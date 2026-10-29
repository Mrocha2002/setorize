/**
 * Formulário de tarefa (só gestor): criar ou editar.
 * O destino é um setor inteiro ou uma pessoa.
 */
import React, { useEffect, useLayoutEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useApp } from '../context/AppContext';
import { ErroValidacao } from '../controllers/erros';
import Campo from '../components/Campo';
import Botao from '../components/Botao';
import GrupoOpcoes from '../components/GrupoOpcoes';
import SeletorDestino from '../components/SeletorDestino';
import { DESCRICAO_MAX, PRIORIDADES, ROTULO_PRIORIDADE, TITULO_MAX } from '../models/Card';
import { mascararData, paraBR } from '../utils/datas';
import { cores, coresPrioridade, espaco } from '../theme/tema';

export default function CardFormScreen({ navigation, route }) {
  const id = route.params?.id ?? null;
  const editando = id !== null;
  const { estado, acoes } = useApp();

  const [form, setForm] = useState({ titulo: '', descricao: '', prioridade: 'media', prazo: '' });
  const [destino, setDestino] = useState({ destino: 'setor', setorId: null, pessoaId: null });
  const [erros, setErros] = useState({});
  const [carregando, setCarregando] = useState(editando);
  const [salvando, setSalvando] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ title: editando ? 'Editar tarefa' : 'Nova tarefa' });
  }, [navigation, editando]);

  useEffect(() => {
    if (!editando) return;
    acoes
      .buscarCard(id)
      .then((c) => {
        if (!c) return navigation.goBack();
        setForm({ titulo: c.titulo, descricao: c.descricao ?? '', prioridade: c.prioridade, prazo: paraBR(c.prazo) });
        setDestino(
          c.setorId
            ? { destino: 'setor', setorId: c.setorId, pessoaId: null, responsavelAtual: c.responsavelId }
            : { destino: 'pessoa', setorId: null, pessoaId: c.responsavelId }
        );
      })
      .finally(() => setCarregando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const alterar = (campo, valor) => {
    setForm((f) => ({ ...f, [campo]: valor }));
    setErros((e) => ({ ...e, [campo]: undefined }));
  };

  const salvar = async () => {
    setSalvando(true);
    try {
      await acoes.salvarCard(
        {
          ...form,
          destino: destino.destino,
          setorId: destino.setorId,
          // tarefa de setor já assumida continua com quem assumiu
          responsavelId: destino.destino === 'pessoa' ? destino.pessoaId : (destino.responsavelAtual ?? null),
        },
        id
      );
      navigation.goBack();
    } catch (e) {
      if (e instanceof ErroValidacao) setErros(e.erros);
      else Alert.alert('Erro ao salvar', e.message);
    } finally {
      setSalvando(false);
    }
  };

  if (carregando) {
    return (
      <View style={styles.centro}>
        <ActivityIndicator size="large" color={cores.primaria} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
        <Campo rotulo="Título *" value={form.titulo} onChangeText={(v) => alterar('titulo', v)} placeholder="Ex.: Cotar papel A4" maxLength={TITULO_MAX} erro={erros.titulo} />
        <Campo rotulo="Descrição" value={form.descricao} onChangeText={(v) => alterar('descricao', v)} placeholder="Detalhes (opcional)" maxLength={DESCRICAO_MAX} multiline erro={erros.descricao} />

        <SeletorDestino
          valor={destino}
          aoMudar={(v) => {
            setDestino(v);
            setErros((e) => ({ ...e, destino: undefined }));
          }}
          setores={estado.setores}
          colaboradores={estado.colaboradores}
          erro={erros.destino}
        />

        <Text style={styles.rotulo}>Prioridade</Text>
        <GrupoOpcoes
          opcoes={PRIORIDADES.map((p) => ({ valor: p, rotulo: ROTULO_PRIORIDADE[p], cor: coresPrioridade[p] }))}
          selecionado={form.prioridade}
          aoSelecionar={(v) => alterar('prioridade', v)}
        />

        <Campo
          rotulo="Prazo"
          value={form.prazo}
          onChangeText={(v) => alterar('prazo', mascararData(v))}
          placeholder="dd/mm/aaaa (opcional)"
          keyboardType="number-pad"
          maxLength={10}
          erro={erros.prazo}
        />

        <Botao titulo={editando ? 'Salvar alterações' : 'Criar tarefa'} aoPressionar={salvar} carregando={salvando} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: cores.fundo },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  conteudo: { padding: espaco.m, paddingBottom: 40 },
  rotulo: { fontSize: 14, fontWeight: '600', color: cores.texto, marginTop: 18, marginBottom: 8 },
});
