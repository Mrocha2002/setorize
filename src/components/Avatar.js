/** Círculo colorido com as iniciais do colaborador. */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { iniciais } from '../models/Colaborador';

export default function Avatar({ nome, cor = '#9CA3AF', tamanho = 40 }) {
  return (
    <View
      style={[styles.circulo, { width: tamanho, height: tamanho, borderRadius: tamanho / 2, backgroundColor: cor }]}
      accessibilityLabel={nome}
    >
      <Text style={[styles.texto, { fontSize: tamanho * 0.38 }]}>{iniciais(nome)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circulo: { alignItems: 'center', justifyContent: 'center' },
  texto: { color: '#FFFFFF', fontWeight: '700' },
});
