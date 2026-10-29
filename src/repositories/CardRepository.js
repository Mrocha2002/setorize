/**
 * REPOSITORY do Kanban (tabelas cards e card_eventos).
 *
 * O RLS do banco já devolve só os cards que o usuário pode ver:
 * aqui não existe nenhum "where setor = ..." para esconder dados.
 */
import { ErroPermissao, verificar } from '../controllers/erros';

// "responsavel:perfis!cards_responsavel_id_fkey(...)" = traga o perfil ligado
// pela chave estrangeira responsavel_id (há duas chaves para perfis, por isso o nome).
const CAMPOS = `
  id, titulo, descricao, status, prioridade, prazo, setor_id, responsavel_id, criado_por, criado_em, concluido_em,
  setor:setores(nome),
  responsavel:perfis!cards_responsavel_id_fkey(nome, cor, setor_id, setor:setores(nome)),
  criador:perfis!cards_criado_por_fkey(nome)
`;

function paraObjeto(l) {
  return {
    id: l.id,
    titulo: l.titulo,
    descricao: l.descricao,
    status: l.status,
    prioridade: l.prioridade,
    prazo: l.prazo,
    setorId: l.setor_id,
    setorNome: l.setor?.nome ?? null,
    responsavelId: l.responsavel_id,
    responsavelNome: l.responsavel?.nome ?? null,
    responsavelCor: l.responsavel?.cor ?? null,
    responsavelSetorId: l.responsavel?.setor_id ?? null,
    responsavelSetorNome: l.responsavel?.setor?.nome ?? null,
    criadoPor: l.criado_por,
    criadoPorNome: l.criador?.nome ?? null,
    criadoEm: l.criado_em,
    concluidoEm: l.concluido_em,
  };
}

/** card do app (camelCase) -> colunas do banco (snake_case) */
function paraBanco(card) {
  return {
    titulo: card.titulo,
    descricao: card.descricao,
    prioridade: card.prioridade,
    prazo: card.prazo,
    setor_id: card.setorId,
    responsavel_id: card.responsavelId,
  };
}

export class CardRepository {
  constructor(cliente) {
    this.cliente = cliente;
  }

  async listar() {
    const linhas = verificar(await this.cliente.from('cards').select(CAMPOS).order('id'));
    return linhas.map(paraObjeto);
  }

  async buscar(id) {
    const l = verificar(await this.cliente.from('cards').select(CAMPOS).eq('id', id).maybeSingle());
    return l ? paraObjeto(l) : null;
  }

  async inserir(card) {
    const l = verificar(await this.cliente.from('cards').insert(paraBanco(card)).select('id').single());
    return l.id;
  }

  async atualizar(id, card) {
    const linhas = verificar(await this.cliente.from('cards').update(paraBanco(card)).eq('id', id).select('id'));
    if (linhas.length === 0) throw new ErroPermissao('Só o gestor que criou a tarefa ou o gestor do setor dela pode editá-la.');
  }

  /** Muda a coluna. Se o RLS não deixar, o banco não altera nenhuma linha. */
  async mudarStatus(id, status) {
    const linhas = verificar(await this.cliente.from('cards').update({ status }).eq('id', id).select('id'));
    if (linhas.length === 0) throw new ErroPermissao('Você não pode mover esta tarefa.');
  }

  async assumir(id, usuarioId) {
    const linhas = verificar(
      await this.cliente.from('cards').update({ responsavel_id: usuarioId }).eq('id', id).is('responsavel_id', null).select('id')
    );
    if (linhas.length === 0) throw new ErroPermissao('Esta tarefa já tem responsável.');
  }

  async excluir(id) {
    const linhas = verificar(await this.cliente.from('cards').delete().eq('id', id).select('id'));
    if (linhas.length === 0) throw new ErroPermissao('Só o gestor que criou a tarefa ou o gestor do setor dela pode excluí-la.');
  }

  async eventos(cardId) {
    const linhas = verificar(
      await this.cliente
        .from('card_eventos')
        .select('id, tipo, texto, criado_em, autor_id, autor:perfis(nome, cor)')
        .eq('card_id', cardId)
        .order('id')
    );
    return linhas.map((e) => ({
      id: e.id,
      tipo: e.tipo,
      texto: e.texto,
      criadoEm: e.criado_em,
      autorId: e.autor_id,
      autorNome: e.autor?.nome ?? 'Sistema',
      autorCor: e.autor?.cor ?? '#9CA3AF',
    }));
  }

  async comentar(cardId, texto) {
    verificar(await this.cliente.from('card_eventos').insert({ card_id: cardId, tipo: 'comentario', texto }));
  }
}
