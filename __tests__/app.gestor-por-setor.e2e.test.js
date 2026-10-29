/**
 * TESTE PONTA A PONTA: gestor POR SETOR.
 * O gestor de TI pede uma tarefa para Suprimentos e acompanha; ele NÃO vê o que o
 * gestor de Suprimentos criou para o próprio setor. O gestor de Suprimentos vê as duas.
 */
import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import App from '../App';
import { montarServicos } from '../src/services/montarServicos';
import { criarServidorFalso } from './helpers/servidorFalso';

jest.setTimeout(60000);

let srv;

async function entrar(email) {
  await fireEvent.changeText(await screen.findByPlaceholderText('voce@empresa.com.br'), email);
  await fireEvent.changeText(screen.getByPlaceholderText('Sua senha'), 'senha123');
  await fireEvent.press(screen.getByText('Entrar'));
  await screen.findByText(/^Olá, /);
}

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

/** Cria uma tarefa direto no servidor, logado como `email`. */
async function criarTarefa(email, titulo, setorNome) {
  await srv.repos.auth.entrar(email, 'senha123');
  await srv.repos.cards.inserir({ titulo, prioridade: 'media', setorId: srv.setorPorNome(setorNome), responsavelId: null });
  await srv.repos.auth.sair();
}

test('cada gestor vê o próprio setor e o que pediu a outros setores', async () => {
  srv = criarServidorFalso();
  srv.criarConta('mateus@empresa.com', 'Mateus Rocha', 'TI', 'gestor');
  srv.criarConta('gustavo@empresa.com', 'Gustavo Fragnani', 'Suprimentos', 'gestor');
  srv.criarConta('carla@empresa.com', 'Carla Mendes', 'Suprimentos');
  await criarTarefa('gustavo@empresa.com', 'Inventário do almoxarifado', 'Suprimentos');
  await criarTarefa('mateus@empresa.com', 'Comprar cabos de rede', 'Suprimentos');

  await render(<App servicos={montarServicos(srv.repos)} />);

  // ---------------- gestor de TI ----------------
  await entrar('mateus@empresa.com');
  expect(screen.getByText('Gestor · TI')).toBeOnTheScreen();
  await fireEvent.press(screen.getByText('Kanban'));
  expect(await screen.findByText('Comprar cabos de rede')).toBeOnTheScreen(); // ele pediu
  expect(screen.queryByText('Inventário do almoxarifado')).toBeNull(); // é de outro setor
  await fireEvent.press(screen.getByText('Comprar cabos de rede'));
  expect(await screen.findByLabelText('Editar tarefa')).toBeOnTheScreen(); // quem criou edita
  await sair();

  // ---------------- gestor de Suprimentos ----------------
  await entrar('gustavo@empresa.com');
  expect(screen.getByText('Gestor · Suprimentos')).toBeOnTheScreen();
  await fireEvent.press(screen.getByText('Kanban'));
  expect(await screen.findByText('Inventário do almoxarifado')).toBeOnTheScreen();
  expect(screen.getByText('Comprar cabos de rede')).toBeOnTheScreen(); // é do setor dele
  await fireEvent.press(screen.getByText('Comprar cabos de rede'));
  expect(await screen.findByLabelText('Editar tarefa')).toBeOnTheScreen(); // gestor do setor edita
  await sair();

  // ---------------- colaboradora de Suprimentos vê as duas, sem editar ----------------
  await entrar('carla@empresa.com');
  await fireEvent.press(screen.getByText('Kanban'));
  await fireEvent.press(await screen.findByText('Tudo'));
  expect(await screen.findByText('Inventário do almoxarifado')).toBeOnTheScreen();
  await fireEvent.press(screen.getByText('Comprar cabos de rede'));
  expect(await screen.findByText('Assumir esta tarefa')).toBeOnTheScreen();
  expect(screen.queryByLabelText('Editar tarefa')).toBeNull();
});
