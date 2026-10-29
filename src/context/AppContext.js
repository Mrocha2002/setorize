/**
 * Context: estado, ações e serviços disponíveis para TODAS as telas.
 *   const { estado, acoes, servicos, pendencias } = useApp();
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState } from 'react';
import { AppState } from 'react-native';
import { servicosSupabase } from '../services/montarServicos';
import { ACOES, appReducer, contarPendencias, estadoInicial } from './appReducer';

const AppContext = createContext(null);

export function AppProvider({ children, servicos: servicosInjetados }) {
  // useState com função: os serviços são criados uma vez só (não a cada renderização).
  const [servicos] = useState(() => servicosInjetados ?? servicosSupabase());

  const [estado, dispatch] = useReducer(appReducer, estadoInicial);
  const perfil = estado.perfil;

  const carregarPerfil = useCallback(
    async (userId) => {
      const p = await servicos.perfis.buscar(userId);
      if (!p) throw new Error('Perfil não encontrado para este usuário.');
      dispatch({ type: ACOES.PERFIL_CARREGADO, payload: p });
    },
    [servicos]
  );

  // 1) Ao abrir: setores (para o cadastro) + sessão salva + escuta login/logout.
  useEffect(() => {
    if (!servicos.configurado) return undefined;
    let ativo = true;

    servicos.perfis
      .listarSetores()
      .then((s) => ativo && dispatch({ type: ACOES.SETORES_CARREGADOS, payload: s }))
      .catch(() => {});

    servicos.auth
      .sessaoAtual()
      .then((userId) => (userId ? carregarPerfil(userId) : dispatch({ type: ACOES.SESSAO_VAZIA })))
      .catch((e) => ativo && dispatch({ type: ACOES.ERRO, payload: e.message }));

    const parar = servicos.auth.aoMudarSessao((userId) => {
      if (!ativo) return;
      if (userId) carregarPerfil(userId).catch((e) => dispatch({ type: ACOES.ERRO, payload: e.message }));
      else dispatch({ type: ACOES.SAIU });
    });

    return () => {
      ativo = false;
      parar();
    };
  }, [servicos, carregarPerfil]);

  const recarregarCards = useCallback(async () => {
    if (!perfil) return;
    dispatch({ type: ACOES.CARDS_CARREGADOS, payload: await servicos.kanban.listar() });
  }, [servicos, perfil]);

  const recarregarAvisos = useCallback(async () => {
    if (!perfil) return;
    dispatch({ type: ACOES.AVISOS_CARREGADOS, payload: await servicos.mural.listar(perfil) });
  }, [servicos, perfil]);

  const recarregarTudo = useCallback(async () => {
    if (!perfil) return;
    const colaboradores = await servicos.perfis.listar();
    dispatch({ type: ACOES.COLABORADORES_CARREGADOS, payload: colaboradores });
    await Promise.all([recarregarCards(), recarregarAvisos()]);
  }, [servicos, perfil, recarregarCards, recarregarAvisos]);

  // 2) Logado: carrega tudo, escuta mudanças em tempo real e recarrega ao voltar para o app.
  useEffect(() => {
    if (!perfil) return undefined;
    recarregarTudo().catch((e) => dispatch({ type: ACOES.ERRO, payload: e.message }));

    let pararTempoReal = () => {};
    try {
      pararTempoReal = servicos.tempoReal.escutar((tabela) => {
        if (tabela === 'avisos') recarregarAvisos().catch(() => {});
        else if (tabela === 'cards') recarregarCards().catch(() => {});
      });
    } catch {
      // sem tempo real: o app continua funcionando com "puxar para atualizar"
    }

    // Ao voltar para o app: relê o perfil (o admin pode ter mudado o papel ou o setor) e os dados.
    const sub = AppState.addEventListener('change', (s) => {
      if (s !== 'active') return;
      carregarPerfil(perfil.id).catch(() => {});
      recarregarTudo().catch(() => {});
    });

    return () => {
      pararTempoReal();
      sub.remove();
    };
    // Refaz quando muda a pessoa, o papel ou o setor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perfil?.id, perfil?.papel, perfil?.setorId]);

  const acoes = useMemo(
    () => ({
      // Conta
      entrar: (dados) => servicos.auth.entrar(dados),
      cadastrar: (dados) => servicos.auth.cadastrar(dados),
      sair: () => servicos.auth.sair(),
      atualizarMeuContato: async (dados) => {
        await servicos.perfis.atualizarMeuContato(perfil.id, dados);
        await carregarPerfil(perfil.id);
        await recarregarTudo();
      },

      // Equipe (só admin)
      alterarColaborador: async (alvo, dados) => {
        await servicos.equipe.alterar(alvo, dados, perfil);
        await recarregarTudo();
      },

      recarregarTudo,
      recarregarCards,
      recarregarAvisos,

      // Kanban
      definirFiltroKanban: (parcial) => dispatch({ type: ACOES.FILTRO_KANBAN_ALTERADO, payload: parcial }),
      buscarCard: (id) => servicos.kanban.buscar(id),
      salvarCard: async (dados, id) => {
        const novoId = await servicos.kanban.salvar(dados, perfil, id);
        await recarregarCards();
        return novoId;
      },
      moverCard: async (id, status) => {
        await servicos.kanban.mover(id, status);
        await recarregarCards();
      },
      assumirCard: async (id) => {
        await servicos.kanban.assumir(id, perfil);
        await recarregarCards();
      },
      excluirCard: async (id) => {
        await servicos.kanban.excluir(id, perfil);
        await recarregarCards();
      },
      historicoCard: (id) => servicos.kanban.historico(id),
      comentarCard: (id, texto) => servicos.kanban.comentar(id, texto),

      // Mural
      publicarAviso: async (dados) => {
        await servicos.mural.publicar(dados, perfil);
        await recarregarAvisos();
      },
      marcarAvisoLido: async (avisoId) => {
        await servicos.mural.marcarLido(avisoId);
        await recarregarAvisos();
      },
      alternarFixado: async (aviso) => {
        await servicos.mural.alternarFixado(aviso);
        await recarregarAvisos();
      },
      excluirAviso: async (avisoId) => {
        await servicos.mural.excluir(avisoId);
        await recarregarAvisos();
      },

      // Agenda e Painel
      agendaDoDia: (data) => servicos.agenda.agendaDoDia(data),
      listarSalas: () => servicos.agenda.listarSalas(),
      reservar: (dados) => servicos.agenda.reservar(dados),
      cancelarReserva: (id) => servicos.agenda.cancelar(id),
      indicadores: () => servicos.painel.indicadores(perfil),
    }),
    [servicos, perfil, carregarPerfil, recarregarTudo, recarregarCards, recarregarAvisos]
  );

  const pendencias = useMemo(() => contarPendencias(estado), [estado]);
  const valor = useMemo(() => ({ estado, acoes, servicos, pendencias }), [estado, acoes, servicos, pendencias]);
  return <AppContext.Provider value={valor}>{children}</AppContext.Provider>;
}

export function useApp() {
  const contexto = useContext(AppContext);
  if (!contexto) throw new Error('useApp precisa estar dentro de <AppProvider>');
  return contexto;
}
