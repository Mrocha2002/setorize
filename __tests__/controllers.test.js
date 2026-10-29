/** TESTES DE INTEGRAÇÃO: controllers + servidor falso (mesmas regras do banco). */
import { criarServidorFalso } from './helpers/servidorFalso';
import { montarServicos } from '../src/services/montarServicos';
import { AgendaController } from '../src/controllers/AgendaController';
import { ErroConflito, ErroPermissao, ErroValidacao } from '../src/controllers/erros';
import { hojeISO, paraBR, somarDias } from '../src/utils/datas';

let s;
let srv;
let ana;
let carla;
let bruno;

beforeEach(async () => {
  srv = criarServidorFalso();
  s = montarServicos(srv.repos);
  srv.criarConta('ana@x.com', 'Ana Souza', 'Operações', 'gestor');
  srv.criarConta('carla@x.com', 'Carla Mendes', 'Suprimentos');
  srv.criarConta('bruno@x.com', 'Bruno Lima', 'TI');
  const entrar = async (email) => {
    const id = await s.auth.entrar({ email, senha: 'senha123' });
    return s.perfis.buscar(id);
  };
  ana = await entrar('ana@x.com');
  carla = { ...(await s.perfis.buscar('u-2')) };
  bruno = { ...(await s.perfis.buscar('u-3')) };
  s.entrarComo = entrar;
});

test('login valida antes de ir ao servidor', async () => {
  await expect(s.auth.entrar({ email: 'x', senha: '' })).rejects.toBeInstanceOf(ErroValidacao);
  await expect(s.auth.entrar({ email: 'ana@x.com', senha: 'errada' })).rejects.toThrow('E-mail ou senha incorretos.');
});

test('cadastro valida e cria colaborador', async () => {
  await expect(s.auth.cadastrar({ nome: 'X', email: 'y', senha: '1', confirmacao: '2' })).rejects.toBeInstanceOf(ErroValidacao);
  await s.auth.cadastrar({ nome: 'Diego Alves', email: 'Diego@X.com', senha: '123456', confirmacao: '123456', setorId: srv.setorPorNome('Suprimentos') });
  expect(srv.db.perfis.find((p) => p.email === 'diego@x.com').papel).toBe('colaborador');
});

test('Kanban: só gestor cria; colaborador do setor assume e comenta', async () => {
  await expect(s.kanban.salvar({ titulo: 'X', destino: 'setor' }, carla)).rejects.toBeInstanceOf(ErroPermissao);
  const id = await s.kanban.salvar({ titulo: 'Cotar papel', prioridade: 'alta', destino: 'setor', setorId: carla.setorId }, ana);
  await s.entrarComo('bruno@x.com');
  expect(await s.kanban.listar()).toHaveLength(0);
  await s.entrarComo('carla@x.com');
  await s.kanban.assumir(id, carla);
  await s.kanban.mover(id, 'fazendo');
  await expect(s.kanban.comentar(id, '   ')).rejects.toBeInstanceOf(ErroValidacao);
  await s.kanban.comentar(id, 'Fornecedor respondeu');
  expect((await s.kanban.historico(id)).map((e) => e.texto)).toEqual(['Criou a tarefa', 'Assumiu a tarefa', 'Moveu para Fazendo', 'Fornecedor respondeu']);
  await expect(s.kanban.excluir(id, carla)).rejects.toBeInstanceOf(ErroPermissao);
});

test('Mural: lido/não lido e resumo de leituras para o gestor', async () => {
  const id = await s.mural.publicar({ titulo: 'Inventário', mensagem: 'Sexta', destino: 'setor', setorId: carla.setorId }, ana);
  expect((await s.mural.listar(ana))[0]).toMatchObject({ lido: true, leituras: { lidos: 0, total: 1 } });
  await s.entrarComo('carla@x.com');
  expect((await s.mural.listar(carla))[0]).toMatchObject({ lido: false, leituras: null });
  await s.mural.marcarLido(id);
  expect((await s.mural.listar(carla))[0].lido).toBe(true);
  await expect(s.mural.publicar({ titulo: 'Oi', mensagem: 'x', destino: 'todos' }, carla)).rejects.toBeInstanceOf(ErroPermissao);
});

test('Agenda: conflito do banco vira mensagem com o nome de quem reservou', async () => {
  const agenda = new AgendaController(srv.repos.agenda, { hoje: () => hojeISO() });
  const amanha = paraBR(somarDias(hojeISO(), 1));
  await agenda.reservar({ titulo: 'Compras', salaId: 1, data: amanha, inicio: '09:00', fim: '10:00' });
  await s.entrarComo('bruno@x.com');
  await expect(agenda.reservar({ titulo: 'Choque', salaId: 1, data: amanha, inicio: '09:30', fim: '10:30' })).rejects.toThrow(
    'Sala Azul já está reservada das 09:00 às 10:00 por Ana Souza ("Compras").'
  );
  await expect(agenda.reservar({ titulo: 'Logo depois', salaId: 1, data: amanha, inicio: '10:00', fim: '11:00' })).resolves.toBeDefined();
  await expect(agenda.reservar({ titulo: 'Tarde', salaId: 1, data: amanha, inicio: '09:00', fim: '09:05' })).rejects.toBeInstanceOf(ErroValidacao);
  expect(ErroConflito).toBeDefined();
});

test('Painel: gestor vê a equipe; colaborador vê o próprio', async () => {
  const id = await s.kanban.salvar({ titulo: 'Para o Bruno', prioridade: 'media', destino: 'pessoa', responsavelId: bruno.id }, ana);
  await s.kanban.salvar({ titulo: 'Para a Carla', prioridade: 'media', destino: 'pessoa', responsavelId: carla.id }, ana);
  await s.entrarComo('bruno@x.com');
  await s.kanban.mover(id, 'concluido');
  const doBruno = await s.painel.indicadores(bruno);
  expect(doBruno.meu.totais).toMatchObject({ total: 1, concluidos: 1 });
  expect(doBruno.equipe.totais.total).toBe(1); // só enxerga a própria
  await s.entrarComo('ana@x.com');
  const daAna = await s.painel.indicadores(ana);
  expect(daAna.equipe.totais).toMatchObject({ total: 2, concluidos: 1 });
  expect(daAna.equipe.porPessoa.map((p) => p.nome)).toEqual(['Bruno Lima', 'Carla Mendes']);
});

test('Equipe: só o admin muda papel, setor e cargo; admin não é alterado; ninguém vira admin', async () => {
  srv.criarConta('adm@x.com', 'Admin Geral', 'TI', 'admin');
  const adm = await s.entrarComo('adm@x.com');
  await s.equipe.alterar(carla, { papel: 'gestor', setorId: srv.setorPorNome('Comercial'), cargo: '  Coordenadora ' }, adm);
  expect(srv.db.perfis.find((p) => p.id === carla.id)).toMatchObject({ papel: 'gestor', setorId: srv.setorPorNome('Comercial'), cargo: 'Coordenadora' });

  await expect(s.equipe.alterar(bruno, { papel: 'admin', setorId: 1, cargo: '' }, adm)).rejects.toBeInstanceOf(ErroValidacao);
  await expect(s.equipe.alterar(bruno, { papel: 'gestor', setorId: null, cargo: '' }, adm)).rejects.toBeInstanceOf(ErroValidacao);
  await expect(s.equipe.alterar(adm, { papel: 'colaborador', setorId: 1, cargo: '' }, adm)).rejects.toBeInstanceOf(ErroPermissao);
  await expect(s.equipe.alterar(bruno, { papel: 'gestor', setorId: 1, cargo: '' }, ana)).rejects.toBeInstanceOf(ErroPermissao);
  // o servidor também recusa, mesmo se o app fosse burlado
  await s.entrarComo('ana@x.com');
  await expect(srv.repos.perfis.alterarPorAdmin(bruno.id, { papel: 'gestor', setorId: 1, cargo: '' })).rejects.toBeInstanceOf(ErroPermissao);
});
