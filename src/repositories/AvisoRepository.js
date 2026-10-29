/**
 * REPOSITORY do Mural (avisos e leituras).
 */
import { ErroPermissao, verificar } from '../controllers/erros';

const CAMPOS = `
  id, titulo, mensagem, fixado, autor_id, setor_id, destinatario_id, criado_em,
  autor:perfis!avisos_autor_id_fkey(nome, cor),
  setor:setores(nome),
  destinatario:perfis!avisos_destinatario_id_fkey(nome)
`;

function paraObjeto(l) {
  return {
    id: l.id,
    titulo: l.titulo,
    mensagem: l.mensagem,
    fixado: l.fixado,
    autorId: l.autor_id,
    autorNome: l.autor?.nome ?? '',
    autorCor: l.autor?.cor ?? '#9CA3AF',
    setorId: l.setor_id,
    setorNome: l.setor?.nome ?? null,
    destinatarioId: l.destinatario_id,
    destinatarioNome: l.destinatario?.nome ?? null,
    criadoEm: l.criado_em,
  };
}

export class AvisoRepository {
  constructor(cliente) {
    this.cliente = cliente;
  }

  /** Fixados primeiro, depois do mais novo para o mais antigo. */
  async listar() {
    const linhas = verificar(
      await this.cliente
        .from('avisos')
        .select(CAMPOS)
        .order('fixado', { ascending: false })
        .order('criado_em', { ascending: false })
    );
    return linhas.map(paraObjeto);
  }

  /** Ids dos avisos que este usuário já leu. */
  async idsLidos(usuarioId) {
    const linhas = verificar(await this.cliente.from('aviso_leituras').select('aviso_id').eq('perfil_id', usuarioId));
    return new Set(linhas.map((l) => l.aviso_id));
  }

  async marcarLido(avisoId) {
    const { error } = await this.cliente.from('aviso_leituras').insert({ aviso_id: avisoId });
    if (error && error.code !== '23505') verificar({ error }); // 23505 = já estava marcado
  }

  async publicar(aviso) {
    const l = verificar(
      await this.cliente
        .from('avisos')
        .insert({
          titulo: aviso.titulo,
          mensagem: aviso.mensagem,
          fixado: aviso.fixado,
          setor_id: aviso.setorId,
          destinatario_id: aviso.destinatarioId,
        })
        .select('id')
        .single()
    );
    return l.id;
  }

  async definirFixado(id, fixado) {
    const linhas = verificar(await this.cliente.from('avisos').update({ fixado }).eq('id', id).select('id'));
    if (linhas.length === 0) throw new ErroPermissao('Só quem publicou pode fixar o aviso.');
  }

  async excluir(id) {
    const linhas = verificar(await this.cliente.from('avisos').delete().eq('id', id).select('id'));
    if (linhas.length === 0) throw new ErroPermissao('Só quem publicou pode excluir o aviso.');
  }

  /** Só para gestor: { avisoId: { lidos, total } } */
  async resumoLeituras() {
    const linhas = verificar(await this.cliente.rpc('resumo_leituras'));
    return Object.fromEntries(linhas.map((l) => [l.aviso_id, { lidos: Number(l.lidos), total: Number(l.total) }]));
  }
}
