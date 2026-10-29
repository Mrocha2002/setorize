/**
 * TESTE PONTA A PONTA: cadastro, login, senha errada, perfil e sair.
 * O app inteiro é renderizado; só o servidor é falso (em memória).
 */
import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import App from '../App';
import { montarServicos } from '../src/services/montarServicos';
import { criarServidorFalso } from './helpers/servidorFalso';

jest.setTimeout(30000);

test('cadastrar, sair, errar a senha e entrar de novo', async () => {
  jest.spyOn(Alert, 'alert').mockImplementation((t, m, botoes) => botoes?.find((b) => b.style === 'destructive')?.onPress());
  const srv = criarServidorFalso();
  await render(<App servicos={montarServicos(srv.repos)} />);

  // 1) Tela de login -> cadastro
  await fireEvent.press(await screen.findByText('Cadastre-se'));
  const criarConta = () => {
    // "Criar conta" aparece no título da tela e no botão: o botão é o último.
    const achados = screen.getAllByText('Criar conta');
    return fireEvent.press(achados[achados.length - 1]);
  };
  await screen.findAllByText('Criar conta');
  await criarConta();

  // validação mostra os erros embaixo dos campos
  expect(await screen.findByText('Informe seu nome completo (3 a 80 caracteres).')).toBeOnTheScreen();
  expect(screen.getByText('Escolha o seu setor.')).toBeOnTheScreen();

  await fireEvent.changeText(screen.getByPlaceholderText('Ex.: Carla Mendes'), 'Carla Mendes');
  await fireEvent.changeText(screen.getByPlaceholderText('voce@empresa.com.br'), 'Carla@Empresa.com');
  await fireEvent.changeText(screen.getByPlaceholderText('Mínimo de 6 caracteres'), 'segredo1');
  await fireEvent.changeText(screen.getByPlaceholderText('Digite a senha de novo'), 'segredo1');
  await fireEvent.press(screen.getByText('Suprimentos'));
  await fireEvent.changeText(screen.getByPlaceholderText('(19) 99999-9999'), '(19) 98888-1111');
  await criarConta();

  // 2) Entrou direto: painel de colaboradora
  expect(await screen.findByText('Olá, Carla')).toBeOnTheScreen();
  expect(screen.getByText('Colaborador · Suprimentos')).toBeOnTheScreen();

  // 3) Colaborador não vê o botão de criar tarefa
  await fireEvent.press(screen.getByText('Kanban'));
  expect(await screen.findByText('Para mim')).toBeOnTheScreen();
  expect(screen.queryByLabelText('Nova tarefa')).toBeNull();

  // 4) Perfil -> sair
  await fireEvent.press(screen.getByLabelText('Meu perfil'));
  expect(await screen.findByText('carla@empresa.com')).toBeOnTheScreen();
  await fireEvent.press(screen.getByText('Sair da conta'));
  expect(await screen.findByText('Cadastre-se')).toBeOnTheScreen();

  // 5) Senha errada
  await fireEvent.changeText(screen.getByPlaceholderText('voce@empresa.com.br'), 'carla@empresa.com');
  await fireEvent.changeText(screen.getByPlaceholderText('Sua senha'), 'errada');
  await fireEvent.press(screen.getByText('Entrar'));
  expect(await screen.findByText('E-mail ou senha incorretos.')).toBeOnTheScreen();

  // 6) Senha certa (o e-mail foi salvo em minúsculas)
  await fireEvent.changeText(screen.getByPlaceholderText('Sua senha'), 'segredo1');
  await fireEvent.press(screen.getByText('Entrar'));
  expect(await screen.findByText('Olá, Carla')).toBeOnTheScreen();
});
