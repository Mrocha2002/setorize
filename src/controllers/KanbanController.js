/**
 * CONTROLLER do Kanban.
 * As permissões de verdade estão no banco (RLS); aqui ficam a validação dos
 * formulários e mensagens claras antes de ir ao servidor.
 */
import { COMENTARIO_MAX, STATUS, normalizarCard, validarCard } from '../models/Card';
import { ehGestor } from '../models/Usuario';
import { ErroPermissao, ErroValidacao } from './erros';

export class KanbanController {
  constructor(cardRepo) {
    this.cards = cardRepo;
  }

  listar() {
    return this.cards.listar();
  }

  buscar(id) {
    return this.cards.buscar(id);
  }

  async salvar(dados, perfil, id = null) {
    if (!ehGestor(perfil)) throw new ErroPermissao('Somente gestores criam e editam tarefas.');
    const { valido, erros } = validarCard(dados);
    if (!valido) throw new ErroValidacao(erros);
    const card = normalizarCard(dados);
    if (id) {
      await this.cards.atualizar(id, card);
      return id;
    }
    return this.cards.inserir(card);
  }

  async mover(id, status) {
    if (!STATUS.includes(status)) throw new Error(`Status inválido: ${status}`);
    await this.cards.mudarStatus(id, status);
  }

  assumir(id, perfil) {
    return this.cards.assumir(id, perfil.id);
  }

  async excluir(id, perfil) {
    if (!ehGestor(perfil)) throw new ErroPermissao('Somente gestores excluem tarefas.');
    await this.cards.excluir(id);
  }

  historico(cardId) {
    return this.cards.eventos(cardId);
  }

  async comentar(cardId, texto) {
    const limpo = (texto || '').trim();
    if (limpo.length === 0) throw new ErroValidacao({ comentario: 'Escreva o comentário.' });
    if (limpo.length > COMENTARIO_MAX) {
      throw new ErroValidacao({ comentario: `O comentário pode ter no máximo ${COMENTARIO_MAX} caracteres.` });
    }
    await this.cards.comentar(cardId, limpo);
  }
}
