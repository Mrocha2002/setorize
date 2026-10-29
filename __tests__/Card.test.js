/** TESTES DE UNIDADE: regras do card (tarefa) e filtros do Kanban. */
import {
  descreverDestino, estaAtrasado, filtrarCards, montarQuadro, normalizarCard, podeAssumir, proximoStatus, statusAnterior, validarCard,
} from '../src/models/Card';

const base = { titulo: 'Cotar papel A4', prioridade: 'alta', prazo: '', destino: 'setor', setorId: 5 };

describe('validarCard', () => {
  test('válido para um setor e para uma pessoa', () => {
    expect(validarCard(base).valido).toBe(true);
    expect(validarCard({ ...base, destino: 'pessoa', setorId: null, responsavelId: 'u1' }).valido).toBe(true);
  });
  test('destino obrigatório e completo', () => {
    expect(validarCard({ ...base, destino: 'setor', setorId: null }).erros.destino).toBe('Escolha o setor.');
    expect(validarCard({ ...base, destino: 'pessoa', responsavelId: null }).erros.destino).toBe('Escolha a pessoa.');
    expect(validarCard({ ...base, destino: undefined }).erros.destino).toBeDefined();
  });
  test('título, prioridade e prazo', () => {
    const r = validarCard({ ...base, titulo: 'ab', prioridade: 'x', prazo: '31/02/2026' });
    expect(Object.keys(r.erros).sort()).toEqual(['prazo', 'prioridade', 'titulo']);
  });
});

test('normalizarCard: setor sem responsável; pessoa sem setor', () => {
  expect(normalizarCard({ ...base, titulo: '  Cotar  ', descricao: ' ', prazo: '05/11/2026' })).toEqual({
    titulo: 'Cotar', descricao: null, prioridade: 'alta', prazo: '2026-11-05', setorId: 5, responsavelId: null,
  });
  expect(normalizarCard({ ...base, destino: 'pessoa', responsavelId: 'u1' })).toMatchObject({ setorId: null, responsavelId: 'u1' });
});

const carla = { id: 'carla', setorId: 5 };
const cards = [
  { id: 1, status: 'a_fazer', prioridade: 'baixa', prazo: null, setorId: 5, responsavelId: null, setorNome: 'Suprimentos' },
  { id: 2, status: 'fazendo', prioridade: 'alta', prazo: '2026-10-20', setorId: 5, responsavelId: 'carla', setorNome: 'Suprimentos', responsavelNome: 'Carla Mendes' },
  { id: 3, status: 'a_fazer', prioridade: 'alta', prazo: '2026-11-01', setorId: null, responsavelId: 'carla', responsavelNome: 'Carla Mendes', responsavelSetorId: 5 },
  { id: 4, status: 'a_fazer', prioridade: 'media', prazo: null, setorId: 6, responsavelId: null, setorNome: 'TI' },
];

test('filtros de visualização', () => {
  expect(filtrarCards(cards, { escopo: 'meus' }, carla).map((c) => c.id)).toEqual([2, 3]);
  expect(filtrarCards(cards, { escopo: 'setor' }, carla).map((c) => c.id)).toEqual([1, 2]);
  expect(filtrarCards(cards, { escopo: 'todos', setorId: 5 }, carla).map((c) => c.id)).toEqual([1, 2, 3]);
  expect(filtrarCards(cards, { escopo: 'todos', setorId: null }, carla)).toHaveLength(4);
});

test('montarQuadro: por coluna, prioridade alta primeiro', () => {
  const q = montarQuadro(cards);
  expect(q.a_fazer.map((c) => c.id)).toEqual([3, 4, 1]);
  expect(q.fazendo.map((c) => c.id)).toEqual([2]);
  expect(q.concluido).toEqual([]);
});

test('assumir, destino e atraso', () => {
  expect(podeAssumir(cards[0], carla)).toBe(true);
  expect(podeAssumir(cards[1], carla)).toBe(false); // já tem dono
  expect(podeAssumir(cards[3], carla)).toBe(false); // outro setor
  expect(descreverDestino(cards[0])).toBe('Suprimentos');
  expect(descreverDestino(cards[1])).toBe('Suprimentos · Carla');
  expect(descreverDestino(cards[2])).toBe('Carla Mendes');
  expect(estaAtrasado(cards[1], '2026-10-28')).toBe(true);
  expect(estaAtrasado({ ...cards[1], status: 'concluido' }, '2026-10-28')).toBe(false);
});

test('navegação entre colunas', () => {
  expect(proximoStatus('a_fazer')).toBe('fazendo');
  expect(proximoStatus('concluido')).toBeNull();
  expect(statusAnterior('a_fazer')).toBeNull();
  expect(statusAnterior('concluido')).toBe('fazendo');
});
