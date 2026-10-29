/** Barra de progresso horizontal (0 a 100%). */
import React from 'react';
import { StyleSheet, View } from 'react-native';

export default function Barra({ percentual, cor, altura = 8 }) {
  const largura = Math.max(0, Math.min(100, percentual));
  return (
    <View style={[styles.fundo, { height: altura, borderRadius: altura / 2 }]}>
      <View style={{ width: `${largura}%`, height: '100%', borderRadius: altura / 2, backgroundColor: cor }} />
    </View>
  );
}

const styles = StyleSheet.create({
  fundo: { backgroundColor: '#E5E7EB', overflow: 'hidden', width: '100%' },
});
