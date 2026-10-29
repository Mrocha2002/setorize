# Configurar o Supabase (passo a passo, ~15 minutos)

O app guarda tudo no **Supabase**: login (e-mail e senha) e banco de dados PostgreSQL na nuvem. Assim a pessoa entra em qualquer celular e vê os mesmos dados. O plano gratuito é suficiente para o projeto.

---

## 1. Criar o projeto
1. Acesse **https://supabase.com** e crie uma conta (dá para entrar com o GitHub).
2. Clique em **New project**.
   - **Name:** `equipe`
   - **Database Password:** crie uma senha forte e **guarde-a** (você quase não vai usar, mas não dá para recuperar).
   - **Region:** *South America (São Paulo)*, a mais perto: o app fica mais rápido.
3. Espere uns 2 minutos até o projeto ficar pronto.

## 2. Criar as tabelas e as regras de acesso
1. No menu da esquerda, abra **SQL Editor** → **New query**.
2. Abra o arquivo `supabase/schema.sql` deste projeto, copie **tudo** e cole no editor.
3. Clique em **Run**. Deve aparecer *Success. No rows returned*.

Isso cria as tabelas, os gatilhos, as regras RLS (quem vê o quê), 6 setores (Comercial, Financeiro, Operações, RH, Suprimentos, TI) e 3 salas. Para mudar setores ou salas, edite a parte **6. DADOS INICIAIS** do arquivo **antes** de rodar, ou depois em **Table Editor**.

> Rode o arquivo **uma vez só**. Se rodar de novo no mesmo projeto, vai dar erro de "já existe". Para recomeçar do zero, crie outro projeto.

## 3. Desligar a confirmação de e-mail (recomendado para o trabalho)
Por padrão, o Supabase manda um e-mail de confirmação no cadastro, e o envio grátis é limitado. Para a demonstração:

**Authentication** → **Sign In / Providers** → **Email** → desligue **Confirm email** → **Save**.

(O app funciona com a confirmação ligada também: ele avisa a pessoa para confirmar o e-mail antes de entrar.)

## 4. Ligar o app ao seu projeto
1. No painel, clique em **Connect** (no topo) ou vá em **Project Settings → API**.
2. Copie a **Project URL** e a chave **pública**. Ela aparece como *anon public* ou *publishable*.
3. Na pasta do projeto, copie o arquivo `.env.example` para `.env` e preencha:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
   EXPO_PUBLIC_SUPABASE_KEY=eyJ... (ou sb_publishable_...)
   ```
4. Reinicie o Expo limpando o cache: `npx expo start -c`

> ⚠️ **Nunca** use a chave **service_role** / **secret** no app: ela ignora todas as regras de segurança. A chave pública pode ficar no app; quem protege os dados é o RLS do banco.

## 5. Criar as contas e definir os gestores

O gestor é **gestor do setor dele**: vê as tarefas e avisos do próprio setor e o que ele mesmo pediu a outros setores, e pode criar tarefas e avisos para **qualquer** setor. Para ser gestor de um setor, a pessoa se cadastra nesse setor e depois é promovida.
1. No app, toque em **Cadastre-se** e crie a **sua** conta. Toda conta nasce como **colaborador**.
2. No Supabase, em **SQL Editor**, rode (com o seu e-mail):
   ```sql
   update public.perfis set papel = 'gestor' where email = 'seu.email@exemplo.com';
   ```
   Para conferir papéis e setores:
   ```sql
   select nome, email, papel, (select nome from setores s where s.id = setor_id) as setor from public.perfis order by setor, papel;
   ```
3. No app: **Perfil → Sair** e entre de novo. Agora aparece o botão **+** no Kanban e no Mural.

Para a apresentação, crie pelo menos:
| Conta | Papel | Setor |
|---|---|---|
| você | gestor | TI |
| colega 1 | gestor | Suprimentos |
| colega 2 | colaborador | TI |
| colega 3 | colaborador | Suprimentos |

Use dois celulares (ou saia e entre com outra conta) para mostrar que a tarefa para **Suprimentos** aparece para os colegas 1 e 3 e **não** aparece para o colega 2. O gestor de TI vê a tarefa que **ele** pediu a Suprimentos, mas não as tarefas internas de Suprimentos.

### Administrador geral
O admin vê tudo e, pelo app (**Perfil → Gerenciar equipe**), muda papel (colaborador/gestor), setor e cargo de qualquer pessoa. Ele só é definido por SQL:
```sql
update public.perfis set papel = 'admin' where email = 'seu.email@exemplo.com';
```
Depois disso, você não precisa mais de SQL para promover gestores.

## 5.1 Banco criado antes de 27/10/2026? Rode as migrações, em ordem
Rode cada arquivo **uma vez**, numa **New query**, nesta ordem. Nenhum apaga dados. Projetos criados com o `schema.sql` atual não precisam.
1. `supabase/migracoes/20261027_gestor_por_setor.sql` (gestor passa a ser do setor dele)
2. `supabase/migracoes/20261028_admin.sql` (cria o administrador; a última linha define quem é o admin, troque o e-mail se precisar)

## 6. Antes do seminário
- **O plano grátis pausa o projeto depois de 7 dias sem uso.** Abra o painel do Supabase na véspera; se estiver pausado, clique em **Resume project**. Os dados voltam.
- Teste o login na rede da faculdade. Se o Expo Go não conectar, use `npx expo start --tunnel`.

---

## Problemas comuns

| Mensagem no app | Causa | Solução |
|---|---|---|
| "Falta configurar o Supabase" | Sem `.env` ou valores errados | Passo 4 e `npx expo start -c` |
| "Não foi possível criar a conta. Confira o setor escolhido." | O `schema.sql` não foi rodado, ou o setor não existe | Passo 2 |
| "Confirme seu e-mail..." | Confirmação de e-mail ligada | Clique no link do e-mail ou faça o passo 3 |
| "E-mail ou senha incorretos." | Login errado | Confira; senha tem no mínimo 6 caracteres |
| "Sem conexão com o servidor." | Sem internet ou projeto pausado | Verifique a internet; **Resume project** |
| Não aparece o botão **+** | A conta não é gestor, ou não saiu e entrou de novo | Passo 5 |
| Erro ao criar usuário pelo painel do Supabase (*Add user*) | O banco exige o setor, que só o cadastro do app envia | Crie as contas pelo **Cadastre-se** do app |

---

## Como as regras de acesso foram testadas
O arquivo `supabase/schema.sql` é testado num PostgreSQL de verdade (PGlite), simulando o Supabase:
```bash
npm run test:banco
```
São 51 testes: quem vê cada tarefa e aviso, quem pode criar e editar, gestor por setor, administrador, conflito de sala, data passada e permissões de leitura. As migrações também foram testadas: schema antigo + as duas migrações passa nos mesmos 51 testes.
