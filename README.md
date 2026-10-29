# Setorize: app de gestão de equipe por setores para Android

Projeto da disciplina **Programação para Dispositivos Móveis em Android** (TI · UniMetrocamp · Prof. Mauro Rodrigues Alves Nogueira) · Aluno: Matheus Rocha.

---

## 1. Objetivo do projeto

Aplicativo Android em que o **gestor direciona tarefas e avisos** a um setor ou a uma pessoa, e cada colaborador vê, no próprio celular, o que é dele. Cada **gestor é gestor do seu setor**: acompanha a própria equipe e o que pediu a outros setores, sem ver o resto da empresa. Um **administrador geral** vê tudo e, pelo próprio app, define quem é gestor, o setor e o cargo de cada pessoa. Com login por e-mail e senha, os dados ficam na nuvem: a pessoa entra em qualquer aparelho e encontra as mesmas informações.

| Módulo | O que faz |
|---|---|
| **Login e cadastro** | E-mail e senha (Supabase Auth). No cadastro a pessoa escolhe o setor. Toda conta nasce colaborador. O **administrador** muda papel (colaborador/gestor), setor e cargo pela tela **Gerenciar equipe**; o próprio administrador só é definido por SQL |
| **Painel** | *Para você*: minhas pendentes, atrasadas, tarefas do setor sem dono, avisos não lidos. **Gestor:** % de entregas no prazo, entregas por semana, desempenho por setor e por pessoa. **Colaborador:** o próprio desempenho |
| **Kanban** | Tarefas em A fazer → Fazendo → Concluído. O gestor cria a tarefa para **qualquer setor** (todos do setor veem e qualquer um assume) ou para uma **pessoa**. Ele vê as tarefas do setor dele e as que pediu; edita as que criou ou que são do setor dele. Cada tarefa tem **histórico** (quem criou, assumiu, moveu) e **comentários** de andamento |
| **Mural de avisos** | O gestor publica para todos, para um setor ou para uma pessoa (o destino é obrigatório: nada vai para "todos" sem querer). O colaborador vê o selo "Novo" e marca como lido; o gestor vê **"Lido por X de Y"** |
| **Agenda de salas** | Reserva por dia e horário. O **banco** impede duas reservas sobrepostas na mesma sala |
| **Contatos** | Colaboradores cadastrados, com busca e filtro por setor; ligar, WhatsApp e e-mail |

Os selos vermelhos nas abas mostram tarefas novas e avisos não lidos, e a tela atualiza sozinha quando alguém cria ou move algo (Supabase Realtime).

---

## 2. Arquitetura e stack

| Camada | Tecnologia |
|---|---|
| App | React Native 0.88 + Expo SDK 58 (JavaScript/JSX) |
| Navegação | React Navigation 7 (pilha + 5 abas) |
| Backend | **Supabase**: Auth (e-mail/senha), PostgreSQL, Realtime, API REST (PostgREST) |
| Cliente | `@supabase/supabase-js` (sessão salva no AsyncStorage) |
| Segurança | **RLS (Row Level Security)** + gatilhos no PostgreSQL |
| Testes | Jest + React Native Testing Library (app) · PGlite, um PostgreSQL real (banco) |

```
 VIEW         screens/ (13 telas) + components/
   │ useApp()                         ▲ estado
 FLUX         context/AppContext + appReducer (função pura)
   │
 CONTROLLER   Auth · Kanban · Mural · Agenda · Painel   (validam com os MODELS)
   │
 REPOSITORY   Auth · Perfil · Card · Aviso · Agenda · TempoReal   (supabase-js)
   │  HTTPS
 SUPABASE     Auth ── PostgreSQL ── RLS + gatilhos ── Realtime
```

**Onde fica cada regra:**
- **Quem vê e quem altera** cada linha está no **banco** (RLS em `supabase/schema.sql`). Mesmo usando a API sem o app, um colaborador de TI não lê as tarefas de Suprimentos.
- **Conflito de sala**: a restrição `EXCLUDE` no banco garante a regra até quando dois celulares reservam ao mesmo tempo.
- **Histórico e datas** (criação, conclusão, quem assumiu) são gravados por **gatilhos** no servidor; o celular não consegue forjar.
- **Validação dos formulários** fica nos `models/`, para dar a resposta na hora, antes de ir à rede.

```
src/
  models/        regras e validações (JS puro): Card, Aviso, Reserva, Usuario, Colaborador, Metricas
  controllers/   regras de uso + tradução de erros do servidor (erros.js)
  repositories/  consultas ao Supabase (único lugar que fala com o servidor)
  services/      cliente Supabase e montagem dos serviços
  context/       estado global (Flux)
  screens/ components/ navigation/ theme/ utils/
supabase/
  schema.sql     tabelas, RLS, gatilhos, setores e salas  ← rodar no Supabase
  testes/        testes do banco (PostgreSQL real)
__tests__/       testes do app (unidade, controllers, ponta a ponta)
```

### Modelo de dados
`setores` · `perfis` (1 por usuário, com setor e papel) · `cards` (destino: setor e/ou responsável) · `card_eventos` (histórico e comentários) · `avisos` (destino: todos, setor ou pessoa) · `aviso_leituras` · `salas` · `reservas`.

---

## 3. Acesso e execução

**Pré-requisitos:** Node.js 20+, celular Android com **Expo Go** (SDK 58) e uma conta grátis no Supabase.

```bash
npm install
# 1x: configurar o Supabase -> veja SUPABASE.md (criar projeto, rodar o SQL, preencher o .env)
npx expo start          # escaneie o QR Code com o Expo Go
npx expo start --tunnel # se a rede bloquear
```

APK opcional: `npx eas-cli@latest build -p android --profile preview`, com `"buildType": "apk"` no perfil `preview` do `eas.json`.

---

## 4. Alterações, testes e validações

```bash
npm test            # 59 testes do app (Jest)
npm run test:banco  # 51 testes do banco num PostgreSQL real (PGlite)
npm run test:tudo   # os dois
npx expo lint
```

| Arquivo | O que verifica |
|---|---|
| `supabase/testes/rls.test.mjs` | **Regras do banco:** cadastro sempre como colaborador; **gestor por setor** (vê e gerencia só o próprio setor e o que criou); **admin** (vê tudo; só ele muda papel/setor/cargo; ninguém vira admin pelo app); colaborador não muda o próprio papel ou setor; tarefa de setor só aparece para o setor, de pessoa só para ela; colaborador não cria, não edita título, não repassa a tarefa; assume e move; histórico automático; comentários; avisos por destino; leituras; "lido por X de Y"; conflito de sala (código 23P01); horário, duração e data passada; cancelamento |
| `__tests__/Card`, `AvisoUsuario`, `Reserva`, `Metricas`, `datas` | Validações, filtros do Kanban, cálculo do painel, datas UTC → horário local |
| `__tests__/CampoDataHora.test.js` | Calendário e relógio do celular devolvem a data e a hora no formato do app; botão Limpar |
| `__tests__/erros.test.js` | Erros do servidor viram mensagens em português |
| `__tests__/appReducer.test.js` | Flux: filtro por papel, sair apaga os dados, selos de pendência |
| `__tests__/controllers.test.js` | Controllers + servidor falso com as mesmas regras |
| `__tests__/app.login.e2e.test.js` | Cadastro, validação, sair, senha errada, entrar |
| `__tests__/app.gestor-colaborador.e2e.test.js` | Gestora cria tarefa e aviso para Suprimentos → TI não vê → Suprimentos é avisada, assume, move e comenta → gestora vê o histórico, "lido por 1 de 1", painel, WhatsApp, conflito de sala |
| `__tests__/app.admin.e2e.test.js` | Admin: aviso exige destino; promove a Carla a gestora, muda setor e cargo; a Carla entra já como gestora com o botão "+" |
| `__tests__/app.gestor-por-setor.e2e.test.js` | Gestor de TI pede tarefa a Suprimentos e acompanha, mas não vê as tarefas internas de Suprimentos; o gestor de Suprimentos vê as duas e edita; a colaboradora assume, sem editar |

Os repositórios também foram testados durante o desenvolvimento contra o **PostgREST 12** (o servidor REST que o Supabase usa) ligado a esse mesmo banco: consultas com relacionamentos, filtros, RPC e tradução de erros.

**Fluxo de alteração:** branch → mudar (regras em `models/`/`controllers/`, acesso a dados só em `repositories/`, permissões só no `schema.sql`) → testes → `npm run test:tudo` + lint → teste no celular → commit/PR. Mudança no banco em produção: criar um arquivo novo `supabase/migracoes/AAAAMMDD_descricao.sql` e rodar no SQL Editor, nunca rodar de novo o schema já aplicado. Exemplos reais: `20261027_gestor_por_setor.sql` (trocou o gestor geral pelo gestor por setor) e `20261028_admin.sql` (criou o administrador). As duas foram testadas sobre o schema antigo antes de ir para o Supabase.

---

## 5. Atualização e monitoramento
- **App:** `npx expo install expo@latest`, `npx expo install --fix`, `npx expo-doctor`. EAS Update envia correções de JavaScript sem reinstalar.
- **Supabase:** painel → **Logs** (Auth, API, Postgres) mostram erros de login, consultas recusadas e lentidão; **Reports** mostra uso. O plano grátis pausa o projeto após 7 dias sem uso (**Resume project**).
- **Backup:** o plano grátis não tem backup automático acessível; antes de mudanças grandes, exporte as tabelas no Table Editor.
- **Erros no app:** em produção, integrar um crash reporting (ex.: Sentry).

---

## Limitações e próximos passos
1. **Notificação push** (com o app fechado) exige um *development build* (EAS) e o serviço de push; o Expo Go no Android não recebe push remoto. Hoje o aviso é dentro do app: selos, "Novo" e atualização em tempo real.
2. "Esqueci a senha" exige deep link de volta para o app; não implementado.
3. Cadastro de setores e salas e a definição do administrador são feitos no painel do Supabase, não no app. Promover gestores, mudar setor e cargo já é pelo app (admin).
4. Funciona só com internet (não há modo offline).
