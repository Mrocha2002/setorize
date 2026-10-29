/** Aparece quando o arquivo .env com os dados do Supabase não foi criado. */
import React from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { cores } from '../theme/tema';

export default function ConfiguracaoScreen() {
  return (
    <ScrollView contentContainerStyle={styles.conteudo}>
      <Text style={styles.titulo}>Falta configurar o Supabase</Text>
      <Text style={styles.texto}>
        Crie o arquivo <Text style={styles.codigo}>.env</Text> na pasta do projeto (copie o
        <Text style={styles.codigo}> .env.example</Text>) com a URL e a chave pública do seu projeto Supabase e
        reinicie com <Text style={styles.codigo}>npx expo start -c</Text>.
      </Text>
      <Text style={styles.texto}>O passo a passo está em SUPABASE.md.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  conteudo: { flexGrow: 1, justifyContent: 'center', padding: 28, backgroundColor: cores.fundo },
  titulo: { fontSize: 20, fontWeight: '800', color: cores.perigo, marginBottom: 12 },
  texto: { fontSize: 15, color: cores.texto, lineHeight: 22, marginBottom: 10 },
  codigo: { fontFamily: 'monospace', fontWeight: '700' },
});
