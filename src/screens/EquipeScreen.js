/**
 * Gerenciar equipe (só o administrador): lista todas as pessoas com papel, setor e cargo.
 * Tocar numa pessoa abre a edição. Administradores não são editáveis pelo app.
 */
import React, { useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import Avatar from '../components/Avatar';
import EstadoVazio from '../components/EstadoVazio';
import { rotuloPapel } from '../models/Usuario';
import { cores, espaco, raio } from '../theme/tema';

const semAcento = (t) => (t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export default function EquipeScreen({ navigation }) {
  const { estado } = useApp();
  const [busca, setBusca] = useState('');
  const termo = semAcento(busca.trim());
  const lista = estado.colaboradores.filter(
    (c) => !termo || [c.nome, c.cargo, c.setorNome, rotuloPapel(c.papel)].some((campo) => semAcento(campo).includes(termo))
  );

  return (
    <View style={styles.container}>
      <View style={styles.topo}>
        <View style={styles.busca}>
          <Ionicons name="search" size={18} color={cores.textoSecundario} />
          <TextInput
            style={styles.buscaInput}
            value={busca}
            onChangeText={setBusca}
            placeholder="Buscar por nome, setor, cargo ou papel"
            placeholderTextColor={cores.textoSecundario}
          />
        </View>
        <Text style={styles.ajuda}>Toque numa pessoa para mudar o papel, o setor ou o cargo.</Text>
      </View>
      <FlatList
        data={lista}
        keyExtractor={(c) => c.id}
        contentContainerStyle={styles.lista}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={<EstadoVazio icone="people-outline" titulo="Ninguém encontrado" />}
        renderItem={({ item }) => {
          const admin = item.papel === 'admin';
          return (
            <TouchableOpacity
              style={styles.item}
              disabled={admin}
              onPress={() => navigation.navigate('ColaboradorEditar', { id: item.id })}
              accessibilityLabel={`Editar ${item.nome}`}
            >
              <Avatar nome={item.nome} cor={item.cor} tamanho={44} />
              <View style={styles.info}>
                <Text style={styles.nome}>{item.nome}</Text>
                <Text style={[styles.papel, item.papel !== 'colaborador' && styles.papelDestaque]}>
                  {rotuloPapel(item.papel)} · {item.setorNome}
                </Text>
                {item.cargo ? <Text style={styles.cargo}>{item.cargo}</Text> : null}
              </View>
              <Ionicons name={admin ? 'lock-closed-outline' : 'chevron-forward'} size={20} color={cores.textoSecundario} />
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: cores.fundo },
  topo: { padding: espaco.m, gap: 8, backgroundColor: cores.cartao, borderBottomWidth: 1, borderBottomColor: cores.borda },
  busca: { flexDirection: 'row', alignItems: 'center', backgroundColor: cores.fundo, borderRadius: raio, paddingHorizontal: 12, gap: 8 },
  buscaInput: { flex: 1, paddingVertical: 10, fontSize: 15, color: cores.texto },
  ajuda: { fontSize: 12, color: cores.textoSecundario },
  lista: { padding: espaco.m, paddingBottom: 40, flexGrow: 1 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: cores.cartao, borderRadius: raio, padding: 14, marginBottom: 10 },
  info: { flex: 1 },
  nome: { fontSize: 16, fontWeight: '600', color: cores.texto },
  papel: { fontSize: 13, color: cores.textoSecundario, marginTop: 2 },
  papelDestaque: { color: cores.primaria, fontWeight: '700' },
  cargo: { fontSize: 12, color: cores.textoSecundario, marginTop: 2 },
});
