/** TESTES DE UNIDADE: cálculo do Painel (desempenho). */
import { agruparPorSemana, calcularPainel } from '../src/models/Metricas';

const HOJE = '2026-10-28'; // quarta-feira
// Timestamp do servidor para um dia/hora LOCAL (independe do fuso da máquina de teste).
const ts = (dia, hora = 17) => {
  const [a, m, d] = dia.split('-').map(Number);
  return new Date(a, m - 1, d, hora).toISOString();
};

const carla = { id: 'carla', nome: 'Carla Mendes', cor: '#111', setorId: 5 };
const bruno = { id: 'bruno', nome: 'Bruno Lima', cor: '#222', setorId: 6 };
const card = (id, status, extra) => ({ id, status, prioridade: 'media', prazo: null, setorId: null, responsavelId: null, concluidoEm: null, ...extra });
const deCarla = { responsavelId: 'carla', responsavelNome: carla.nome, responsavelCor: carla.cor, responsavelSetorNome: 'Suprimentos' };
const deBruno = { responsavelId: 'bruno', responsavelNome: bruno.nome, responsavelCor: bruno.cor, responsavelSetorNome: 'TI' };

const cards = [
  card(1, 'concluido', { ...deCarla, prazo: '2026-10-20', concluidoEm: ts('2026-10-19') }), // no prazo, semana 19/10
  card(2, 'concluido', { ...deCarla, prazo: '2026-10-20', concluidoEm: ts('2026-10-22') }), // atrasada, semana 19/10
  card(3, 'concluido', { ...deBruno, prazo: '2026-10-27', concluidoEm: ts('2026-10-27', 22) }), // no prazo, semana atual
  card(4, 'fazendo', { ...deCarla, prazo: '2026-10-25' }), // atrasada
  card(5, 'a_fazer', { setorId: 5, setorNome: 'Suprimentos' }), // do setor, sem dono
  card(6, 'a_fazer', { ...deBruno, prazo: '2026-11-10' }),
];

test('agruparPorSemana', () => {
  expect(agruparPorSemana(['2026-10-26', '2026-10-25', '2026-08-01'], HOJE, 2)).toEqual([
    { inicio: '2026-10-19', total: 1 },
    { inicio: '2026-10-26', total: 1 },
  ]);
});

test('painel da equipe (visão do gestor)', () => {
  const p = calcularPainel(cards, HOJE, { id: 'ana', setorId: 3 });
  expect(p.totais).toEqual({ total: 6, aFazer: 2, fazendo: 1, concluidos: 3, atrasados: 1 });
  expect(p.prazo).toEqual({ comPrazo: 3, noPrazo: 2, percentual: 67 });
  expect(p.semanas.slice(-2)).toEqual([
    { inicio: '2026-10-19', total: 2 },
    { inicio: '2026-10-26', total: 1 },
  ]);
  expect(p.concluidosEstaSemana).toBe(1);
  expect(p.porPessoa.map((x) => [x.nome, x.concluidos, x.atrasados, x.prazo.percentual])).toEqual([
    ['Carla Mendes', 2, 1, 50],
    ['Bruno Lima', 1, 0, 100],
  ]);
  expect(p.porSetor.map((s) => [s.nome, s.total, s.concluidos])).toEqual([
    ['Suprimentos', 4, 2],
    ['TI', 2, 1],
  ]);
});

test('pendências de quem está logado', () => {
  const p = calcularPainel(cards, HOJE, carla);
  expect(p.minhasPendentes).toBe(1);
  expect(p.minhasAtrasadas).toBe(1);
  expect(p.doSetorSemResponsavel).toBe(1);
});

test('sem cards: nada de divisão por zero', () => {
  const p = calcularPainel([], HOJE, carla);
  expect(p.prazo.percentual).toBeNull();
  expect(p.porPessoa).toEqual([]);
});
