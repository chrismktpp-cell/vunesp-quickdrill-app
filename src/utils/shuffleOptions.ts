/**
 * Utilitário de permutação determinística de alternativas.
 * Elimina o viés de 67% da alternativa 'A' sem alterar o JSON original de questões.
 * É 100% determinístico por ID de questão: para a mesma questão, a ordem exibida
 * é sempre idêntica em todas as renderizações, revisões e sessões.
 */
export function getDeterministicOptionOrder(questionId: string, optionsCount: number): number[] {
  if (optionsCount <= 1) return Array.from({ length: optionsCount }, (_, i) => i);

  // Hash determinístico da string do ID (algoritmo FNV-1a simples de 32 bits)
  let hash = 2166136261;
  for (let i = 0; i < questionId.length; i++) {
    hash ^= questionId.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  const indices = Array.from({ length: optionsCount }, (_, i) => i);

  // Fisher-Yates determinístico com LCG
  let seed = hash >>> 0;
  for (let i = indices.length - 1; i > 0; i--) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const j = seed % (i + 1);
    const temp = indices[i];
    indices[i] = indices[j];
    indices[j] = temp;
  }

  return indices;
}

