/** TESTES DE UNIDADE: tradução dos erros do Supabase/PostgreSQL para mensagens do app. */
import { ErroAutenticacao, ErroConflito, ErroPermissao, ErroRede, ErroValidacao, traduzirErro, verificar } from '../src/controllers/erros';

test('códigos do PostgreSQL', () => {
  expect(traduzirErro({ code: '23P01', message: 'conflicting key value' })).toBeInstanceOf(ErroConflito);
  const rls = traduzirErro({ code: '42501', message: 'new row violates row-level security policy for table "cards"' });
  expect(rls).toBeInstanceOf(ErroPermissao);
  expect(rls.message).toBe('Você não tem permissão para fazer isso.');
  expect(traduzirErro({ code: '42501', message: 'Somente gestores podem editar os dados da tarefa.' }).message).toBe(
    'Somente gestores podem editar os dados da tarefa.'
  );
  expect(traduzirErro({ code: '23514', message: 'check' })).toBeInstanceOf(ErroValidacao);
});

test('erros do login', () => {
  expect(traduzirErro({ message: 'Invalid login credentials' }).message).toBe('E-mail ou senha incorretos.');
  expect(traduzirErro({ message: 'Email not confirmed' })).toBeInstanceOf(ErroAutenticacao);
  expect(traduzirErro({ message: 'User already registered' }).message).toBe('Este e-mail já está cadastrado.');
});

test('sem internet', () => {
  expect(traduzirErro({ message: 'TypeError: Network request failed' })).toBeInstanceOf(ErroRede);
});

test('verificar devolve os dados ou lança o erro traduzido', () => {
  expect(verificar({ data: [1], error: null })).toEqual([1]);
  expect(() => verificar({ data: null, error: { code: '23P01', message: 'x' } })).toThrow(ErroConflito);
});
