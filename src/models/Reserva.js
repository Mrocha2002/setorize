/**
 * MODEL da Agenda de salas de reunião.
 *
 * A regra mais importante do app inteiro está aqui: duas reservas da mesma sala
 * no mesmo dia não podem se sobrepor.
 */
import { horaValida, paraISO, paraMinutos } from '../utils/datas';

export const HORA_ABERTURA = '07:00';
export const HORA_FECHAMENTO = '22:00';
export const DURACAO_MINIMA = 15; // minutos

/**
 * Dois intervalos [inicio, fim) se sobrepõem quando um começa antes do outro terminar
 * E termina depois do outro começar.
 *
 *   09:00-10:00 e 10:00-11:00 -> NÃO conflitam (um termina quando o outro começa)
 *   09:00-10:00 e 09:30-10:30 -> conflitam
 */
export function haConflito(a, b) {
  return paraMinutos(a.inicio) < paraMinutos(b.fim) && paraMinutos(a.fim) > paraMinutos(b.inicio);
}

/**
 * Valida o formulário (data "dd/mm/aaaa", horas "hh:mm").
 * "hoje" vem de fora para os testes não dependerem do relógio.
 */
export function validarReserva(dados, hoje) {
  const erros = {};
  const titulo = (dados.titulo || '').trim();

  if (titulo.length < 3 || titulo.length > 60) {
    erros.titulo = 'Informe o assunto da reunião (3 a 60 caracteres).';
  }
  if (!dados.salaId) {
    erros.salaId = 'Escolha uma sala.';
  }

  const dataISO = paraISO(dados.data || '');
  if (!dataISO) {
    erros.data = 'Data inválida. Use dd/mm/aaaa.';
  } else if (dataISO < hoje) {
    erros.data = 'Não é possível reservar uma data que já passou.';
  }

  const inicioOk = horaValida(dados.inicio);
  const fimOk = horaValida(dados.fim);
  if (!inicioOk) erros.inicio = 'Hora inválida (hh:mm).';
  if (!fimOk) erros.fim = 'Hora inválida (hh:mm).';

  if (inicioOk && fimOk) {
    const ini = paraMinutos(dados.inicio);
    const fim = paraMinutos(dados.fim);
    if (ini < paraMinutos(HORA_ABERTURA) || fim > paraMinutos(HORA_FECHAMENTO)) {
      erros.inicio = `As salas funcionam das ${HORA_ABERTURA} às ${HORA_FECHAMENTO}.`;
    } else if (fim - ini < DURACAO_MINIMA) {
      erros.fim = `O término deve ser pelo menos ${DURACAO_MINIMA} minutos depois do início.`;
    }
  }

  return { valido: Object.keys(erros).length === 0, erros };
}

export function normalizarReserva(dados) {
  return {
    titulo: (dados.titulo || '').trim(),
    salaId: dados.salaId,
    data: paraISO(dados.data),
    inicio: dados.inicio,
    fim: dados.fim,
  };
}

/** Quem reservou pode cancelar; o gestor cancela também as reservas das pessoas do setor dele. */
export function podeCancelarReserva(reserva, perfil) {
  if (!reserva || !perfil) return false;
  if (reserva.responsavelId === perfil.id) return true;
  if (perfil.papel === 'admin') return true;
  return perfil.papel === 'gestor' && !!reserva.responsavelSetorId && reserva.responsavelSetorId === perfil.setorId;
}
