# VUNESP QuickDrill

Aplicativo tático de treino e repetição espaçada (SRS) 100% offline para concursos públicos, com catálogo de fontes oficiais da VUNESP e separação do processo seletivo de Agente de Vigilância Patrimonial de Itanhaém.

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

5. **Build web de validação:**
   ```bash
   npm run build
   ```

> ⚠️ **Aviso de Compatibilidade:** O aplicativo utiliza **Expo SDK 57** (React 19.2.3, React Native 0.86.2). Certifique-se de que o aplicativo **Expo Go** instalado no seu dispositivo móvel seja compatível com a versão 57.

## 📂 Onde Ficam os Dados

- **Banco de Questões:** [`src/data/questions.json`](src/data/questions.json) (questões formatadas com lacunas, alternativas, gabarito e raio-X da banca).
- **Mapeamento do Edital:** [`src/data/edital.json`](src/data/edital.json) (tópicos curriculares oficiais e legislação).
- **Catálogo de provas oficiais:** [`src/data/provas-oficiais.json`](src/data/provas-oficiais.json), com links para as páginas oficiais da VUNESP e para os documentos oficiais do Instituto Nosso Rumo/Prefeitura de Itanhaém.
- **Gabaritos oficiais:** [`src/data/gabaritos-oficiais.json`](src/data/gabaritos-oficiais.json), contendo o gabarito definitivo publicado para o cargo 101 de Itanhaém.
- **Regra de integridade:** não são inseridas questões quando o caderno oficial e o gabarito correspondente não estão publicamente verificáveis. O caderno de Itanhaém não está no portal municipal consultado; o edital informa que ele ficou disponível apenas durante o período de recursos. As páginas de provas da VUNESP direcionam para a área oficial do candidato.
- **Progresso e Estatísticas do Usuário:** Armazenados localmente no dispositivo via `@react-native-async-storage/async-storage` (100% offline, sem necessidade de conexão com a internet).
