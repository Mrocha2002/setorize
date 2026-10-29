/**
 * Agenda das salas. Faixa com 7 dias (setas mudam de semana) e, embaixo,
 * cada sala com as reservas do dia. Quem reservou (ou o gestor do setor dessa pessoa) pode cancelar.
 */
import React, { useCallback, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import Avatar from '../components/Avatar';
import { podeCancelarReserva } from '../models/Reserva';
import { hojeISO, inicioSemana, nomeDiaSemana, paraBR, somarDias } from '../utils/datas';
import { cores, espaco, raio } from '../theme/tema';

export default function AgendaScreen({ navigation }) {
  const { estado, acoes } = useApp();
  const hoje = hojeISO();
  const [dia, setDia] = useState(hoje);
  const [agenda, setAgenda] = useState([]);
  const [atualizando, setAtualizando] = useState(false);

  const semana = Array.from({ length: 7 }, (_, i) => somarDias(inicioSemana(dia), i));

  const carregar = useCallback(
    () => acoes.agendaDoDia(dia).then(setAgenda).catch((e) => Alert.alert('Erro', e.message)),
    [acoes, dia]
  );

  // Recarrega ao voltar para a aba (ex.: depois de reservar) e ao trocar o dia.
  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar])
  );

  const puxar = async () => {
    setAtualizando(true);
    await carregar();
    setAtualizando(false);
  };

  const cancelar = (r) =>
    Alert.alert('Cancelar reserva', `Cancelar "${r.titulo}" das ${r.inicio} às ${r.fim}?`, [
      { text: 'Voltar', style: 'cancel' },
      {
        text: 'Cancelar reserva',
        style: 'destructive',
        onPress: () => acoes.cancelarReserva(r.id).then(carregar).catch((e) => Alert.alert('Não foi possível', e.message)),
      },
    ]);

  return (
    <View style={styles.container}>
      <View style={styles.faixa}>
        <TouchableOpacity onPress={() => setDia(somarDias(dia, -7))} hitSlop={10} accessibilityLabel="Semana anterior">
          <Ionicons name="chevron-back" size={22} color={cores.texto} />
        </TouchableOpacity>
        {semana.map((d) => {
          const ativo = d === dia;
          return (
            <TouchableOpacity key={d} style={[styles.dia, ativo && styles.diaAtivo]} onPress={() => setDia(d)} accessibilityLabel={`Ver ${paraBR(d)}`}>
              <Text style={[styles.diaSemana, ativo && styles.textoAtivo]}>{nomeDiaSemana(d)}</Text>
              <Text style={[styles.diaNumero, ativo && styles.textoAtivo, d === hoje && !ativo && styles.hoje]}>{d.slice(8, 10)}</Text>
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity onPress={() => setDia(somarDias(dia, 7))} hitSlop={10} accessibilityLabel="Próxima semana">
          <Ionicons name="chevron-forward" size={22} color={cores.texto} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.conteudo} refreshControl={<RefreshControl refreshing={atualizando} onRefresh={puxar} />}>
        <Text style={styles.dataTitulo}>
          {dia === hoje ? 'Hoje' : nomeDiaSemana(dia)}, {paraBR(dia)}
        </Text>

        {agenda.map(({ sala, reservas }) => (
          <View key={sala.id} style={styles.sala}>
            <View style={styles.salaTopo}>
              <Ionicons name="business-outline" size={18} color={cores.primaria} />
              <Text style={styles.salaNome}>{sala.nome}</Text>
              <Text style={styles.salaCapacidade}>{sala.capacidade} pessoas</Text>
            </View>
            {reservas.length === 0 ? (
              <Text style={styles.livre}>Livre o dia todo</Text>
            ) : (
              reservas.map((r) => (
                <View key={r.id} style={styles.reserva}>
                  <Text style={styles.horario}>
                    {r.inicio}–{r.fim}
                  </Text>
                  <View style={styles.reservaInfo}>
                    <Text style={styles.reservaTitulo}>{r.titulo}</Text>
                    <View style={styles.responsavel}>
                      <Avatar nome={r.responsavelNome} cor={r.responsavelCor} tamanho={20} />
                      <Text style={styles.responsavelNome}>{r.responsavelNome}</Text>
                    </View>
                  </View>
                  {podeCancelarReserva(r, estado.perfil) ? (
                    <TouchableOpacity onPress={() => cancelar(r)} hitSlop={8} accessibilityLabel={`Cancelar ${r.titulo}`}>
                      <Ionicons name="close-circle-outline" size={24} color={cores.perigo} />
                    </TouchableOpacity>
                  ) : null}
                </View>
              ))
            )}
          </View>
        ))}
      </ScrollView>

      <TouchableOpacity style={styles.botaoNovo} onPress={() => navigation.navigate('ReservaForm', { data: dia < hoje ? hoje : dia })} accessibilityLabel="Reservar sala">
        <Ionicons name="add" size={32} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: cores.fundo },
  faixa: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: cores.cartao, paddingHorizontal: 8, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: cores.borda },
  dia: { alignItems: 'center', paddingVertical: 6, width: 40, borderRadius: 10 },
  diaAtivo: { backgroundColor: cores.primaria },
  diaSemana: { fontSize: 11, color: cores.textoSecundario },
  diaNumero: { fontSize: 16, fontWeight: '700', color: cores.texto },
  textoAtivo: { color: '#FFFFFF' },
  hoje: { color: cores.primaria },
  conteudo: { padding: espaco.m, paddingBottom: 100 },
  dataTitulo: { fontSize: 18, fontWeight: '700', color: cores.texto, marginBottom: 12 },
  sala: { backgroundColor: cores.cartao, borderRadius: raio, padding: 14, marginBottom: 12 },
  salaTopo: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  salaNome: { flex: 1, fontSize: 16, fontWeight: '700', color: cores.texto },
  salaCapacidade: { fontSize: 12, color: cores.textoSecundario },
  livre: { color: cores.sucesso, fontSize: 14, paddingVertical: 4 },
  reserva: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, borderTopWidth: 1, borderTopColor: cores.borda },
  horario: { fontSize: 14, fontWeight: '700', color: cores.primaria, width: 92 },
  reservaInfo: { flex: 1 },
  reservaTitulo: { fontSize: 14, fontWeight: '600', color: cores.texto },
  responsavel: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  responsavelNome: { fontSize: 12, color: cores.textoSecundario },
  botaoNovo: {
    position: 'absolute', right: 20, bottom: 20, width: 60, height: 60, borderRadius: 30,
    backgroundColor: cores.primaria, alignItems: 'center', justifyContent: 'center',
    elevation: 4, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 3 },
  },
});
