/** Publicar aviso (só gestor): para todos, para um setor ou para uma pessoa. */
import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useApp } from '../context/AppContext';
import { ErroValidacao } from '../controllers/erros';
import Campo from '../components/Campo';
import Botao from '../components/Botao';
import SeletorDestino from '../components/SeletorDestino';
import { AVISO_MENSAGEM_MAX, AVISO_TITULO_MAX } from '../models/Aviso';
import { cores, espaco, raio } from '../theme/tema';

export default function AvisoFormScreen({ navigation }) {
  const { estado, acoes } = useApp();
  const [form, setForm] = useState({ titulo: '', mensagem: '', fixado: false });
  // Sem destino marcado: a pessoa precisa escolher (evita mandar para a empresa toda sem querer).
  const [destino, setDestino] = useState({ destino: null, setorId: null, pessoaId: null });
  const [erros, setErros] = useState({});
  const [salvando, setSalvando] = useState(false);

  const alterar = (campo, valor) => {
    setForm((f) => ({ ...f, [campo]: valor }));
    setErros((e) => ({ ...e, [campo]: undefined }));
  };

  const publicar = async () => {
    setSalvando(true);
    try {
      await acoes.publicarAviso({ ...form, destino: destino.destino, setorId: destino.setorId, destinatarioId: destino.pessoaId });
      navigation.goBack();
    } catch (e) {
      if (e instanceof ErroValidacao) setErros(e.erros);
      else Alert.alert('Erro ao publicar', e.message);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
        <Campo rotulo="Título *" value={form.titulo} onChangeText={(v) => alterar('titulo', v)} placeholder="Ex.: Inventário na sexta" maxLength={AVISO_TITULO_MAX} erro={erros.titulo} />
        <Campo rotulo="Mensagem *" value={form.mensagem} onChangeText={(v) => alterar('mensagem', v)} placeholder="Escreva o aviso" maxLength={AVISO_MENSAGEM_MAX} multiline erro={erros.mensagem} />
        <Text style={styles.contador}>
          {form.mensagem.length}/{AVISO_MENSAGEM_MAX}
        </Text>

        <SeletorDestino
          valor={destino}
          aoMudar={(v) => {
            setDestino(v);
            setErros((e) => ({ ...e, destino: undefined }));
          }}
          permitirTodos
          setores={estado.setores}
          colaboradores={estado.colaboradores}
          erro={erros.destino}
        />

        <View style={styles.linhaSwitch}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rotulo}>Fixar no topo do mural</Text>
            <Text style={styles.ajuda}>Use para avisos importantes.</Text>
          </View>
          <Switch value={form.fixado} onValueChange={(v) => alterar('fixado', v)} trackColor={{ true: cores.primaria }} accessibilityLabel="Fixar no topo do mural" />
        </View>

        <Botao titulo="Publicar aviso" aoPressionar={publicar} carregando={salvando} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: cores.fundo },
  conteudo: { padding: espaco.m, paddingBottom: 40 },
  contador: { alignSelf: 'flex-end', fontSize: 12, color: cores.textoSecundario, marginTop: 4 },
  linhaSwitch: { flexDirection: 'row', alignItems: 'center', backgroundColor: cores.cartao, borderRadius: raio, padding: 14, marginTop: 20 },
  rotulo: { fontSize: 15, fontWeight: '600', color: cores.texto },
  ajuda: { fontSize: 13, color: cores.textoSecundario, marginTop: 2 },
});
