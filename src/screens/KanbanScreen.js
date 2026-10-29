/**
 * Kanban: três colunas num ScrollView horizontal com "snap" (carrossel, cap. 3).
 *
 * O servidor só devolve o que a pessoa pode ver. Os filtros aqui são de visualização:
 *  - colaborador: "Para mim", "Meu setor", "Tudo"
 *  - gestor: o setor dele + o que ele criou, com filtro por setor; só o gestor tem o botão "+"
 */
import React, { useCallback, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import KanbanCard from '../components/KanbanCard';
import GrupoOpcoes from '../components/GrupoOpcoes';
import { ROTULO_STATUS, STATUS, filtrarCards, montarQuadro } from '../models/Card';
import { ehGestor } from '../models/Usuario';
import { cores, coresStatus, espaco, raio } from '../theme/tema';

const FILTROS_COLABORADOR = [
  { valor: 'meus', rotulo: 'Para mim' },
  { valor: 'setor', rotulo: 'Meu setor' },
  { valor: 'todos', rotulo: 'Tudo' },
];

export default function KanbanScreen({ navigation }) {
  const { estado, acoes } = useApp();
  const { perfil, filtroKanban } = estado;
  const gestor = ehGestor(perfil);
  const { width } = useWindowDimensions();
  const larguraColuna = Math.min(width * 0.82, 360);
  const [atualizando, setAtualizando] = useState(false);

  const quadro = montarQuadro(filtrarCards(estado.cards, filtroKanban, perfil));

  const abrir = useCallback((card) => navigation.navigate('CardDetalhe', { id: card.id }), [navigation]);
  const mover = useCallback(
    (card, status) => {
      acoes.moverCard(card.id, status).catch((e) => Alert.alert('Não foi possível', e.message));
    },
    [acoes]
  );

  const puxar = async () => {
    setAtualizando(true);
    await acoes.recarregarCards().catch(() => {});
    setAtualizando(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.filtros}>
        {gestor ? (
          <GrupoOpcoes
            opcoes={[{ valor: null, rotulo: 'Todos os setores' }, ...estado.setores.map((s) => ({ valor: s.id, rotulo: s.nome }))]}
            selecionado={filtroKanban.setorId}
            aoSelecionar={(setorId) => acoes.definirFiltroKanban({ escopo: 'todos', setorId })}
            rolavel
          />
        ) : (
          <GrupoOpcoes
            opcoes={FILTROS_COLABORADOR}
            selecionado={filtroKanban.escopo}
            aoSelecionar={(escopo) => acoes.definirFiltroKanban({ escopo })}
          />
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={larguraColuna + 12}
        decelerationRate="fast"
        contentContainerStyle={styles.colunas}
      >
        {STATUS.map((status) => (
          <View key={status} style={[styles.coluna, { width: larguraColuna }]}>
            <View style={styles.colunaTopo}>
              <View style={[styles.bolinha, { backgroundColor: coresStatus[status] }]} />
              <Text style={styles.colunaTitulo}>{ROTULO_STATUS[status]}</Text>
              <View style={styles.contador}>
                <Text style={styles.contadorTexto}>{quadro[status].length}</Text>
              </View>
            </View>
            <ScrollView
              contentContainerStyle={styles.listaCards}
              nestedScrollEnabled
              refreshControl={<RefreshControl refreshing={atualizando} onRefresh={puxar} />}
            >
              {quadro[status].length === 0 ? (
                <Text style={styles.vazio}>Nenhuma tarefa</Text>
              ) : (
                quadro[status].map((card) => <KanbanCard key={card.id} card={card} aoAbrir={abrir} aoMover={mover} />)
              )}
            </ScrollView>
          </View>
        ))}
      </ScrollView>

      {gestor ? (
        <TouchableOpacity style={styles.botaoNovo} onPress={() => navigation.navigate('CardForm')} accessibilityLabel="Nova tarefa">
          <Ionicons name="add" size={32} color="#FFFFFF" />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: cores.fundo },
  filtros: { paddingHorizontal: espaco.m, paddingTop: 12 },
  colunas: { padding: espaco.m, gap: 12 },
  coluna: { backgroundColor: '#EBEDF2', borderRadius: raio, padding: 10, flex: 1 },
  colunaTopo: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10, paddingHorizontal: 4 },
  bolinha: { width: 10, height: 10, borderRadius: 5 },
  colunaTitulo: { flex: 1, fontSize: 16, fontWeight: '700', color: cores.texto },
  contador: { backgroundColor: cores.cartao, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  contadorTexto: { fontSize: 13, fontWeight: '700', color: cores.textoSecundario },
  listaCards: { paddingBottom: 90 },
  vazio: { textAlign: 'center', color: cores.textoSecundario, paddingVertical: 24 },
  botaoNovo: {
    position: 'absolute', right: 20, bottom: 20, width: 60, height: 60, borderRadius: 30,
    backgroundColor: cores.primaria, alignItems: 'center', justifyContent: 'center',
    elevation: 4, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 3 },
  },
});
