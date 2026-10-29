/**
 * TESTE PONTA A PONTA: administrador geral.
 * O admin abre "Gerenciar equipe", promove a Carla a gestora e muda o setor e o cargo dela;
 * a Carla entra e já aparece como gestora, com o botão "+" no Kanban.
 * Também confere que o aviso exige escolher o destino (não vai para "Todos" sem querer).
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

test('admin muda papel, setor e cargo pelo app', async () => {
  srv = criarServidorFalso();
  srv.criarConta('matheus@empresa.com', 'Matheus Rocha', 'TI', 'admin');
  srv.criarConta('carla@empresa.com', 'Carla Mendes', 'Suprimentos');
  srv.criarConta('bruno@empresa.com', 'Bruno Lima', 'TI');

  await render(<App servicos={montarServicos(srv.repos)} />);
  await entrar('matheus@empresa.com');
  expect(screen.getByText('Administrador · TI')).toBeOnTheScreen();

  // ---------------- aviso: destino é obrigatório ----------------
  await fireEvent.press(screen.getByText('Mural'));
  await fireEvent.press(await screen.findByLabelText('Novo aviso'));
  await fireEvent.changeText(await screen.findByPlaceholderText('Ex.: Inventário na sexta'), 'Reunião geral');
  await fireEvent.changeText(screen.getByPlaceholderText('Escreva o aviso'), 'Sexta às 9h.');
  await fireEvent.press(screen.getByText('Publicar aviso'));
  expect(await screen.findByText('Escolha para quem é o aviso.')).toBeOnTheScreen();
  await fireEvent.press(screen.getByText('Todos'));
  expect(screen.getByText('Toda a empresa vai ver este aviso.')).toBeOnTheScreen();
  await fireEvent.press(screen.getByText('Publicar aviso'));
  expect(await screen.findByText('Reunião geral')).toBeOnTheScreen();

  // ---------------- gerenciar equipe ----------------
  await fireEvent.press(screen.getByLabelText('Meu perfil'));
  await fireEvent.press(await screen.findByText('Gerenciar equipe'));
  expect(await screen.findByText('Colaborador · Suprimentos')).toBeOnTheScreen();
  expect(screen.getByLabelText('Editar Matheus Rocha')).toBeDisabled(); // admin não é editável
  await fireEvent.press(screen.getByLabelText('Editar Carla Mendes'));
  await fireEvent.press(await screen.findByText('Gestor'));
  await fireEvent.press(screen.getByText('Comercial'));
  await fireEvent.changeText(screen.getByPlaceholderText('Ex.: Coordenador de Suprimentos'), 'Coordenadora Comercial');
  await fireEvent.press(screen.getByText('Salvar alterações'));
  expect(await screen.findByText('Gestor · Comercial')).toBeOnTheScreen();
  expect(screen.getByText('Coordenadora Comercial')).toBeOnTheScreen();

  // ---------------- a Carla entra já como gestora ----------------
  await act(() => srv.repos.auth.sair());
  await screen.findByText('Cadastre-se');
  await entrar('carla@empresa.com');
  expect(screen.getByText('Gestor · Comercial')).toBeOnTheScreen();
  await fireEvent.press(screen.getByText('Kanban'));
  expect(await screen.findByLabelText('Nova tarefa')).toBeOnTheScreen();
  expect(screen.queryByText('Gerenciar equipe')).toBeNull();
});
