/**
 * REPOSITORY de autenticação: conversa com o Supabase Auth (e-mail e senha).
 * O Supabase guarda a senha com hash (o app nunca vê nem armazena a senha).
 */
import { verificar, traduzirErro } from '../controllers/erros';

export class AuthRepository {
  constructor(cliente) {
    this.cliente = cliente;
  }

  /** Id do usuário logado neste aparelho (sessão salva), ou null. */
  async sessaoAtual() {
    const data = verificar(await this.cliente.auth.getSession());
    return data.session?.user?.id ?? null;
  }

  /** Avisa quando alguém entra ou sai. Devolve a função para parar de escutar. */
  aoMudarSessao(callback) {
    const { data } = this.cliente.auth.onAuthStateChange((_evento, sessao) => {
      callback(sessao?.user?.id ?? null);
    });
    return () => data.subscription.unsubscribe();
  }

  async entrar(email, senha) {
    const data = verificar(await this.cliente.auth.signInWithPassword({ email, password: senha }));
    return data.user.id;
  }

  /**
   * Cria a conta. Nome, setor, cargo e telefone vão como "metadados";
   * o gatilho criar_perfil() do banco usa esses dados para criar o perfil.
   */
  async cadastrar({ email, senha, nome, setorId, cargo, telefone }) {
    const { data, error } = await this.cliente.auth.signUp({
      email,
      password: senha,
      options: { data: { nome, setor_id: setorId, cargo, telefone } },
    });
    if (error) throw traduzirErro(error);
    // Se o projeto exige confirmação de e-mail, o Supabase não devolve sessão ainda.
    return { userId: data.user?.id ?? null, precisaConfirmarEmail: !data.session };
  }

  async sair() {
    verificar(await this.cliente.auth.signOut());
  }
}
