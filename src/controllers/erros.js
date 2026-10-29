/**
 * Erros próprios do app. As telas usam "instanceof" para decidir como mostrar:
 *  - ErroValidacao  -> mensagem embaixo de cada campo
 *  - os outros      -> alerta ou faixa vermelha com e.message
 */
export class ErroValidacao extends Error {
  constructor(erros) {
    super('Dados inválidos');
    this.name = 'ErroValidacao';
    this.erros = erros;
  }
}

export class ErroPermissao extends Error {
  constructor(mensagem = 'Você não tem permissão para fazer isso.') {
    super(mensagem);
    this.name = 'ErroPermissao';
  }
}

export class ErroConflito extends Error {
  constructor(mensagem, reservaExistente = null) {
    super(mensagem);
    this.name = 'ErroConflito';
    this.reservaExistente = reservaExistente;
  }
}

export class ErroAutenticacao extends Error {
  constructor(mensagem) {
    super(mensagem);
    this.name = 'ErroAutenticacao';
  }
}

export class ErroRede extends Error {
  constructor() {
    super('Sem conexão com o servidor. Verifique a internet e tente de novo.');
    this.name = 'ErroRede';
  }
}

/**
 * Traduz o erro que vem do Supabase/PostgreSQL para um erro do app.
 * Códigos do PostgreSQL usados:
 *   42501 = sem permissão (RLS ou gatilho)   23P01 = conflito (reserva sobreposta)
 *   23514 = regra (CHECK) violada            22023 = valor inválido (data passada)
 */
export function traduzirErro(erro) {
  if (!erro) return null;
  const msg = erro.message || '';
  if (/network request failed|failed to fetch|network/i.test(msg)) return new ErroRede();

  switch (erro.code) {
    case '42501':
      // Mensagens escritas por nós nos gatilhos do banco vêm em português: aproveitamos.
      return new ErroPermissao(/[áéíóúãõç]|Somente|Você/.test(msg) ? msg : undefined);
    case '23P01':
      return new ErroConflito('Esta sala já está reservada nesse horário.');
    case '23514':
      return new ErroValidacao({ geral: 'Algum dado está fora das regras (tamanho, horário ou destino).' });
    case '22023':
      return new ErroValidacao({ geral: msg });
    default:
      break;
  }

  // Erros do login (Supabase Auth)
  if (/invalid login credentials/i.test(msg)) return new ErroAutenticacao('E-mail ou senha incorretos.');
  if (/email not confirmed/i.test(msg)) {
    return new ErroAutenticacao('Confirme seu e-mail pelo link que enviamos antes de entrar.');
  }
  if (/already registered|already exists/i.test(msg)) return new ErroAutenticacao('Este e-mail já está cadastrado.');
  if (/database error saving new user/i.test(msg)) {
    return new ErroAutenticacao('Não foi possível criar a conta. Confira o setor escolhido.');
  }
  if (/password/i.test(msg)) return new ErroAutenticacao('Senha fraca: use pelo menos 6 caracteres.');

  return new Error(msg || 'Erro inesperado no servidor.');
}

/** Atalho para as respostas do Supabase: { data, error }. Lança o erro já traduzido. */
export function verificar({ data, error }) {
  if (error) throw traduzirErro(error);
  return data;
}
