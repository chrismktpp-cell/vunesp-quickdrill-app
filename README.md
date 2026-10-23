# AprovaFox (VUNESP QuickDrill)

Aplicativo tático de treino, fixação de editais e repetição espaçada (SRS) 100% offline para concursos públicos, com cobertura de certames da **Fundação VUNESP** e do **Instituto Nosso Rumo**.

> **"Estude esperto. Passe preparado."**

---

## 🏛️ Concursos e Bancas Catalogadas

O aplicativo organiza o banco de questões e o catálogo de provas respeitando estritamente a identidade de cada órgão e organizadora:

1. **Câmara Municipal de Itanhaém / SP** — Concurso Público (Banca: **Fundação VUNESP**)
   - Cargo: *Agente de Segurança Legislativa*
2. **Prefeitura Municipal da Estância Balneária de Itanhaém / SP** — Processo Seletivo nº 01/2026 (Organizadora: **Instituto Nosso Rumo**)
   - Cargo: *Agente de Vigilância Patrimonial* (Código 101)
3. **Câmara Municipal de Alumínio / SP** — Concurso Público nº 01/2024 (Banca: **Fundação VUNESP**)
   - Cargo: *Agente de Segurança Patrimonial* (Código 001)
4. **Câmara Municipal de Marília / SP** — Concurso Público nº 01/2025 (Banca: **Fundação VUNESP**)
   - Cargo: *Agente de Segurança Legislativa* (Código 003)
5. **Prefeitura Municipal de Itanhaém / SP** — Concurso Público nº 01/2019 (Banca: **Fundação VUNESP**)
   - Cargo: *Guarda Civil Municipal - 2ª Classe*

---

## 🛡️ Política Estrita de Integridade de Conteúdo

1. **Origem Verificável (`origem: 'oficial' | 'autoral'`):**
   - Nenhuma questão é rotulada como oficial de banca sem comprovação simultânea do caderno oficial de provas e do gabarito definitivo publicado pelo órgão.
   - Provas cujo caderno permaneceu restrito à Área do Candidato (com login/senha) são mantidas em [`src/data/provas-oficiais.json`](src/data/provas-oficiais.json) e [`src/data/gabaritos-oficiais.json`](src/data/gabaritos-oficiais.json) como fonte documental de referência oficial, sem criação de enunciados artificiais.
   - Exercícios táticos de fixação para tópicos de edital (crase, concordância, licitações, patrimônio e raciocínio lógico) são estruturados sob rigor normativo pedagógico e classificados com precisão.
2. **Validação Automática por Schemas Zod:**
   - Todo o banco de dados é auditado via suite automatizada (`npm test`), validando a conformidade de alternativas, limites de gabarito e integridade referencial entre provas e gabaritos.
3. **Filtros Inclusivos por Padrão:**
   - O aplicativo inicia por padrão com filtros em modo abrangente (`all`), assegurando acesso total a todas as disciplinas e questões disponíveis, com comparação insensível a acentuação e caixa.

---

## 🚀 Como Executar

1. **Instalar dependências:**
   ```bash
   npm install
   ```

2. **Iniciar o app com Expo:**
   ```bash
   npx expo start
   ```

3. **Executar testes unitários (Vitest):**
   ```bash
   npm test
   ```

4. **Verificação de tipagem TypeScript:**
   ```bash
   npm run typecheck
   ```

5. **Build de produção / Export:**
   ```bash
   npm run build
   ```

---

## 📂 Estrutura de Dados

- **Banco de Questões:** [`src/data/questions.json`](src/data/questions.json) (enunciados, alternativas, gabarito e raio-X).
- **Mapeamento do Edital:** [`src/data/edital.json`](src/data/edital.json) (tópicos curriculares oficiais e referências legais).
- **Catálogo de Provas Oficiais:** [`src/data/provas-oficiais.json`](src/data/provas-oficiais.json) (metadados e URLs oficiais de editais e certames).
- **Gabaritos Oficiais:** [`src/data/gabaritos-oficiais.json`](src/data/gabaritos-oficiais.json) (gabaritos oficiais publicados pelas bancas).
- **Filtros e Defaults:** [`src/constants/filters.ts`](src/constants/filters.ts) e [`src/services/filterEngine.ts`](src/services/filterEngine.ts).
- **Paletas e Categorias:** [`src/theme/categoryPalettes.ts`](src/theme/categoryPalettes.ts).
- **Progresso e Estatísticas:** Persistência 100% offline via AsyncStorage com versionamento de envelope e recuperação segura contra corrupção de estado.
