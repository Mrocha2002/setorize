/**
 * TESTE PONTA A PONTA do pedido principal:
 * o GESTOR direciona uma tarefa e um aviso ao setor Suprimentos;
 * quem é de outro setor não vê; quem é do setor vê, assume, move e comenta;
 * o gestor acompanha o histórico e as leituras.
 */
import React from 'react';
import { Alert, Linking } from 'react-native';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import App from '../App';
import { montarServicos } from '../src/services/montarServicos';
import { criarServidorFalso } from './helpers/servidorFalso';

jest.setTimeout(60000);

async function entrar(email) {
  await fireEvent.changeText(await screen.findByPlaceholderText('voce@empresa.com.br'), email);
  await fireEvent.changeText(screen.getByPlaceholderText('Sua senha'), 'senha123');
  await fireEvent.press(screen.getByText('Entrar'));
  await screen.findByText(/^Olá, /);
}

let srv;

/**
 * Sai pela tela de Perfil. Se o teste estiver numa tela empilhada (ex.: detalhe da tarefa),
 * onde o botão de voltar nativo não existe no ambiente de teste, encerra a sessão pelo servidor,
 * como aconteceria se ela expirasse: o app deve voltar sozinho para o login.
 */
async function sair() {
  const perfil = screen.queryByLabelText('Meu perfil');
  if (perfil) {
    await fireEvent.press(perfil);
    await fireEvent.press(await screen.findByText('Sair da conta'));
  } else {
    await act(() => srv.repos.auth.sair());
  }
  await screen.findByText('Cadastre-se');
}

test('tarefa e aviso direcionados ao setor', async () => {
  jest.spyOn(Alert, 'alert').mockImplementation((t, m, botoes) => botoes?.find((b) => b.style === 'destructive')?.onPress());
  const abrirLink = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  srv = criarServidorFalso();
  srv.criarConta('ana@empresa.com', 'Ana Souza', 'Operações', 'gestor');
  srv.criarConta('carla@empresa.com', 'Carla Mendes', 'Suprimentos');
  srv.criarConta('bruno@empresa.com', 'Bruno Lima', 'TI');

  await render(<App servicos={montarServicos(srv.repos)} />);

  // ---------------- GESTORA cria tarefa para o setor Suprimentos ----------------
  await entrar('ana@empresa.com');
  expect(screen.getByText('Gestor · Operações')).toBeOnTheScreen();
  await fireEvent.press(screen.getByText('Kanban'));
  await fireEvent.press(await screen.findByLabelText('Nova tarefa'));
  await fireEvent.changeText(await screen.findByPlaceholderText('Ex.: Cotar papel A4'), 'Cotar papel A4');
  await fireEvent.press(screen.getByText('Criar tarefa'));
  expect(await screen.findByText('Escolha o setor.')).toBeOnTheScreen(); // destino é obrigatório
  await fireEvent.press(screen.getByText('Suprimentos'));
  await fireEvent.press(screen.getByText('Criar tarefa'));
  expect(await screen.findByText('Cotar papel A4')).toBeOnTheScreen();
  expect(screen.getByText('Suprimentos · sem responsável')).toBeOnTheScreen();

  // ---------------- e um aviso para o setor ----------------
  await fireEvent.press(screen.getByText('Mural'));
  await fireEvent.press(await screen.findByLabelText('Novo aviso'));
  await fireEvent.changeText(await screen.findByPlaceholderText('Ex.: Inventário na sexta'), 'Inventário na sexta');
  await fireEvent.changeText(screen.getByPlaceholderText('Escreva o aviso'), 'Começa às 8h no almoxarifado.');
  await fireEvent.press(screen.getByText('Um setor'));
  await fireEvent.press(screen.getByText('Suprimentos'));
  await fireEvent.press(screen.getByText('Publicar aviso'));
  expect(await screen.findByText('Inventário na sexta')).toBeOnTheScreen();
  expect(screen.getByText('Para Suprimentos')).toBeOnTheScreen();
  expect(screen.getByText('Lido por 0 de 1')).toBeOnTheScreen();
  await sair();

  // ---------------- BRUNO (TI) não vê nada disso ----------------
  await entrar('bruno@empresa.com');
  await fireEvent.press(screen.getByText('Kanban'));
  await fireEvent.press(await screen.findByText('Tudo'));
  expect(screen.queryByText('Cotar papel A4')).toBeNull();
  await fireEvent.press(screen.getByText('Mural'));
  expect(await screen.findByText('Nenhum aviso para você')).toBeOnTheScreen();
  await sair();

  // ---------------- CARLA (Suprimentos) vê, é avisada, assume, move e comenta ----------------
  await entrar('carla@empresa.com');
  // Painel mostra o que espera por ela
  expect(screen.getByLabelText('Do setor sem dono: 1')).toBeOnTheScreen();
  expect(screen.getByLabelText('Avisos não lidos: 1')).toBeOnTheScreen();

  await fireEvent.press(screen.getByText('Mural'));
  expect(await screen.findByText('Novo')).toBeOnTheScreen();
  await fireEvent.press(screen.getByLabelText('Marcar Inventário na sexta como lido'));
  await waitFor(() => expect(screen.queryByText('Novo')).toBeNull());

  await fireEvent.press(screen.getByText('Kanban'));
  await fireEvent.press(await screen.findByText('Meu setor'));
  await fireEvent.press(await screen.findByText('Cotar papel A4'));
  await fireEvent.press(await screen.findByText('Assumir esta tarefa'));
  expect(await screen.findByText('Para: Suprimentos · Carla')).toBeOnTheScreen();
  await fireEvent.press(screen.getByText('Fazendo'));
  await fireEvent.changeText(screen.getByPlaceholderText('Ex.: Aguardando retorno do fornecedor'), 'Pedi 3 orçamentos');
  await fireEvent.press(screen.getByText('Enviar comentário'));
  expect(await screen.findByText(/Pedi 3 orçamentos/)).toBeOnTheScreen();
  expect(screen.queryByText('Excluir tarefa')).toBeNull(); // colaborador não exclui
  expect(screen.queryByLabelText('Editar tarefa')).toBeNull(); // nem edita

  await sair();

  // ---------------- GESTORA acompanha ----------------
  await entrar('ana@empresa.com');

  // Painel da equipe
  expect(await screen.findByText('Por pessoa')).toBeOnTheScreen();
  expect(screen.getByText('Carla Mendes')).toBeOnTheScreen();

  // Mural: a leitura da Carla aparece
  await fireEvent.press(screen.getByText('Mural'));
  expect(await screen.findByText('Lido por 1 de 1')).toBeOnTheScreen();

  // Contatos: WhatsApp da Carla
  await fireEvent.press(screen.getByText('Contatos'));
  await fireEvent.press(await screen.findByLabelText('WhatsApp de Carla'));
  expect(abrirLink).toHaveBeenCalledWith('https://wa.me/5519900000001');

  // Agenda: reserva e conflito (o servidor recusa e a tela diz quem reservou)
  await fireEvent.press(screen.getByText('Agenda'));
  await fireEvent.press(await screen.findByLabelText('Reservar sala'));
  await fireEvent.changeText(await screen.findByPlaceholderText('Ex.: Alinhamento semanal'), 'Alinhamento');
  await fireEvent.press(await screen.findByText('Sala Azul (8)'));
  let [inicio, fim] = screen.getAllByPlaceholderText('hh:mm');
  await fireEvent.changeText(inicio, '0700');
  await fireEvent.changeText(fim, '0800');
  await fireEvent.press(screen.getByText('Confirmar reserva'));
  expect(await screen.findByText('Alinhamento')).toBeOnTheScreen();

  await fireEvent.press(screen.getByLabelText('Reservar sala'));
  await fireEvent.changeText(await screen.findByPlaceholderText('Ex.: Alinhamento semanal'), 'Choque');
  await fireEvent.press(await screen.findByText('Sala Azul (8)'));
  [inicio, fim] = screen.getAllByPlaceholderText('hh:mm');
  await fireEvent.changeText(inicio, '0730');
  await fireEvent.changeText(fim, '0830');
  await fireEvent.press(screen.getByText('Confirmar reserva'));
  expect(await screen.findByText(/Sala Azul já está reservada das 07:00 às 08:00 por Ana Souza/)).toBeOnTheScreen();
  await act(() => srv.repos.auth.sair());
  await entrar('ana@empresa.com');

  // Kanban: a tarefa agora tem responsável; o histórico mostra o andamento
  await fireEvent.press(screen.getByText('Kanban'));
  expect(await screen.findByText('Carla · Suprimentos')).toBeOnTheScreen();
  await fireEvent.press(screen.getByText('Cotar papel A4'));
  // cada linha do histórico: "Nome: o que fez"
  expect(await screen.findByText('Carla Mendes: Pedi 3 orçamentos')).toBeOnTheScreen();
  expect(screen.getByText('Carla Mendes: Moveu para Fazendo')).toBeOnTheScreen();
  expect(screen.getByText('Carla Mendes: Assumiu a tarefa')).toBeOnTheScreen();
  expect(screen.getByText('Ana Souza: Criou a tarefa')).toBeOnTheScreen();
  expect(screen.getByLabelText('Editar tarefa')).toBeOnTheScreen();
  expect(screen.getByText('Excluir tarefa')).toBeOnTheScreen();
});
