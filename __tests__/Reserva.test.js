/** TESTES DE UNIDADE: regras da agenda (o banco garante o conflito; o app valida antes). */
import { haConflito, podeCancelarReserva, validarReserva } from '../src/models/Reserva';

const r = (inicio, fim) => ({ inicio, fim });
test('conflito de horário', () => {
  expect(haConflito(r('09:00', '10:00'), r('10:00', '11:00'))).toBe(false);
  expect(haConflito(r('09:00', '10:00'), r('09:30', '10:30'))).toBe(true);
  expect(haConflito(r('08:00', '12:00'), r('09:00', '09:30'))).toBe(true);
  expect(haConflito(r('14:00', '15:00'), r('14:00', '15:00'))).toBe(true);
});

describe('validarReserva', () => {
  const hoje = '2026-10-28';
  const ok = { titulo: 'Planejamento', salaId: 1, data: '28/10/2026', inicio: '09:00', fim: '10:00' };
  test('válida', () => expect(validarReserva(ok, hoje).valido).toBe(true));
  test('data passada', () => expect(validarReserva({ ...ok, data: '27/10/2026' }, hoje).erros.data).toMatch(/já passou/));
  test('horário de funcionamento e duração', () => {
    expect(validarReserva({ ...ok, inicio: '06:30' }, hoje).erros.inicio).toMatch(/07:00/);
    expect(validarReserva({ ...ok, inicio: '10:00', fim: '10:10' }, hoje).erros.fim).toMatch(/15 minutos/);
    expect(validarReserva({ ...ok, inicio: '25:00' }, hoje).erros.inicio).toMatch(/inválida/);
    expect(validarReserva({ ...ok, salaId: null }, hoje).erros.salaId).toBeDefined();
  });
});

test('quem pode cancelar: dono ou gestor do setor do dono', () => {
  expect(podeCancelarReserva({ responsavelId: 'a' }, { id: 'a', papel: 'colaborador' })).toBe(true);
  expect(podeCancelarReserva({ responsavelId: 'a' }, { id: 'b', papel: 'colaborador' })).toBe(false);
  expect(podeCancelarReserva({ responsavelId: 'a', responsavelSetorId: 6 }, { id: 'g', papel: 'gestor', setorId: 6 })).toBe(true);
  expect(podeCancelarReserva({ responsavelId: 'a', responsavelSetorId: 5 }, { id: 'g', papel: 'gestor', setorId: 6 })).toBe(false);
  expect(podeCancelarReserva({ responsavelId: 'a', responsavelSetorId: 5 }, { id: 'z', papel: 'admin', setorId: 6 })).toBe(true);
});
