/** Botão padrão do app. variante: 'primario' (cheio) ou 'perigo' (texto vermelho). */
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { cores, raio } from '../theme/tema';

export default function Botao({ titulo, aoPressionar, carregando = false, variante = 'primario', style }) {
  const perigo = variante === 'perigo';
  return (
    <TouchableOpacity
      style={[styles.base, perigo ? styles.perigo : styles.primario, carregando && styles.desabilitado, style]}
      onPress={aoPressionar}
      disabled={carregando}
      accessibilityRole="button"
    >
      {carregando ? (
        <ActivityIndicator color={perigo ? cores.perigo : '#FFFFFF'} />
      ) : (
        <Text style={[styles.texto, perigo && styles.textoPerigo]}>{titulo}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: raio, paddingVertical: 15, alignItems: 'center', marginTop: 24 },
  primario: { backgroundColor: cores.primaria },
  perigo: { backgroundColor: 'transparent', marginTop: 8 },
  desabilitado: { opacity: 0.6 },
  texto: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  textoPerigo: { color: cores.perigo },
});
