/**
 * CONTROLLER do Painel (Dashboard de desempenho).
 */
import { calcularPainel } from '../models/Metricas';
import { relogioReal } from './relogio';

export class PainelController {
  constructor(cardRepo, agendaRepo, relogio = relogioReal) {
    this.cards = cardRepo;
    this.agenda = agendaRepo;
    this.relogio = relogio;
  }

  async indicadores(perfil) {
    const hoje = this.relogio.hoje();
    const [cards, reunioes] = await Promise.all([
      this.cards.listar(),
      this.agenda.proximasDoUsuario(perfil.id, hoje),
    ]);
    return {
      // tudo que a pessoa enxerga (para o gestor = o setor dele + o que ele criou)
      equipe: calcularPainel(cards, hoje, perfil),
      // só as tarefas em que ela é a responsável
      meu: calcularPainel(cards.filter((c) => c.responsavelId === perfil.id), hoje, perfil),
      minhasReunioes: reunioes,
    };
  }
}
