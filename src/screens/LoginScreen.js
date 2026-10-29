/**
 * Login com e-mail e senha (Supabase Auth).
 * A sessão fica salva no aparelho: na próxima vez o app já abre logado.
 */
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { ErroValidacao } from '../controllers/erros';
import Campo from '../components/Campo';
import Botao from '../components/Botao';
import { cores, espaco } from '../theme/tema';

export default function LoginScreen({ navigation }) {
  const { acoes } = useApp();
  const [form, setForm] = useState({ email: '', senha: '' });
  const [erros, setErros] = useState({});
  const [erroGeral, setErroGeral] = useState('');
  const [enviando, setEnviando] = useState(false);

  const alterar = (campo, valor) => {
    setForm((f) => ({ ...f, [campo]: valor }));
    setErros((e) => ({ ...e, [campo]: undefined }));
    setErroGeral('');
  };

  const entrar = async () => {
    setEnviando(true);
    try {
      await acoes.entrar(form);
      // Não precisa navegar: o Context percebe o login e o app troca de tela sozinho.
    } catch (e) {
      if (e instanceof ErroValidacao) setErros(e.erros);
      else setErroGeral(e.message);
      setEnviando(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
        <View style={styles.logo}>
          <Ionicons name="people-circle" size={72} color={cores.primaria} />
          <Text style={styles.titulo}>Setorize</Text>
          <Text style={styles.subtitulo}>Tarefas, avisos e salas da sua equipe</Text>
        </View>

        <Campo
          rotulo="E-mail"
          value={form.email}
          onChangeText={(v) => alterar('email', v)}
          placeholder="voce@empresa.com.br"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          erro={erros.email}
        />
        <Campo
          rotulo="Senha"
          value={form.senha}
          onChangeText={(v) => alterar('senha', v)}
          placeholder="Sua senha"
          secureTextEntry
          autoComplete="password"
          erro={erros.senha}
          onSubmitEditing={entrar}
        />

        {erroGeral ? <Text style={styles.erro}>{erroGeral}</Text> : null}

        <Botao titulo="Entrar" aoPressionar={entrar} carregando={enviando} />

        <TouchableOpacity style={styles.link} onPress={() => navigation.navigate('Cadastro')}>
          <Text style={styles.linkTexto}>
            Não tem conta? <Text style={styles.linkDestaque}>Cadastre-se</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: cores.fundo },
  conteudo: { padding: espaco.g, paddingTop: 60, paddingBottom: 40 },
  logo: { alignItems: 'center', marginBottom: 16 },
  titulo: { fontSize: 30, fontWeight: '800', color: cores.texto, marginTop: 4 },
  subtitulo: { fontSize: 14, color: cores.textoSecundario, marginTop: 4 },
  erro: { color: cores.perigo, fontSize: 14, marginTop: 14, textAlign: 'center' },
  link: { alignItems: 'center', marginTop: 20, padding: 8 },
  linkTexto: { fontSize: 15, color: cores.textoSecundario },
  linkDestaque: { color: cores.primaria, fontWeight: '700' },
});
