/**
 * Monta repositórios e controllers em cima do cliente Supabase.
 * Os testes passam serviços "falsos" no lugar deste (injeção de dependência),
 * por isso o resto do app nunca importa o Supabase diretamente.
 */
import { supabase, supabaseConfigurado } from './supabase';
import { AuthRepository } from '../repositories/AuthRepository';
import { PerfilRepository } from '../repositories/PerfilRepository';
import { CardRepository } from '../repositories/CardRepository';
import { AvisoRepository } from '../repositories/AvisoRepository';
import { AgendaRepository } from '../repositories/AgendaRepository';
import { TempoRealRepository } from '../repositories/TempoRealRepository';
import { AuthController } from '../controllers/AuthController';
import { KanbanController } from '../controllers/KanbanController';
import { MuralController } from '../controllers/MuralController';
import { AgendaController } from '../controllers/AgendaController';
import { PainelController } from '../controllers/PainelController';
import { EquipeController } from '../controllers/EquipeController';

export function montarServicos(repos) {
  return {
    configurado: true,
    auth: new AuthController(repos.auth),
    perfis: repos.perfis,
    kanban: new KanbanController(repos.cards),
    mural: new MuralController(repos.avisos),
    agenda: new AgendaController(repos.agenda),
    painel: new PainelController(repos.cards, repos.agenda),
    equipe: new EquipeController(repos.perfis),
    tempoReal: repos.tempoReal,
  };
}

export function servicosSupabase() {
  if (!supabaseConfigurado) return { configurado: false };
  return montarServicos({
    auth: new AuthRepository(supabase),
    perfis: new PerfilRepository(supabase),
    cards: new CardRepository(supabase),
    avisos: new AvisoRepository(supabase),
    agenda: new AgendaRepository(supabase),
    tempoReal: new TempoRealRepository(supabase),
  });
}
