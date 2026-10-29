/**
 * Utilitários de data.
 *
 * No banco guardamos o prazo no formato ISO "aaaa-mm-dd" (ex.: 2026-11-30).
 * Motivo: nesse formato, ordenar como texto é o mesmo que ordenar por data,
 * então o ORDER BY do SQLite funciona sem conversão.
 *
 * Na tela mostramos no formato brasileiro "dd/mm/aaaa".
 */

/** Completa com zero à esquerda: 5 -> "05" */
function doisDigitos(n) {
  return String(n).padStart(2, '0');
}

/** Data de hoje (fuso local do celular) em ISO "aaaa-mm-dd". */
export function hojeISO(agora = new Date()) {
  return `${agora.getFullYear()}-${doisDigitos(agora.getMonth() + 1)}-${doisDigitos(agora.getDate())}`;
}

/**
 * Converte "dd/mm/aaaa" -> "aaaa-mm-dd".
 * Retorna null se o texto não for uma data real (ex.: 31/02/2026).
 */
export function paraISO(dataBR) {
  if (!dataBR) return null;
  const partes = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(dataBR.trim());
  if (!partes) return null;

  const dia = Number(partes[1]);
  const mes = Number(partes[2]);
  const ano = Number(partes[3]);

  // Truque para validar: o JavaScript "corrige" datas inválidas
  // (31/02 vira 03/03). Se o resultado mudou, a data não existe.
  const d = new Date(ano, mes - 1, dia);
  if (d.getFullYear() !== ano || d.getMonth() !== mes - 1 || d.getDate() !== dia) {
    return null;
  }
  return `${ano}-${doisDigitos(mes)}-${doisDigitos(dia)}`;
}

/** Converte "aaaa-mm-dd" -> "dd/mm/aaaa". Texto vazio se não houver data. */
export function paraBR(iso) {
  if (!iso) return '';
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
}

/**
 * Máscara de digitação: o usuário digita só números e a função
 * coloca as barras. "3011" -> "30/11", "30112026" -> "30/11/2026".
 */
export function mascararData(texto) {
  const numeros = (texto || '').replace(/\D/g, '').slice(0, 8);
  if (numeros.length <= 2) return numeros;
  if (numeros.length <= 4) return `${numeros.slice(0, 2)}/${numeros.slice(2)}`;
  return `${numeros.slice(0, 2)}/${numeros.slice(2, 4)}/${numeros.slice(4)}`;
}

/**
 * Quantos dias faltam até a data ISO (negativo = já passou).
 * Usamos meio-dia para não sofrer com horário de verão.
 */
export function diasAte(iso, hoje = hojeISO()) {
  if (!iso) return null;
  const [a1, m1, d1] = hoje.split('-').map(Number);
  const [a2, m2, d2] = iso.split('-').map(Number);
  const inicio = new Date(a1, m1 - 1, d1, 12);
  const fim = new Date(a2, m2 - 1, d2, 12);
  return Math.round((fim - inicio) / 86400000);
}

/** Texto amigável para o prazo: "Hoje", "Amanhã", "Atrasada 2 dias", "30/11/2026". */
export function descreverPrazo(iso, hoje = hojeISO()) {
  if (!iso) return '';
  const dias = diasAte(iso, hoje);
  if (dias === 0) return 'Hoje';
  if (dias === 1) return 'Amanhã';
  if (dias < 0) return `Atrasada ${-dias} dia${dias === -1 ? '' : 's'}`;
  return paraBR(iso);
}

/** Soma (ou subtrai) dias de uma data ISO: somarDias('2026-10-30', 3) -> '2026-11-02'. */
export function somarDias(iso, dias) {
  const [a, m, d] = iso.split('-').map(Number);
  return hojeISO(new Date(a, m - 1, d + dias, 12));
}

/** Segunda-feira da semana da data ISO (semana começa na segunda). */
export function inicioSemana(iso) {
  const [a, m, d] = iso.split('-').map(Number);
  const diaDaSemana = new Date(a, m - 1, d, 12).getDay(); // 0 = domingo
  const voltar = diaDaSemana === 0 ? 6 : diaDaSemana - 1;
  return somarDias(iso, -voltar);
}

/**
 * Data e hora LOCAIS no formato "aaaa-mm-ddThh:mm:ss".
 * Não usamos toISOString() porque ele converte para UTC (3h a mais no Brasil),
 * e uma tarefa concluída às 22h apareceria como concluída no dia seguinte.
 */
export function agoraLocal(agora = new Date()) {
  const h = doisDigitos(agora.getHours());
  const mi = doisDigitos(agora.getMinutes());
  const s = doisDigitos(agora.getSeconds());
  return `${hojeISO(agora)}T${h}:${mi}:${s}`;
}

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

/** "Seg", "Ter"... para a data ISO. */
export function nomeDiaSemana(iso) {
  const [a, m, d] = iso.split('-').map(Number);
  return DIAS_SEMANA[new Date(a, m - 1, d, 12).getDay()];
}

/** "30/11" (sem o ano) para listas compactas. */
export function dataCurta(iso) {
  if (!iso) return '';
  const [, mes, dia] = iso.slice(0, 10).split('-');
  return `${dia}/${mes}`;
}

// ---------------- Horas ----------------

/** Máscara de hora: o usuário digita "0930" e vê "09:30". */
export function mascararHora(texto) {
  const numeros = (texto || '').replace(/\D/g, '').slice(0, 4);
  if (numeros.length <= 2) return numeros;
  return `${numeros.slice(0, 2)}:${numeros.slice(2)}`;
}

/** true se o texto for uma hora válida "hh:mm" entre 00:00 e 23:59. */
export function horaValida(texto) {
  const partes = /^(\d{2}):(\d{2})$/.exec(texto || '');
  if (!partes) return false;
  return Number(partes[1]) <= 23 && Number(partes[2]) <= 59;
}

/** "09:30" -> 570 (minutos desde a meia-noite). Facilita comparar horários. */
export function paraMinutos(hora) {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
}

/**
 * O servidor devolve data e hora em UTC (ex.: "2026-10-28T23:30:00+00:00").
 * Estas funções convertem para o horário do CELULAR, que é o que o usuário espera ver.
 * 23:30 UTC = 20:30 em Brasília, ainda no mesmo dia.
 */
export function dataLocalDeTimestamp(timestamp) {
  if (!timestamp) return null;
  return hojeISO(new Date(timestamp));
}

export function horaLocalDeTimestamp(timestamp) {
  if (!timestamp) return '';
  const d = new Date(timestamp);
  return `${doisDigitos(d.getHours())}:${doisDigitos(d.getMinutes())}`;
}

/** "Hoje às 14:05" ou "28/10 às 14:05". */
export function quandoFoi(timestamp, hoje = hojeISO()) {
  if (!timestamp) return '';
  const dia = dataLocalDeTimestamp(timestamp);
  const hora = horaLocalDeTimestamp(timestamp);
  return `${dia === hoje ? 'Hoje' : dataCurta(dia)} às ${hora}`;
}

// ---------------- Calendário e relógio do celular ----------------
// O seletor nativo trabalha com objetos Date; o resto do app usa texto ("dd/mm/aaaa" e "hh:mm").

/** Date -> "dd/mm/aaaa" */
export function dateParaBR(data) {
  return `${doisDigitos(data.getDate())}/${doisDigitos(data.getMonth() + 1)}/${data.getFullYear()}`;
}

/** Date -> "hh:mm" */
export function dateParaHora(data) {
  return `${doisDigitos(data.getHours())}:${doisDigitos(data.getMinutes())}`;
}

/** "dd/mm/aaaa" -> Date (meia-noite). Se o texto estiver vazio ou inválido, usa hoje. */
export function brParaDate(dataBR, agora = new Date()) {
  const iso = paraISO(dataBR);
  if (!iso) return new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
  const [ano, mes, dia] = iso.split('-').map(Number);
  return new Date(ano, mes - 1, dia);
}

/** "hh:mm" -> Date de hoje nesse horário. Se vazio ou inválido, usa a próxima hora cheia. */
export function horaParaDate(hora, agora = new Date()) {
  const d = new Date(agora);
  if (horaValida(hora)) {
    const [h, m] = hora.split(':').map(Number);
    d.setHours(h, m, 0, 0);
  } else {
    d.setHours(agora.getHours() + 1, 0, 0, 0);
  }
  return d;
}
