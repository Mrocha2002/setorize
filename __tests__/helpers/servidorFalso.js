/**
 * SERVIDOR FALSO, em memória, para os testes de tela.
 *
 * Implementa as MESMAS funções dos repositórios Supabase (mesmos nomes e formatos)
 * e imita as regras do banco (RLS): quem vê o quê, quem pode criar, conflito de sala.
 * As regras reais são testadas no PostgreSQL em supabase/testes/rls.test.mjs;
 * aqui o objetivo é testar as TELAS sem internet.
 */
const { ErroAutenticacao, ErroConflito, ErroPermissao, ErroValidacao } = require('../../src/controllers/erros');

const CORES = ['#6C5CE7', '#0984E3', '#E84393', '#00B894', '#E17055'];

function criarServidorFalso() {
  const db = {
    setores: ['Comercial', 'Financeiro', 'Operações', 'RH', 'Suprimentos', 'TI'].map((nome, i) => ({ id: i + 1, nome })),
    salas: [
      { id: 1, nome: 'Sala Azul', capacidade: 8 },
      { id: 2, nome: 'Sala Verde', capacidade: 4 },
      { id: 3, nome: 'Auditório', capacidade: 30 },
    ],
    perfis: [],
    senhas: {},
    cards: [],
    eventos: [],
    avisos: [],
    leituras: [],
    reservas: [],
  };
  let seq = 1;
  let sessao = null; // id de quem está logado
  const ouvintes = new Set();

  const agora = () => new Date().toISOString();
  const setorPorNome = (nome) => db.setores.find((s) => s.nome === nome).id;
  const perfil = (id) => db.perfis.find((p) => p.id === id);
  const eu = () => perfil(sessao);
  const admin = () => eu()?.papel === 'admin';
  const gestor = () => eu()?.papel === 'gestor' || admin(); // o admin também é gestor
  const avisar = () => ouvintes.forEach((cb) => cb(sessao));
  const exigirLogin = () => {
    if (!sessao) throw new ErroPermissao();
  };

  function adicionarPerfil({ email, senha, nome, setorId, cargo = '', telefone = '', papel = 'colaborador' }) {
    const id = `u-${seq++}`;
    db.perfis.push({ id, email, nome, setorId, cargo, telefone, papel, cor: CORES[db.perfis.length % CORES.length] });
    db.senhas[email] = { senha, id };
    return id;
  }

  // ---------------- regras de visibilidade (iguais às políticas RLS) ----------------
  // Gestor é gestor DO SEU SETOR (igual às funções ve_card / gerencia_card / ve_aviso do banco).
  const setorDe = (id) => perfil(id)?.setorId ?? null;
  const doMeuSetor = (pessoaId) => !!pessoaId && setorDe(pessoaId) === eu().setorId;
  const podeVerCard = (c) =>
    admin() ||
    c.criadoPor === sessao ||
    c.responsavelId === sessao ||
    (c.setorId && c.setorId === eu().setorId) ||
    (gestor() && doMeuSetor(c.responsavelId));
  const gerenciaCard = (c) =>
    admin() || (gestor() && (c.criadoPor === sessao || c.setorId === eu().setorId || doMeuSetor(c.responsavelId)));
  const podeVerAviso = (a) =>
    admin() ||
    a.autorId === sessao ||
    a.destinatarioId === sessao ||
    a.setorId === eu().setorId ||
    (!a.setorId && !a.destinatarioId) ||
    (gestor() && doMeuSetor(a.destinatarioId));

  const montarCard = (c) => {
    const resp = perfil(c.responsavelId);
    const setorNome = (id) => db.setores.find((s) => s.id === id)?.nome ?? null;
    return {
      ...c,
      setorNome: setorNome(c.setorId),
      responsavelNome: resp?.nome ?? null,
      responsavelCor: resp?.cor ?? null,
      responsavelSetorId: resp?.setorId ?? null,
      responsavelSetorNome: resp ? setorNome(resp.setorId) : null,
      criadoPorNome: perfil(c.criadoPor)?.nome ?? null,
    };
  };
  const evento = (cardId, tipo, texto) =>
    db.eventos.push({ id: seq++, cardId, autorId: sessao, tipo, texto, criadoEm: agora() });

  const montarPerfil = (p) => ({ ...p, setorNome: db.setores.find((s) => s.id === p.setorId).nome });

  const repos = {
    auth: {
      sessaoAtual: async () => sessao,
      aoMudarSessao: (cb) => {
        ouvintes.add(cb);
        return () => ouvintes.delete(cb);
      },
      entrar: async (email, senha) => {
        const conta = db.senhas[email];
        if (!conta || conta.senha !== senha) throw new ErroAutenticacao('E-mail ou senha incorretos.');
        sessao = conta.id;
        avisar();
        return sessao;
      },
      cadastrar: async ({ email, senha, nome, setorId, cargo, telefone }) => {
        if (db.senhas[email]) throw new ErroAutenticacao('Este e-mail já está cadastrado.');
        sessao = adicionarPerfil({ email, senha, nome, setorId, cargo, telefone }); // sempre colaborador
        avisar();
        return { userId: sessao, precisaConfirmarEmail: false };
      },
      sair: async () => {
        sessao = null;
        avisar();
      },
    },

    perfis: {
      listarSetores: async () => db.setores,
      buscar: async (id) => (perfil(id) ? montarPerfil(perfil(id)) : null),
      listar: async () => (exigirLogin(), [...db.perfis].sort((a, b) => a.nome.localeCompare(b.nome)).map(montarPerfil)),
      // Igual à função admin_atualizar_perfil do banco.
      alterarPorAdmin: async (id, { papel, setorId, cargo }) => {
        if (!admin()) throw new ErroPermissao('Somente o administrador pode alterar papel, setor e cargo.');
        const alvo = perfil(id);
        if (alvo.papel === 'admin') throw new ErroPermissao('Você não pode alterar um administrador pelo app.');
        if (!['colaborador', 'gestor'].includes(papel)) throw new ErroValidacao({ geral: 'Papel inválido: escolha colaborador ou gestor.' });
        Object.assign(alvo, { papel, setorId, cargo });
      },
      atualizarMeuContato: async (id, { cargo, telefone }) => {
        if (id !== sessao) throw new ErroPermissao();
        Object.assign(perfil(id), { cargo, telefone });
      },
    },

    cards: {
      listar: async () => (exigirLogin(), db.cards.filter(podeVerCard).map(montarCard)),
      buscar: async (id) => {
        const c = db.cards.find((x) => x.id === id);
        return c && podeVerCard(c) ? montarCard(c) : null;
      },
      inserir: async (card) => {
        if (!gestor()) throw new ErroPermissao();
        const c = { id: seq++, status: 'a_fazer', criadoPor: sessao, criadoEm: agora(), concluidoEm: null, ...card };
        db.cards.push(c);
        evento(c.id, 'criado', 'Criou a tarefa');
        return c.id;
      },
      atualizar: async (id, card) => {
        const c = db.cards.find((x) => x.id === id);
        if (!c || !gerenciaCard(c)) throw new ErroPermissao('Só o gestor que criou a tarefa ou o gestor do setor dela pode editá-la.');
        Object.assign(c, card);
      },
      mudarStatus: async (id, status) => {
        const c = db.cards.find((x) => x.id === id);
        if (!c || !(gestor() || c.responsavelId === sessao || c.setorId === eu().setorId)) {
          throw new ErroPermissao('Você não pode mover esta tarefa.');
        }
        if (c.status !== status) {
          c.status = status;
          c.concluidoEm = status === 'concluido' ? agora() : null;
          evento(id, 'status', `Moveu para ${{ a_fazer: 'A fazer', fazendo: 'Fazendo', concluido: 'Concluído' }[status]}`);
        }
      },
      assumir: async (id, usuarioId) => {
        const c = db.cards.find((x) => x.id === id);
        if (!c || c.responsavelId || c.setorId !== eu().setorId) throw new ErroPermissao('Esta tarefa já tem responsável.');
        c.responsavelId = usuarioId;
        evento(id, 'assumido', 'Assumiu a tarefa');
      },
      excluir: async (id) => {
        const c = db.cards.find((x) => x.id === id);
        if (!c || !gerenciaCard(c)) throw new ErroPermissao('Só o gestor que criou a tarefa ou o gestor do setor dela pode excluí-la.');
        db.cards = db.cards.filter((x) => x.id !== id);
      },
      eventos: async (cardId) =>
        db.eventos
          .filter((e) => e.cardId === cardId)
          .map((e) => ({ ...e, autorNome: perfil(e.autorId)?.nome ?? 'Sistema', autorCor: perfil(e.autorId)?.cor ?? '#999' })),
      comentar: async (cardId, texto) => {
        const c = db.cards.find((x) => x.id === cardId);
        if (!c || !podeVerCard(c)) throw new ErroPermissao();
        evento(cardId, 'comentario', texto);
      },
    },

    avisos: {
      listar: async () =>
        db.avisos
          .filter(podeVerAviso)
          .sort((a, b) => b.fixado - a.fixado || b.id - a.id)
          .map((a) => ({
            ...a,
            autorNome: perfil(a.autorId).nome,
            autorCor: perfil(a.autorId).cor,
            setorNome: db.setores.find((s) => s.id === a.setorId)?.nome ?? null,
            destinatarioNome: perfil(a.destinatarioId)?.nome ?? null,
          })),
      idsLidos: async (uid) => new Set(db.leituras.filter((l) => l.perfilId === uid).map((l) => l.avisoId)),
      marcarLido: async (avisoId) => {
        if (!db.leituras.some((l) => l.avisoId === avisoId && l.perfilId === sessao)) db.leituras.push({ avisoId, perfilId: sessao });
      },
      publicar: async (aviso) => {
        if (!gestor()) throw new ErroPermissao();
        const a = { id: seq++, autorId: sessao, criadoEm: agora(), ...aviso };
        db.avisos.push(a);
        return a.id;
      },
      definirFixado: async (id, fixado) => {
        const a = db.avisos.find((x) => x.id === id);
        if (a.autorId !== sessao) throw new ErroPermissao('Só quem publicou pode fixar o aviso.');
        a.fixado = fixado;
      },
      excluir: async (id) => {
        const a = db.avisos.find((x) => x.id === id);
        if (a.autorId !== sessao) throw new ErroPermissao('Só quem publicou pode excluir o aviso.');
        db.avisos = db.avisos.filter((x) => x.id !== id);
      },
      resumoLeituras: async () => {
        if (!gestor()) return {};
        return Object.fromEntries(
          db.avisos.filter(podeVerAviso).map((a) => {
            const alvo = db.perfis.filter(
              (p) => p.id !== a.autorId && ((!a.setorId && !a.destinatarioId) || p.setorId === a.setorId || p.id === a.destinatarioId)
            );
            const lidos = db.leituras.filter((l) => l.avisoId === a.id && l.perfilId !== a.autorId).length;
            return [a.id, { lidos, total: alvo.length }];
          })
        );
      },
    },

    agenda: {
      listarSalas: async () => db.salas,
      reservasDoDia: async (data) =>
        db.reservas
          .filter((r) => r.data === data)
          .sort((a, b) => a.inicio.localeCompare(b.inicio))
          .map((r) => ({
            ...r,
            salaNome: db.salas.find((s) => s.id === r.salaId).nome,
            responsavelNome: perfil(r.responsavelId).nome,
            responsavelCor: perfil(r.responsavelId).cor,
            responsavelSetorId: perfil(r.responsavelId).setorId,
          })),
      buscarConflito: async (salaId, data, inicio, fim) => {
        const r = db.reservas.find((x) => x.salaId === salaId && x.data === data && x.inicio < fim && x.fim > inicio);
        return r ? { ...r, salaNome: db.salas.find((s) => s.id === salaId).nome, responsavelNome: perfil(r.responsavelId).nome } : null;
      },
      inserir: async (reserva) => {
        const choque = db.reservas.some(
          (x) => x.salaId === reserva.salaId && x.data === reserva.data && x.inicio < reserva.fim && x.fim > reserva.inicio
        );
        if (choque) throw new ErroConflito('Esta sala já está reservada nesse horário.'); // como o 23P01 do banco
        const r = { id: seq++, responsavelId: sessao, ...reserva };
        db.reservas.push(r);
        return r.id;
      },
      excluir: async (id) => {
        const r = db.reservas.find((x) => x.id === id);
        if (!r || !(r.responsavelId === sessao || admin() || (gestor() && doMeuSetor(r.responsavelId)))) throw new ErroPermissao();
        db.reservas = db.reservas.filter((x) => x.id !== id);
      },
      proximasDoUsuario: async (uid, hoje) =>
        db.reservas
          .filter((r) => r.responsavelId === uid && r.data >= hoje)
          .map((r) => ({ ...r, salaNome: db.salas.find((s) => s.id === r.salaId).nome })),
    },

    tempoReal: { escutar: () => () => {} },
  };

  /** Cria uma conta direto (como se a pessoa já tivesse se cadastrado antes). */
  function criarConta(email, nome, setorNome, papel = 'colaborador') {
    return adicionarPerfil({ email, senha: 'senha123', nome, setorId: setorPorNome(setorNome), papel, telefone: '(19) 90000-0001' });
  }

  return { repos, db, criarConta, setorPorNome };
}

module.exports = { criarServidorFalso };
