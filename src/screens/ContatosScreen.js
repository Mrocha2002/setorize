/**
 * Contatos: diretório dos colaboradores cadastrados, com busca e filtro por setor.
 * Linking.openURL pede ao Android para abrir outro app: tel: (discador), wa.me (WhatsApp), mailto: (e-mail).
 */
import React, { useState } from 'react';
import { Alert, FlatList, Linking, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import Avatar from '../components/Avatar';
import GrupoOpcoes from '../components/GrupoOpcoes';
import EstadoVazio from '../components/EstadoVazio';
import { linkEmail, linkLigacao, linkWhatsApp } from '../models/Colaborador';
import { rotuloPapel } from '../models/Usuario';
import { cores, espaco, raio } from '../theme/tema';

async function abrir(url) {
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert('Não foi possível abrir', 'Nenhum aplicativo deste aparelho consegue abrir esse contato.');
  }
}

/** Busca sem diferenciar maiúsculas nem acentos ("operacoes" acha "Operações"). */
const semAcento = (t) => (t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export default function ContatosScreen() {
  const { estado } = useApp();
  const [busca, setBusca] = useState('');
  const [setorId, setSetorId] = useState(null);

  const termo = semAcento(busca.trim());
  const lista = estado.colaboradores.filter(
    (c) =>
      (!setorId || c.setorId === setorId) &&
      (!termo || [c.nome, c.cargo, c.setorNome].some((campo) => semAcento(campo).includes(termo)))
  );

  return (
    <View style={styles.container}>
      <View style={styles.topo}>
        <View style={styles.busca}>
          <Ionicons name="search" size={18} color={cores.textoSecundario} />
          <TextInput style={styles.buscaInput} placeholder="Buscar por nome, cargo ou setor" placeholderTextColor={cores.textoSecundario} value={busca} onChangeText={setBusca} />
        </View>
        <GrupoOpcoes
          opcoes={[{ valor: null, rotulo: 'Todos' }, ...estado.setores.map((s) => ({ valor: s.id, rotulo: s.nome }))]}
          selecionado={setorId}
          aoSelecionar={setSetorId}
          rolavel
        />
      </View>

      <FlatList
        data={lista}
        keyExtractor={(c) => c.id}
        contentContainerStyle={styles.lista}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={<EstadoVazio icone="people-outline" titulo="Ninguém encontrado" />}
        renderItem={({ item }) => {
          const souEu = item.id === estado.perfil.id;
          const primeiro = item.nome.split(' ')[0];
          return (
            <View style={styles.item}>
              <Avatar nome={item.nome} cor={item.cor} tamanho={44} />
              <View style={styles.info}>
                <Text style={styles.nome}>
                  {item.nome}
                  {souEu ? <Text style={styles.voce}> (você)</Text> : null}
                </Text>
                <Text style={styles.cargo}>
                  {[item.cargo, item.setorNome].filter(Boolean).join(' · ')}
                  {item.papel !== 'colaborador' ? ` · ${rotuloPapel(item.papel)}` : ''}
                </Text>
                {item.telefone ? <Text style={styles.detalhe}>{item.telefone}</Text> : null}
              </View>
              {souEu ? null : (
                <View style={styles.botoes}>
                  {item.telefone ? (
                    <>
                      <BotaoContato icone="call" cor="#0984E3" rotulo={`Ligar para ${primeiro}`} url={linkLigacao(item.telefone)} />
                      <BotaoContato icone="logo-whatsapp" cor="#25D366" rotulo={`WhatsApp de ${primeiro}`} url={linkWhatsApp(item.telefone)} />
                    </>
                  ) : null}
                  <BotaoContato icone="mail" cor="#E17055" rotulo={`E-mail para ${primeiro}`} url={linkEmail(item.email)} />
                </View>
              )}
            </View>
          );
        }}
      />
    </View>
  );
}

function BotaoContato({ icone, cor, rotulo, url }) {
  return (
    <TouchableOpacity style={[styles.botao, { backgroundColor: cor + '1A' }]} onPress={() => abrir(url)} accessibilityLabel={rotulo}>
      <Ionicons name={icone} size={20} color={cor} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: cores.fundo },
  topo: { padding: espaco.m, gap: 12, backgroundColor: cores.cartao, borderBottomWidth: 1, borderBottomColor: cores.borda },
  busca: { flexDirection: 'row', alignItems: 'center', backgroundColor: cores.fundo, borderRadius: raio, paddingHorizontal: 12, gap: 8 },
  buscaInput: { flex: 1, paddingVertical: 10, fontSize: 15, color: cores.texto },
  lista: { padding: espaco.m, paddingBottom: 40, flexGrow: 1 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: cores.cartao, borderRadius: raio, padding: 14, marginBottom: 10 },
  info: { flex: 1 },
  nome: { fontSize: 16, fontWeight: '600', color: cores.texto },
  voce: { color: cores.textoSecundario, fontWeight: '400' },
  cargo: { fontSize: 13, color: cores.textoSecundario, marginTop: 2 },
  detalhe: { fontSize: 12, color: cores.textoSecundario, marginTop: 2 },
  botoes: { flexDirection: 'row', gap: 6 },
  botao: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
});
