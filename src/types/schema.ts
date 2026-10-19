export type CategoryType = 
  | 'Crase (VUNESP)'
  | 'Sujeito Oracional e Transitividade'
  | 'Gestão de Patrimônio e Bens Públicos'
  | 'Nova Lei de Licitações (Lei 14.133/2021)';

export type Banca = 'VUNESP' | 'FCC' | 'FGV' | 'Cebraspe' | 'Geral';

export type Materia = 
  | 'Língua Portuguesa'
  | 'Direito Administrativo'
  | 'Administração Pública e Patrimônio'
  | 'Legislação Municipal';

export type Dificuldade = 'Fácil' | 'Média' | 'Difícil';

export type CertaintyLevel = 1 | 2 | 3; // 1: Chute, 2: Dúvida, 3: Certeza

export type PerformanceClassification = 
  | 'real_mastery'     // Certeza (3) + Acerto -> Domínio Real
  | 'blind_spot'       // Certeza (3) + Erro   -> Ilusão de Competência (Ponto Cego!)
  | 'lucky_guess'      // Chute (1) + Acerto   -> Sorte / Acerto Frágil
  | 'conscious_error'  // Chute (1) + Erro     -> Erro Consciente
  | 'doubt_success'    // Dúvida (2) + Acerto  -> Dúvida com Acerto
  | 'doubt_failure';   // Dúvida (2) + Erro    -> Dúvida com Erro

export interface Question {
  id: string;
  category: CategoryType;
  subtopic: string;
  statement: string;
  options: string[];
  correctIndex: number;
  raioX: string;
  legalBasis?: string;
  difficulty: Dificuldade;
  banca?: Banca | string;
  materia?: Materia | string;
  ano?: number;
  editalTopicoId?: string;
}

export type Pergunta = Question;

export interface QuestionAttempt {
  id?: string;
  questionId: string;
  category: CategoryType;
  selectedOptionIndex: number;
  isCorrect: boolean;
  certainty: CertaintyLevel;
  classification: PerformanceClassification;
  tempoGastoMs?: number;
  timestamp: number;
}

export type RespostaUsuario = QuestionAttempt;

// Spaced Repetition (SRS Leitner / SM-2)
export type SRSStatus = 'pendente' | 'em_revisao' | 'dominado';

export interface RevisaoSRS {
  perguntaId: string;
  caixa: number; // 1 a 5
  intervaloDias: number; // 1d, 3d, 7d, 14d, 30d
  proximaRevisao: number; // timestamp em ms
  historicoRepeticoes: number;
  fatorFacilidade: number; // Padrão 2.5 (SM-2)
  lapses: number; // Vezes que errou após aprender
  status: SRSStatus;
  ultimaRevisao: number; // timestamp em ms
}

export interface FilaDoDia {
  revisoesPendentes: Question[];
  novasQuestoes: Question[];
  totalHoje: number;
  timestampCalculo: number;
}

// Edital Itanhaém Tracking
export interface EditalTopico {
  id: string;
  materia: Materia;
  category: CategoryType;
  nome: string;
  descricao: string;
  pesoOuRelevancia: 'Alta' | 'Média' | 'Baixa';
  artigosLei?: string;
}

export interface ProgressoEdital {
  topicoId: string;
  totalQuestoes: number;
  questoesRespondidas: number;
  acertos: number;
  erros: number;
  status: 'pendente' | 'em_revisao' | 'dominado';
  percentualCobertura: number; // 0 - 100%
  taxaAcerto: number; // 0 - 100%
}

export interface CoberturaGeralEdital {
  totalTopicos: number;
  topicosDominados: number;
  topicosEmRevisao: number;
  topicosPendentes: number;
  percentualGeralCobertura: number;
  taxaGeralAcerto: number;
  porMateria: Record<string, {
    totalTopicos: number;
    dominados: number;
    emRevisao: number;
    pendentes: number;
    percentualCobertura: number;
  }>;
}

// Modo Simulado Real
export interface SimuladoConfig {
  id: string;
  titulo: string;
  duracaoMinutos: number;
  quantidadeQuestoes: number;
  categorias?: CategoryType[];
}

export interface SimuladoResposta {
  perguntaId: string;
  selectedOptionIndex: number | null; // null = pulada/em branco
  marcadaParaRevisao?: boolean;
}

export interface SimuladoResultado {
  id: string;
  titulo: string;
  dataHora: number;
  tempoTotalGastoSegundos: number;
  duracaoTotalSegundos: number;
  totalQuestoes: number;
  acertos: number;
  erros: number;
  emBranco: number;
  pontuacaoPercentual: number;
  detalhesPorCategoria: Record<CategoryType, {
    total: number;
    acertos: number;
    taxa: number;
  }>;
  respostas: Array<{
    pergunta: Question;
    selectedOptionIndex: number | null;
    isCorrect: boolean;
  }>;
}

export interface UserStats {
  attempts: QuestionAttempt[];
  streak: number;
  bestStreak: number;
  blindSpotQueue: string[]; // question ids flagged as blind spots
  errorQueue: string[]; // question ids with wrong answers
  revisoesSRS?: Record<string, RevisaoSRS>;
  simuladosHistorico?: SimuladoResultado[];
}

export type DrillMode = 'all' | 'errors_only' | 'blind_spots_only' | 'srs_queue';
