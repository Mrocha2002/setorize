/** Campo de data/hora: abre o seletor do celular e devolve o texto no formato do app. */
import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import CampoDataHora from '../src/components/CampoDataHora';
import { brParaDate, dateParaBR, dateParaHora, horaParaDate } from '../src/utils/datas';

function Tela({ modo, inicial = '' }) {
  const [valor, setValor] = useState(inicial);
  return <CampoDataHora rotulo="Prazo" modo={modo} valor={valor} aoMudar={setValor} placeholder="Sem prazo" permitirLimpar />;
}

test('escolher uma data no calendário preenche "dd/mm/aaaa" e "Limpar" apaga', async () => {
  await render(<Tela modo="date" />);
  expect(screen.getByText('Sem prazo')).toBeOnTheScreen();
  global.__seletorValor = new Date(2026, 10, 30);
  await fireEvent.press(screen.getByLabelText('Escolher prazo'));
  expect(screen.getByText('30/11/2026')).toBeOnTheScreen();
  await fireEvent.press(screen.getByText('Limpar'));
  expect(screen.getByText('Sem prazo')).toBeOnTheScreen();
});

test('conversões entre o texto do app e o Date do seletor', () => {
  expect(dateParaBR(new Date(2026, 0, 5))).toBe('05/01/2026');
  expect(dateParaHora(new Date(2026, 0, 5, 9, 5))).toBe('09:05');
  expect(brParaDate('30/11/2026').getDate()).toBe(30);
  const hoje = new Date(2026, 9, 29, 14, 20);
  expect(brParaDate('', hoje)).toEqual(new Date(2026, 9, 29));
  expect(dateParaHora(horaParaDate('07:30', hoje))).toBe('07:30');
  expect(dateParaHora(horaParaDate('', hoje))).toBe('15:00'); // vazio: próxima hora cheia
});
