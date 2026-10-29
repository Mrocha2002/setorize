-- =====================================================================
-- MIGRAÇÃO 2026-10-28: ADMINISTRADOR GERAL
--
-- Rode UMA vez no SQL Editor (New query -> colar -> Run), DEPOIS da
-- migração 20261027_gestor_por_setor.sql. Projetos novos não precisam:
-- o schema.sql já está com estas regras. Não apaga nenhum dado.
--
-- O que muda:
--   - novo papel 'admin': vê e gerencia tudo, de todos os setores;
--   - o admin muda papel (colaborador/gestor), setor e cargo das pessoas PELO APP
--     (função admin_atualizar_perfil);
--   - ninguém vira admin pelo app: só por SQL (última linha deste arquivo).
-- =====================================================================

begin;

alter table public.perfis drop constraint if exists perfis_papel_check;
alter table public.perfis add constraint perfis_papel_check check (papel in ('colaborador', 'gestor', 'admin'));

create or replace function public.eh_gestor() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select papel in ('gestor', 'admin') from perfis where id = auth.uid()), false);
$$;

create or replace function public.eh_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select papel = 'admin' from perfis where id = auth.uid()), false);
$$;

create or replace function public.ve_card(p_criado_por uuid, p_setor bigint, p_responsavel uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select eh_admin()
      or p_criado_por = auth.uid()
      or p_responsavel = auth.uid()
      or p_setor = meu_setor()
      or (eh_gestor() and setor_de(p_responsavel) = meu_setor());
$$;

create or replace function public.gerencia_card(p_criado_por uuid, p_setor bigint, p_responsavel uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select eh_admin()
      or (eh_gestor()
          and (p_criado_por = auth.uid() or p_setor = meu_setor() or setor_de(p_responsavel) = meu_setor()));
$$;

create or replace function public.ve_aviso(p_autor uuid, p_setor bigint, p_destinatario uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select eh_admin()
      or p_autor = auth.uid()
      or p_destinatario = auth.uid()
      or p_setor = meu_setor()
      or (p_setor is null and p_destinatario is null)
      or (eh_gestor() and setor_de(p_destinatario) = meu_setor());
$$;

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

revoke execute on function public.admin_atualizar_perfil(uuid, text, bigint, text) from public, anon;
grant execute on function public.admin_atualizar_perfil(uuid, text, bigint, text) to authenticated;

drop policy if exists "leituras: ver" on public.aviso_leituras;
drop policy if exists "reservas: cancelar" on public.reservas;
create policy "leituras: ver" on public.aviso_leituras for select to authenticated
  using (perfil_id = auth.uid() or eh_admin() or (eh_gestor() and setor_de(perfil_id) = meu_setor()));
create policy "reservas: cancelar" on public.reservas for delete to authenticated
  using (responsavel_id = auth.uid() or eh_admin() or (eh_gestor() and setor_de(responsavel_id) = meu_setor()));

-- O administrador geral do projeto:
update public.perfis set papel = 'admin' where email = 'matheus.rocha@seter.com.br';

commit;
