/**
 * CONTROLLER de login e cadastro: valida no app antes de ir ao servidor.
 */
import { normalizarCadastro, validarCadastro, validarLogin } from '../models/Usuario';
import { ErroValidacao } from './erros';

export class AuthController {
  constructor(authRepo) {
    this.auth = authRepo;
  }

  sessaoAtual() {
    return this.auth.sessaoAtual();
  }

  aoMudarSessao(callback) {
    return this.auth.aoMudarSessao(callback);
  }

  async entrar({ email, senha }) {
    const { valido, erros } = validarLogin({ email, senha });
    if (!valido) throw new ErroValidacao(erros);
    return this.auth.entrar(email.trim().toLowerCase(), senha);
  }

  /** Devolve { precisaConfirmarEmail } */
  async cadastrar(dados) {
    const { valido, erros } = validarCadastro(dados);
    if (!valido) throw new ErroValidacao(erros);
    return this.auth.cadastrar(normalizarCadastro(dados));
  }

  sair() {
    return this.auth.sair();
  }
}
