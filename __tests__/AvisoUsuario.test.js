/** TESTES DE UNIDADE: aviso, cadastro/login e contatos. */
import { descreverDestinoAviso, normalizarAviso, podeGerenciarAviso, validarAviso } from '../src/models/Aviso';
import { ehAdmin, ehGestor, emailValido, podeGerenciarCard, rotuloPapel, validarAlteracaoPerfil, normalizarCadastro, validarCadastro, validarLogin } from '../src/models/Usuario';
import { iniciais, linkEmail, linkLigacao, linkWhatsApp } from '../src/models/Colaborador';

describe('Aviso', () => {
  const ok = { titulo: 'Inventário', mensagem: 'Sexta 8h', destino: 'todos' };
  test('validação e destino', () => {
    expect(validarAviso(ok).valido).toBe(true);
    expect(validarAviso({ ...ok, destino: 'setor' }).erros.destino).toBe('Escolha o setor.');
    expect(validarAviso({ ...ok, destino: 'pessoa' }).erros.destino).toBe('Escolha a pessoa.');
    expect(validarAviso({ ...ok, mensagem: ' ' }).erros.mensagem).toBeDefined();
  });
  test('normalizar mantém só o destino escolhido', () => {
    expect(normalizarAviso({ ...ok, destino: 'setor', setorId: 5, destinatarioId: 'x', fixado: undefined })).toEqual({
      titulo: 'Inventário', mensagem: 'Sexta 8h', fixado: false, setorId: 5, destinatarioId: null,
    });
  });
  test('descrição do destino e permissão do autor', () => {
    expect(descreverDestinoAviso({})).toBe('Para todos');
    expect(descreverDestinoAviso({ setorNome: 'TI' })).toBe('Para TI');
    expect(descreverDestinoAviso({ destinatarioNome: 'Bruno Lima' })).toBe('Para Bruno Lima');
    expect(podeGerenciarAviso({ autorId: 'a' }, 'a')).toBe(true);
    expect(podeGerenciarAviso({ autorId: 'a' }, 'b')).toBe(false);
  });
});

describe('Usuário', () => {
  test('e-mail', () => {
    expect(emailValido('ana@empresa.com.br')).toBe(true);
    expect(emailValido('ana@empresa')).toBe(false);
    expect(emailValido('ana empresa.com')).toBe(false);
  });
  test('login', () => {
    expect(validarLogin({ email: 'x', senha: '' }).erros).toEqual({ email: 'Informe um e-mail válido.', senha: 'Informe a senha.' });
  });
  test('cadastro', () => {
    const r = validarCadastro({ nome: 'Al', email: 'a@b.co', senha: '123', confirmacao: '1234', setorId: null });
    expect(Object.keys(r.erros).sort()).toEqual(['confirmacao', 'nome', 'senha', 'setorId']);
    const ok = { nome: ' Carla Mendes ', email: ' Carla@Empresa.com ', senha: '123456', confirmacao: '123456', setorId: 5 };
    expect(validarCadastro(ok).valido).toBe(true);
    expect(normalizarCadastro(ok)).toMatchObject({ nome: 'Carla Mendes', email: 'carla@empresa.com' });
  });
  test('papel', () => {
    expect(ehGestor({ papel: 'gestor' })).toBe(true);
    expect(ehGestor({ papel: 'colaborador' })).toBe(false);
    expect(ehGestor(null)).toBe(false);
  });
  test('gestor por setor: gerencia o que criou, o do setor dele e o das pessoas do setor dele', () => {
    const gestorTI = { id: 'm', papel: 'gestor', setorId: 6 };
    expect(podeGerenciarCard({ criadoPor: 'm', setorId: 5 }, gestorTI)).toBe(true); // criou para Suprimentos
    expect(podeGerenciarCard({ criadoPor: 'x', setorId: 6 }, gestorTI)).toBe(true); // tarefa do TI
    expect(podeGerenciarCard({ criadoPor: 'x', setorId: null, responsavelSetorId: 6 }, gestorTI)).toBe(true); // pessoa do TI
    expect(podeGerenciarCard({ criadoPor: 'x', setorId: 5, responsavelSetorId: 5 }, gestorTI)).toBe(false); // outro setor
    expect(podeGerenciarCard({ criadoPor: 'm', setorId: 6 }, { id: 'm', papel: 'colaborador', setorId: 6 })).toBe(false);
    expect(podeGerenciarCard(null, gestorTI)).toBe(false);
  });
  test('admin: é gestor, gerencia qualquer tarefa e tem rótulo próprio', () => {
    const adm = { id: 'a', papel: 'admin', setorId: 1 };
    expect(ehGestor(adm)).toBe(true);
    expect(ehAdmin(adm)).toBe(true);
    expect(ehAdmin({ papel: 'gestor' })).toBe(false);
    expect(podeGerenciarCard({ criadoPor: 'x', setorId: 5, responsavelSetorId: 5 }, adm)).toBe(true);
    expect(rotuloPapel('admin')).toBe('Administrador');
    expect(rotuloPapel('gestor')).toBe('Gestor');
  });
  test('validação da alteração feita pelo admin', () => {
    expect(validarAlteracaoPerfil({ papel: 'gestor', setorId: 2, cargo: 'Coordenador' }).valido).toBe(true);
    expect(validarAlteracaoPerfil({ papel: 'admin', setorId: 2 }).erros.papel).toBeDefined();
    expect(validarAlteracaoPerfil({ papel: 'gestor', setorId: null }).erros.setorId).toBeDefined();
    expect(validarAlteracaoPerfil({ papel: 'gestor', setorId: 2, cargo: 'x'.repeat(61) }).erros.cargo).toBeDefined();
  });
});

test('Contatos: links', () => {
  expect(iniciais('Ana Paula Souza')).toBe('AS');
  expect(linkLigacao('(19) 90000-0001')).toBe('tel:19900000001');
  expect(linkWhatsApp('(19) 90000-0001')).toBe('https://wa.me/5519900000001');
  expect(linkWhatsApp('+55 19 90000-0001')).toBe('https://wa.me/5519900000001');
  expect(linkEmail('a@b.com')).toBe('mailto:a@b.com');
});
