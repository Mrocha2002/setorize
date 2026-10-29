/**
 * MODEL do Kanban. Um card é uma tarefa direcionada a um SETOR (todos do setor
 * veem e qualquer um pode assumir) ou a uma PESSOA (ela, quem criou e o gestor do setor dela veem).
 *
 * JavaScript puro: sem React e sem servidor. Por isso é fácil de testar.
 */
import { hojeISO, paraISO } from '../utils/datas';

export const STATUS = ['a_fazer', 'fazendo', 'concluido'];
export const ROTULO_STATUS = { a_fazer: 'A fazer', fazendo: 'Fazendo', concluido: 'Concluído' };
export const PRIORIDADES = ['baixa', 'media', 'alta'];
export const ROTULO_PRIORIDADE = { baixa: 'Baixa', media: 'Média', alta: 'Alta' };

export const TITULO_MIN = 3;
export const TITULO_MAX = 80;
export const DESCRICAO_MAX = 500;
export const COMENTARIO_MAX = 500;

/** dados.destino = 'setor' (usa setorId) ou 'pessoa' (usa responsavelId). Prazo em "dd/mm/aaaa". */
export function validarCard(dados) {
  const erros = {};
  const titulo = (dados.titulo || '').trim();
  if (titulo.length < TITULO_MIN) erros.titulo = `O título precisa ter pelo menos ${TITULO_MIN} caracteres.`;
  else if (titulo.length > TITULO_MAX) erros.titulo = `O título pode ter no máximo ${TITULO_MAX} caracteres.`;
  if ((dados.descricao || '').trim().length > DESCRICAO_MAX) {
    erros.descricao = `A descrição pode ter no máximo ${DESCRICAO_MAX} caracteres.`;
  }
  if (!PRIORIDADES.includes(dados.prioridade)) erros.prioridade = 'Escolha uma prioridade.';
  if (dados.prazo && dados.prazo.trim() !== '' && !paraISO(dados.prazo)) {
    erros.prazo = 'Data inválida. Use o formato dd/mm/aaaa.';
  }
  if (dados.destino === 'setor' && !dados.setorId) erros.destino = 'Escolha o setor.';
  else if (dados.destino === 'pessoa' && !dados.responsavelId) erros.destino = 'Escolha a pessoa.';
  else if (dados.destino !== 'setor' && dados.destino !== 'pessoa') erros.destino = 'Escolha para quem é a tarefa.';
  return { valido: Object.keys(erros).length === 0, erros };
}

/**
 * Formato enviado ao servidor.
 * Tarefa de setor: setorId preenchido; responsavelId só se alguém já assumiu (na edição).
 * Tarefa de pessoa: só responsavelId.
 */
export function normalizarCard(dados) {
  const descricao = (dados.descricao || '').trim();
  const paraSetor = dados.destino === 'setor';
  return {
    titulo: dados.titulo.trim(),
    descricao: descricao === '' ? null : descricao,
    prioridade: dados.prioridade,
    prazo: dados.prazo ? paraISO(dados.prazo) : null,
    setorId: paraSetor ? dados.setorId : null,
    responsavelId: dados.responsavelId ?? null,
  };
}

export function estaAtrasado(card, hoje = hojeISO()) {
  return card.status !== 'concluido' && !!card.prazo && card.prazo < hoje;
}

export function proximoStatus(status) {
  const i = STATUS.indexOf(status);
  return i >= 0 && i < STATUS.length - 1 ? STATUS[i + 1] : null;
}

export function statusAnterior(status) {
  const i = STATUS.indexOf(status);
  return i > 0 ? STATUS[i - 1] : null;
}

/** "Suprimentos" (tarefa do setor), "Carla Mendes" (tarefa pessoal), "Suprimentos · Carla" (assumida). */
export function descreverDestino(card) {
  if (card.setorNome && card.responsavelNome) return `${card.setorNome} · ${card.responsavelNome.split(' ')[0]}`;
  return card.setorNome || card.responsavelNome || '—';
}

/** O usuário pode assumir: tarefa do setor dele, ainda sem responsável. */
export function podeAssumir(card, perfil) {
  return !!perfil && !card.responsavelId && !!card.setorId && card.setorId === perfil.setorId;
}

/**
 * Filtra o quadro. O SERVIDOR já só devolve o que a pessoa pode ver;
 * aqui é só a escolha de visualização na tela.
 *   'meus'  -> responsável sou eu
 *   'setor' -> tarefas do meu setor
 *   'todos' -> tudo que eu posso ver (gestor: o setor dele + o que ele criou; pode filtrar por setor)
 */
export function filtrarCards(cards, { escopo = 'todos', setorId = null }, perfil) {
  return cards.filter((c) => {
    if (escopo === 'meus') return c.responsavelId === perfil.id;
    if (escopo === 'setor') return c.setorId === perfil.setorId;
    if (setorId) return c.setorId === setorId || (c.responsavelSetorId === setorId && !c.setorId);
    return true;
  });
}

/** Separa por coluna: { a_fazer: [], fazendo: [], concluido: [] } com alta prioridade primeiro. */
export function montarQuadro(cards) {
  const peso = { alta: 0, media: 1, baixa: 2 };
  const colunas = Object.fromEntries(STATUS.map((s) => [s, []]));
  const ordenados = [...cards].sort(
    (a, b) =>
      peso[a.prioridade] - peso[b.prioridade] ||
      (a.prazo ?? '9999').localeCompare(b.prazo ?? '9999') ||
      a.id - b.id
  );
  for (const c of ordenados) colunas[c.status].push(c);
  return colunas;
}
