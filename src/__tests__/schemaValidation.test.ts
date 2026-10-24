import { describe, expect, it } from 'vitest';
import questionsData from '../data/questions.json';
import provasData from '../data/provas-oficiais.json';
import gabaritosData from '../data/gabaritos-oficiais.json';
import editalData from '../data/edital.json';
import {
  QuestionSchema,
  ProvaOficialSchema,
  GabaritoOficialSchema,
  EditalItemSchema,
} from '../schemas/concursoSchemas';
import { CATEGORIES, CategoryType } from '../types/schema';
import { CATEGORY_PALETTES } from '../theme/categoryPalettes';

describe('Auditoria Automatizada de Schemas Zod e Integridade de Dados', () => {
  it('1. todas as questões em questions.json atendem rigorosamente ao QuestionSchema', () => {
    expect(questionsData.length).toBeGreaterThan(0);
    for (const q of questionsData) {
      const parsed = QuestionSchema.safeParse(q);
      if (!parsed.success) {
        console.error(`Falha de schema na questão ${q.id}:`, parsed.error.format());
      }
      expect(parsed.success).toBe(true);
    }
  });

  it('2. toda categoria presente em questions.json existe em CATEGORIES e possui paleta mapeada', () => {
    const categoriesSet = new Set(CATEGORIES);
    for (const q of questionsData) {
      const cat = q.category as CategoryType;
      expect(categoriesSet.has(cat)).toBe(true);
      expect(CATEGORY_PALETTES.dark[cat]).toBeDefined();
      expect(CATEGORY_PALETTES.light[cat]).toBeDefined();
    }
  });

  it('3. todas as provas em provas-oficiais.json atendem ao ProvaOficialSchema', () => {
    expect(provasData.length).toBeGreaterThanOrEqual(4);
    for (const prova of provasData) {
      const parsed = ProvaOficialSchema.safeParse(prova);
      if (!parsed.success) {
        console.error(`Falha de schema na prova ${prova.id}:`, parsed.error.format());
      }
      expect(parsed.success).toBe(true);
    }
  });

  it('4. todo gabarito em gabaritos-oficiais.json referencia uma prova válida e tem contagem coerente', () => {
    const provaMap = new Map(provasData.map((p) => [p.id, p]));

    for (const gab of gabaritosData) {
      const parsed = GabaritoOficialSchema.safeParse(gab);
      expect(parsed.success).toBe(true);

      // Referência cruzada
      const prova = provaMap.get(gab.provaId);
      expect(prova).toBeDefined();

      // Contagem de respostas confere com quantidadeQuestoes declarada
      if (prova?.quantidadeQuestoes) {
        expect(gab.respostas.length).toBe(prova.quantidadeQuestoes);
      }
    }
  });

  it('5. todos os tópicos de edital.json atendem ao EditalItemSchema e mapeiam categorias válidas', () => {
    expect(editalData.length).toBeGreaterThan(0);
    for (const item of editalData) {
      const parsed = EditalItemSchema.safeParse(item);
      if (!parsed.success) {
        console.error(`Falha no item do edital ${item.id}:`, parsed.error.format());
      }
      expect(parsed.success).toBe(true);
    }
  });

  it('6. 100% das 175 questões possuem metadados completos de banca, matéria, cargo e órgão sem lacunas', () => {
    expect(questionsData).toHaveLength(175);
    for (const q of questionsData) {
      expect(q.banca).toBe('VUNESP');
      expect(q.cargo).toBe('Agente Patrimonial');
      expect(q.orgao).toBe('Câmara Municipal de Itanhaém');
      expect(q.cidade).toBe('Itanhaém');
      expect(q.materia).toBeDefined();
      expect(['Língua Portuguesa', 'Direito Administrativo', 'Matemática e Raciocínio Lógico', 'Conhecimentos Específicos']).toContain(q.materia);
      expect(q.questionFormat).toBeDefined();
      expect(['lacuna', 'multipla_escolha']).toContain(q.questionFormat);
    }
  });
});
