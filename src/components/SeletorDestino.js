/**
 * "Para quem?": escolhe o destino de uma tarefa ou aviso.
 *   tipo 'todos'  -> ninguém específico (só avisos)
 *   tipo 'setor'  -> escolhe um setor
 *   tipo 'pessoa' -> escolhe um colaborador (filtrável por setor)
 *
 * Props: valor = { destino, setorId, pessoaId }, aoMudar(novoValor), permitirTodos, setores, colaboradores
 */
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import GrupoOpcoes from './GrupoOpcoes';
import { cores } from '../theme/tema';

export default function SeletorDestino({ valor, aoMudar, permitirTodos = false, setores, colaboradores, erro }) {
  const [setorDaPessoa, setSetorDaPessoa] = useState(null);

  const tipos = [
    ...(permitirTodos ? [{ valor: 'todos', rotulo: 'Todos' }] : []),
    { valor: 'setor', rotulo: 'Um setor' },
    { valor: 'pessoa', rotulo: 'Uma pessoa' },
  ];
  const opcoesSetor = setores.map((s) => ({ valor: s.id, rotulo: s.nome }));
  const pessoas = colaboradores.filter((c) => !setorDaPessoa || c.setorId === setorDaPessoa);

  return (
    <View>
      <Text style={styles.rotulo}>Para quem? *</Text>
      <GrupoOpcoes opcoes={tipos} selecionado={valor.destino} aoSelecionar={(d) => aoMudar({ ...valor, destino: d })} />

      {valor.destino === 'todos' ? <Text style={styles.ajuda}>Toda a empresa vai ver este aviso.</Text> : null}

      {valor.destino === 'setor' ? (
        <View style={styles.bloco}>
          <GrupoOpcoes opcoes={opcoesSetor} selecionado={valor.setorId} aoSelecionar={(id) => aoMudar({ ...valor, setorId: id })} />
          <Text style={styles.ajuda}>Todos do setor vão ver e qualquer um pode assumir.</Text>
        </View>
      ) : null}

      {valor.destino === 'pessoa' ? (
        <View style={styles.bloco}>
          <GrupoOpcoes
            opcoes={[{ valor: null, rotulo: 'Todos os setores' }, ...opcoesSetor]}
            selecionado={setorDaPessoa}
            aoSelecionar={setSetorDaPessoa}
            rolavel
          />
          <View style={{ height: 8 }} />
          <GrupoOpcoes
            opcoes={pessoas.map((c) => ({ valor: c.id, rotulo: c.nome, cor: c.cor }))}
            selecionado={valor.pessoaId}
            aoSelecionar={(id) => aoMudar({ ...valor, pessoaId: id })}
          />
        </View>
      ) : null}

      {erro ? <Text style={styles.erro}>{erro}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  rotulo: { fontSize: 14, fontWeight: '600', color: cores.texto, marginTop: 18, marginBottom: 8 },
  bloco: { marginTop: 10 },
  ajuda: { fontSize: 12, color: cores.textoSecundario, marginTop: 6 },
  erro: { color: cores.perigo, fontSize: 13, marginTop: 6 },
});
