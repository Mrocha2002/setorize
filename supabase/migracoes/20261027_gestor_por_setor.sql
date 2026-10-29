-- =====================================================================
-- MIGRAÇÃO 2026-10-27: gestor POR SETOR
--
-- Para quem JÁ rodou o schema.sql antigo (gestor geral). Rode este arquivo
-- UMA vez no SQL Editor do Supabase (New query -> colar -> Run).
-- Projetos novos não precisam: o schema.sql já está com estas regras.
--
-- Antes: todo gestor via e gerenciava TUDO.
-- Agora: o gestor é gestor DO SEU SETOR:
--   - vê o que é do setor dele, o que foi dado a pessoas do setor dele e o que ele criou;
--   - cria tarefas e avisos para QUALQUER setor (e acompanha o que criou);
--   - edita/exclui as tarefas que criou ou que são do setor dele;
--   - cancela reservas próprias e das pessoas do setor dele.
-- Não apaga nenhum dado.
-- =====================================================================

begin;

create or replace function public.setor_de(p_perfil uuid) returns bigint
language sql stable security definer set search_path = public as $$
  select setor_id from perfis where id = p_perfil;
$$;

create or replace function public.ve_card(p_criado_por uuid, p_setor bigint, p_responsavel uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select p_criado_por = auth.uid()
      or p_responsavel = auth.uid()
      or p_setor = meu_setor()
      or (eh_gestor() and setor_de(p_responsavel) = meu_setor());
$$;

create or replace function public.gerencia_card(p_criado_por uuid, p_setor bigint, p_responsavel uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select eh_gestor()
     and (p_criado_por = auth.uid() or p_setor = meu_setor() or setor_de(p_responsavel) = meu_setor());
$$;

create or replace function public.pode_ver_card(p_card_id bigint) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from cards c
    where c.id = p_card_id and ve_card(c.criado_por, c.setor_id, c.responsavel_id)
  );
$$;

create or replace function public.ve_aviso(p_autor uuid, p_setor bigint, p_destinatario uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select p_autor = auth.uid()
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

drop policy if exists "cards: ver" on public.cards;
drop policy if exists "cards: alterar o que vê" on public.cards;
drop policy if exists "cards: só gestor exclui" on public.cards;
drop policy if exists "cards: gestor que gerencia exclui" on public.cards;
drop policy if exists "avisos: ver" on public.avisos;
drop policy if exists "leituras: ver" on public.aviso_leituras;
drop policy if exists "reservas: cancelar" on public.reservas;

create policy "cards: ver" on public.cards for select to authenticated
  using (ve_card(criado_por, setor_id, responsavel_id));
create policy "cards: alterar o que vê" on public.cards for update to authenticated
  using (gerencia_card(criado_por, setor_id, responsavel_id) or responsavel_id = auth.uid() or setor_id = meu_setor())
  with check (gerencia_card(criado_por, setor_id, responsavel_id) or responsavel_id = auth.uid() or setor_id = meu_setor());
create policy "cards: gestor que gerencia exclui" on public.cards for delete to authenticated
  using (gerencia_card(criado_por, setor_id, responsavel_id));
create policy "avisos: ver" on public.avisos for select to authenticated
  using (ve_aviso(autor_id, setor_id, destinatario_id));
create policy "leituras: ver" on public.aviso_leituras for select to authenticated
  using (perfil_id = auth.uid() or (eh_gestor() and setor_de(perfil_id) = meu_setor()));
create policy "reservas: cancelar" on public.reservas for delete to authenticated
  using (responsavel_id = auth.uid() or (eh_gestor() and setor_de(responsavel_id) = meu_setor()));

commit;
