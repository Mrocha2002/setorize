/**
 * Padrão FLUX com useReducer:  Tela --dispatch(AÇÃO)--> REDUCER --novo ESTADO--> Tela
 * O reducer é uma função PURA: nunca altera o estado antigo, devolve um novo.
 */
export const ACOES = {
  SETORES_CARREGADOS: 'SETORES_CARREGADOS',
  SESSAO_VAZIA: 'SESSAO_VAZIA',
  PERFIL_CARREGADO: 'PERFIL_CARREGADO',
  SAIU: 'SAIU',
  COLABORADORES_CARREGADOS: 'COLABORADORES_CARREGADOS',
  CARDS_CARREGADOS: 'CARDS_CARREGADOS',
  AVISOS_CARREGADOS: 'AVISOS_CARREGADOS',
  FILTRO_KANBAN_ALTERADO: 'FILTRO_KANBAN_ALTERADO',
  ERRO: 'ERRO',
};

export const estadoInicial = {
  inicializando: true, // ainda verificando se há sessão salva no aparelho
  erro: null,
  perfil: null, // quem está logado (null = tela de login)
  setores: [],
  colaboradores: [],
  cards: [],
  avisos: [],
  filtroKanban: null, // definido ao entrar: gestor vê "todos", colaborador "meus"
};

export function appReducer(estado, acao) {
  switch (acao.type) {
    case ACOES.SETORES_CARREGADOS:
      return { ...estado, setores: acao.payload };
    case ACOES.SESSAO_VAZIA:
      return { ...estado, inicializando: false, perfil: null };
    case ACOES.PERFIL_CARREGADO: {
      const perfil = acao.payload;
      const mudouUsuario = estado.perfil?.id !== perfil.id;
      return {
        ...estado,
        inicializando: false,
        erro: null,
        perfil,
        filtroKanban: mudouUsuario
          ? { escopo: ['gestor', 'admin'].includes(perfil.papel) ? 'todos' : 'meus', setorId: null }
          : estado.filtroKanban,
      };
    }
    case ACOES.SAIU:
      // Ao sair, apaga da memória tudo que era do usuário anterior.
      return { ...estadoInicial, inicializando: false, setores: estado.setores };
    case ACOES.COLABORADORES_CARREGADOS:
      return { ...estado, colaboradores: acao.payload };
    case ACOES.CARDS_CARREGADOS:
      return { ...estado, cards: acao.payload };
    case ACOES.AVISOS_CARREGADOS:
      return { ...estado, avisos: acao.payload };
    case ACOES.FILTRO_KANBAN_ALTERADO:
      return { ...estado, filtroKanban: { ...estado.filtroKanban, ...acao.payload } };
    case ACOES.ERRO:
      return { ...estado, inicializando: false, erro: acao.payload };
    default:
      return estado;
  }
}

/** Números para os "selos" (badges) das abas. Função pura, derivada do estado. */
export function contarPendencias(estado) {
  const p = estado.perfil;
  if (!p) return { tarefasNovas: 0, avisosNaoLidos: 0 };
  const tarefasNovas = estado.cards.filter(
    (c) => c.status === 'a_fazer' && (c.responsavelId === p.id || (!c.responsavelId && c.setorId === p.setorId))
  ).length;
  const avisosNaoLidos = estado.avisos.filter((a) => !a.lido).length;
  return { tarefasNovas, avisosNaoLidos };
}
