// Nos testes não existe celular: trocamos o AsyncStorage real
// pelo mock oficial (armazenamento em memória com a mesma API).
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// O SafeAreaProvider espera medidas da tela do celular; nos testes usamos o mock oficial.
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);

// Ícones dependem de carregar arquivos de fonte do aparelho.
// Nos testes, cada ícone vira um componente simples que mostra só o nome.
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  const Icone = ({ name }) => React.createElement(Text, { testID: `icone-${name}` }, '');
  return { Ionicons: Icone };
});

// Calendário/relógio do celular: nos testes não existe a janela nativa.
// Ao "abrir", o seletor devolve na hora o valor de global.__seletorValor (se o teste definiu)
// ou o valor atual do campo, como se a pessoa tivesse tocado em OK.
jest.mock('@react-native-community/datetimepicker', () => {
  const React = require('react');
  const proximo = () => {
    const v = global.__seletorValor;
    global.__seletorValor = undefined;
    return v;
  };
  const Seletor = ({ value, onChange }) => {
    React.useEffect(() => {
      onChange({ type: 'set' }, proximo() ?? value);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return null;
  };
  return {
    __esModule: true,
    default: Seletor,
    DateTimePickerAndroid: { open: jest.fn(({ value, onChange }) => onChange({ type: 'set' }, proximo() ?? value)) },
  };
});
