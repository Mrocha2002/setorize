/**
 * MODEL do Mural. Destino: 'todos', 'setor' (setorId) ou 'pessoa' (destinatarioId).
 */
export const AVISO_TITULO_MIN = 3;
export const AVISO_TITULO_MAX = 80;
export const AVISO_MENSAGEM_MAX = 1000;

export function validarAviso(dados) {
  const erros = {};
  const titulo = (dados.titulo || '').trim();
  const mensagem = (dados.mensagem || '').trim();
  if (titulo.length < AVISO_TITULO_MIN || titulo.length > AVISO_TITULO_MAX) {
    erros.titulo = `O título deve ter entre ${AVISO_TITULO_MIN} e ${AVISO_TITULO_MAX} caracteres.`;
  }
  if (mensagem.length === 0) erros.mensagem = 'Escreva a mensagem do aviso.';
  else if (mensagem.length > AVISO_MENSAGEM_MAX) {
    erros.mensagem = `A mensagem pode ter no máximo ${AVISO_MENSAGEM_MAX} caracteres.`;
  }
  if (dados.destino === 'setor' && !dados.setorId) erros.destino = 'Escolha o setor.';
  if (dados.destino === 'pessoa' && !dados.destinatarioId) erros.destino = 'Escolha a pessoa.';
  if (!['todos', 'setor', 'pessoa'].includes(dados.destino)) erros.destino = 'Escolha para quem é o aviso.';
  return { valido: Object.keys(erros).length === 0, erros };
}

export function normalizarAviso(dados) {
  return {
    titulo: dados.titulo.trim(),
    mensagem: dados.mensagem.trim(),
    fixado: !!dados.fixado,
    setorId: dados.destino === 'setor' ? dados.setorId : null,
    destinatarioId: dados.destino === 'pessoa' ? dados.destinatarioId : null,
  };
}

export function descreverDestinoAviso(aviso) {
  if (aviso.destinatarioNome) return `Para ${aviso.destinatarioNome}`;
  if (aviso.setorNome) return `Para ${aviso.setorNome}`;
  return 'Para todos';
}

export function podeGerenciarAviso(aviso, usuarioId) {
  return !!aviso && aviso.autorId === usuarioId;
}
