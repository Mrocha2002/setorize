/**
 * Atualização em tempo real (Supabase Realtime): quando alguém cria ou move
 * uma tarefa, publica um aviso ou reserva uma sala, os outros celulares
 * recebem um sinal e recarregam. O RLS também vale aqui: ninguém recebe
 * mudanças de linhas que não pode ver.
 *
 * Exige ativar o Realtime nessas tabelas (o schema.sql já faz isso).
 */
const TABELAS = ['cards', 'card_eventos', 'avisos', 'reservas'];

export class TempoRealRepository {
  constructor(cliente) {
    this.cliente = cliente;
  }

  /** callback(tabela) a cada mudança. Devolve a função para parar de escutar. */
  escutar(callback) {
    let canal = this.cliente.channel('mudancas-equipe');
    for (const tabela of TABELAS) {
      canal = canal.on('postgres_changes', { event: '*', schema: 'public', table: tabela }, () => callback(tabela));
    }
    canal.subscribe();
    return () => this.cliente.removeChannel(canal);
  }
}
