/** TESTES DE UNIDADE: reducer (Flux) e contagem de pendências. */
import { ACOES, appReducer, contarPendencias, estadoInicial } from '../src/context/appReducer';

const gestor = { id: 'g', papel: 'gestor', setorId: 3 };
const carla = { id: 'c', papel: 'colaborador', setorId: 5 };

test('ao entrar, o filtro do Kanban depende do papel', () => {
  expect(appReducer(estadoInicial, { type: ACOES.PERFIL_CARREGADO, payload: gestor }).filtroKanban).toEqual({ escopo: 'todos', setorId: null });
  const e = appReducer(estadoInicial, { type: ACOES.PERFIL_CARREGADO, payload: carla });
  expect(e.filtroKanban).toEqual({ escopo: 'meus', setorId: null });
  expect(e.inicializando).toBe(false);
});

test('recarregar o mesmo perfil mantém o filtro escolhido', () => {
  let e = appReducer(estadoInicial, { type: ACOES.PERFIL_CARREGADO, payload: carla });
  e = appReducer(e, { type: ACOES.FILTRO_KANBAN_ALTERADO, payload: { escopo: 'setor' } });
  e = appReducer(e, { type: ACOES.PERFIL_CARREGADO, payload: { ...carla, telefone: '1' } });
  expect(e.filtroKanban.escopo).toBe('setor');
});

test('sair apaga os dados do usuário anterior, mas mantém os setores', () => {
  let e = appReducer(estadoInicial, { type: ACOES.SETORES_CARREGADOS, payload: [{ id: 1 }] });
  e = appReducer(e, { type: ACOES.PERFIL_CARREGADO, payload: carla });
  e = appReducer(e, { type: ACOES.CARDS_CARREGADOS, payload: [{ id: 9 }] });
  e = appReducer(e, { type: ACOES.SAIU });
  expect(e.perfil).toBeNull();
  expect(e.cards).toEqual([]);
  expect(e.setores).toEqual([{ id: 1 }]);
});

test('pendências: tarefas novas para mim/meu setor e avisos não lidos', () => {
  const estado = {
    ...estadoInicial,
    perfil: carla,
    cards: [
      { status: 'a_fazer', responsavelId: 'c' },
      { status: 'a_fazer', responsavelId: null, setorId: 5 },
      { status: 'a_fazer', responsavelId: 'outra', setorId: 5 },
      { status: 'fazendo', responsavelId: 'c' },
      { status: 'a_fazer', responsavelId: null, setorId: 6 },
    ],
    avisos: [{ lido: false }, { lido: true }, { lido: false }],
  };
  expect(contarPendencias(estado)).toEqual({ tarefasNovas: 2, avisosNaoLidos: 2 });
  expect(contarPendencias(estadoInicial)).toEqual({ tarefasNovas: 0, avisosNaoLidos: 0 });
});

test('imutabilidade e ação desconhecida', () => {
  const copia = JSON.parse(JSON.stringify(estadoInicial));
  appReducer(estadoInicial, { type: ACOES.PERFIL_CARREGADO, payload: carla });
  expect(estadoInicial).toEqual(copia);
  expect(appReducer(estadoInicial, { type: 'X' })).toBe(estadoInicial);
});
