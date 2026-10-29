/**
 * CONTROLLER do Mural de avisos.
 */
import { normalizarAviso, validarAviso } from '../models/Aviso';
import { ehGestor } from '../models/Usuario';
import { ErroPermissao, ErroValidacao } from './erros';

export class MuralController {
  constructor(avisoRepo) {
    this.avisos = avisoRepo;
  }

  /**
   * Avisos com a marcação "lido" de quem está logado e, para o gestor,
   * quantos destinatários já leram cada aviso.
   */
  async listar(perfil) {
    const [avisos, lidos, resumo] = await Promise.all([
      this.avisos.listar(),
      this.avisos.idsLidos(perfil.id),
      ehGestor(perfil) ? this.avisos.resumoLeituras() : Promise.resolve({}),
    ]);
    return avisos.map((a) => ({
      ...a,
      lido: a.autorId === perfil.id || lidos.has(a.id),
      leituras: resumo[a.id] ?? null,
    }));
  }

  async publicar(dados, perfil) {
    if (!ehGestor(perfil)) throw new ErroPermissao('Somente gestores publicam avisos.');
    const { valido, erros } = validarAviso(dados);
    if (!valido) throw new ErroValidacao(erros);
    return this.avisos.publicar(normalizarAviso(dados));
  }

  marcarLido(avisoId) {
    return this.avisos.marcarLido(avisoId);
  }

  alternarFixado(aviso) {
    return this.avisos.definirFixado(aviso.id, !aviso.fixado);
  }

  excluir(avisoId) {
    return this.avisos.excluir(avisoId);
  }
}
