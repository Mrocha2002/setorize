/**
 * Cliente do Supabase: a "porta" do app para o servidor.
 *
 * A URL e a chave pública vêm do arquivo .env (veja .env.example):
 *   EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
 *   EXPO_PUBLIC_SUPABASE_KEY=chave "anon" / "publishable" do projeto
 *
 * Essa chave é PÚBLICA de propósito (vai dentro do app). Quem protege os dados
 * são as regras RLS no banco (supabase/schema.sql). NUNCA coloque aqui a chave
 * "service_role"/"secret": ela ignora todas as regras.
 */
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import { createClient } from '@supabase/supabase-js';

const URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const CHAVE = process.env.EXPO_PUBLIC_SUPABASE_KEY;

export const supabaseConfigurado = !!URL && !!CHAVE && URL.startsWith('https://');

export const supabase = supabaseConfigurado
  ? createClient(URL, CHAVE, {
      auth: {
        storage: AsyncStorage, // a sessão (login) fica salva no celular
        autoRefreshToken: true, // renova o token sozinho antes de expirar
        persistSession: true, // continua logado ao fechar e abrir o app
        detectSessionInUrl: false, // isso é para navegador; no celular não se usa
      },
    })
  : null;

// Só renova o token enquanto o app está aberto na tela (economiza bateria e rede).
if (supabase) {
  AppState.addEventListener('change', (estado) => {
    if (estado === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
