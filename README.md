# VUNESP QuickDrill

Aplicativo tático de treino e repetição espaçada (SRS) 100% offline para concursos da banca VUNESP, com foco específico no edital da Câmara Municipal de Itanhaém.

## 🚀 Como Executar

1. **Instalar dependências:**
   ```bash
   npm install
   ```

2. **Iniciar o app com Expo:**
   ```bash
   npx expo start
   ```

3. **Executar testes unitários:**
   ```bash
   npm test
   ```

4. **Verificação de tipagem TypeScript:**
   ```bash
   npm run typecheck
   ```

> ⚠️ **Aviso de Compatibilidade:** O aplicativo utiliza **Expo SDK 57** (React 19.2.3, React Native 0.86.2). Certifique-se de que o aplicativo **Expo Go** instalado no seu dispositivo móvel seja compatível com a versão 57.

## 📂 Onde Ficam os Dados

- **Banco de Questões:** [`src/data/questions.json`](src/data/questions.json) (questões formatadas com lacunas, alternativas, gabarito e raio-X da banca).
- **Mapeamento do Edital:** [`src/data/edital.json`](src/data/edital.json) (tópicos curriculares oficiais e legislação).
- **Catálogo de Provas Oficiais:** [`src/data/provas-oficiais.json`](src/data/provas-oficiais.json) (metadados e URLs oficiais de concursos VUNESP e Instituto Nosso Rumo).
- **Gabaritos Oficiais:** [`src/data/gabaritos-oficiais.json`](src/data/gabaritos-oficiais.json) (gabaritos oficiais publicados pelas organizadoras).
- **Regra de Integridade Oficial:** nenhuma questão é importada sem verificação direta do caderno oficial de provas publicado e do gabarito definitivo oficial. Cadernos restritos à Área do Candidato com login são catalogados como fonte, sem importação sintética.
- **Progresso e Estatísticas do Usuário:** Armazenados localmente no dispositivo via `@react-native-async-storage/async-storage` (100% offline, sem necessidade de conexão com a internet).

## ⚙️ Regras do Motor
- **Teto da Fila:** Máximo de 20 revisões/dia priorizadas pelas mais atrasadas.
- **Lapse Suave:** Questão avançada/dominada (caixa ≥ 4) que erra volta à caixa 2 (não ao início).
- **Backup Local:** Exportação e restauração manual via JSON versionado (sem nuvem).

