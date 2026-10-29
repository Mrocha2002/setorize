/**
 * Detalhe da tarefa: dados, coluna, "Assumir", histórico e comentários.
 * O histórico é o que permite ao gestor acompanhar o andamento: cada mudança
 * de coluna e cada comentário ficam registrados com nome e horário (gravados pelo banco).
 */
import React, { useCallback, useLayoutEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { ErroValidacao } from '../controllers/erros';
import Avatar from '../components/Avatar';
import Botao from '../components/Botao';
import Campo from '../components/Campo';
import GrupoOpcoes from '../components/GrupoOpcoes';
import { COMENTARIO_MAX, ROTULO_PRIORIDADE, ROTULO_STATUS, STATUS, descreverDestino, estaAtrasado, podeAssumir } from '../models/Card';
import { podeGerenciarCard } from '../models/Usuario';
import { paraBR, quandoFoi } from '../utils/datas';
import { cores, coresPrioridade, coresStatus, espaco, raio } from '../theme/tema';

const ICONE_EVENTO = { criado: 'add-circle-outline', status: 'swap-horizontal-outline', assumido: 'hand-left-outline', comentario: 'chatbubble-outline' };

export default function CardDetalheScreen({ navigation, route }) {
  const id = route.params.id;
  const { estado, acoes } = useApp();
  const [card, setCard] = useState(null);
  // Editar/excluir: só o gestor que criou ou o gestor do setor da tarefa.
  const gerencia = podeGerenciarCard(card, estado.perfil);
  const [eventos, setEventos] = useState([]);
  const [comentario, setComentario] = useState('');
  const [erroComentario, setErroComentario] = useState('');
  const [enviando, setEnviando] = useState(false);

  const carregar = useCallback(async () => {
    const [c, ev] = await Promise.all([acoes.buscarCard(id), acoes.historicoCard(id)]);
    if (!c) {
      navigation.goBack();
      return;
    }
    setCard(c);
    setEventos(ev);
  }, [acoes, id, navigation]);

  useFocusEffect(
    useCallback(() => {
      carregar().catch((e) => Alert.alert('Erro', e.message));
    }, [carregar])
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Tarefa',
      headerRight: gerencia
        ? () => (
            <TouchableOpacity onPress={() => navigation.navigate('CardForm', { id })} accessibilityLabel="Editar tarefa">
              <Ionicons name="create-outline" size={24} color={cores.primaria} />
            </TouchableOpacity>
          )
        : undefined,
    });
  }, [navigation, gerencia, id]);

  const executar = async (acao) => {
    try {
      await acao();
      await carregar();
    } catch (e) {
      Alert.alert('Não foi possível', e.message);
    }
  };

  const comentar = async () => {
    setEnviando(true);
    try {
      await acoes.comentarCard(id, comentario);
      setComentario('');
      setErroComentario('');
      await carregar();
    } catch (e) {
      if (e instanceof ErroValidacao) setErroComentario(e.erros.comentario);
      else Alert.alert('Não foi possível', e.message);
    } finally {
      setEnviando(false);
    }
  };

  const excluir = () => {
    Alert.alert('Excluir tarefa', 'Essa ação não pode ser desfeita.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () =>
          acoes
            .excluirCard(id)
            .then(() => navigation.goBack())
            .catch((e) => Alert.alert('Não foi possível', e.message)),
      },
    ]);
  };

  if (!card) {
    return (
      <View style={styles.centro}>
        <ActivityIndicator size="large" color={cores.primaria} />
      </View>
    );
  }

  const atrasado = estaAtrasado(card);

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
        <View style={[styles.cabecalho, { borderLeftColor: coresPrioridade[card.prioridade] }]}>
          <Text style={styles.titulo}>{card.titulo}</Text>
          {card.descricao ? <Text style={styles.descricao}>{card.descricao}</Text> : null}
          <Linha icone="flag-outline" texto={`Prioridade ${ROTULO_PRIORIDADE[card.prioridade]}`} />
          <Linha icone="people-outline" texto={`Para: ${descreverDestino(card)}`} />
          {card.prazo ? (
            <Linha icone="calendar-outline" texto={`Prazo: ${paraBR(card.prazo)}${atrasado ? ' (atrasada)' : ''}`} perigo={atrasado} />
          ) : null}
          <Linha icone="person-outline" texto={`Criada por ${card.criadoPorNome ?? '—'}`} />
        </View>

        {podeAssumir(card, estado.perfil) ? (
          <Botao titulo="Assumir esta tarefa" aoPressionar={() => executar(() => acoes.assumirCard(id))} />
        ) : null}

        <Text style={styles.secao}>Coluna</Text>
        <GrupoOpcoes
          opcoes={STATUS.map((s) => ({ valor: s, rotulo: ROTULO_STATUS[s], cor: coresStatus[s] }))}
          selecionado={card.status}
          aoSelecionar={(s) => s !== card.status && executar(() => acoes.moverCard(id, s))}
        />

        <Text style={styles.secao}>Histórico</Text>
        <View style={styles.bloco}>
          {eventos.map((e) => (
            <View key={e.id} style={styles.evento}>
              <Avatar nome={e.autorNome} cor={e.autorCor} tamanho={28} />
              <View style={styles.eventoInfo}>
                <Text style={styles.eventoTexto}>
                  <Text style={styles.eventoAutor}>{e.autorNome}: </Text>
                  {e.texto}
                </Text>
                <View style={styles.eventoQuando}>
                  <Ionicons name={ICONE_EVENTO[e.tipo]} size={12} color={cores.textoSecundario} />
                  <Text style={styles.eventoData}> {quandoFoi(e.criadoEm)}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        <Campo
          rotulo="Comentar o andamento"
          value={comentario}
          onChangeText={(v) => {
            setComentario(v);
            setErroComentario('');
          }}
          placeholder="Ex.: Aguardando retorno do fornecedor"
          maxLength={COMENTARIO_MAX}
          multiline
          erro={erroComentario}
        />
        <Botao titulo="Enviar comentário" aoPressionar={comentar} carregando={enviando} />

        {gerencia ? <Botao titulo="Excluir tarefa" variante="perigo" aoPressionar={excluir} /> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Linha({ icone, texto, perigo }) {
  return (
    <View style={styles.linha}>
      <Ionicons name={icone} size={16} color={perigo ? cores.perigo : cores.textoSecundario} />
      <Text style={[styles.linhaTexto, perigo && { color: cores.perigo, fontWeight: '700' }]}>{texto}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: cores.fundo },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  conteudo: { padding: espaco.m, paddingBottom: 40 },
  cabecalho: { backgroundColor: cores.cartao, borderRadius: raio, borderLeftWidth: 5, padding: 16, gap: 6 },
  titulo: { fontSize: 19, fontWeight: '800', color: cores.texto },
  descricao: { fontSize: 15, color: cores.texto, marginBottom: 4 },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  linhaTexto: { fontSize: 14, color: cores.textoSecundario },
  secao: { fontSize: 15, fontWeight: '700', color: cores.texto, marginTop: 22, marginBottom: 10 },
  bloco: { backgroundColor: cores.cartao, borderRadius: raio, padding: 12, gap: 12 },
  evento: { flexDirection: 'row', gap: 10 },
  eventoInfo: { flex: 1 },
  eventoTexto: { fontSize: 14, color: cores.texto },
  eventoAutor: { fontWeight: '700' },
  eventoQuando: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  eventoData: { fontSize: 12, color: cores.textoSecundario },
});
