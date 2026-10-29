/**
 * REPOSITORY de perfis (colaboradores) e setores.
 * A equipe é pequena, então a busca por nome/cargo/setor é feita no app,
 * sobre a lista completa (e o banco já só deixa ver o que pode).
 */
import { verificar } from '../controllers/erros';

const CAMPOS = 'id, nome, email, cargo, telefone, papel, cor, setor_id, setor:setores(nome)';

function paraObjeto(l) {
  return {
    id: l.id,
    nome: l.nome,
    email: l.email,
    cargo: l.cargo,
    telefone: l.telefone,
    papel: l.papel,
    cor: l.cor,
    setorId: l.setor_id,
    setorNome: l.setor?.nome ?? '',
  };
}

export class PerfilRepository {
  constructor(cliente) {
    this.cliente = cliente;
  }

  async listarSetores() {
    return verificar(await this.cliente.from('setores').select('id, nome').order('nome'));
  }

  async buscar(id) {
    const linha = verificar(await this.cliente.from('perfis').select(CAMPOS).eq('id', id).maybeSingle());
    return linha ? paraObjeto(linha) : null;
  }

  async listar() {
    const linhas = verificar(await this.cliente.from('perfis').select(CAMPOS).order('nome'));
    return linhas.map(paraObjeto);
  }

  /**
   * Só o ADMIN: muda papel, setor e cargo de outra pessoa.
   * Chama a função admin_atualizar_perfil do banco (RPC), que confere se quem chama é admin.
   */
  async alterarPorAdmin(id, { papel, setorId, cargo }) {
    verificar(await this.cliente.rpc('admin_atualizar_perfil', { p_perfil: id, p_papel: papel, p_setor: setorId, p_cargo: cargo }));
  }

  /** Só cargo e telefone: o banco não deixa o próprio usuário mudar papel nem setor. */
  async atualizarMeuContato(id, { cargo, telefone }) {
    verificar(await this.cliente.from('perfis').update({ cargo, telefone }).eq('id', id));
  }
}
