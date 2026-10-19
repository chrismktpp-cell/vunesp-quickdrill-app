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
- **Progresso e Estatísticas do Usuário:** Armazenados localmente no dispositivo via `@react-native-async-storage/async-storage` (100% offline, sem necessidade de conexão com a internet).

