/**
 * MODEL de usuário: regras de login e cadastro.
 * A senha mínima de 6 caracteres é a mesma exigida pelo Supabase Auth.
 */
export const SENHA_MIN = 6;
const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function emailValido(email) {
  return EMAIL_VALIDO.test((email || '').trim());
}

export function validarLogin({ email, senha }) {
  const erros = {};
  if (!emailValido(email)) erros.email = 'Informe um e-mail válido.';
  if (!senha) erros.senha = 'Informe a senha.';
  return { valido: Object.keys(erros).length === 0, erros };
}

export function validarCadastro(dados) {
  const erros = {};
  const nome = (dados.nome || '').trim();
  if (nome.length < 3 || nome.length > 80) erros.nome = 'Informe seu nome completo (3 a 80 caracteres).';
  if (!emailValido(dados.email)) erros.email = 'Informe um e-mail válido.';
  if ((dados.senha || '').length < SENHA_MIN) erros.senha = `A senha precisa ter pelo menos ${SENHA_MIN} caracteres.`;
  if (dados.confirmacao !== dados.senha) erros.confirmacao = 'As senhas não conferem.';
  if (!dados.setorId) erros.setorId = 'Escolha o seu setor.';
  return { valido: Object.keys(erros).length === 0, erros };
}

/** Prepara os dados para o servidor: e-mail em minúsculas e sem espaços. */
export function normalizarCadastro(dados) {
  return {
    nome: dados.nome.trim(),
    email: dados.email.trim().toLowerCase(),
    senha: dados.senha,
    setorId: dados.setorId,
    cargo: (dados.cargo || '').trim(),
    telefone: (dados.telefone || '').trim(),
  };
}

/** O admin também é gestor: cria tarefas e avisos. */
export const ehGestor = (perfil) => perfil?.papel === 'gestor' || perfil?.papel === 'admin';
export const ehAdmin = (perfil) => perfil?.papel === 'admin';

export const ROTULO_PAPEL = { colaborador: 'Colaborador', gestor: 'Gestor', admin: 'Administrador' };
export const rotuloPapel = (papel) => ROTULO_PAPEL[papel] ?? 'Colaborador';

/** Papéis que o admin pode dar pelo app. "admin" fica de fora de propósito: só por SQL. */
export const PAPEIS_EDITAVEIS = ['colaborador', 'gestor'];
export const CARGO_MAX = 60;

/** Validação da tela do admin (a mesma regra está na função admin_atualizar_perfil do banco). */
export function validarAlteracaoPerfil(dados) {
  const erros = {};
  if (!PAPEIS_EDITAVEIS.includes(dados.papel)) erros.papel = 'Escolha colaborador ou gestor.';
  if (!dados.setorId) erros.setorId = 'Escolha o setor.';
  if ((dados.cargo || '').trim().length > CARGO_MAX) erros.cargo = `O cargo pode ter no máximo ${CARGO_MAX} caracteres.`;
  return { valido: Object.keys(erros).length === 0, erros };
}

/**
 * O gestor é gestor DO SEU SETOR. Ele edita e exclui a tarefa se:
 * criou a tarefa, ou ela é do setor dele, ou o responsável é do setor dele.
 * (Mesma regra da função gerencia_card() do banco; aqui só decide se mostra os botões.)
 */
export function podeGerenciarCard(card, perfil) {
  if (!ehGestor(perfil) || !card) return false;
  if (ehAdmin(perfil)) return true;
  return (
    card.criadoPor === perfil.id ||
    (!!card.setorId && card.setorId === perfil.setorId) ||
    (!!card.responsavelSetorId && card.responsavelSetorId === perfil.setorId)
  );
}
