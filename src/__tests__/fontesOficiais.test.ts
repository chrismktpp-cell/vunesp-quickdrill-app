import { describe, expect, it } from 'vitest';
import provasOficiais from '../data/provas-oficiais.json';
import gabaritosOficiais from '../data/gabaritos-oficiais.json';
import questionsData from '../data/questions.json';
import { filtrarQuestoes, QuestionFilters } from '../services/filterEngine';
import type { Question, UserStats } from '../types/schema';

describe('Validação de Provas Oficiais, Integridade de Conteúdo e Filtros Táticos', () => {
  const dummyStats: UserStats = {
    attempts: [],
    streak: 0,
    bestStreak: 0,
    blindSpotQueue: [],
    errorQueue: [],
    revisoesSRS: {},
    simuladosHistorico: [],
  };

  // 1. Toda prova catalogada possui fonte oficial
  it('1. toda prova catalogada possui fonte oficial com protocolo HTTPS e domínios legítimos', () => {
    expect(provasOficiais.length).toBeGreaterThanOrEqual(4);
    for (const prova of provasOficiais) {
      expect(prova.id).toBeTruthy();
      expect(prova.titulo).toBeTruthy();
      expect(prova.orgao).toBeTruthy();
      expect(prova.cidade).toBeTruthy();
      expect(prova.ano).toBeGreaterThanOrEqual(2019);
      expect(prova.organizadora).toBeTruthy();
      expect(prova.cargo).toBeTruthy();
      expect(prova.urlConcurso).toMatch(/^https:\/\//);
      expect(
        prova.urlConcurso.includes('vunesp.com.br') ||
        prova.urlConcurso.includes('itanhaem.sp.gov.br') ||
        prova.urlConcurso.includes('nossorumo.org.br') ||
        prova.urlConcurso.includes('camaraaluminio.sp.gov.br')
      ).toBe(true);
    }
  });

  // 2. Toda questão importada possui referência ao caderno oficial (ou caderno não disponível não é importado)
  it('2. cadernos não disponibilizados publicamente não têm questões importadas', () => {
    const itanhaem = provasOficiais.find((p) => p.id === 'itanhaem-ps012026');
    expect(itanhaem).toBeDefined();
    expect(itanhaem?.situacaoCaderno).toMatch(/não disponibilizado/i);
    // Como o caderno de Itanhaém não está em acesso público, nenhuma questão dele é importada
    const questoesItanhaemImportadas = (questionsData as Question[]).filter(
      (q) => q.prova === 'Prefeitura de Itanhaém' || q.id.startsWith('itanhaem-ap-')
    );
    expect(questoesItanhaemImportadas).toHaveLength(0);
  });

  // 3. Toda questão importada possui referência ao gabarito oficial
  it('3. toda prova com gabarito oficial cadastrado possui referência válida ao documento oficial', () => {
    expect(gabaritosOficiais.length).toBeGreaterThanOrEqual(1);
    for (const gab of gabaritosOficiais) {
      expect(gab.provaId).toBeTruthy();
      expect(gab.cargo).toBeTruthy();
      expect(gab.fonte).toMatch(/^https:\/\//);
      expect(gab.respostas.length).toBeGreaterThan(0);
    }
  });

  // 4. O texto da questão não foi gerado pelo sistema
  it('4. nenhuma questão no banco contém marcas ou padrões de geração sintética', () => {
    for (const q of questionsData as Question[]) {
      expect(q.statement).not.toMatch(/como um modelo de linguagem/i);
      expect(q.statement).not.toMatch(/questão gerada por ia/i);
      expect(q.raioX).not.toMatch(/gerado artificialmente/i);
      expect(q.statement.trim().length).toBeGreaterThan(10);
      expect(q.options.length).toBeGreaterThanOrEqual(2);
    }
  });

  // 5. O concurso de Itanhaém não é classificado como VUNESP quando a organizadora for outra
  it('5. o concurso de Itanhaém (PS 01/2026) é classificado estritamente como Instituto Nosso Rumo, não VUNESP', () => {
    const itanhaem = provasOficiais.find((p) => p.id === 'itanhaem-ps012026');
    expect(itanhaem?.organizadora).toBe('Instituto Nosso Rumo');
    expect(itanhaem?.banca).toBe('Instituto Nosso Rumo');
    expect(itanhaem?.banca).not.toBe('VUNESP');

    const gabarito = gabaritosOficiais.find((g) => g.provaId === 'itanhaem-ps012026');
    expect(gabarito?.organizadora).toBe('Instituto Nosso Rumo');
    expect(gabarito?.organizadora).not.toBe('VUNESP');
  });

  // 6. Os filtros separam corretamente banca, órgão, prova, cargo e cidade
  it('6. os filtros separam corretamente banca, órgão, prova, cargo e cidade (Alumínio x Itanhaém)', () => {
    const mockQuestoes: Question[] = [
      {
        id: 'q-camara-itanhaem-01',
        category: 'Crase (VUNESP)',
        subtopic: 'Crase proibida',
        statement: 'Questão sobre crase da Câmara de Itanhaém',
        options: ['A', 'B'],
        correctIndex: 0,
        raioX: 'Explicação Vunesp',
        difficulty: 'Fácil',
        banca: 'VUNESP',
        orgao: 'Câmara Municipal de Itanhaém',
        cidade: 'Itanhaém',
        prova: 'Concurso Câmara de Itanhaém',
        cargo: 'Agente de Segurança Legislativa',
        ano: 2024,
      },
      {
        id: 'q-camara-aluminio-01',
        category: 'Gestão de Patrimônio e Bens Públicos',
        subtopic: 'Controle de Acesso',
        statement: 'Questão sobre patrimônio da Câmara de Alumínio',
        options: ['A', 'B'],
        correctIndex: 1,
        raioX: 'Explicação Alumínio',
        difficulty: 'Média',
        banca: 'VUNESP',
        orgao: 'Câmara Municipal de Alumínio',
        cidade: 'Alumínio/SP',
        prova: 'Concurso Câmara de Alumínio',
        cargo: 'Agente de Segurança Patrimonial',
        ano: 2024,
      },
      {
        id: 'q-prefeitura-itanhaem-01',
        category: 'Conhecimentos Específicos - Agente Patrimonial',
        subtopic: 'Vigilância',
        statement: 'Questão oficial Nosso Rumo Itanhaém',
        options: ['A', 'B', 'C', 'D', 'E'],
        correctIndex: 2,
        raioX: 'Explicação Nosso Rumo',
        difficulty: 'Média',
        banca: 'Instituto Nosso Rumo',
        orgao: 'Prefeitura Municipal da Estância Balneária de Itanhaém',
        cidade: 'Itanhaém',
        prova: 'Processo Seletivo 01/2026',
        cargo: 'Agente de Vigilância Patrimonial',
        ano: 2026,
      },
    ];

    // Filtro por Cargo: Agente de Segurança Patrimonial (Alumínio)
    const filtroAluminio: QuestionFilters = {
      cargo: 'Agente de Segurança Patrimonial',
    };
    const resAluminio = filtrarQuestoes(mockQuestoes, filtroAluminio, dummyStats);
    expect(resAluminio).toHaveLength(1);
    expect(resAluminio[0].id).toBe('q-camara-aluminio-01');
    expect(resAluminio[0].cidade).toBe('Alumínio/SP');

    // Garante que a questão de Alumínio NÃO aparece quando o filtro é para Itanhaém
    const filtroItanhaemCargo: QuestionFilters = {
      cargo: 'Agente de Vigilância Patrimonial',
    };
    const resItanhaem = filtrarQuestoes(mockQuestoes, filtroItanhaemCargo, dummyStats);
    expect(resItanhaem).toHaveLength(1);
    expect(resItanhaem[0].id).toBe('q-prefeitura-itanhaem-01');
    expect(resItanhaem.some((q) => q.id === 'q-camara-aluminio-01')).toBe(false);

    // Filtro por Banca: VUNESP x Instituto Nosso Rumo
    const filtroVunesp: QuestionFilters = { banca: 'VUNESP' };
    const resVunesp = filtrarQuestoes(mockQuestoes, filtroVunesp, dummyStats);
    expect(resVunesp).toHaveLength(2);
    expect(resVunesp.some((q) => q.banca === 'Instituto Nosso Rumo')).toBe(false);

    const filtroINR: QuestionFilters = { banca: 'Instituto Nosso Rumo' };
    const resINR = filtrarQuestoes(mockQuestoes, filtroINR, dummyStats);
    expect(resINR).toHaveLength(1);
    expect(resINR[0].id).toBe('q-prefeitura-itanhaem-01');
  });

  // 7. O gabarito possui a quantidade correta de respostas
  it('7. o gabarito oficial definitivo de Itanhaém possui exatamente 24 respostas válidas', () => {
    const gabarito = gabaritosOficiais.find((g) => g.provaId === 'itanhaem-ps012026');
    expect(gabarito).toBeDefined();
    expect(gabarito?.tipo).toBe('definitivo');
    expect(gabarito?.codigoCargo).toBe('101');
    expect(gabarito?.respostas).toHaveLength(24);
    expect(
      gabarito?.respostas.every((r) => ['A', 'B', 'C', 'D', 'E'].includes(r))
    ).toBe(true);
  });

  // 8. Não existem IDs duplicados
  it('8. não existem IDs duplicados nas provas catalogadas nem no banco de questões', () => {
    const provaIds = provasOficiais.map((p) => p.id);
    expect(new Set(provaIds).size).toBe(provaIds.length);

    const questionIds = (questionsData as Question[]).map((q) => q.id);
    expect(new Set(questionIds).size).toBe(questionIds.length);
  });

  // 9. Não existem questões sintéticas ou criadas pelo agente
  it('9. não existem questões sintéticas geradas por agente (ex: lote itanhaem-ap-*)', () => {
    const syntheticFound = (questionsData as Question[]).filter((q) =>
      q.id.startsWith('itanhaem-ap-')
    );
    expect(syntheticFound).toHaveLength(0);
    expect((questionsData as Question[]).length).toBe(145);
  });
});
