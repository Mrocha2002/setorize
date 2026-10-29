/**
 * Painel (Dashboard de desempenho, padrão "Dashboard" do cap. 3).
 *
 * GESTOR: desempenho da equipe inteira (por setor e por pessoa), % de entregas
 *         no prazo, entregas por semana.
 * COLABORADOR: o que está esperando por ele (tarefas, avisos) e o próprio desempenho.
 *
 * Recarrega toda vez que a aba ganha foco.
 */
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import Avatar from '../components/Avatar';
import Barra from '../components/Barra';
import { ehGestor, rotuloPapel } from '../models/Usuario';
import { dataCurta, descreverPrazo, nomeDiaSemana } from '../utils/datas';
import { cores, coresStatus, espaco, raio } from '../theme/tema';

function Indicador({ icone, cor, valor, rotulo, aoPressionar }) {
  return (
    <TouchableOpacity style={styles.indicador} onPress={aoPressionar} disabled={!aoPressionar} accessibilityLabel={`${rotulo}: ${valor}`}>
      <Ionicons name={icone} size={20} color={cor} />
      <Text style={styles.indicadorValor}>{valor}</Text>
      <Text style={styles.indicadorRotulo}>{rotulo}</Text>
    </TouchableOpacity>
  );
}

function Destaque({ dados, titulo }) {
  return (
    <View style={styles.destaque}>
      <View style={styles.destaqueItem}>
        <Text style={styles.destaqueValor}>{dados.prazo.percentual === null ? '—' : `${dados.prazo.percentual}%`}</Text>
        <Text style={styles.destaqueRotulo}>{titulo} no prazo</Text>
        <Text style={styles.destaqueDetalhe}>
          {dados.prazo.noPrazo} de {dados.prazo.comPrazo} com prazo
        </Text>
      </View>
      <View style={styles.separador} />
      <View style={styles.destaqueItem}>
        <Text style={styles.destaqueValor}>{dados.concluidosEstaSemana}</Text>
        <Text style={styles.destaqueRotulo}>{dados.concluidosEstaSemana === 1 ? 'concluída' : 'concluídas'} nesta semana</Text>
      </View>
    </View>
  );
}

/** Gráfico de colunas feito só com View (sem biblioteca). */
function GraficoSemanas({ semanas }) {
  const maximo = Math.max(1, ...semanas.map((s) => s.total));
  return (
    <View style={styles.grafico}>
      {semanas.map((s, i) => {
        const atual = i === semanas.length - 1;
        return (
          <View key={s.inicio} style={styles.colunaGrafico}>
            <Text style={styles.valorGrafico}>{s.total}</Text>
            <View style={styles.trilho}>
              <View style={[styles.coluna, { height: `${(s.total / maximo) * 100}%`, backgroundColor: atual ? cores.primaria : '#A5B4FC' }]} />
            </View>
            <Text style={styles.rotuloGrafico}>{atual ? 'Atual' : dataCurta(s.inicio)}</Text>
          </View>
        );
      })}
    </View>
  );
}

function Totais({ totais }) {
  return (
    <View style={styles.grade}>
      <Indicador icone="list-outline" cor={coresStatus.a_fazer} valor={totais.aFazer} rotulo="A fazer" />
      <Indicador icone="sync-outline" cor={coresStatus.fazendo} valor={totais.fazendo} rotulo="Fazendo" />
      <Indicador icone="checkmark-done-outline" cor={coresStatus.concluido} valor={totais.concluidos} rotulo="Concluídas" />
      <Indicador icone="alert-circle-outline" cor={cores.perigo} valor={totais.atrasados} rotulo="Atrasadas" />
    </View>
  );
}

export default function DashboardScreen({ navigation }) {
  const { estado, acoes, pendencias } = useApp();
  const gestor = ehGestor(estado.perfil);
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState('');
  const [atualizando, setAtualizando] = useState(false);

  const carregar = useCallback(
    () =>
      acoes
        .indicadores()
        .then((d) => {
          setDados(d);
          setErro('');
        })
        .catch((e) => setErro(e.message)),
    [acoes]
  );

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar])
  );

  const puxar = async () => {
    setAtualizando(true);
    await Promise.all([carregar(), acoes.recarregarTudo().catch(() => {})]);
    setAtualizando(false);
  };

  if (!dados) {
    return (
      <View style={styles.centro}>
        {erro ? <Text style={styles.erro}>{erro}</Text> : <ActivityIndicator size="large" color={cores.primaria} />}
      </View>
    );
  }

  const { equipe, meu } = dados;
  const maxConcluidos = Math.max(1, ...equipe.porPessoa.map((p) => p.concluidos));
  const irPara = (aba) => () => navigation.navigate(aba);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.conteudo} refreshControl={<RefreshControl refreshing={atualizando} onRefresh={puxar} />}>
      <Text style={styles.ola}>Olá, {estado.perfil.nome.split(' ')[0]}</Text>
      <Text style={styles.subtitulo}>
        {rotuloPapel(estado.perfil.papel)} · {estado.perfil.setorNome}
      </Text>

      {/* O que está esperando por esta pessoa: vale para os dois papéis */}
      <Text style={styles.secao}>Para você</Text>
      <View style={styles.grade}>
        <Indicador icone="person-outline" cor={cores.primaria} valor={equipe.minhasPendentes} rotulo="Minhas pendentes" aoPressionar={irPara('Kanban')} />
        <Indicador icone="alert-circle-outline" cor={cores.perigo} valor={equipe.minhasAtrasadas} rotulo="Minhas atrasadas" aoPressionar={irPara('Kanban')} />
        <Indicador icone="people-outline" cor={cores.aviso} valor={equipe.doSetorSemResponsavel} rotulo="Do setor sem dono" aoPressionar={irPara('Kanban')} />
        <Indicador icone="megaphone-outline" cor={coresStatus.fazendo} valor={pendencias.avisosNaoLidos} rotulo="Avisos não lidos" aoPressionar={irPara('Mural')} />
      </View>

      {gestor ? (
        <>
          <Text style={styles.secao}>Equipe</Text>
          <Destaque dados={equipe} titulo="entregas" />
          <Totais totais={equipe.totais} />

          <Text style={styles.secao}>Entregas por semana</Text>
          <View style={styles.bloco}>
            <GraficoSemanas semanas={equipe.semanas} />
          </View>

          <Text style={styles.secao}>Por setor</Text>
          <View style={styles.bloco}>
            {equipe.porSetor.length === 0 ? <Text style={styles.vazio}>Nenhuma tarefa criada ainda.</Text> : null}
            {equipe.porSetor.map((s) => (
              <View key={s.nome} style={styles.linhaSetor}>
                <View style={styles.pessoaTopo}>
                  <Text style={styles.pessoaNome}>{s.nome}</Text>
                  <Text style={styles.pessoaNumero}>
                    {s.concluidos}/{s.total} concluídas
                  </Text>
                </View>
                <Barra percentual={s.total ? (s.concluidos / s.total) * 100 : 0} cor={cores.sucesso} />
                <Text style={styles.pessoaDetalhe}>
                  {s.fazendo} em andamento · {s.aFazer} a fazer
                  {s.atrasados ? <Text style={styles.atrasado}> · {s.atrasados} atrasada(s)</Text> : null}
                </Text>
              </View>
            ))}
          </View>

          <Text style={styles.secao}>Por pessoa</Text>
          <View style={styles.bloco}>
            {equipe.porPessoa.length === 0 ? <Text style={styles.vazio}>Ninguém com tarefas atribuídas.</Text> : null}
            {equipe.porPessoa.map((p) => (
              <View key={p.id} style={styles.pessoa}>
                <Avatar nome={p.nome} cor={p.cor} tamanho={34} />
                <View style={styles.pessoaInfo}>
                  <View style={styles.pessoaTopo}>
                    <Text style={styles.pessoaNome}>{p.nome}</Text>
                    <Text style={styles.pessoaNumero}>
                      {p.concluidos} {p.concluidos === 1 ? 'concluída' : 'concluídas'}
                    </Text>
                  </View>
                  <Barra percentual={(p.concluidos / maxConcluidos) * 100} cor={p.cor} />
                  <Text style={styles.pessoaDetalhe}>
                    {p.fazendo} em andamento · {p.aFazer} a fazer
                    {p.prazo.percentual !== null ? ` · ${p.prazo.percentual}% no prazo` : ''}
                    {p.atrasados ? <Text style={styles.atrasado}> · {p.atrasados} atrasada(s)</Text> : null}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </>
      ) : (
        <>
          <Text style={styles.secao}>Meu desempenho</Text>
          <Destaque dados={meu} titulo="minhas entregas" />
          <Totais totais={meu.totais} />
          <Text style={styles.secao}>Minhas entregas por semana</Text>
          <View style={styles.bloco}>
            <GraficoSemanas semanas={meu.semanas} />
          </View>
        </>
      )}

      <Text style={styles.secao}>Minhas próximas reuniões</Text>
      <View style={styles.bloco}>
        {dados.minhasReunioes.length === 0 ? (
          <Text style={styles.vazio}>Nenhuma reunião agendada.</Text>
        ) : (
          dados.minhasReunioes.map((r) => {
            const rot = descreverPrazo(r.data);
            return (
              <View key={r.id} style={styles.reuniao}>
                <Text style={styles.reuniaoQuando}>
                  {rot === 'Hoje' || rot === 'Amanhã' ? rot : `${nomeDiaSemana(r.data)} ${dataCurta(r.data)}`} · {r.inicio}–{r.fim}
                </Text>
                <Text style={styles.reuniaoTitulo}>
                  {r.titulo} ({r.salaNome})
                </Text>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: cores.fundo },
  conteudo: { padding: espaco.m, paddingBottom: 40 },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  erro: { color: cores.perigo, textAlign: 'center' },
  ola: { fontSize: 22, fontWeight: '800', color: cores.texto },
  subtitulo: { fontSize: 14, color: cores.textoSecundario, marginTop: 2 },
  destaque: { flexDirection: 'row', backgroundColor: cores.primaria, borderRadius: raio, padding: 18 },
  destaqueItem: { flex: 1 },
  destaqueValor: { color: '#FFFFFF', fontSize: 32, fontWeight: '800' },
  destaqueRotulo: { color: '#E0E7FF', fontSize: 13 },
  destaqueDetalhe: { color: '#C7D2FE', fontSize: 12, marginTop: 4 },
  separador: { width: 1, backgroundColor: '#818CF8', marginHorizontal: 14 },
  grade: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10, marginTop: 10 },
  indicador: { width: '48.5%', backgroundColor: cores.cartao, borderRadius: raio, padding: 14 },
  indicadorValor: { fontSize: 26, fontWeight: '700', color: cores.texto, marginTop: 4 },
  indicadorRotulo: { fontSize: 13, color: cores.textoSecundario },
  secao: { fontSize: 17, fontWeight: '700', color: cores.texto, marginTop: 24, marginBottom: 6 },
  bloco: { backgroundColor: cores.cartao, borderRadius: raio, padding: 14, marginTop: 4 },
  grafico: { flexDirection: 'row', height: 150, alignItems: 'flex-end', gap: 8 },
  colunaGrafico: { flex: 1, alignItems: 'center', height: '100%' },
  valorGrafico: { fontSize: 12, fontWeight: '700', color: cores.texto, marginBottom: 4 },
  trilho: { flex: 1, width: '70%', justifyContent: 'flex-end' },
  coluna: { width: '100%', borderTopLeftRadius: 4, borderTopRightRadius: 4, minHeight: 2 },
  rotuloGrafico: { fontSize: 11, color: cores.textoSecundario, marginTop: 6 },
  linhaSetor: { paddingVertical: 8, gap: 5 },
  pessoa: { flexDirection: 'row', gap: 10, alignItems: 'center', paddingVertical: 8 },
  pessoaInfo: { flex: 1, gap: 5 },
  pessoaTopo: { flexDirection: 'row', justifyContent: 'space-between' },
  pessoaNome: { fontSize: 14, fontWeight: '600', color: cores.texto },
  pessoaNumero: { fontSize: 13, color: cores.textoSecundario },
  pessoaDetalhe: { fontSize: 12, color: cores.textoSecundario },
  atrasado: { color: cores.perigo, fontWeight: '700' },
  vazio: { color: cores.textoSecundario },
  reuniao: { paddingVertical: 6 },
  reuniaoQuando: { fontSize: 13, fontWeight: '700', color: cores.primaria },
  reuniaoTitulo: { fontSize: 14, color: cores.texto },
});
