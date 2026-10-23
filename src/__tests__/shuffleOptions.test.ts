import { describe, it, expect } from 'vitest';
import { getDeterministicOptionOrder } from '../utils/shuffleOptions';

describe('getDeterministicOptionOrder', () => {
  it('deve retornar permutação válida contendo todos os índices sem duplicatas', () => {
    const order = getDeterministicOptionOrder('q-1234', 5);
    expect(order.length).toBe(5);
    const sorted = [...order].sort((a, b) => a - b);
    expect(sorted).toEqual([0, 1, 2, 3, 4]);
  });

  it('deve ser 100% determinístico para o mesmo id de questão', () => {
    const order1 = getDeterministicOptionOrder('crase-01', 4);
    const order2 = getDeterministicOptionOrder('crase-01', 4);
    expect(order1).toEqual(order2);
  });

  it('deve distribuir posições de forma diversificada entre diferentes questões', () => {
    const ids = ['q-1', 'q-2', 'q-3', 'q-4', 'q-5', 'q-6', 'q-7', 'q-8', 'q-9', 'q-10'];
    const firstPositions = ids.map((id) => getDeterministicOptionOrder(id, 4)[0]);
    // Não devem ser todos iguais a 0 (quebra o viés de 67% na opção A)
    const uniquePositions = new Set(firstPositions);
    expect(uniquePositions.size).toBeGreaterThan(1);
  });
});
