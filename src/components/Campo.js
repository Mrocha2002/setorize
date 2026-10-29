/**
 * Campo de formulário: rótulo + TextInput + mensagem de erro.
 * Evita repetir o mesmo trecho em todos os formulários.
 * Repassa qualquer outra prop para o TextInput (...props).
 */
import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { cores, raio } from '../theme/tema';

export default function Campo({ rotulo, erro, style, multiline, ...props }) {
  return (
    <View style={[styles.container, style]}>
      {rotulo ? <Text style={styles.rotulo}>{rotulo}</Text> : null}
      <TextInput
        style={[styles.input, multiline && styles.multilinha, erro && styles.inputErro]}
        placeholderTextColor={cores.textoSecundario}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        {...props}
      />
      {erro ? <Text style={styles.erro}>{erro}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 16 },
  rotulo: { fontSize: 14, fontWeight: '600', color: cores.texto, marginBottom: 8 },
  input: {
    backgroundColor: cores.cartao,
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: raio,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: cores.texto,
  },
  multilinha: { minHeight: 100 },
  inputErro: { borderColor: cores.perigo },
  erro: { color: cores.perigo, fontSize: 13, marginTop: 6 },
});
