/**
 * Cálculo dos indicadores do Painel (Dashboard de desempenho).
 *
 * Recebe a lista de cards que o usuário PODE ver (o servidor já filtrou pelo RLS):
 *  - o gestor recebe os cards do setor dele e os que ele criou → vê a equipe dele;
 *  - o colaborador recebe os dele e do setor → vê o próprio desempenho.
 *
 * Função pura: mesmos cards + mesma data = mesmo resultado. Testável sem servidor.
 */
import { dataLocalDeTimestamp, inicioSemana, somarDias } from '../utils/datas';
import { estaAtrasado } from './Card';

export const SEMANAS_NO_GRAFICO = 6;

/** Conta quantas datas caem em cada uma das últimas N semanas (segunda a domingo). */
export function agruparPorSemana(datas, hoje, semanas = SEMANAS_NO_GRAFICO) {
  const atual = inicioSemana(hoje);
  const resultado = [];
  for (let i = semanas - 1; i >= 0; i--) resultado.push({ inicio: somarDias(atual, -7 * i), total: 0 });
  for (const dia of datas) {
    const item = resultado.find((r) => r.inicio === inicioSemana(dia));
    if (item) item.total += 1;
  }
  return resultado;
}

function contar(cards, hoje) {
  return {
    total: cards.length,
    aFazer: cards.filter((c) => c.status === 'a_fazer').length,
    fazendo: cards.filter((c) => c.status === 'fazendo').length,
    concluidos: cards.filter((c) => c.status === 'concluido').length,
    atrasados: cards.filter((c) => estaAtrasado(c, hoje)).length,
  };
}

/**
 * Entrega no prazo = concluída num dia igual ou anterior ao prazo.
 * Cards sem prazo não entram na conta.
 */
function entregasNoPrazo(cards) {
  const comPrazo = cards.filter((c) => c.status === 'concluido' && c.prazo);
  const noPrazo = comPrazo.filter((c) => dataLocalDeTimestamp(c.concluidoEm) <= c.prazo).length;
  return {
    comPrazo: comPrazo.length,
    noPrazo,
    percentual: comPrazo.length === 0 ? null : Math.round((noPrazo / comPrazo.length) * 100),
  };
}

export function calcularPainel(cards, hoje, perfil) {
  const datasConclusao = cards
    .filter((c) => c.status === 'concluido' && c.concluidoEm)
    .map((c) => dataLocalDeTimestamp(c.concluidoEm));
  const semanas = agruparPorSemana(datasConclusao, hoje);

  // Desempenho por pessoa: só cards com responsável.
  const pessoas = new Map();
  for (const c of cards) {
    if (!c.responsavelId) continue;
    if (!pessoas.has(c.responsavelId)) {
      pessoas.set(c.responsavelId, { id: c.responsavelId, nome: c.responsavelNome, cor: c.responsavelCor, cards: [] });
    }
    pessoas.get(c.responsavelId).cards.push(c);
  }
  const porPessoa = [...pessoas.values()]
    .map((p) => ({ id: p.id, nome: p.nome, cor: p.cor, ...contar(p.cards, hoje), prazo: entregasNoPrazo(p.cards) }))
    .sort((a, b) => b.concluidos - a.concluidos || a.nome.localeCompare(b.nome));

  // Por setor: o setor do card, ou o setor de quem é o responsável.
  const setores = new Map();
  for (const c of cards) {
    const nome = c.setorNome || c.responsavelSetorNome;
    if (!nome) continue;
    if (!setores.has(nome)) setores.set(nome, []);
    setores.get(nome).push(c);
  }
  const porSetor = [...setores.entries()]
    .map(([nome, lista]) => ({ nome, ...contar(lista, hoje) }))
    .sort((a, b) => b.total - a.total || a.nome.localeCompare(b.nome));

  // Para quem está logado: o que está esperando por ele.
  const meus = cards.filter((c) => c.responsavelId === perfil.id);
  const semDono = cards.filter((c) => !c.responsavelId && c.setorId === perfil.setorId && c.status !== 'concluido');

  return {
    totais: contar(cards, hoje),
    prazo: entregasNoPrazo(cards),
    semanas,
    concluidosEstaSemana: semanas[semanas.length - 1].total,
    porPessoa,
    porSetor,
    minhasPendentes: meus.filter((c) => c.status !== 'concluido').length,
    minhasAtrasadas: meus.filter((c) => estaAtrasado(c, hoje)).length,
    doSetorSemResponsavel: semDono.length,
  };
}
