# AGENTS.md — Diretrizes de Engenharia do VUNESP QuickDrill

Este documento serve como contrato operacional e referência técnica permanente para qualquer agente ou desenvolvedor que atue neste repositório. **Leia antes de qualquer alteração.**

---

## 🎯 1. Visão do Produto & Regra de Ouro
O objetivo do **VUNESP QuickDrill** é fazer o concurseiro **acertar mais questões em menos tempo**, eliminando pontos cegos e garantindo que os erros nunca sejam esquecidos.

> **Regra Anti-Scope-Creep:**
> Tudo o que não ajuda a pessoa a resolver e revisar mais questões de forma eficaz fica para a versão 2.
> O MVP é composto estritamente por:
> 1. **Banco de Questões** com filtros reais (matéria, tópico, banca, ano, dificuldade).
> 2. **Banco de Erros** automático (errou = caiu na fila).
> 3. **Fila de Revisão Diária (SRS/SM-2)** ("O que revisar hoje").
> 4. **Rastreio de Cobertura de Edital** (Pendente, Em Revisão, Dominado).
> 5. **Dashboard de Métricas** (taxa de acerto por tema, repetição de erros).
> 6. **Modo Simulado Real** (cronometrado, gabarito apenas no fim).
> 7. **Local-First & 100% Offline** (estudo em transporte público).

---

## 🛠️ 2. Stack Tecnológica
- **Ambiente:** Expo React Native (TypeScript).
- **Compatibilidade Rigorosa:** **Expo SDK 57** (`expo ~57.0.15`, `react 19.2.3`, `react-native 0.86.2`).
  - *Aviso:* **NUNCA** atualize para o SDK 58 sem autorização expressa, pois o Expo Go do dispositivo do usuário está fixado no SDK 57.
- **Ícones:** `@expo/vector-icons` (Ionicons). **NÃO use** `lucide-react-native` nem pacotes que importem módulos nativos do Node (ex: `buffer`).
- **Persistência Local-First:** `@react-native-async-storage/async-storage` (ou SQLite `expo-sqlite`). Sem dependência de internet para funcionar.
- **Testes Unitários:** Vitest / Jest para motores de lógica (SRS, filtros e edital).

---

## 📦 3. Estrutura de Pastas
```text
src/
├── types/             # Schemas e interfaces estritas (Pergunta, SRS, Edital, Métricas)
├── services/          # Motores puros de lógica testáveis (srsEngine, filterEngine, editalService)
├── data/              # Datasets normalizados e deduplicados (questions.json, edital.json)
├── utils/             # Storage, haptics e helpers de cálculo
├── components/        # Componentes de UI modulares e focados
└── __tests__/         # Testes unitários para SRS, filtros e edital
```

---

## 🗄️ 4. Modelo de Dados Formal (Local-First)
1. **`Pergunta`**:
   - `id: string` (ex: `vunesp-crase-01`)
   - `banca: string` (ex: `VUNESP`)
   - `materia: string` (ex: `Língua Portuguesa`)
   - `topico: string` (ex: `Crase`)
   - `editalTopicoId: string` (vínculo com o edital de Itanhaém)
   - `ano: number`
   - `dificuldade: 'Fácil' | 'Média' | 'Difícil'`
   - `enunciado: string`
   - `alternativas: string[]`
   - `gabaritoIndex: number`
   - `raioX: string` (macete em 1 frase)
   - `fundamentacao: string`

2. **`RespostaUsuario`**:
   - `id: string`
   - `perguntaId: string`
   - `alternativaEscolhida: number`
   - `correta: boolean`
   - `certeza: 1 | 2 | 3` (Chute, Dúvida, Certeza)
   - `tempoGastoMs: number`
   - `dataHora: number` (timestamp)

3. **`RevisaoSRS` (Algoritmo SM-2 / Leitner)**:
   - `perguntaId: string`
   - `caixa: number` (1 a 5)
   - `intervaloDias: number` (1d, 3d, 7d, 14d, 30d)
   - `proximaRevisao: number` (timestamp da data alvo)
   - `historicoRepeticoes: number`
   - `fatorFacilidade: number` (padrão 2.5)
   - `status: 'pendente' | 'em_revisao' | 'dominado'`

4. **`EditalTopico`**:
   - `id: string`
   - `materia: string`
   - `nome: string`
   - `pesoOuRelevancia: 'Alta' | 'Média' | 'Baixa'`
   - `totalQuestoesDisponiveis: number`

5. **`ProgressoEdital`**:
   - `editalTopicoId: string`
   - `status: 'pendente' | 'em_revisao' | 'dominado'`
   - `percentualCobertura: number`
   - `taxaAcerto: number`

---

## ⚙️ 5. Convenções de Código & Boas Práticas
1. **Qualidade dos Dados > Features**: Questão duplicada ou com gabarito errado destrói o produto. Toda questão passa por validação.
2. **Diff Cirúrgico**: Faça alterações pontuais. Não reescreva arquivos inteiros sem necessidade.
3. **Teste Unitário Obrigatório para Lógica**: SRS e filtros **precisam** ter testes automatizados. A UI não avisa quando o cálculo de intervalo falha.
4. **Modo Simulado Real**: Cronômetro regressivo, sem possibilidade de ver gabarito antes de concluir, nota e diagnóstico completo somente na tela final.
5. **Fila do Dia como Métrica de Ouro**: A primeira tela do app deve responder com clareza: *"Você tem X revisões para hoje e Y novas questões"*.
