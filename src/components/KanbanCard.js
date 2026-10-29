/**
 * Um card do Kanban. Setas ◀ ▶ movem o card entre as colunas;
 * tocar no card abre o detalhe (histórico, comentários).
 */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Avatar from './Avatar';
import { ROTULO_PRIORIDADE, ROTULO_STATUS, estaAtrasado, proximoStatus, statusAnterior } from '../models/Card';
import { descreverPrazo } from '../utils/datas';
import { cores, coresPrioridade, raio } from '../theme/tema';

function KanbanCard({ card, aoAbrir, aoMover }) {
  const atrasado = estaAtrasado(card);
  const anterior = statusAnterior(card.status);
  const proximo = proximoStatus(card.status);

  return (
    <TouchableOpacity
      style={[styles.card, { borderLeftColor: coresPrioridade[card.prioridade] }]}
      onPress={() => aoAbrir(card)}
      activeOpacity={0.7}
    >
      <Text style={[styles.titulo, card.status === 'concluido' && styles.concluido]} numberOfLines={3}>
        {card.titulo}
      </Text>

      <View style={styles.linha}>
        <Text style={[styles.prioridade, { color: coresPrioridade[card.prioridade] }]}>
          {ROTULO_PRIORIDADE[card.prioridade]}
        </Text>
        {card.prazo ? (
          <Text style={[styles.meta, atrasado && styles.atrasado]}>{descreverPrazo(card.prazo)}</Text>
        ) : null}
      </View>

      <View style={styles.rodape}>
        {card.responsavelNome ? (
          <View style={styles.responsavel}>
            <Avatar nome={card.responsavelNome} cor={card.responsavelCor} tamanho={24} />
            <Text style={styles.meta} numberOfLines={1}>
              {card.responsavelNome.split(' ')[0]}
              {card.setorNome ? ` · ${card.setorNome}` : ''}
            </Text>
          </View>
        ) : (
          <View style={styles.responsavel}>
            <Ionicons name="people-outline" size={18} color={cores.primaria} />
            <Text style={[styles.meta, styles.setor]} numberOfLines={1}>
              {card.setorNome} · sem responsável
            </Text>
          </View>
        )}

        <View style={styles.setas}>
          {anterior ? (
            <TouchableOpacity
              onPress={() => aoMover(card, anterior)}
              hitSlop={8}
              accessibilityLabel={`Mover ${card.titulo} para ${ROTULO_STATUS[anterior]}`}
            >
              <Ionicons name="chevron-back-circle" size={30} color={cores.textoSecundario} />
            </TouchableOpacity>
          ) : null}
          {proximo ? (
            <TouchableOpacity
              onPress={() => aoMover(card, proximo)}
              hitSlop={8}
              accessibilityLabel={`Mover ${card.titulo} para ${ROTULO_STATUS[proximo]}`}
            >
              <Ionicons name="chevron-forward-circle" size={30} color={cores.primaria} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default React.memo(KanbanCard);

const styles = StyleSheet.create({
  card: {
    backgroundColor: cores.cartao,
    borderRadius: raio,
    borderLeftWidth: 5,
    padding: 12,
    marginBottom: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  titulo: { fontSize: 15, fontWeight: '600', color: cores.texto },
  concluido: { textDecorationLine: 'line-through', color: cores.textoSecundario },
  linha: { flexDirection: 'row', gap: 12, marginTop: 6 },
  prioridade: { fontSize: 12, fontWeight: '700' },
  meta: { fontSize: 12, color: cores.textoSecundario },
  atrasado: { color: cores.perigo, fontWeight: '700' },
  setor: { color: cores.primaria, fontWeight: '600' },
  rodape: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  responsavel: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  setas: { flexDirection: 'row', gap: 6 },
});
