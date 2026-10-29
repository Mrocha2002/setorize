/**
 * Campo de data ou hora que abre o calendário (ou o relógio) do celular,
 * em vez de a pessoa digitar. Assim não aparece teclado e não dá para digitar
 * uma data que não existe.
 *
 * O valor continua sendo texto ("dd/mm/aaaa" ou "hh:mm"), igual ao resto do app,
 * então os models e as validações não mudaram.
 *
 * Props: rotulo, modo ('date' ou 'time'), valor, aoMudar(texto), placeholder,
 *        erro, permitirLimpar (para campos opcionais), minimo (data mínima)
 */
import React, { useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { brParaDate, dateParaBR, dateParaHora, horaParaDate } from '../utils/datas';
import { cores, raio } from '../theme/tema';

export default function CampoDataHora({ rotulo, modo = 'date', valor, aoMudar, placeholder, erro, permitirLimpar = false, minimo, style }) {
  const [abertoIOS, setAbertoIOS] = useState(false);
  const ehData = modo === 'date';
  const atual = ehData ? brParaDate(valor) : horaParaDate(valor);

  const escolher = (data) => aoMudar(ehData ? dateParaBR(data) : dateParaHora(data));

  const abrir = () => {
    if (Platform.OS === 'android') {
      // No Android o calendário abre como uma janela do próprio sistema.
      DateTimePickerAndroid.open({
        value: atual,
        mode: modo,
        is24Hour: true,
        minimumDate: minimo,
        onChange: (evento, data) => {
          if (evento.type === 'set' && data) escolher(data);
        },
      });
    } else {
      setAbertoIOS((a) => !a);
    }
  };

  return (
    <View style={[styles.container, style]}>
      {rotulo ? <Text style={styles.rotulo}>{rotulo}</Text> : null}
      <TouchableOpacity
        style={[styles.caixa, erro && styles.caixaErro]}
        onPress={abrir}
        accessibilityRole="button"
        accessibilityLabel={`Escolher ${(rotulo || '').replace(' *', '').toLowerCase()}`}
      >
        <Text style={[styles.texto, !valor && styles.placeholder]}>{valor || placeholder}</Text>
        <Ionicons name={ehData ? 'calendar-outline' : 'time-outline'} size={20} color={cores.textoSecundario} />
      </TouchableOpacity>

      {permitirLimpar && valor ? (
        <TouchableOpacity onPress={() => aoMudar('')} hitSlop={8}>
          <Text style={styles.limpar}>Limpar</Text>
        </TouchableOpacity>
      ) : null}

      {abertoIOS ? (
        <DateTimePicker
          value={atual}
          mode={modo}
          display="spinner"
          minimumDate={minimo}
          onChange={(_evento, data) => data && escolher(data)}
        />
      ) : null}

      {erro ? <Text style={styles.erro}>{erro}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 16 },
  rotulo: { fontSize: 14, fontWeight: '600', color: cores.texto, marginBottom: 8 },
  caixa: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: cores.cartao,
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: raio,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  caixaErro: { borderColor: cores.perigo },
  texto: { fontSize: 16, color: cores.texto },
  placeholder: { color: cores.textoSecundario },
  limpar: { color: cores.primaria, fontSize: 13, fontWeight: '600', marginTop: 6 },
  erro: { color: cores.perigo, fontSize: 13, marginTop: 6 },
});
