/**
 * TESTES DO BANCO (Supabase) num PostgreSQL de verdade (PGlite).
 * Rode com:  npm run test:banco
 *
 * Roda o MESMO supabase/schema.sql que vai para o Supabase e confere as regras
 * de acesso (RLS) com usuários diferentes. Para isso simulamos o que o Supabase
 * já tem pronto: os papéis "anon"/"authenticated", a tabela auth.users e a
 * função auth.uid() (que diz quem está logado).
 *
 * Usa o executor de testes nativo do Node (node:test), não o Jest,
 * porque o PGlite precisa de recursos de módulos que o Jest não oferece.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { after as afterAll, before as beforeAll, describe, test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { btree_gist } from '@electric-sql/pglite/contrib/btree_gist';
import { expect } from './expect.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Por padrão roda o schema.sql. Para testar uma migração num banco antigo:
//   SCHEMA_ARQUIVOS=antigo.sql,migracao.sql node --test supabase/testes/rls.test.mjs
const ARQUIVOS = process.env.SCHEMA_ARQUIVOS ? process.env.SCHEMA_ARQUIVOS.split(',') : [path.join(__dirname, '../schema.sql')];
const SCHEMA = ARQUIVOS.map((a) => fs.readFileSync(a, 'utf8')).join('\n');

const SIMULACAO_SUPABASE = `
  create role anon nologin;
  create role authenticated nologin;
  create publication supabase_realtime;
  create schema auth;
  create table auth.users (
    id uuid primary key default gen_random_uuid(),
    email text unique not null,
    raw_user_meta_data jsonb not null default '{}'
  );
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  grant usage on schema auth to anon, authenticated;
`;

let db;
const u = {}; // ids dos usuários de teste
const setor = {};

/** Executa SQL como um usuário logado (uid) ou como visitante (uid = null). */
async function como(uid, sql, params = []) {
  return db.transaction(async (tx) => {
    await tx.query(`select set_config('request.jwt.claim.sub', $1, true)`, [uid || '']);
    await tx.exec(`set local role ${uid ? 'authenticated' : 'anon'}`);
    const r = await tx.query(sql, params);
    return r.rows;
  });
}

/** Espera que o SQL falhe com um código de erro do Postgres. */
async function falha(promessa, codigo) {
  try {
    await promessa;
  } catch (e) {
    if (codigo) expect(e.code).toBe(codigo);
    return e;
  }
  throw new Error('Era esperado um erro, mas o comando funcionou');
}

/** Simula o cadastro feito pelo app (supabase.auth.signUp com metadados). */
async function cadastrar(email, nome, setorNome, extra = {}) {
  const r = await db.query(
    `insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id`,
    [email, JSON.stringify({ nome, setor_id: setor[setorNome], cargo: 'Analista', telefone: '(19) 90000-0000', ...extra })]
  );
  return r.rows[0].id;
}

beforeAll(async () => {
  db = new PGlite({ extensions: { btree_gist } });
  await db.exec(SIMULACAO_SUPABASE);
  await db.exec(SCHEMA);

  for (const s of (await db.query('select id, nome from setores')).rows) setor[s.nome] = s.id;

  u.ana = await cadastrar('ana@empresa.exemplo', 'Ana Souza', 'Operações');
  u.carla = await cadastrar('carla@empresa.exemplo', 'Carla Mendes', 'Suprimentos');
  u.diego = await cadastrar('diego@empresa.exemplo', 'Diego Alves', 'Suprimentos');
  u.bruno = await cadastrar('bruno@empresa.exemplo', 'Bruno Lima', 'TI');
  // A Ana vira gestora pelo painel do Supabase (sem usuário logado = administrador).
  await db.query(`update perfis set papel = 'gestor' where email = 'ana@empresa.exemplo'`);
});

afterAll(() => db.close());

// ---------------------------------------------------------------------
describe('cadastro e perfis', () => {
  test('o cadastro cria o perfil com o setor escolhido', async () => {
    const [p] = await como(u.carla, 'select nome, papel, setor_id, cor from perfis where id = $1', [u.carla]);
    expect(p).toMatchObject({ nome: 'Carla Mendes', papel: 'colaborador', setor_id: setor.Suprimentos });
    expect(p.cor).toMatch(/^#/);
  });

  test('mandar "gestor" no cadastro NÃO dá papel de gestor', async () => {
    const id = await cadastrar('esperto@empresa.exemplo', 'Espertinho', 'TI', { papel: 'gestor' });
    const [p] = await como(id, 'select papel from perfis where id = $1', [id]);
    expect(p.papel).toBe('colaborador');
  });

  test('cadastro com setor inexistente é recusado', async () => {
    await falha(
      db.query(`insert into auth.users (email, raw_user_meta_data) values ('x@x.com', '{"nome":"Fulano","setor_id":999}')`)
    );
  });

  test('visitante (sem login) lê os setores, mas não os perfis', async () => {
    expect((await como(null, 'select nome from setores')).length).toBe(6);
    await falha(como(null, 'select * from perfis'), '42501');
  });

  test('colaborador muda o próprio telefone, mas não o papel nem o setor', async () => {
    await como(u.bruno, `update perfis set telefone = '(19) 98888-7777' where id = $1`, [u.bruno]);
    const [p] = await como(u.bruno, 'select telefone from perfis where id = $1', [u.bruno]);
    expect(p.telefone).toBe('(19) 98888-7777');
    await falha(como(u.bruno, `update perfis set papel = 'gestor' where id = $1`, [u.bruno]), '42501');
    await falha(como(u.bruno, `update perfis set setor_id = $2 where id = $1`, [u.bruno, setor.RH]), '42501');
  });

  test('ninguém altera o perfil de outra pessoa', async () => {
    const r = await como(u.bruno, `update perfis set nome = 'Hackeado' where id = $1 returning id`, [u.carla]);
    expect(r).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------
describe('tarefas (cards) direcionadas', () => {
  let paraSuprimentos;
  let paraBruno;

  beforeAll(async () => {
    [{ id: paraSuprimentos }] = await como(
      u.ana,
      `insert into cards (titulo, prioridade, setor_id) values ('Cotar papel A4', 'alta', $1) returning id`,
      [setor.Suprimentos]
    );
    [{ id: paraBruno }] = await como(
      u.ana,
      `insert into cards (titulo, responsavel_id, prazo) values ('Trocar roteador', $1, '2026-11-05') returning id`,
      [u.bruno]
    );
  });

  const titulosVistos = async (uid) => (await como(uid, 'select titulo from cards order by id')).map((c) => c.titulo);

  test('colaborador NÃO cria tarefa', async () => {
    await falha(como(u.bruno, `insert into cards (titulo, setor_id) values ('Teste', $1)`, [setor.TI]), '42501');
  });

  test('o servidor grava quem criou e o histórico de criação', async () => {
    const [c] = await como(u.ana, 'select criado_por, status from cards where id = $1', [paraSuprimentos]);
    expect(c).toEqual({ criado_por: u.ana, status: 'a_fazer' });
    const ev = await como(u.ana, 'select tipo, texto from card_eventos where card_id = $1', [paraSuprimentos]);
    expect(ev).toEqual([{ tipo: 'criado', texto: 'Criou a tarefa' }]);
  });

  test('tarefa sem destino é recusada', async () => {
    await falha(como(u.ana, `insert into cards (titulo) values ('Sem destino')`), '23514');
  });

  test('tarefa para o SETOR aparece para todos do setor; para a PESSOA, só para ela', async () => {
    expect(await titulosVistos(u.carla)).toEqual(['Cotar papel A4']);
    expect(await titulosVistos(u.diego)).toEqual(['Cotar papel A4']);
    expect(await titulosVistos(u.bruno)).toEqual(['Trocar roteador']);
  });

  test('a gestora vê as que ela criou, mesmo de outros setores', async () => {
    expect(await titulosVistos(u.ana)).toEqual(['Cotar papel A4', 'Trocar roteador']);
  });

  test('colaborador de outro setor não consegue mover a tarefa (nada é alterado)', async () => {
    const r = await como(u.bruno, `update cards set status = 'fazendo' where id = $1 returning id`, [paraSuprimentos]);
    expect(r).toHaveLength(0);
  });

  test('colaborador do setor assume e move; o servidor grava data e histórico', async () => {
    await como(u.carla, `update cards set responsavel_id = $2 where id = $1`, [paraSuprimentos, u.carla]);
    await como(u.carla, `update cards set status = 'concluido' where id = $1`, [paraSuprimentos]);
    const [c] = await como(u.ana, 'select status, responsavel_id, concluido_em from cards where id = $1', [paraSuprimentos]);
    expect(c.status).toBe('concluido');
    expect(c.responsavel_id).toBe(u.carla);
    expect(c.concluido_em).not.toBeNull();
    const ev = await como(u.ana, 'select tipo, texto, autor_id from card_eventos where card_id = $1 order by id', [paraSuprimentos]);
    expect(ev.map((e) => e.texto)).toEqual(['Criou a tarefa', 'Assumiu a tarefa', 'Moveu para Concluído']);
    expect(ev[2].autor_id).toBe(u.carla);
  });

  test('ao sair de "Concluído", a data de conclusão é apagada', async () => {
    await como(u.carla, `update cards set status = 'fazendo' where id = $1`, [paraSuprimentos]);
    const [c] = await como(u.carla, 'select concluido_em from cards where id = $1', [paraSuprimentos]);
    expect(c.concluido_em).toBeNull();
  });

  test('a tarefa assumida continua visível para o setor', async () => {
    expect(await titulosVistos(u.diego)).toEqual(['Cotar papel A4']);
  });

  test('colaborador não edita título nem passa a tarefa para outra pessoa', async () => {
    const e1 = await falha(como(u.bruno, `update cards set titulo = 'Outro' where id = $1`, [paraBruno]), '42501');
    expect(e1.message).toMatch(/Somente gestores/);
    const e2 = await falha(como(u.diego, `update cards set responsavel_id = $2 where id = $1`, [paraSuprimentos, u.diego]), '42501');
    expect(e2.message).toMatch(/sem responsável|ainda não têm responsável/);
  });

  test('comentário só em tarefa visível e em nome próprio', async () => {
    await como(u.bruno, `insert into card_eventos (card_id, tipo, texto) values ($1, 'comentario', 'Peça chega amanhã')`, [paraBruno]);
    await falha(como(u.bruno, `insert into card_eventos (card_id, tipo, texto) values ($1, 'comentario', 'Intruso')`, [paraSuprimentos]), '42501');
    await falha(
      como(u.bruno, `insert into card_eventos (card_id, tipo, texto, autor_id) values ($1, 'comentario', 'Fingindo', $2)`, [paraBruno, u.carla]),
      '42501'
    );
    await falha(como(u.bruno, `insert into card_eventos (card_id, tipo, texto) values ($1, 'status', 'Falso')`, [paraBruno]), '42501');
    const ev = await como(u.ana, `select texto from card_eventos where card_id = $1 and tipo = 'comentario'`, [paraBruno]);
    expect(ev.map((e) => e.texto)).toEqual(['Peça chega amanhã']);
  });

  test('colaborador não exclui tarefa; gestora exclui', async () => {
    expect(await como(u.bruno, 'delete from cards where id = $1 returning id', [paraBruno])).toHaveLength(0);
    expect(await como(u.ana, 'delete from cards where id = $1 returning id', [paraBruno])).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------
describe('mural de avisos', () => {
  let paraTodos;
  let paraSuprimentos;
  let paraBruno;

  beforeAll(async () => {
    [{ id: paraTodos }] = await como(u.ana, `insert into avisos (titulo, mensagem) values ('Feriado', 'Sem expediente') returning id`);
    [{ id: paraSuprimentos }] = await como(
      u.ana,
      `insert into avisos (titulo, mensagem, setor_id) values ('Inventário', 'Sexta às 8h', $1) returning id`,
      [setor.Suprimentos]
    );
    [{ id: paraBruno }] = await como(
      u.ana,
      `insert into avisos (titulo, mensagem, destinatario_id) values ('Seu acesso', 'Senha nova', $1) returning id`,
      [u.bruno]
    );
  });

  const vistos = async (uid) => (await como(uid, 'select titulo from avisos order by id')).map((a) => a.titulo);

  test('cada um vê os avisos para todos, para o seu setor e para si', async () => {
    expect(await vistos(u.carla)).toEqual(['Feriado', 'Inventário']);
    expect(await vistos(u.bruno)).toEqual(['Feriado', 'Seu acesso']);
    expect(await vistos(u.ana)).toEqual(['Feriado', 'Inventário', 'Seu acesso']);
  });

  test('colaborador não publica nem publica em nome de outro', async () => {
    await falha(como(u.carla, `insert into avisos (titulo, mensagem) values ('Oi', 'teste')`), '42501');
    await falha(como(u.ana, `insert into avisos (titulo, mensagem, autor_id) values ('Oi', 'x', $1)`, [u.carla]), '42501');
  });

  test('aviso não pode ser para setor e pessoa ao mesmo tempo', async () => {
    await falha(
      como(u.ana, `insert into avisos (titulo, mensagem, setor_id, destinatario_id) values ('Duplo', 'x', $1, $2)`, [setor.TI, u.bruno]),
      '23514'
    );
  });

  test('leituras: marca a própria, não a de outro, e só de aviso visível', async () => {
    await como(u.carla, 'insert into aviso_leituras (aviso_id) values ($1)', [paraSuprimentos]);
    await falha(como(u.carla, 'insert into aviso_leituras (aviso_id, perfil_id) values ($1, $2)', [paraTodos, u.diego]), '42501');
    await falha(como(u.carla, 'insert into aviso_leituras (aviso_id) values ($1)', [paraBruno]), '42501');
    // colaborador só enxerga as próprias leituras
    expect(await como(u.diego, 'select * from aviso_leituras')).toHaveLength(0);
  });

  test('gestora acompanha "lido por X de Y"', async () => {
    await como(u.bruno, 'insert into aviso_leituras (aviso_id) values ($1)', [paraTodos]);
    const linhas = await como(u.ana, 'select aviso_id, lidos, total from resumo_leituras() order by aviso_id');
    const porId = Object.fromEntries(linhas.map((l) => [l.aviso_id, [Number(l.lidos), Number(l.total)]]));
    // "todos" = todos os perfis menos a autora (5 cadastrados - Ana = 4, inclui o "Espertinho")
    expect(porId[paraTodos]).toEqual([1, 4]);
    expect(porId[paraSuprimentos]).toEqual([1, 2]);
    expect(porId[paraBruno]).toEqual([0, 1]);
  });

  test('colaborador não consegue usar o resumo de leituras', async () => {
    expect(await como(u.carla, 'select * from resumo_leituras()')).toHaveLength(0);
  });

  test('só a autora fixa e exclui; e não muda o texto', async () => {
    expect(await como(u.carla, 'update avisos set fixado = true where id = $1 returning id', [paraSuprimentos])).toHaveLength(0);
    await como(u.ana, 'update avisos set fixado = true where id = $1', [paraTodos]);
    await falha(como(u.ana, `update avisos set mensagem = 'editado' where id = $1`, [paraTodos]), '42501');
    expect(await como(u.carla, 'delete from avisos where id = $1 returning id', [paraSuprimentos])).toHaveLength(0);
    expect(await como(u.ana, 'delete from avisos where id = $1 returning id', [paraBruno])).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------
describe('agenda de salas', () => {
  const amanha = "(now() at time zone 'America/Sao_Paulo')::date + 1";
  const reservar = (uid, sala, inicio, fim, titulo = 'Reunião') =>
    como(uid, `insert into reservas (sala_id, titulo, data, inicio, fim) values ($1, $2, ${amanha}, $3, $4) returning id`, [
      sala,
      titulo,
      inicio,
      fim,
    ]);

  let reservaDaCarla;

  beforeAll(async () => {
    [{ id: reservaDaCarla }] = await reservar(u.carla, 1, '09:00', '10:00', 'Compras do mês');
  });

  test('horário sobreposto na mesma sala: o BANCO recusa (código 23P01)', async () => {
    await falha(reservar(u.bruno, 1, '09:30', '10:30'), '23P01');
    await falha(reservar(u.bruno, 1, '08:00', '12:00'), '23P01');
    await falha(reservar(u.bruno, 1, '09:00', '10:00'), '23P01');
  });

  test('horário encostado, outra sala ou outro dia: aceito', async () => {
    expect(await reservar(u.bruno, 1, '10:00', '11:00')).toHaveLength(1);
    expect(await reservar(u.bruno, 2, '09:00', '10:00')).toHaveLength(1);
    const outroDia = await como(
      u.bruno,
      `insert into reservas (sala_id, titulo, data, inicio, fim) values (1, 'Outro dia', ${amanha} + 1, '09:00', '10:00') returning id`
    );
    expect(outroDia).toHaveLength(1);
  });

  test('regras de horário e data', async () => {
    await falha(reservar(u.bruno, 3, '06:30', '08:00'), '23514'); // antes de abrir
    await falha(reservar(u.bruno, 3, '21:00', '22:30'), '23514'); // depois de fechar
    await falha(reservar(u.bruno, 3, '10:00', '10:10'), '23514'); // menos de 15 min
    await falha(
      como(u.bruno, `insert into reservas (sala_id, titulo, data, inicio, fim) values (3, 'Ontem', ${amanha} - 2, '09:00', '10:00')`),
      '22023'
    );
  });

  test('não dá para reservar em nome de outra pessoa', async () => {
    await falha(
      como(u.bruno, `insert into reservas (sala_id, titulo, data, inicio, fim, responsavel_id) values (3, 'Falsa', ${amanha}, '15:00', '16:00', $1)`, [
        u.carla,
      ]),
      '42501'
    );
  });

  test('cancelar: outro colaborador não; gestora de OUTRO setor não; a dona sim', async () => {
    expect(await como(u.bruno, 'delete from reservas where id = $1 returning id', [reservaDaCarla])).toHaveLength(0);
    expect(await como(u.ana, 'delete from reservas where id = $1 returning id', [reservaDaCarla])).toHaveLength(0);
    expect(await como(u.carla, 'delete from reservas where id = $1 returning id', [reservaDaCarla])).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------
// GESTOR POR SETOR: cada gestor cuida do próprio setor, mas pode pedir coisas a outros setores.
describe('gestor por setor', () => {
  const c = {}; // ids dos cards
  const a = {}; // ids dos avisos

  beforeAll(async () => {
    u.gustavo = await cadastrar('gustavo@empresa.exemplo', 'Gustavo Fragnani', 'Suprimentos');
    u.mateus = await cadastrar('mateus@empresa.exemplo', 'Mateus Rocha', 'TI');
    await db.query(`update perfis set papel = 'gestor' where email in ('gustavo@empresa.exemplo', 'mateus@empresa.exemplo')`);

    const novoCard = async (uid, titulo, setorNome, responsavel = null) =>
      (await como(uid, `insert into cards (titulo, setor_id, responsavel_id) values ($1, $2, $3) returning id`, [
        titulo,
        setorNome ? setor[setorNome] : null,
        responsavel,
      ]))[0].id;

    c.vpn = await novoCard(u.ana, 'Configurar VPN', null, u.bruno); // Ana (Operações) -> pessoa do TI
    c.proposta = await novoCard(u.ana, 'Proposta cliente X', 'Comercial'); // Ana -> Comercial
    c.cabos = await novoCard(u.mateus, 'Comprar cabos de rede', 'Suprimentos'); // gestor TI -> Suprimentos

    const novoAviso = async (uid, titulo, setorNome, destinatario = null) =>
      (await como(uid, `insert into avisos (titulo, mensagem, setor_id, destinatario_id) values ($1, 'x', $2, $3) returning id`, [
        titulo,
        setorNome ? setor[setorNome] : null,
        destinatario,
      ]))[0].id;
    a.paraBruno = await novoAviso(u.ana, 'Treinamento do Bruno', null, u.bruno);
    a.paraComercial = await novoAviso(u.ana, 'Meta do Comercial', 'Comercial');
  });

  const titulos = async (uid, tabela) => (await como(uid, `select titulo from ${tabela} order by id`)).map((x) => x.titulo);

  test('gestor de TI vê as tarefas do TI e as que ele criou, NÃO as dos outros setores', async () => {
    const vistos = await titulos(u.mateus, 'cards');
    expect(vistos).toEqual(['Configurar VPN', 'Comprar cabos de rede']);
    expect(vistos.includes('Cotar papel A4')).toBe(false);
    expect(vistos.includes('Proposta cliente X')).toBe(false);
  });

  test('gestor de Suprimentos vê as tarefas do setor dele, inclusive a pedida pelo gestor de TI', async () => {
    expect(await titulos(u.gustavo, 'cards')).toEqual(['Cotar papel A4', 'Comprar cabos de rede']);
  });

  test('a tarefa que o gestor de TI mandou para Suprimentos aparece para Suprimentos e não para o TI', async () => {
    expect((await titulos(u.carla, 'cards')).includes('Comprar cabos de rede')).toBe(true);
    expect((await titulos(u.bruno, 'cards')).includes('Comprar cabos de rede')).toBe(false);
  });

  test('quem criou acompanha o andamento: vê o histórico do que o outro setor fez', async () => {
    await como(u.carla, `update cards set responsavel_id = $2 where id = $1`, [c.cabos, u.carla]);
    await como(u.carla, `update cards set status = 'fazendo' where id = $1`, [c.cabos]);
    const ev = await como(u.mateus, 'select texto from card_eventos where card_id = $1 order by id', [c.cabos]);
    expect(ev.map((e) => e.texto)).toEqual(['Criou a tarefa', 'Assumiu a tarefa', 'Moveu para Fazendo']);
    const [card] = await como(u.mateus, 'select status, responsavel_id from cards where id = $1', [c.cabos]);
    expect(card).toEqual({ status: 'fazendo', responsavel_id: u.carla });
  });

  test('o gestor de TI não vê o histórico de tarefas de outro setor', async () => {
    expect(await como(u.mateus, 'select * from card_eventos where card_id = $1', [c.proposta])).toHaveLength(0);
  });

  test('editar: quem criou e o gestor do setor podem; gestor de outro setor não', async () => {
    expect(await como(u.mateus, `update cards set prioridade = 'alta' where id = $1 returning id`, [c.cabos])).toHaveLength(1);
    expect(await como(u.gustavo, `update cards set prazo = '2026-12-01' where id = $1 returning id`, [c.cabos])).toHaveLength(1);
    expect(await como(u.mateus, `update cards set titulo = 'Invasão' where id = $1 returning id`, [c.proposta])).toHaveLength(0);
    expect(await como(u.gustavo, `update cards set titulo = 'Invasão' where id = $1 returning id`, [c.vpn])).toHaveLength(0);
  });

  test('gestor do setor do responsável gerencia a tarefa dada a alguém do setor dele', async () => {
    expect(await como(u.mateus, `update cards set prioridade = 'baixa' where id = $1 returning id`, [c.vpn])).toHaveLength(1);
  });

  test('excluir: gestor de outro setor não exclui', async () => {
    expect(await como(u.mateus, 'delete from cards where id = $1 returning id', [c.proposta])).toHaveLength(0);
    expect(await como(u.gustavo, 'delete from cards where id = $1 returning id', [c.vpn])).toHaveLength(0);
  });

  test('avisos: gestor vê o que é para o setor dele e para as pessoas dele, não o de outros setores', async () => {
    const vistos = await titulos(u.mateus, 'avisos');
    expect(vistos.includes('Treinamento do Bruno')).toBe(true);
    expect(vistos.includes('Meta do Comercial')).toBe(false);
    expect(vistos.includes('Inventário')).toBe(false);
    expect(vistos.includes('Feriado')).toBe(true);
  });

  test('"lido por X de Y" só para avisos que o gestor vê', async () => {
    const ids = (await como(u.mateus, 'select aviso_id from resumo_leituras()')).map((l) => l.aviso_id);
    expect(ids.includes(a.paraBruno)).toBe(true);
    expect(ids.includes(a.paraComercial)).toBe(false);
  });

  test('leituras: o gestor vê as das pessoas do setor dele, não as de outros setores', async () => {
    const leitores = (await como(u.mateus, 'select perfil_id from aviso_leituras')).map((l) => l.perfil_id);
    expect(leitores.includes(u.bruno)).toBe(true);
    expect(leitores.includes(u.carla)).toBe(false);
  });

  test('reservas: o gestor cancela as do setor dele, não as de outros setores', async () => {
    const amanha = "(now() at time zone 'America/Sao_Paulo')::date + 1";
    const reservar = async (uid, inicio, fim) =>
      (await como(uid, `insert into reservas (sala_id, titulo, data, inicio, fim) values (3, 'Reunião', ${amanha}, $1, $2) returning id`, [
        inicio,
        fim,
      ]))[0].id;
    const doBruno = await reservar(u.bruno, '13:00', '14:00');
    const daCarla = await reservar(u.carla, '14:00', '15:00');
    expect(await como(u.mateus, 'delete from reservas where id = $1 returning id', [daCarla])).toHaveLength(0);
    expect(await como(u.mateus, 'delete from reservas where id = $1 returning id', [doBruno])).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------
// ADMIN GERAL: vê tudo e muda papel, setor e cargo pelo app (função admin_atualizar_perfil).
describe('administrador geral', () => {
  const alterar = (uid, perfilId, papel, setorNome, cargo = '') =>
    como(uid, 'select admin_atualizar_perfil($1, $2, $3, $4)', [perfilId, papel, setorNome ? setor[setorNome] : 999, cargo]);

  beforeAll(async () => {
    u.adm = await cadastrar('adm@empresa.exemplo', 'Admin Geral', 'RH');
    await db.query(`update perfis set papel = 'admin' where email = 'adm@empresa.exemplo'`);
  });

  test('admin vê todas as tarefas e todos os avisos', async () => {
    const totalCards = (await db.query('select count(*)::int as n from cards')).rows[0].n;
    const totalAvisos = (await db.query('select count(*)::int as n from avisos')).rows[0].n;
    expect(await como(u.adm, 'select id from cards')).toHaveLength(totalCards);
    expect(await como(u.adm, 'select id from avisos')).toHaveLength(totalAvisos);
  });

  test('admin cria, edita e exclui tarefa de qualquer setor', async () => {
    const [{ id }] = await como(u.adm, `insert into cards (titulo, setor_id) values ('Tarefa do admin', $1) returning id`, [setor.Comercial]);
    expect(await como(u.adm, `update cards set titulo = 'Editada pelo admin' where id = $1 returning id`, [id])).toHaveLength(1);
    expect(await como(u.adm, 'delete from cards where id = $1 returning id', [id])).toHaveLength(1);
  });

  test('admin promove a gestor e muda setor e cargo pelo app', async () => {
    await alterar(u.adm, u.diego, 'gestor', 'TI', '  Coordenador de TI  ');
    const [p] = await db.query('select papel, setor_id, cargo from perfis where id = $1', [u.diego]).then((r) => r.rows);
    expect(p).toEqual({ papel: 'gestor', setor_id: setor.TI, cargo: 'Coordenador de TI' });
    // a mudança vale na hora: agora o Diego é gestor de TI e vê as tarefas das pessoas do TI
    const vistos = (await como(u.diego, 'select titulo from cards')).map((c) => c.titulo);
    expect(vistos.includes('Configurar VPN')).toBe(true);
    await alterar(u.adm, u.diego, 'colaborador', 'Suprimentos', 'Analista'); // volta ao normal
  });

  test('gestor, colaborador e visitante NÃO usam a função de admin', async () => {
    await falha(alterar(u.mateus, u.bruno, 'gestor', 'TI'), '42501');
    await falha(alterar(u.bruno, u.bruno, 'gestor', 'TI'), '42501');
    await falha(alterar(null, u.bruno, 'gestor', 'TI'), '42501');
  });

  test('pelo app ninguém vira admin, e um admin não é alterado', async () => {
    await falha(alterar(u.adm, u.bruno, 'admin', 'TI'), '22023');
    await falha(alterar(u.adm, u.adm, 'colaborador', 'RH'), '42501');
    await falha(como(u.bruno, `update perfis set papel = 'admin' where id = $1`, [u.bruno]), '42501');
  });

  test('admin: setor inexistente, cargo longo e papel fora da lista são recusados', async () => {
    await falha(alterar(u.adm, u.bruno, 'gestor', null), '22023');
    await falha(alterar(u.adm, u.bruno, 'gestor', 'TI', 'x'.repeat(61)), '22023');
    await falha(db.query(`update perfis set papel = 'chefe' where id = $1`, [u.bruno]), '23514');
  });

  test('admin cancela reserva de qualquer pessoa e vê todas as leituras', async () => {
    const [{ id }] = await como(
      u.carla,
      `insert into reservas (sala_id, titulo, data, inicio, fim) values (2, 'Da Carla', (now() at time zone 'America/Sao_Paulo')::date + 3, '08:00', '09:00') returning id`
    );
    expect(await como(u.adm, 'delete from reservas where id = $1 returning id', [id])).toHaveLength(1);
    const total = (await db.query('select count(*)::int as n from aviso_leituras')).rows[0].n;
    expect(await como(u.adm, 'select * from aviso_leituras')).toHaveLength(total);
  });
});

// ---------------------------------------------------------------------
describe('estrutura usada pelo app', () => {
  test('nomes das chaves estrangeiras usadas nas consultas do app existem', async () => {
    const r = await db.query(`select conname from pg_constraint where contype = 'f' order by conname`);
    const nomes = r.rows.map((x) => x.conname);
    for (const n of ['cards_responsavel_id_fkey', 'cards_criado_por_fkey', 'avisos_autor_id_fkey', 'avisos_destinatario_id_fkey']) {
      expect(nomes.includes(n)).toBe(true);
    }
  });

  test('tabelas publicadas para o tempo real', async () => {
    const r = await db.query(`select tablename from pg_publication_tables where pubname = 'supabase_realtime' order by 1`);
    expect(r.rows.map((x) => x.tablename)).toEqual(['avisos', 'card_eventos', 'cards', 'reservas']);
  });
});
