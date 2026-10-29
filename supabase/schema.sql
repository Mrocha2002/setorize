-- =====================================================================
-- App Equipe: banco de dados no Supabase (PostgreSQL)
--
-- COMO USAR: no painel do Supabase, abra "SQL Editor", cole este arquivo
-- INTEIRO e clique em "Run". Rode uma única vez num projeto novo.
--
-- O que este arquivo faz:
--   1. Cria as tabelas.
--   2. Cria o perfil automaticamente quando alguém se cadastra no app.
--   3. Liga o RLS (Row Level Security): o PRÓPRIO BANCO decide quem pode
--      ver e alterar cada linha. Mesmo que alguém use a API direto, sem o app,
--      não consegue ver tarefas de outro setor.
--   4. Insere os setores e as salas iniciais.
--
-- Papéis:
--   colaborador  vê o que foi direcionado a ele ou ao setor dele; move tarefas,
--                comenta, assume tarefas do setor, marca avisos como lidos, reserva salas.
--   gestor       é gestor DO SEU SETOR: vê o que é do setor dele (e das pessoas do setor)
--                e o que ele mesmo criou; cria tarefas e avisos para QUALQUER setor;
--                edita e exclui as tarefas que criou ou que são do setor dele;
--                acompanha as leituras dos avisos que ele vê.
--   admin        administrador geral: vê e gerencia TUDO, de todos os setores, e pelo
--                app muda o papel (colaborador/gestor), o setor e o cargo das pessoas.
--   (todo cadastro nasce colaborador; o admin é definido SÓ por SQL, veja o final do arquivo)
-- =====================================================================

create schema if not exists extensions;
-- btree_gist permite a restrição que impede duas reservas da mesma sala no mesmo horário.
create extension if not exists btree_gist with schema extensions;

-- ---------------------------------------------------------------------
-- 1. TABELAS
-- ---------------------------------------------------------------------

create table public.setores (
  id    bigint generated always as identity primary key,
  nome  text not null unique
);

-- Um perfil para cada usuário do Supabase Auth (auth.users guarda e-mail e senha).
create table public.perfis (
  id         uuid primary key references auth.users (id) on delete cascade,
  nome       text not null check (char_length(trim(nome)) between 3 and 80),
  email      text not null,
  setor_id   bigint not null references public.setores (id),
  cargo      text not null default '',
  telefone   text not null default '',
  papel      text not null default 'colaborador',
  cor        text not null default '#6C5CE7',
  criado_em  timestamptz not null default now(),
  constraint perfis_papel_check check (papel in ('colaborador', 'gestor', 'admin'))
);

-- Tarefas do Kanban. Destino: um SETOR (todos do setor veem) ou uma PESSOA.
create table public.cards (
  id              bigint generated always as identity primary key,
  titulo          text not null check (char_length(titulo) between 3 and 80),
  descricao       text check (descricao is null or char_length(descricao) <= 500),
  status          text not null default 'a_fazer' check (status in ('a_fazer', 'fazendo', 'concluido')),
  prioridade      text not null default 'media' check (prioridade in ('baixa', 'media', 'alta')),
  prazo           date,
  setor_id        bigint references public.setores (id) on delete set null,
  responsavel_id  uuid references public.perfis (id) on delete set null,
  criado_por      uuid references public.perfis (id) on delete set null,
  criado_em       timestamptz not null default now(),
  concluido_em    timestamptz,
  constraint card_tem_destino check (setor_id is not null or responsavel_id is not null)
);

-- Histórico de cada tarefa: criação, mudanças de coluna, quem assumiu e comentários.
create table public.card_eventos (
  id         bigint generated always as identity primary key,
  card_id    bigint not null references public.cards (id) on delete cascade,
  autor_id   uuid references public.perfis (id) on delete set null default auth.uid(),
  tipo       text not null check (tipo in ('criado', 'status', 'assumido', 'comentario')),
  texto      text not null check (char_length(texto) between 1 and 500),
  criado_em  timestamptz not null default now()
);

-- Avisos do mural. Destino: TODOS (setor e pessoa vazios), um SETOR ou uma PESSOA.
create table public.avisos (
  id               bigint generated always as identity primary key,
  titulo           text not null check (char_length(titulo) between 3 and 80),
  mensagem         text not null check (char_length(mensagem) between 1 and 1000),
  fixado           boolean not null default false,
  autor_id         uuid not null references public.perfis (id) on delete cascade default auth.uid(),
  setor_id         bigint references public.setores (id) on delete cascade,
  destinatario_id  uuid references public.perfis (id) on delete cascade,
  criado_em        timestamptz not null default now(),
  constraint aviso_um_destino check (setor_id is null or destinatario_id is null)
);

-- Quem já leu cada aviso (o gestor acompanha "lido por X de Y").
create table public.aviso_leituras (
  aviso_id   bigint not null references public.avisos (id) on delete cascade,
  perfil_id  uuid not null references public.perfis (id) on delete cascade default auth.uid(),
  lido_em    timestamptz not null default now(),
  primary key (aviso_id, perfil_id)
);

create table public.salas (
  id          bigint generated always as identity primary key,
  nome        text not null unique,
  capacidade  int not null check (capacidade > 0)
);

create table public.reservas (
  id              bigint generated always as identity primary key,
  sala_id         bigint not null references public.salas (id) on delete cascade,
  responsavel_id  uuid not null references public.perfis (id) on delete cascade default auth.uid(),
  titulo          text not null check (char_length(titulo) between 3 and 60),
  data            date not null,
  inicio          time not null,
  fim             time not null,
  criado_em       timestamptz not null default now(),
  constraint horario_de_funcionamento check (inicio >= time '07:00' and fim <= time '22:00'),
  constraint duracao_minima check (fim >= inicio + interval '15 minutes'),
  -- A REGRA DE CONFLITO, garantida pelo banco: na mesma sala, os intervalos
  -- [data+inicio, data+fim) não podem se sobrepor. '[)' = 10:00-11:00 não conflita com 09:00-10:00.
  constraint sem_conflito_de_horario exclude using gist (
    sala_id with =,
    tsrange(data + inicio, data + fim, '[)') with &&
  )
);

create index on public.cards (setor_id);
create index on public.cards (responsavel_id);
create index on public.card_eventos (card_id);
create index on public.reservas (data);

-- ---------------------------------------------------------------------
-- 2. FUNÇÕES AUXILIARES
-- "security definer" = roda com permissão do dono, sem passar pelo RLS.
-- Isso evita que a regra de "perfis" consulte "perfis" em loop.
-- ---------------------------------------------------------------------

-- O admin também é gestor (pode criar tarefas e avisos).
create or replace function public.eh_gestor() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select papel in ('gestor', 'admin') from perfis where id = auth.uid()), false);
$$;

create or replace function public.eh_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select papel = 'admin' from perfis where id = auth.uid()), false);
$$;

create or replace function public.meu_setor() returns bigint
language sql stable security definer set search_path = public as $$
  select setor_id from perfis where id = auth.uid();
$$;

-- Setor de uma pessoa qualquer (usado para o gestor ver o que é das pessoas do setor dele).
create or replace function public.setor_de(p_perfil uuid) returns bigint
language sql stable security definer set search_path = public as $$
  select setor_id from perfis where id = p_perfil;
$$;

-- REGRA DE VER UM CARD (usada pelo RLS e pelo histórico):
--   quem criou, o responsável, todos do setor de destino, o gestor do setor do responsável e o admin.
create or replace function public.ve_card(p_criado_por uuid, p_setor bigint, p_responsavel uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select eh_admin()
      or p_criado_por = auth.uid()
      or p_responsavel = auth.uid()
      or p_setor = meu_setor()
      or (eh_gestor() and setor_de(p_responsavel) = meu_setor());
$$;

-- REGRA DE GERENCIAR (editar/excluir) UM CARD: admin, gestor que criou, ou gestor do setor da tarefa/do responsável.
create or replace function public.gerencia_card(p_criado_por uuid, p_setor bigint, p_responsavel uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select eh_admin()
      or (eh_gestor()
          and (p_criado_por = auth.uid() or p_setor = meu_setor() or setor_de(p_responsavel) = meu_setor()));
$$;

create or replace function public.pode_ver_card(p_card_id bigint) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from cards c
    where c.id = p_card_id and ve_card(c.criado_por, c.setor_id, c.responsavel_id)
  );
$$;

-- REGRA DE VER UM AVISO: autor, destinatário, setor de destino, "todos", o gestor do setor do destinatário e o admin.
create or replace function public.ve_aviso(p_autor uuid, p_setor bigint, p_destinatario uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select eh_admin()
      or p_autor = auth.uid()
      or p_destinatario = auth.uid()
      or p_setor = meu_setor()
      or (p_setor is null and p_destinatario is null)
      or (eh_gestor() and setor_de(p_destinatario) = meu_setor());
$$;

create or replace function public.pode_ver_aviso(p_aviso_id bigint) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from avisos a
    where a.id = p_aviso_id and ve_aviso(a.autor_id, a.setor_id, a.destinatario_id)
  );
$$;

-- Data de hoje no fuso de Brasília (o servidor do Supabase roda em UTC).
create or replace function public.hoje_brasilia() returns date
language sql stable as $$
  select (now() at time zone 'America/Sao_Paulo')::date;
$$;

-- ---------------------------------------------------------------------
-- 3. GATILHOS (TRIGGERS)
-- ---------------------------------------------------------------------

-- 3.1 Cadastro no app -> cria o perfil. O papel é SEMPRE 'colaborador',
--     mesmo que alguém tente mandar "gestor" nos dados do cadastro.
create or replace function public.criar_perfil() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_setor bigint := nullif(new.raw_user_meta_data ->> 'setor_id', '')::bigint;
  v_cores text[] := array['#6C5CE7','#0984E3','#E84393','#00B894','#E17055','#FDCB6E','#00CEC9','#A29BFE'];
begin
  if v_setor is null or not exists (select 1 from setores where id = v_setor) then
    raise exception 'Setor inválido no cadastro';
  end if;
  insert into perfis (id, nome, email, setor_id, cargo, telefone, cor)
  values (
    new.id,
    trim(coalesce(new.raw_user_meta_data ->> 'nome', '')),
    new.email,
    v_setor,
    trim(coalesce(new.raw_user_meta_data ->> 'cargo', '')),
    trim(coalesce(new.raw_user_meta_data ->> 'telefone', '')),
    v_cores[1 + abs(hashtext(new.id::text)) % array_length(v_cores, 1)]
  );
  return new;
end;
$$;

create trigger ao_criar_usuario
  after insert on auth.users
  for each row execute function public.criar_perfil();

-- 3.2 Card novo: quem criou e as datas são definidos pelo servidor, não pelo app.
create or replace function public.cards_antes_de_inserir() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null then
    new.criado_por := auth.uid();
  end if;
  new.criado_em := now();
  new.status := 'a_fazer';
  new.concluido_em := null;
  return new;
end;
$$;

create trigger cards_antes_de_inserir
  before insert on public.cards
  for each row execute function public.cards_antes_de_inserir();

-- 3.3 Card alterado: grava a data de conclusão e limita o que o colaborador pode mudar.
create or replace function public.cards_antes_de_atualizar() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- Data de conclusão sempre calculada aqui.
  if new.status is distinct from old.status then
    new.concluido_em := case when new.status = 'concluido' then now() else null end;
  else
    new.concluido_em := old.concluido_em;
  end if;

  -- Sem usuário (painel do Supabase / administrador) ou gestor que gerencia esta tarefa: pode tudo.
  if auth.uid() is null or gerencia_card(old.criado_por, old.setor_id, old.responsavel_id) then
    return new;
  end if;

  -- Colaborador: só muda a coluna (status) e pode ASSUMIR uma tarefa sem responsável.
  if new.titulo is distinct from old.titulo
     or new.descricao is distinct from old.descricao
     or new.prioridade is distinct from old.prioridade
     or new.prazo is distinct from old.prazo
     or new.setor_id is distinct from old.setor_id
     or new.criado_por is distinct from old.criado_por
     or new.criado_em is distinct from old.criado_em then
    raise exception 'Somente gestores podem editar os dados da tarefa.' using errcode = '42501';
  end if;

  if new.responsavel_id is distinct from old.responsavel_id
     and not (old.responsavel_id is null and new.responsavel_id = auth.uid()) then
    raise exception 'Você só pode assumir tarefas que ainda não têm responsável.' using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger cards_antes_de_atualizar
  before update on public.cards
  for each row execute function public.cards_antes_de_atualizar();

-- 3.4 Histórico automático: criação, mudança de coluna e "assumir".
create or replace function public.cards_registrar_historico() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  rotulo text;
begin
  if tg_op = 'INSERT' then
    insert into card_eventos (card_id, autor_id, tipo, texto)
    values (new.id, new.criado_por, 'criado', 'Criou a tarefa');
    return new;
  end if;

  if new.status is distinct from old.status then
    rotulo := case new.status when 'a_fazer' then 'A fazer' when 'fazendo' then 'Fazendo' else 'Concluído' end;
    insert into card_eventos (card_id, autor_id, tipo, texto)
    values (new.id, auth.uid(), 'status', 'Moveu para ' || rotulo);
  end if;

  if new.responsavel_id is distinct from old.responsavel_id and new.responsavel_id = auth.uid() then
    insert into card_eventos (card_id, autor_id, tipo, texto)
    values (new.id, auth.uid(), 'assumido', 'Assumiu a tarefa');
  end if;
  return new;
end;
$$;

create trigger cards_historico
  after insert or update on public.cards
  for each row execute function public.cards_registrar_historico();

-- 3.5 Reserva: não pode ser numa data que já passou (no horário de Brasília).
create or replace function public.reservas_validar_data() returns trigger
language plpgsql as $$
begin
  if new.data < hoje_brasilia() then
    raise exception 'Não é possível reservar uma data que já passou.' using errcode = '22023';
  end if;
  return new;
end;
$$;

create trigger reservas_validar_data
  before insert or update on public.reservas
  for each row execute function public.reservas_validar_data();

-- ---------------------------------------------------------------------
-- 4. CONSULTA PARA O GESTOR: leituras de cada aviso ("lido por X de Y")
-- ---------------------------------------------------------------------
create or replace function public.resumo_leituras()
returns table (aviso_id bigint, lidos bigint, total bigint)
language sql stable security definer set search_path = public as $$
  select
    a.id,
    (select count(*) from aviso_leituras l where l.aviso_id = a.id and l.perfil_id <> a.autor_id),
    (select count(*) from perfis p
      where p.id <> a.autor_id
        and (   (a.setor_id is null and a.destinatario_id is null)
             or p.setor_id = a.setor_id
             or p.id = a.destinatario_id))
  from avisos a
  where eh_gestor() and ve_aviso(a.autor_id, a.setor_id, a.destinatario_id);
$$;

-- ---------------------------------------------------------------------
-- 4.1 ADMIN: muda papel, setor e cargo de alguém pelo app.
--     Só o admin chama; ninguém vira admin pelo app (nem o admin se rebaixa sem querer).
-- ---------------------------------------------------------------------
create or replace function public.admin_atualizar_perfil(
  p_perfil uuid, p_papel text, p_setor bigint, p_cargo text
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_papel_atual text;
begin
  if not eh_admin() then
    raise exception 'Somente o administrador pode alterar papel, setor e cargo.' using errcode = '42501';
  end if;
  select papel into v_papel_atual from perfis where id = p_perfil;
  if v_papel_atual is null then
    raise exception 'Pessoa não encontrada.' using errcode = '22023';
  end if;
  if v_papel_atual = 'admin' then
    raise exception 'Você não pode alterar um administrador pelo app.' using errcode = '42501';
  end if;
  if p_papel not in ('colaborador', 'gestor') then
    raise exception 'Papel inválido: escolha colaborador ou gestor.' using errcode = '22023';
  end if;
  if not exists (select 1 from setores where id = p_setor) then
    raise exception 'Setor inválido.' using errcode = '22023';
  end if;
  if char_length(trim(coalesce(p_cargo, ''))) > 60 then
    raise exception 'O cargo pode ter no máximo 60 caracteres.' using errcode = '22023';
  end if;
  update perfis
     set papel = p_papel, setor_id = p_setor, cargo = trim(coalesce(p_cargo, ''))
   where id = p_perfil;
end;
$$;

-- ---------------------------------------------------------------------
-- 5. PERMISSÕES (GRANT) E REGRAS POR LINHA (RLS)
-- ---------------------------------------------------------------------

revoke all on all tables in schema public from anon, authenticated;
grant usage on schema public to anon, authenticated;

grant select on public.setores to anon, authenticated;            -- a tela de cadastro lista os setores
grant select on public.perfis to authenticated;
grant update (nome, cargo, telefone) on public.perfis to authenticated;  -- papel e setor NÃO
grant select, insert, update, delete on public.cards to authenticated;
grant select, insert on public.card_eventos to authenticated;
grant select, insert, delete on public.avisos to authenticated;
grant update (fixado) on public.avisos to authenticated;
grant select, insert on public.aviso_leituras to authenticated;
grant select on public.salas to authenticated;
grant select, insert, delete on public.reservas to authenticated;

revoke execute on function public.resumo_leituras() from public, anon;
grant execute on function public.resumo_leituras() to authenticated;
revoke execute on function public.admin_atualizar_perfil(uuid, text, bigint, text) from public, anon;
grant execute on function public.admin_atualizar_perfil(uuid, text, bigint, text) to authenticated;

alter table public.setores        enable row level security;
alter table public.perfis         enable row level security;
alter table public.cards          enable row level security;
alter table public.card_eventos   enable row level security;
alter table public.avisos         enable row level security;
alter table public.aviso_leituras enable row level security;
alter table public.salas          enable row level security;
alter table public.reservas       enable row level security;

-- Setores e salas: leitura livre.
create policy "setores: todos leem" on public.setores for select using (true);
create policy "salas: logados leem" on public.salas for select to authenticated using (true);

-- Perfis: todos os logados veem (diretório de contatos); cada um edita o próprio.
create policy "perfis: logados leem" on public.perfis for select to authenticated using (true);
create policy "perfis: edita o próprio" on public.perfis for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- Cards: cada um vê o que é dele ou do setor dele; o gestor vê também o que criou
-- e o que foi dado a alguém do setor dele. Gestor cria para qualquer setor.
create policy "cards: ver" on public.cards for select to authenticated
  using (ve_card(criado_por, setor_id, responsavel_id));
create policy "cards: só gestor cria" on public.cards for insert to authenticated
  with check (eh_gestor());
create policy "cards: alterar o que vê" on public.cards for update to authenticated
  using (gerencia_card(criado_por, setor_id, responsavel_id) or responsavel_id = auth.uid() or setor_id = meu_setor())
  with check (gerencia_card(criado_por, setor_id, responsavel_id) or responsavel_id = auth.uid() or setor_id = meu_setor());
create policy "cards: gestor que gerencia exclui" on public.cards for delete to authenticated
  using (gerencia_card(criado_por, setor_id, responsavel_id));

-- Histórico: vê quem vê o card; comentário só em card visível e em nome próprio.
create policy "eventos: ver" on public.card_eventos for select to authenticated
  using (pode_ver_card(card_id));
create policy "eventos: comentar" on public.card_eventos for insert to authenticated
  with check (tipo = 'comentario' and autor_id = auth.uid() and pode_ver_card(card_id));

-- Avisos.
create policy "avisos: ver" on public.avisos for select to authenticated
  using (ve_aviso(autor_id, setor_id, destinatario_id));
create policy "avisos: só gestor publica" on public.avisos for insert to authenticated
  with check (eh_gestor() and autor_id = auth.uid());
create policy "avisos: autor fixa" on public.avisos for update to authenticated
  using (autor_id = auth.uid()) with check (autor_id = auth.uid());
create policy "avisos: autor exclui" on public.avisos for delete to authenticated
  using (autor_id = auth.uid());

-- Leituras: cada um vê a própria; o gestor vê as das pessoas do setor dele.
create policy "leituras: ver" on public.aviso_leituras for select to authenticated
  using (perfil_id = auth.uid() or eh_admin() or (eh_gestor() and setor_de(perfil_id) = meu_setor()));
create policy "leituras: marcar" on public.aviso_leituras for insert to authenticated
  with check (perfil_id = auth.uid() and pode_ver_aviso(aviso_id));

-- Reservas: todos veem a agenda; cada um reserva em nome próprio; cancela a própria
-- (o gestor cancela também as das pessoas do setor dele).
create policy "reservas: ver" on public.reservas for select to authenticated using (true);
create policy "reservas: reservar" on public.reservas for insert to authenticated
  with check (responsavel_id = auth.uid());
create policy "reservas: cancelar" on public.reservas for delete to authenticated
  using (responsavel_id = auth.uid() or eh_admin() or (eh_gestor() and setor_de(responsavel_id) = meu_setor()));

-- ---------------------------------------------------------------------
-- 6. DADOS INICIAIS
-- ---------------------------------------------------------------------
insert into public.setores (nome) values
  ('Comercial'), ('Financeiro'), ('Operações'), ('RH'), ('Suprimentos'), ('TI');

insert into public.salas (nome, capacidade) values
  ('Sala Azul', 8), ('Sala Verde', 4), ('Auditório', 30);

-- ---------------------------------------------------------------------
-- 7. TEMPO REAL: avisa os celulares quando tarefas, avisos e reservas mudam.
--    (No Supabase a publicação "supabase_realtime" já existe.)
-- ---------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.cards, public.card_eventos, public.avisos, public.reservas;
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- 8. DEFINIR O ADMIN (rode depois que a pessoa se cadastrar no app).
--    Depois disso, o admin promove gestores e muda setores pelo próprio app.
--
--   update public.perfis set papel = 'admin' where email = 'seu.email@exemplo.com';
--
--   (Também dá para fazer gestor por SQL: ... set papel = 'gestor' ...)
-- ---------------------------------------------------------------------
