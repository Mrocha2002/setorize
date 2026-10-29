/**
 * REPOSITORY da Agenda (salas e reservas).
 * O conflito de horário é garantido pelo BANCO (restrição sem_conflito_de_horario);
 * buscarConflito() serve só para mostrar QUEM já reservou.
 */
import { ErroPermissao, verificar } from '../controllers/erros';

const CAMPOS = 'id, sala_id, responsavel_id, titulo, data, inicio, fim, sala:salas(nome), responsavel:perfis(nome, cor, setor_id)';

// O Postgres devolve hora como "09:00:00"; o app usa "09:00".
const hhmm = (t) => (t || '').slice(0, 5);

function paraObjeto(l) {
  return {
    id: l.id,
    salaId: l.sala_id,
    salaNome: l.sala?.nome ?? '',
    responsavelId: l.responsavel_id,
    responsavelNome: l.responsavel?.nome ?? '',
    responsavelCor: l.responsavel?.cor ?? '#9CA3AF',
    responsavelSetorId: l.responsavel?.setor_id ?? null,
    titulo: l.titulo,
    data: l.data,
    inicio: hhmm(l.inicio),
    fim: hhmm(l.fim),
  };
}

export class AgendaRepository {
  constructor(cliente) {
    this.cliente = cliente;
  }

  async listarSalas() {
    return verificar(await this.cliente.from('salas').select('id, nome, capacidade').order('id'));
  }

  async reservasDoDia(data) {
    const linhas = verificar(await this.cliente.from('reservas').select(CAMPOS).eq('data', data).order('inicio'));
    return linhas.map(paraObjeto);
  }

  async buscarConflito(salaId, data, inicio, fim) {
    const linhas = verificar(
      await this.cliente
        .from('reservas')
        .select(CAMPOS)
        .eq('sala_id', salaId)
        .eq('data', data)
        .lt('inicio', fim)
        .gt('fim', inicio)
        .limit(1)
    );
    return linhas.length ? paraObjeto(linhas[0]) : null;
  }

  async inserir(reserva) {
    const l = verificar(
      await this.cliente
        .from('reservas')
        .insert({ sala_id: reserva.salaId, titulo: reserva.titulo, data: reserva.data, inicio: reserva.inicio, fim: reserva.fim })
        .select('id')
        .single()
    );
    return l.id;
  }

  async excluir(id) {
    const linhas = verificar(await this.cliente.from('reservas').delete().eq('id', id).select('id'));
    if (linhas.length === 0) throw new ErroPermissao('Só quem reservou (ou o gestor do setor dessa pessoa) pode cancelar.');
  }

  async proximasDoUsuario(usuarioId, hoje, limite = 3) {
    const linhas = verificar(
      await this.cliente
        .from('reservas')
        .select(CAMPOS)
        .eq('responsavel_id', usuarioId)
        .gte('data', hoje)
        .order('data')
        .order('inicio')
        .limit(limite)
    );
    return linhas.map(paraObjeto);
  }
}
