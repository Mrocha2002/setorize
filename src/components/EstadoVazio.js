/** Mensagem mostrada quando a lista não tem itens. */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { cores } from '../theme/tema';

export default function EstadoVazio({ icone = 'clipboard-outline', titulo, mensagem }) {
  return (
    <View style={styles.container}>
      <Ionicons name={icone} size={56} color={cores.borda} />
      <Text style={styles.titulo}>{titulo}</Text>
      {mensagem ? <Text style={styles.mensagem}>{mensagem}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  titulo: { fontSize: 17, fontWeight: '600', color: cores.texto, marginTop: 12 },
  mensagem: { fontSize: 14, color: cores.textoSecundario, textAlign: 'center', marginTop: 6 },
});
