/**
 * CONTROLLER da gestão de equipe (só o administrador).
 * O banco confere de novo (função admin_atualizar_perfil); aqui ficam a validação
 * do formulário e mensagens claras antes de ir ao servidor.
 */
import { ehAdmin, validarAlteracaoPerfil } from '../models/Usuario';
import { ErroPermissao, ErroValidacao } from './erros';

export class EquipeController {
  constructor(perfilRepo) {
    this.perfis = perfilRepo;
  }

  /** alvo = perfil que será alterado; dados = { papel, setorId, cargo }; admin = quem está logado. */
  async alterar(alvo, dados, admin) {
    if (!ehAdmin(admin)) throw new ErroPermissao('Somente o administrador pode alterar papel, setor e cargo.');
    if (alvo.papel === 'admin') throw new ErroPermissao('Você não pode alterar um administrador pelo app.');
    const { valido, erros } = validarAlteracaoPerfil(dados);
    if (!valido) throw new ErroValidacao(erros);
    await this.perfis.alterarPorAdmin(alvo.id, { papel: dados.papel, setorId: dados.setorId, cargo: (dados.cargo || '').trim() });
  }
}
