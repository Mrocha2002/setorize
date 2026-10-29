/** Perfil: dados de quem está logado, editar cargo e telefone, e sair. */
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useApp } from '../context/AppContext';
import Avatar from '../components/Avatar';
import Campo from '../components/Campo';
import Botao from '../components/Botao';
import { ehAdmin, rotuloPapel } from '../models/Usuario';
import { cores, espaco, raio } from '../theme/tema';

export default function PerfilScreen({ navigation }) {
  const { estado, acoes } = useApp();
  const p = estado.perfil;
  const [cargo, setCargo] = useState(p?.cargo ?? '');
  const [telefone, setTelefone] = useState(p?.telefone ?? '');
  const [salvando, setSalvando] = useState(false);

  if (!p) return null;

  const salvar = async () => {
    setSalvando(true);
    try {
      await acoes.atualizarMeuContato({ cargo: cargo.trim(), telefone: telefone.trim() });
      navigation.goBack();
    } catch (e) {
      Alert.alert('Não foi possível salvar', e.message);
    } finally {
      setSalvando(false);
    }
  };

  const sair = () =>
    Alert.alert('Sair', 'Deseja sair da sua conta neste aparelho?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: () => acoes.sair().catch((e) => Alert.alert('Erro', e.message)) },
    ]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.conteudo} keyboardShouldPersistTaps="handled">
      <View style={styles.cartao}>
        <Avatar nome={p.nome} cor={p.cor} tamanho={64} />
        <Text style={styles.nome}>{p.nome}</Text>
        <Text style={styles.email}>{p.email}</Text>
        <Text style={styles.papel}>
          {rotuloPapel(p.papel)} · {p.setorNome}
        </Text>
      </View>

      <Campo rotulo="Cargo" value={cargo} onChangeText={setCargo} placeholder="Ex.: Comprador" />
      <Campo rotulo="Telefone (WhatsApp)" value={telefone} onChangeText={setTelefone} placeholder="(19) 99999-9999" keyboardType="phone-pad" />
      <Text style={styles.ajuda}>Setor e papel são alterados pelo administrador.</Text>
      <Botao titulo="Salvar" aoPressionar={salvar} carregando={salvando} />
      {ehAdmin(p) ? <Botao titulo="Gerenciar equipe" aoPressionar={() => navigation.navigate('Equipe')} /> : null}
      <Botao titulo="Sair da conta" variante="perigo" aoPressionar={sair} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: cores.fundo },
  conteudo: { padding: espaco.m, paddingBottom: 40 },
  cartao: { alignItems: 'center', backgroundColor: cores.cartao, borderRadius: raio, padding: 20, gap: 4 },
  nome: { fontSize: 20, fontWeight: '800', color: cores.texto, marginTop: 8 },
  email: { fontSize: 14, color: cores.textoSecundario },
  papel: { fontSize: 14, color: cores.primaria, fontWeight: '700', marginTop: 4 },
  ajuda: { fontSize: 12, color: cores.textoSecundario, marginTop: 8 },
});
