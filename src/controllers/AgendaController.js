/**
 * CONTROLLER da Agenda de salas.
 * Valida no app (resposta rápida) e o banco garante a regra de conflito
 * mesmo se duas pessoas reservarem ao mesmo tempo em celulares diferentes.
 */
import { normalizarReserva, validarReserva } from '../models/Reserva';
import { ErroConflito, ErroValidacao } from './erros';
import { relogioReal } from './relogio';

export class AgendaController {
  constructor(agendaRepo, relogio = relogioReal) {
    this.agenda = agendaRepo;
    this.relogio = relogio;
  }

  listarSalas() {
    return this.agenda.listarSalas();
  }

  async agendaDoDia(data) {
    const [salas, reservas] = await Promise.all([this.agenda.listarSalas(), this.agenda.reservasDoDia(data)]);
    return salas.map((sala) => ({ sala, reservas: reservas.filter((r) => r.salaId === sala.id) }));
  }

  async reservar(dados) {
    const { valido, erros } = validarReserva(dados, this.relogio.hoje());
    if (!valido) throw new ErroValidacao(erros);
    const reserva = normalizarReserva(dados);
    try {
      return await this.agenda.inserir(reserva);
    } catch (e) {
      if (!(e instanceof ErroConflito)) throw e;
      // O banco recusou: descobre quem está na sala para a mensagem ficar útil.
      const c = await this.agenda.buscarConflito(reserva.salaId, reserva.data, reserva.inicio, reserva.fim);
      if (!c) throw e;
      throw new ErroConflito(
        `${c.salaNome} já está reservada das ${c.inicio} às ${c.fim} por ${c.responsavelNome} ("${c.titulo}").`,
        c
      );
    }
  }

  cancelar(reservaId) {
    return this.agenda.excluir(reservaId);
  }

  proximasDoUsuario(usuarioId) {
    return this.agenda.proximasDoUsuario(usuarioId, this.relogio.hoje());
  }
}
