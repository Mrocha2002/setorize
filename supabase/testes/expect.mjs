/**
 * Um "expect" mínimo, no estilo do Jest, feito com o módulo assert do Node.
 * Assim os testes do banco ficam parecidos com os do app.
 */
import assert from 'node:assert/strict';

function contem(real, esperado) {
  for (const [chave, valor] of Object.entries(esperado)) {
    assert.deepEqual(real[chave], valor, `campo "${chave}"`);
  }
}

export function expect(real) {
  return {
    toBe: (v) => assert.strictEqual(real, v),
    toEqual: (v) => assert.deepEqual(real, v),
    toMatchObject: (v) => contem(real, v),
    toHaveLength: (n) => assert.strictEqual(real.length, n),
    toMatch: (re) => assert.match(real, re),
    toBeNull: () => assert.strictEqual(real, null),
    not: {
      toBeNull: () => assert.notStrictEqual(real, null),
    },
  };
}
