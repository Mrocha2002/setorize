/**
 * MODEL de Colaborador: funções para exibir e contatar uma pessoa.
 */

/** "Ana Paula Souza" -> "AS" (primeira letra do primeiro e do último nome). */
export function iniciais(nome) {
  const partes = (nome || '').trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '?';
  if (partes.length === 1) return partes[0][0].toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

/** Mantém só os dígitos: "(19) 99876-5432" -> "19998765432". */
export function soDigitos(telefone) {
  return (telefone || '').replace(/\D/g, '');
}

/** Link que abre o discador do celular. */
export function linkLigacao(telefone) {
  return `tel:${soDigitos(telefone)}`;
}

/**
 * Link do WhatsApp. O formato oficial é https://wa.me/<código do país><DDD><número>.
 * Se o número não tiver o 55 do Brasil, colocamos.
 */
export function linkWhatsApp(telefone) {
  const numeros = soDigitos(telefone);
  const comPais = numeros.startsWith('55') && numeros.length > 11 ? numeros : `55${numeros}`;
  return `https://wa.me/${comPais}`;
}

/** Link que abre o app de e-mail. */
export function linkEmail(email) {
  return `mailto:${email}`;
}
