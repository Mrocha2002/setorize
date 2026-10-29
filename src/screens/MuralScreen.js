/**
 * Mural de avisos. Cada um vê os avisos para todos, para o seu setor e para si.
 * Avisos não lidos aparecem com o selo "Novo"; tocar em "Marcar como lido" registra a leitura.
 * O gestor vê "Lido por X de Y" e é o único que publica.
 */
import React, { useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import Avatar from '../components/Avatar';
import EstadoVazio from '../components/EstadoVazio';
import { descreverDestinoAviso, podeGerenciarAviso } from '../models/Aviso';
import { ehGestor } from '../models/Usuario';
import { quandoFoi } from '../utils/datas';
import { cores, espaco, raio } from '../theme/tema';

export default function MuralScreen({ navigation }) {
  const { estado, acoes } = useApp();
  const gestor = ehGestor(estado.perfil);
  const [atualizando, setAtualizando] = useState(false);
  const erro = (e) => Alert.alert('Não foi possível', e.message);

  const puxar = async () => {
    setAtualizando(true);
    await acoes.recarregarAvisos().catch(() => {});
    setAtualizando(false);
  };

  const excluir = (aviso) =>
    Alert.alert('Excluir aviso', `Excluir "${aviso.titulo}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => acoes.excluirAviso(aviso.id).catch(erro) },
    ]);

  const renderizar = ({ item }) => {
    const meu = podeGerenciarAviso(item, estado.perfil.id);
    return (
      <View style={[styles.aviso, item.fixado && styles.fixado, !item.lido && styles.naoLido]}>
        <View style={styles.topo}>
          {item.fixado ? (
            <View style={styles.selo}>
              <Ionicons name="pin" size={13} color={cores.aviso} />
              <Text style={[styles.seloTexto, { color: cores.aviso }]}>Fixado</Text>
            </View>
          ) : null}
          {!item.lido ? <Text style={styles.novo}>Novo</Text> : null}
          <Text style={styles.destino}>{descreverDestinoAviso(item)}</Text>
        </View>

        <Text style={styles.titulo}>{item.titulo}</Text>
        <Text style={styles.mensagem}>{item.mensagem}</Text>

        <View style={styles.rodape}>
          <Avatar nome={item.autorNome} cor={item.autorCor} tamanho={26} />
          <Text style={styles.autor} numberOfLines={1}>
            {item.autorNome} · {quandoFoi(item.criadoEm)}
          </Text>
          {meu ? (
            <View style={styles.acoes}>
              <TouchableOpacity onPress={() => acoes.alternarFixado(item).catch(erro)} hitSlop={8} accessibilityLabel={item.fixado ? `Desafixar ${item.titulo}` : `Fixar ${item.titulo}`}>
                <Ionicons name={item.fixado ? 'pin' : 'pin-outline'} size={20} color={cores.aviso} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => excluir(item)} hitSlop={8} accessibilityLabel={`Excluir ${item.titulo}`}>
                <Ionicons name="trash-outline" size={20} color={cores.perigo} />
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        {gestor && item.leituras ? (
          <Text style={styles.leituras}>
            Lido por {item.leituras.lidos} de {item.leituras.total}
          </Text>
        ) : null}

        {!item.lido ? (
          <TouchableOpacity style={styles.marcar} onPress={() => acoes.marcarAvisoLido(item.id).catch(erro)} accessibilityLabel={`Marcar ${item.titulo} como lido`}>
            <Ionicons name="checkmark-done" size={18} color={cores.primaria} />
            <Text style={styles.marcarTexto}>Marcar como lido</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={estado.avisos}
        keyExtractor={(a) => String(a.id)}
        renderItem={renderizar}
        contentContainerStyle={styles.lista}
        ListEmptyComponent={<EstadoVazio icone="megaphone-outline" titulo="Nenhum aviso para você" />}
        refreshing={atualizando}
        onRefresh={puxar}
      />
      {gestor ? (
        <TouchableOpacity style={styles.botaoNovo} onPress={() => navigation.navigate('AvisoForm')} accessibilityLabel="Novo aviso">
          <Ionicons name="add" size={32} color="#FFFFFF" />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: cores.fundo },
  lista: { padding: espaco.m, paddingBottom: 100, flexGrow: 1 },
  aviso: { backgroundColor: cores.cartao, borderRadius: raio, padding: 16, marginBottom: 12 },
  fixado: { borderWidth: 1.5, borderColor: cores.aviso },
  naoLido: { borderLeftWidth: 5, borderLeftColor: cores.primaria },
  topo: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  selo: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  seloTexto: { fontSize: 12, fontWeight: '700' },
  novo: { fontSize: 11, fontWeight: '800', color: '#FFFFFF', backgroundColor: cores.primaria, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 },
  destino: { flex: 1, textAlign: 'right', fontSize: 12, color: cores.textoSecundario },
  titulo: { fontSize: 17, fontWeight: '700', color: cores.texto },
  mensagem: { fontSize: 15, color: cores.texto, marginTop: 6, lineHeight: 21 },
  rodape: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 },
  autor: { flex: 1, fontSize: 13, color: cores.textoSecundario },
  acoes: { flexDirection: 'row', gap: 16 },
  leituras: { fontSize: 13, color: cores.primaria, fontWeight: '600', marginTop: 10 },
  marcar: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, alignSelf: 'flex-start' },
  marcarTexto: { color: cores.primaria, fontWeight: '700' },
  botaoNovo: {
    position: 'absolute', right: 20, bottom: 20, width: 60, height: 60, borderRadius: 30,
    backgroundColor: cores.primaria, alignItems: 'center', justifyContent: 'center',
    elevation: 4, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 3 },
  },
});
