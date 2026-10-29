/** TESTES DE UNIDADE: utilitários de data e hora. */
import {
  agoraLocal, dataCurta, dataLocalDeTimestamp, descreverPrazo, diasAte, hojeISO, horaLocalDeTimestamp, horaValida,
  inicioSemana, mascararData, mascararHora, nomeDiaSemana, paraBR, paraISO, paraMinutos, quandoFoi, somarDias,
} from '../src/utils/datas';

describe('conversões de data', () => {
  test('paraISO valida datas reais', () => {
    expect(paraISO('30/11/2026')).toBe('2026-11-30');
    expect(paraISO('31/02/2026')).toBeNull();
    expect(paraISO('29/02/2027')).toBeNull();
    expect(paraISO('29/02/2028')).toBe('2028-02-29');
    expect(paraISO('2026-11-30')).toBeNull();
    expect(paraISO('')).toBeNull();
  });
  test('paraBR', () => {
    expect(paraBR('2026-01-05')).toBe('05/01/2026');
    expect(paraBR(null)).toBe('');
  });
  test('máscaras', () => {
    expect(mascararData('30112026')).toBe('30/11/2026');
    expect(mascararData('30a11b2026999')).toBe('30/11/2026');
    expect(mascararHora('0930')).toBe('09:30');
    expect(mascararHora('9')).toBe('9');
  });
});

describe('dias e semanas', () => {
  test('hojeISO, diasAte e descreverPrazo', () => {
    expect(hojeISO(new Date(2026, 9, 5))).toBe('2026-10-05');
    expect(diasAte('2026-10-31', '2026-10-26')).toBe(5);
    expect(descreverPrazo('2026-10-26', '2026-10-26')).toBe('Hoje');
    expect(descreverPrazo('2026-10-27', '2026-10-26')).toBe('Amanhã');
    expect(descreverPrazo('2026-10-20', '2026-10-26')).toBe('Atrasada 6 dias');
    expect(descreverPrazo('2026-12-01', '2026-10-26')).toBe('01/12/2026');
  });
  test('somarDias atravessa mês e ano', () => {
    expect(somarDias('2026-10-30', 3)).toBe('2026-11-02');
    expect(somarDias('2026-12-31', 1)).toBe('2027-01-01');
  });
  test('semana começa na segunda', () => {
    expect(inicioSemana('2026-10-28')).toBe('2026-10-26');
    expect(inicioSemana('2026-11-01')).toBe('2026-10-26');
    expect(nomeDiaSemana('2026-10-28')).toBe('Qua');
    expect(dataCurta('2026-10-28')).toBe('28/10');
  });
});

describe('horas', () => {
  test('horaValida e paraMinutos', () => {
    expect(horaValida('23:59')).toBe(true);
    expect(horaValida('24:00')).toBe(false);
    expect(horaValida('9:30')).toBe(false);
    expect(paraMinutos('09:30')).toBe(570);
  });
  test('agoraLocal usa o relógio do celular', () => {
    expect(agoraLocal(new Date(2026, 9, 28, 22, 5, 9))).toBe('2026-10-28T22:05:09');
  });
  test('timestamp do servidor (UTC) vira data e hora LOCAIS', () => {
    const ts = new Date(2026, 9, 28, 21, 30).toISOString(); // 21:30 no horário do aparelho
    expect(dataLocalDeTimestamp(ts)).toBe('2026-10-28');
    expect(horaLocalDeTimestamp(ts)).toBe('21:30');
    expect(quandoFoi(ts, '2026-10-28')).toBe('Hoje às 21:30');
    expect(quandoFoi(ts, '2026-10-30')).toBe('28/10 às 21:30');
    expect(dataLocalDeTimestamp(null)).toBeNull();
  });
});
