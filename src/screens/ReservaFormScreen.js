/**
 * Reservar sala. Se o horário estiver ocupado, o BANCO recusa e a tela mostra quem reservou.
 */
import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { ErroConflito, ErroValidacao } from '../controllers/erros';
import Campo from '../components/Campo';
import Botao from '../components/Botao';
import GrupoOpcoes from '../components/GrupoOpcoes';
import { HORA_ABERTURA, HORA_FECHAMENTO } from '../models/Reserva';
import { hojeISO, mascararData, mascararHora, paraBR } from '../utils/datas';
import { cores, espaco, raio } from '../theme/tema';

export default function ReservaFormScreen({ navigation, route }) {
  const { acoes } = useApp();
  const [salas, setSalas] = useState([]);
  const [form, setForm] = useState({ titulo: '', salaId: null, data: paraBR(route.params?.data ?? hojeISO()), inicio: '', fim: '' });
  const [erros, setErros] = useState({});
  const [conflito, setConflito] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    acoes.listarSalas().then(setSalas).catch((e) => Alert.alert('Erro', e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const alterar = (campo, valor) => {
    setForm((f) => ({ ...f, [campo]: valor }));
    setErros((e) => ({ ...e, [campo]: undefined }));
    setConflito('');
  };

  const reservar = async () => {
    setSalvando(true);
    try {
      await acoes.reservar(form);
      navigation.goBack();
    } catch (e) {
      if (e instanceof ErroValidacao) setErros(e.erros);
      else if (e instanceof ErroConflito) setConflito(e.message);
      else Alert.alert('Erro ao reservar', e.message);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
        <Campo rotulo="Assunto da reunião *" value={form.titulo} onChangeText={(v) => alterar('titulo', v)} placeholder="Ex.: Alinhamento semanal" maxLength={60} erro={erros.titulo} />

        <Text style={styles.rotulo}>Sala *</Text>
        <GrupoOpcoes opcoes={salas.map((s) => ({ valor: s.id, rotulo: `${s.nome} (${s.capacidade})` }))} selecionado={form.salaId} aoSelecionar={(v) => alterar('salaId', v)} />
        {erros.salaId ? <Text style={styles.erro}>{erros.salaId}</Text> : null}

        <Campo rotulo="Data *" value={form.data} onChangeText={(v) => alterar('data', mascararData(v))} placeholder="dd/mm/aaaa" keyboardType="number-pad" maxLength={10} erro={erros.data} />

        <View style={styles.linha}>
          <Campo style={styles.metade} rotulo="Início *" value={form.inicio} onChangeText={(v) => alterar('inicio', mascararHora(v))} placeholder="hh:mm" keyboardType="number-pad" maxLength={5} erro={erros.inicio} />
          <Campo style={styles.metade} rotulo="Término *" value={form.fim} onChangeText={(v) => alterar('fim', mascararHora(v))} placeholder="hh:mm" keyboardType="number-pad" maxLength={5} erro={erros.fim} />
        </View>
        <Text style={styles.ajuda}>
          Salas disponíveis das {HORA_ABERTURA} às {HORA_FECHAMENTO}.
        </Text>

        {conflito || erros.geral ? (
          <View style={styles.conflito}>
            <Ionicons name="warning-outline" size={20} color={cores.perigo} />
            <Text style={styles.conflitoTexto}>{conflito || erros.geral}</Text>
          </View>
        ) : null}

        <Botao titulo="Confirmar reserva" aoPressionar={reservar} carregando={salvando} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: cores.fundo },
  conteudo: { padding: espaco.m, paddingBottom: 40 },
  rotulo: { fontSize: 14, fontWeight: '600', color: cores.texto, marginTop: 18, marginBottom: 8 },
  erro: { color: cores.perigo, fontSize: 13, marginTop: 6 },
  linha: { flexDirection: 'row', gap: 12 },
  metade: { flex: 1 },
  ajuda: { fontSize: 12, color: cores.textoSecundario, marginTop: 8 },
  conflito: { flexDirection: 'row', gap: 8, backgroundColor: '#FEF2F2', borderRadius: raio, padding: 12, marginTop: 16 },
  conflitoTexto: { flex: 1, color: cores.perigo, fontSize: 14 },
});
