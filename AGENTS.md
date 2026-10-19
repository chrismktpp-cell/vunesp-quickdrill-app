# AGENTS.md — Diretrizes de Engenharia do VUNESP QuickDrill

Este documento serve como contrato operacional e referência técnica permanente para qualquer agente ou desenvolvedor que atue neste repositório. **Leia antes de qualquer alteração.** O código da aplicação é a fonte primária de verdade.

---

## 🎯 1. Visão do Produto & Regra de Ouro
O objetivo do **VUNESP QuickDrill** é fazer o concurseiro **acertar mais questões em menos tempo**, eliminando pontos cegos e garantindo que os erros nunca sejam esquecidos.

> **Regra Anti-Scope-Creep:**
> O foco do aplicativo é estritamente a prática intensiva, rápida e offline:
> 1. **Banco de Questões Táticas** com filtros reais (categoria, dificuldade, status de estudo, busca textual).
> 2. **Banco de Erros** automático (errou = incluído na fila prioritária de treino).
> 3. **Fila do Dia (Leitner SRS)** ("O que revisar hoje").
> 4. **Rastreio de Cobertura de Edital** (Pendente, Em Revisão, Dominado).
> 5. **Dashboard Executivo de Métricas** (taxa de acerto global e por matéria, matriz metacognitiva).
> 6. **Modo Simulado Real** (cronometrado, gabarito e raio-X apenas ao final).
> 7. **Local-First & 100% Offline** (estudo em qualquer lugar via AsyncStorage versionado).

---

## 🛠️ 2. Stack Tecnológica
- **Ambiente:** Expo React Native (TypeScript).
- **Compatibilidade Rigorosa:** **Expo SDK 57** (`expo ~57.0.15`, `react 19.2.3`, `react-native 0.86.2`).
  - *Aviso:* **NUNCA** atualize para o SDK 58 sem autorização expressa, pois o Expo Go do dispositivo do usuário está fixado no SDK 57.
- **Ícones:** `@expo/vector-icons` (Ionicons exclusivamente). Não instale nem cite `lucide-react-native` nem pacotes nativos de Node (ex: `buffer`).
- **Persistência Local-First:** `@react-native-async-storage/async-storage` com chaves versionadas V2 e envelopes de integridade.
- **Testes Unitários:** Vitest (`npm test`) e checagem de tipos (`npm run typecheck`).

---

## 📦 3. Estrutura de Pastas
```text
src/
├── types/schema.ts    # Schemas e interfaces estritas (Question, QuestionAttempt, RevisaoSRS, SimuladoResultado)
├── services/          # Motores puros de lógica testáveis (srsEngine, filterEngine, editalService, simuladoService)
├── data/              # Datasets táticos normalizados (questions.json, edital.json)
├── utils/             # Storage versionado V2, mutex de escrita, haptics e helpers
├── components/        # Componentes de UI modulares (DrillScreen, DashboardScreen, SimuladoScreen, EditalScreen, MuralDeMacetes)
└── __tests__/         # Testes unitários para SRS, simulados, filtros e persistência
```

---

## 🗄️ 4. Modelo de Dados Real (Local-First)

### 1. `Question` (src/types/schema.ts):
Campos reais obrigatórios:
- `id: string` (ex: `crase-01`)
- `category: CategoryType` ('Crase (VUNESP)' | 'Sujeito Oracional e Transitividade' | 'Gestão de Patrimônio e Bens Públicos' | 'Nova Lei de Licitações (Lei 14.133/2021)')
- `subtopic: string`
- `statement: string` (com marcador `_____` para preenchimento de lacuna)
- `options: string[]`
- `correctIndex: number`
- `raioX: string` (macete tático da banca em 1 frase)
- `legalBasis?: string` (fundamentação legal ou gramatical)
- `difficulty: Dificuldade` ('Fácil' | 'Média' | 'Difícil')

*Campos opcionais:* `banca?: string`, `materia?: string`, `ano?: number`, `editalTopicoId?: string` (a maioria das questões do banco tático não os possui).

### 2. `QuestionAttempt`:
- `id?: string`
- `questionId: string`
- `category: CategoryType`
- `selectedOptionIndex: number`
- `isCorrect: boolean`
- `certainty: CertaintyLevel` (1: Chute, 2: Dúvida, 3: Certeza)
- `classification: PerformanceClassification` ('real_mastery' | 'blind_spot' | 'lucky_guess' | 'conscious_error' | 'doubt_success' | 'doubt_failure')
- `timestamp: number`

### 3. `RevisaoSRS` (Algoritmo de Leitner com Regras de Certeza):
Intervalos: Caixa 1 (1d), Caixa 2 (3d), Caixa 3 (7d), Caixa 4 (14d), Caixa 5 (30d). Sem fator de facilidade (removido para manter intervalo determinístico).
- `perguntaId: string`
- `caixa: number` (1 a 5)
- `intervaloDias: number` (1, 3, 7, 14, 30)
- `proximaRevisao: number` (timestamp em ms)
- `historicoRepeticoes: number`
- `lapses: number` (vezes que errou após aprender)
- `status: 'pendente' | 'em_revisao' | 'dominado'`
- `ultimaRevisao: number` (timestamp em ms)

**Regras de Progressão do SRS:**
- **Acerto com Certeza [3]:** Sobe 1 caixa (teto na caixa 5). Status `'dominado'` exclusivamente ao atingir a caixa 5.
- **Acerto com Certeza [2] (Dúvida):** Sobe no máximo 1 caixa, com teto na caixa 3. Nunca atinge status `'dominado'` sem Certeza [3].
- **Acerto com Chute [1]:** Permanece na caixa 1 com intervalo de 1 dia (acerto frágil para fixação).
- **Erro:** Retorna à caixa 1, intervalo de 1 dia, incrementa `lapses`, status `'pendente'`.
- **Fila do Dia:** Questões já respondidas no mesmo dia civil local não reaparecem nas pendentes de hoje. Novas questões são embaralhadas com seed determinística baseada na data civil local (`YYYY-MM-DD`).

### 4. `SimuladoResultado`:
Estrutura leve (sem duplicar instâncias de `Question`):
- `id: string`, `titulo: string`, `dataHora: number`, `tempoTotalGastoSegundos: number`, `duracaoTotalSegundos: number`, `totalQuestoes: number`, `acertos: number`, `erros: number`, `emBranco: number`, `pontuacaoPercentual: number`
- `detalhesPorCategoria: Record<CategoryType, { total: number; acertos: number; taxa: number }>`
- `respostas: Array<{ perguntaId: string; selectedOptionIndex: number | null; isCorrect: boolean }>`

---

## 💾 5. Persistência & Performance Offline (V2)

### Chaves Versionadas:
1. `vunesp_qd_meta_v2`: Envelope `{ v: 2, savedAt: number, data: { streak, bestStreak, blindSpotQueue, errorQueue } }`
2. `vunesp_qd_srs_v2`: Envelope `{ v: 2, savedAt: number, data: Record<string, RevisaoSRS> }`
3. `vunesp_qd_attempts_v2`: Envelope `{ v: 2, savedAt: number, data: QuestionAttempt[] }` (máximo 400 tentativas recentes)
4. `vunesp_qd_simulados_v2`: Envelope `{ v: 2, savedAt: number, data: SimuladoResultado[] }` (máximo 20 simulados leves)

### Fila de Escrita (Mutex):
- Toda gravação em disco passa por uma promise chain serializada (`enqueueWrite`) em `storage.ts`.
- Respostas atualizam a UI de forma otimista e instantânea antes de qualquer operação de I/O em disco (`void saveAttemptToStorage(newStats).catch(console.error)`).
- A gravação de resposta persiste apenas meta + srs + attempts. Simulados persistem apenas a chave de simulados.
- Na primeira carga, se as chaves v2 não existirem e a chave legada v1 (`vunesp_quickdrill_stats_v1`) estiver presente, o sistema migra transparentemente os dados para o schema v2 e descarta a chave antiga.

---

## ⚙️ 6. Convenções de Código
1. **Diff Cirúrgico:** Faça alterações pontuais. Nunca reescreva arquivos inteiros sem necessidade.
2. **Qualidade dos Dados > Features:** Questões no estilo VUNESP, com lacunas e gabarito conferido.
3. **Testes Unitários:** Todo motor (`srsEngine`, `storage`, `filterEngine`, `editalService`, `simuladoService`) possui testes em `src/__tests__/`. Execute sempre `npm test` e `npm run typecheck` antes de finalizar.
4. **Sem Abstrações Desnecessárias:** Manter React Native simples e idiomático com `useState`, `useCallback` e `useMemo`.
