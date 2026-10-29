/** Selo vermelho com número (ex.: avisos não lidos). Não aparece se for zero. */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { cores } from '../theme/tema';

export default function Selo({ numero, rotulo }) {
  if (!numero) return null;
  return (
    <View style={styles.selo} accessibilityLabel={rotulo ?? `${numero} novos`}>
      <Text style={styles.texto}>{numero > 99 ? '99+' : numero}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  selo: { backgroundColor: cores.perigo, borderRadius: 10, minWidth: 20, paddingHorizontal: 6, paddingVertical: 1, alignItems: 'center' },
  texto: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
});
