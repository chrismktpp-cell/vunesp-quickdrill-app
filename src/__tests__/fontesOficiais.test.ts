import { describe, expect, it } from 'vitest';
import provasOficiais from '../data/provas-oficiais.json';
import gabaritosOficiais from '../data/gabaritos-oficiais.json';
import questionsData from '../data/questions.json';

describe('Catálogo de fontes oficiais', () => {
  it('mantém provas com links oficiais e sem importar cadernos inacessíveis', () => {
    expect(provasOficiais).toHaveLength(4);
    for (const prova of provasOficiais) {
      expect(prova.fonteConcurso).toMatch(/^https:\/\//);
      expect(prova.organizadora).toBeTruthy();
      expect(prova.cargo).toBeTruthy();
    }
    const itanhaem = provasOficiais.find((prova) => prova.id === 'itanhaem-ps012026');
    expect(itanhaem?.organizadora).toBe('Instituto Nosso Rumo');
    expect(itanhaem?.quantidadeQuestoes).toBe(24);
    expect(itanhaem?.statusQuestoes).toContain('não disponibilizado');
  });

  it('preserva o gabarito definitivo oficial com 24 respostas', () => {
    const gabarito = gabaritosOficiais.find((item) => item.provaId === 'itanhaem-ps012026');
    expect(gabarito?.tipo).toBe('definitivo');
    expect(gabarito?.respostas).toHaveLength(24);
    expect(gabarito?.respostas.every((answer) => ['A', 'B', 'C', 'D', 'E'].includes(answer))).toBe(true);
  });

  it('não mantém o lote sintético anterior no banco de questões', () => {
    expect(questionsData.some((question) => question.id.startsWith('itanhaem-ap-'))).toBe(false);
  });
});
