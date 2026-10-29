/**
 * Grupo de "chips" onde só um fica selecionado (como um botão de rádio).
 * Reutilizado nos filtros da lista, na prioridade do formulário e nos ajustes.
 *
 * Props:
 *   opcoes: [{ valor, rotulo, cor? }]
 *   selecionado: valor atual
 *   aoSelecionar: função chamada com o novo valor
 */
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { cores } from '../theme/tema';

export default function GrupoOpcoes({ opcoes, selecionado, aoSelecionar, rolavel = false }) {
  const chips = opcoes.map((op) => {
    const ativo = op.valor === selecionado;
    const corAtiva = op.cor || cores.primaria;
    return (
      <TouchableOpacity
        key={String(op.valor)}
        onPress={() => aoSelecionar(op.valor)}
        style={[styles.chip, ativo && { backgroundColor: corAtiva, borderColor: corAtiva }]}
        accessibilityRole="button"
        accessibilityState={{ selected: ativo }}
      >
        <Text style={[styles.texto, ativo && styles.textoAtivo]}>{op.rotulo}</Text>
      </TouchableOpacity>
    );
  });

  if (rolavel) {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.linha}>
        {chips}
      </ScrollView>
    );
  }
  return <View style={styles.linha}>{chips}</View>;
}

const styles = StyleSheet.create({
  linha: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: cores.borda,
    backgroundColor: cores.cartao,
  },
  texto: {
    color: cores.texto,
    fontSize: 14,
  },
  textoAtivo: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
