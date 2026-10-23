import { z } from 'zod';
import { CATEGORIES_LIST } from '../types/schema';

/**
 * Schema Zod para validação rigorosa de integridade de questões.
 */
export const QuestionSchema = z
  .object({
    id: z.string().min(3, 'ID da questão deve ter pelo menos 3 caracteres'),
    category: z.enum(CATEGORIES_LIST, {
      message: 'Categoria deve pertencer ao elenco oficial de categorias',
    }),
    subtopic: z.string().min(1, 'Subtópico é obrigatório'),
    statement: z.string().min(10, 'Enunciado deve conter no mínimo 10 caracteres'),
    options: z
      .array(z.string().min(1, 'Alternativa não pode ser vazia'))
      .min(2, 'Questão deve conter pelo menos 2 alternativas (formato quickdrill binário ou múltipla escolha)')
      .max(5, 'Questão deve conter no máximo 5 alternativas'),
    correctIndex: z.number().int().min(0, 'Índice de gabarito deve ser >= 0'),
    raioX: z.string().min(5, 'Raio-X tático explicativo é obrigatório'),
    difficulty: z.enum(['Fácil', 'Média', 'Difícil']),
    origem: z.enum(['oficial', 'autoral']).optional(),
    fonteCaderno: z.string().optional(),
    fonteGabarito: z.string().optional(),
    banca: z.string().optional(),
    cargo: z.string().optional(),
    prova: z.string().optional(),
    orgao: z.string().optional(),
    cidade: z.string().optional(),
    ano: z.number().int().min(2000).optional(),
    legalBasis: z.string().optional(),
    supportText: z.string().optional(),
    trapAlert: z.string().optional(),
    questionFormat: z.enum(['lacuna', 'multipla_escolha', 'assertivas']).optional(),
    editalTopicoId: z.string().optional(),
    materia: z.string().optional(),
  })
  .refine((q) => q.correctIndex < q.options.length, {
    message: 'correctIndex deve ser menor que a quantidade de alternativas',
    path: ['correctIndex'],
  })
  .refine(
    (q) => q.origem !== 'oficial' || !!(q.fonteCaderno || q.fonteGabarito || q.prova),
    {
      message: 'Questão marcada como oficial exige referência a caderno, gabarito ou prova oficial catalogada',
      path: ['origem'],
    }
  );

/**
 * Schema Zod para Provas Oficiais Catalogadas.
 */
export const ProvaOficialSchema = z.object({
  id: z.string().min(3),
  titulo: z.string().min(5),
  orgao: z.string().min(3),
  cidade: z.string().min(3),
  ano: z.number().int().min(2000),
  organizadora: z.string().min(2),
  banca: z.string().min(2),
  cargo: z.string().min(2),
  codigoCargo: z.string().optional(),
  quantidadeQuestoes: z.number().int().positive().nullable(),
  disciplinas: z.array(z.string().min(2)).min(1),
  urlConcurso: z.string().url(),
  urlEdital: z.string().url().optional(),
  urlCaderno: z.string().url().nullable().optional(),
  urlGabarito: z.string().url().nullable().optional(),
  fonteConcurso: z.string().url().optional(),
  fonteEdital: z.string().url().optional(),
  fonteProvaGabarito: z.string().url().optional(),
  fonteGabaritoFinal: z.string().url().optional(),
  situacaoCaderno: z.string().min(3),
  statusQuestoes: z.string().optional(),
  observacoesAcesso: z.string().optional(),
});

/**
 * Schema Zod para Gabaritos Oficiais Definitivos/Preliminares.
 */
export const GabaritoOficialSchema = z.object({
  provaId: z.string().min(3),
  cargo: z.string().min(2),
  codigoCargo: z.string().optional(),
  organizadora: z.string().min(2),
  tipo: z.enum(['preliminar', 'definitivo']),
  fonte: z.string().url(),
  respostas: z.array(z.string().regex(/^[A-E]$/, 'Resposta deve ser A, B, C, D ou E')).min(1),
});

/**
 * Schema Zod para Itens do Edital Verticalizado.
 */
export const EditalItemSchema = z.object({
  id: z.string().min(3),
  materia: z.string().min(2),
  category: z.enum(CATEGORIES_LIST),
  nome: z.string().min(3),
  descricao: z.string().min(5),
  pesoOuRelevancia: z.string().optional(),
  artigosLei: z.string().optional(),
});
