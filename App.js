/**
 * Ponto de entrada.
 * - Sem .env configurado: tela explicando como configurar o Supabase.
 * - Verificando sessão salva: indicador de carregamento.
 * - Depois: navegação (login ou abas, conforme a sessão).
 *
 * "servicos" pode ser passado nos testes para usar um servidor falso.
 */
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider, useApp } from './src/context/AppContext';
import AppNavigator from './src/navigation/AppNavigator';
import ConfiguracaoScreen from './src/screens/ConfiguracaoScreen';
import { cores } from './src/theme/tema';

function Conteudo() {
  const { estado, acoes, servicos } = useApp();

  if (!servicos.configurado) return <ConfiguracaoScreen />;

  if (estado.inicializando) {
    return (
      <View style={styles.centro}>
        <ActivityIndicator size="large" color={cores.primaria} />
      </View>
    );
  }

  if (estado.erro && !estado.perfil) {
    return (
      <View style={styles.centro}>
        <Text style={styles.erroTitulo}>Não foi possível conectar</Text>
        <Text style={styles.erroTexto}>{estado.erro}</Text>
        <TouchableOpacity onPress={() => acoes.sair().catch(() => {})} style={styles.botao}>
          <Text style={styles.botaoTexto}>Voltar ao login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return <AppNavigator />;
}

export default function App({ servicos }) {
  return (
    <SafeAreaProvider>
      <AppProvider servicos={servicos}>
        <StatusBar style="dark" />
        <Conteudo />
      </AppProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: cores.fundo },
  erroTitulo: { fontSize: 17, fontWeight: '700', color: cores.perigo, textAlign: 'center' },
  erroTexto: { marginTop: 8, color: cores.textoSecundario, textAlign: 'center' },
  botao: { marginTop: 20, padding: 12 },
  botaoTexto: { color: cores.primaria, fontWeight: '700', fontSize: 15 },
});
