/**
 * Cadastro: nome, e-mail, senha, setor, cargo e telefone.
 * Toda conta nasce como "colaborador". Quem vira gestor é definido no
 * painel do Supabase (o próprio app não deixa ninguém se promover).
 */
import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { useApp } from '../context/AppContext';
import { ErroValidacao } from '../controllers/erros';
import Campo from '../components/Campo';
import Botao from '../components/Botao';
import GrupoOpcoes from '../components/GrupoOpcoes';
import { SENHA_MIN } from '../models/Usuario';
import { cores, espaco } from '../theme/tema';

export default function CadastroScreen({ navigation }) {
  const { estado, acoes } = useApp();
  const [form, setForm] = useState({ nome: '', email: '', senha: '', confirmacao: '', setorId: null, cargo: '', telefone: '' });
  const [erros, setErros] = useState({});
  const [erroGeral, setErroGeral] = useState('');
  const [enviando, setEnviando] = useState(false);

  const alterar = (campo, valor) => {
    setForm((f) => ({ ...f, [campo]: valor }));
    setErros((e) => ({ ...e, [campo]: undefined }));
    setErroGeral('');
  };

  const cadastrar = async () => {
    setEnviando(true);
    try {
      const { precisaConfirmarEmail } = await acoes.cadastrar(form);
      if (precisaConfirmarEmail) {
        Alert.alert('Confirme seu e-mail', `Enviamos um link para ${form.email}. Depois de confirmar, volte e entre.`);
        navigation.goBack();
      }
      // Sem confirmação de e-mail, o Supabase já devolve a sessão e o app entra sozinho.
    } catch (e) {
      if (e instanceof ErroValidacao) setErros(e.erros);
      else setErroGeral(e.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
        <Campo rotulo="Nome completo *" value={form.nome} onChangeText={(v) => alterar('nome', v)} placeholder="Ex.: Carla Mendes" erro={erros.nome} maxLength={80} />
        <Campo
          rotulo="E-mail *"
          value={form.email}
          onChangeText={(v) => alterar('email', v)}
          placeholder="voce@empresa.com.br"
          keyboardType="email-address"
          autoCapitalize="none"
          erro={erros.email}
        />
        <Campo rotulo="Senha *" value={form.senha} onChangeText={(v) => alterar('senha', v)} placeholder={`Mínimo de ${SENHA_MIN} caracteres`} secureTextEntry erro={erros.senha} />
        <Campo rotulo="Confirme a senha *" value={form.confirmacao} onChangeText={(v) => alterar('confirmacao', v)} placeholder="Digite a senha de novo" secureTextEntry erro={erros.confirmacao} />

        <Text style={styles.rotulo}>Seu setor *</Text>
        <GrupoOpcoes
          opcoes={estado.setores.map((s) => ({ valor: s.id, rotulo: s.nome }))}
          selecionado={form.setorId}
          aoSelecionar={(v) => alterar('setorId', v)}
        />
        {erros.setorId ? <Text style={styles.erro}>{erros.setorId}</Text> : null}
        {estado.setores.length === 0 ? <Text style={styles.ajuda}>Carregando setores... verifique a internet.</Text> : null}

        <Campo rotulo="Cargo" value={form.cargo} onChangeText={(v) => alterar('cargo', v)} placeholder="Ex.: Comprador" />
        <Campo rotulo="Telefone (WhatsApp)" value={form.telefone} onChangeText={(v) => alterar('telefone', v)} placeholder="(19) 99999-9999" keyboardType="phone-pad" />

        {erroGeral ? <Text style={[styles.erro, styles.erroGeral]}>{erroGeral}</Text> : null}
        <Botao titulo="Criar conta" aoPressionar={cadastrar} carregando={enviando} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: cores.fundo },
  conteudo: { padding: espaco.m, paddingBottom: 40 },
  rotulo: { fontSize: 14, fontWeight: '600', color: cores.texto, marginTop: 18, marginBottom: 8 },
  erro: { color: cores.perigo, fontSize: 13, marginTop: 6 },
  erroGeral: { fontSize: 14, textAlign: 'center', marginTop: 16 },
  ajuda: { fontSize: 12, color: cores.textoSecundario, marginTop: 6 },
});
