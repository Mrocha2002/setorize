/**
 * Navegação (cap. 3):
 *
 *  Sem login:  Pilha [Login -> Cadastro]
 *
 *  Logado:     Pilha raiz
 *               ├─ Abas: Painel · Kanban · Mural · Agenda · Contatos
 *               │        (selos vermelhos = tarefas novas para você / avisos não lidos)
 *               ├─ CardDetalhe, CardForm, AvisoForm, ReservaForm (por cima das abas)
 *               ├─ Perfil (avatar no canto)
 *               └─ Equipe, ColaboradorEditar (só o administrador, a partir do Perfil)
 *
 * Trocar de "sem login" para "logado" é automático: o AppContext percebe a sessão.
 */
import React from 'react';
import { TouchableOpacity } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import Avatar from '../components/Avatar';
import LoginScreen from '../screens/LoginScreen';
import CadastroScreen from '../screens/CadastroScreen';
import DashboardScreen from '../screens/DashboardScreen';
import KanbanScreen from '../screens/KanbanScreen';
import CardDetalheScreen from '../screens/CardDetalheScreen';
import CardFormScreen from '../screens/CardFormScreen';
import MuralScreen from '../screens/MuralScreen';
import AvisoFormScreen from '../screens/AvisoFormScreen';
import AgendaScreen from '../screens/AgendaScreen';
import ReservaFormScreen from '../screens/ReservaFormScreen';
import ContatosScreen from '../screens/ContatosScreen';
import PerfilScreen from '../screens/PerfilScreen';
import EquipeScreen from '../screens/EquipeScreen';
import ColaboradorEditarScreen from '../screens/ColaboradorEditarScreen';
import { ehAdmin } from '../models/Usuario';
import { cores } from '../theme/tema';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const ICONES = { Painel: 'speedometer', Kanban: 'albums', Mural: 'megaphone', Agenda: 'calendar', Contatos: 'people' };

const estiloCabecalho = {
  headerStyle: { backgroundColor: cores.cartao },
  headerTintColor: cores.texto,
  headerShadowVisible: false,
};

function Abas({ navigation }) {
  const { estado, pendencias } = useApp();
  const p = estado.perfil;
  const selo = (n) => (n > 0 ? n : undefined);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        ...estiloCabecalho,
        tabBarIcon: ({ focused, color, size }) => (
          <Ionicons name={focused ? ICONES[route.name] : `${ICONES[route.name]}-outline`} size={size} color={color} />
        ),
        tabBarActiveTintColor: cores.primaria,
        tabBarInactiveTintColor: cores.textoSecundario,
        headerRight: () => (
          <TouchableOpacity onPress={() => navigation.navigate('Perfil')} style={{ marginRight: 16 }} accessibilityLabel="Meu perfil">
            <Avatar nome={p.nome} cor={p.cor} tamanho={32} />
          </TouchableOpacity>
        ),
      })}
    >
      <Tab.Screen name="Painel" component={DashboardScreen} />
      <Tab.Screen name="Kanban" component={KanbanScreen} options={{ tabBarBadge: selo(pendencias.tarefasNovas) }} />
      <Tab.Screen name="Mural" component={MuralScreen} options={{ tabBarBadge: selo(pendencias.avisosNaoLidos) }} />
      <Tab.Screen name="Agenda" component={AgendaScreen} />
      <Tab.Screen name="Contatos" component={ContatosScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { estado } = useApp();
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={estiloCabecalho}>
        {estado.perfil ? (
          <>
            <Stack.Screen name="Abas" component={Abas} options={{ headerShown: false }} />
            <Stack.Screen name="CardDetalhe" component={CardDetalheScreen} options={{ title: 'Tarefa' }} />
            <Stack.Screen name="CardForm" component={CardFormScreen} options={{ title: 'Tarefa' }} />
            <Stack.Screen name="AvisoForm" component={AvisoFormScreen} options={{ title: 'Novo aviso' }} />
            <Stack.Screen name="ReservaForm" component={ReservaFormScreen} options={{ title: 'Reservar sala' }} />
            <Stack.Screen name="Perfil" component={PerfilScreen} options={{ title: 'Meu perfil' }} />
            {ehAdmin(estado.perfil) ? (
              <>
                <Stack.Screen name="Equipe" component={EquipeScreen} options={{ title: 'Gerenciar equipe' }} />
                <Stack.Screen name="ColaboradorEditar" component={ColaboradorEditarScreen} options={{ title: 'Editar pessoa' }} />
              </>
            ) : null}
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Cadastro" component={CadastroScreen} options={{ title: 'Criar conta' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
