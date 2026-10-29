/**
 * Editar papel, setor e cargo de uma pessoa (só o administrador).
 * Quem confere a permissão de verdade é o banco: função admin_atualizar_perfil.
 * A pessoa alterada vê a mudança ao abrir o app de novo (ou sair e entrar).
 */
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useApp } from '../context/AppContext';
import { ErroValidacao } from '../controllers/erros';
import Avatar from '../components/Avatar';
import Botao from '../components/Botao';
import Campo from '../components/Campo';
import GrupoOpcoes from '../components/GrupoOpcoes';
import { CARGO_MAX, ROTULO_PAPEL } from '../models/Usuario';
import { cores, espaco, raio } from '../theme/tema';

const OPCOES_PAPEL = [
  { valor: 'colaborador', rotulo: ROTULO_PAPEL.colaborador },
  { valor: 'gestor', rotulo: ROTULO_PAPEL.gestor },
];

export default function ColaboradorEditarScreen({ navigation, route }) {
  const { estado, acoes } = useApp();
  const alvo = estado.colaboradores.find((c) => c.id === route.params.id);
  const [form, setForm] = useState({ papel: alvo?.papel, setorId: alvo?.setorId, cargo: alvo?.cargo ?? '' });
  const [erros, setErros] = useState({});
  const [salvando, setSalvando] = useState(false);

  if (!alvo) return null;

  const alterar = (campo, valor) => {
    setForm((f) => ({ ...f, [campo]: valor }));
    setErros((e) => ({ ...e, [campo]: undefined, geral: undefined }));
  };

  const salvar = async () => {
    setSalvando(true);
    try {
      await acoes.alterarColaborador(alvo, form);
      navigation.goBack();
    } catch (e) {
      if (e instanceof ErroValidacao) setErros(e.erros);
      else Alert.alert('Não foi possível salvar', e.message);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
      <View style={styles.cartao}>
        <Avatar nome={alvo.nome} cor={alvo.cor} tamanho={56} />
        <Text style={styles.nome}>{alvo.nome}</Text>
        <Text style={styles.email}>{alvo.email}</Text>
      </View>

      <Text style={styles.rotulo}>Papel</Text>
      <GrupoOpcoes opcoes={OPCOES_PAPEL} selecionado={form.papel} aoSelecionar={(v) => alterar('papel', v)} />
      <Text style={styles.ajuda}>
        {form.papel === 'gestor'
          ? 'Gestor do setor: vê o que é do setor dele e o que pediu; cria tarefas e avisos para qualquer setor.'
          : 'Colaborador: vê o que é dele e do setor dele; assume e move tarefas.'}
      </Text>
      {erros.papel ? <Text style={styles.erro}>{erros.papel}</Text> : null}

      <Text style={styles.rotulo}>Setor</Text>
      <GrupoOpcoes
        opcoes={estado.setores.map((s) => ({ valor: s.id, rotulo: s.nome }))}
        selecionado={form.setorId}
        aoSelecionar={(v) => alterar('setorId', v)}
      />
      {erros.setorId ? <Text style={styles.erro}>{erros.setorId}</Text> : null}

      <View style={{ height: 12 }} />
      <Campo
        rotulo="Cargo"
        value={form.cargo}
        onChangeText={(v) => alterar('cargo', v)}
        placeholder="Ex.: Coordenador de Suprimentos"
        maxLength={CARGO_MAX}
        erro={erros.cargo}
      />
      {erros.geral ? <Text style={styles.erro}>{erros.geral}</Text> : null}

      <Botao titulo="Salvar alterações" aoPressionar={salvar} carregando={salvando} />
      <Text style={styles.ajuda}>A pessoa vê a mudança quando abrir o app de novo.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: cores.fundo },
  conteudo: { padding: espaco.m, paddingBottom: 40 },
  cartao: { alignItems: 'center', backgroundColor: cores.cartao, borderRadius: raio, padding: 16, gap: 4, marginBottom: 12 },
  nome: { fontSize: 18, fontWeight: '800', color: cores.texto, marginTop: 6 },
  email: { fontSize: 13, color: cores.textoSecundario },
  rotulo: { fontSize: 14, fontWeight: '700', color: cores.texto, marginTop: 12, marginBottom: 8 },
  ajuda: { fontSize: 12, color: cores.textoSecundario, marginTop: 6 },
  erro: { fontSize: 12, color: cores.perigo, marginTop: 6 },
});
