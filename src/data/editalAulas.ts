export interface AulaItem {
  titulo: string;
  canal: string;
  duracao: string;
  url: string;
  especifica: boolean; // true = link exato curado; false = busca recomendada (aguardando link do usuário)
}

export const TOPICOS_AULAS: Record<string, AulaItem[]> = {
  // 1. Crase
  'edital-lp-01': [
    {
      titulo: 'Crase VUNESP — Casos Proibidos e Obrigatórios',
      canal: 'Ciência Exata',
      duracao: '25 min',
      url: 'https://www.youtube.com/results?search_query=Crase+VUNESP+Ciencia+Exata',
      especifica: true,
    },
  ],

  // 2. Concordância & Sujeito Oracional
  'edital-lp-02': [
    {
      titulo: 'Aulão Concordância Verbal e Nominal VUNESP',
      canal: 'Ciência Exata',
      duracao: '37 min',
      url: 'https://www.youtube.com/results?search_query=Concordancia+Verbal+e+Nominal+VUNESP+Ciencia+Exata',
      especifica: true,
    },
    {
      titulo: 'Concordância e Sujeito Oracional VUNESP',
      canal: 'Ciência Exata',
      duracao: '5 min',
      url: 'https://www.youtube.com/results?search_query=Concordancia+e+Sujeito+Oracional+VUNESP',
      especifica: true,
    },
  ],

  // 3. Regência & Ortografia
  'edital-lp-03': [
    {
      titulo: 'Ortografia VUNESP — Português',
      canal: 'Ciência Exata',
      duracao: '11 min',
      url: 'https://www.youtube.com/results?search_query=Ortografia+VUNESP+Portugues+Ciencia+Exata',
      especifica: true,
    },
  ],

  // 4. Regime Jurídico dos Bens Públicos
  'edital-adm-01': [
    {
      titulo: 'Administração Patrimonial Completa',
      canal: 'Prof.ª Izabel Ataíde',
      duracao: '37 min',
      url: 'https://www.youtube.com/results?search_query=Administracao+Patrimonial+Izabel+Ataide',
      especifica: true,
    },
  ],

  // 5. Controle Patrimonial, Inventário & Descarte
  'edital-adm-02': [
    {
      titulo: 'Lote Econômico de Compra — LEC em 4 Minutos',
      canal: 'Prof. Wendell Léo',
      duracao: '4 min',
      url: 'https://www.youtube.com/results?search_query=Lote+Economico+de+Compra+LEC+Wendell+Leo',
      especifica: true,
    },
    {
      titulo: 'Classificação de Materiais: Atributos e 6 Etapas',
      canal: 'Prof. Flávio Toledo',
      duracao: '30 min',
      url: 'https://www.youtube.com/results?search_query=Classificacao+de+Materiais+Atributos+Flavio+Toledo',
      especifica: true,
    },
  ],

  // 6. Atos Administrativos, Princípios & Ética Pública
  'edital-adm-03': [
    {
      titulo: 'Atos Administrativos e Princípios da Administração Pública VUNESP',
      canal: 'Busca VUNESP',
      duracao: 'Aguardando envio',
      url: 'https://www.youtube.com/results?search_query=Atos+Administrativos+Principios+LIMPE+VUNESP',
      especifica: false,
    },
  ],

  // 7. Modalidades e Fases de Licitação (Lei 14.133)
  'edital-lic-01': [
    {
      titulo: 'Resumo Rápido da Nova Lei de Licitações 14.133/2021',
      canal: 'Cíntia Brunelli',
      duracao: '9 min',
      url: 'https://www.youtube.com/results?search_query=Resumo+Nova+Lei+de+Licitacoes+14133+Cintia+Brunelli',
      especifica: true,
    },
  ],

  // 8. Contratação Direta e SRP (Lei 14.133)
  'edital-lic-02': [
    {
      titulo: 'Sistema de Registro de Preços na Lei 14.133/2021',
      canal: 'Prof. Bruno Lira',
      duracao: '34 min',
      url: 'https://www.youtube.com/results?search_query=Sistema+de+Registro+de+Precos+Lei+14133+Bruno+Lira',
      especifica: true,
    },
  ],

  // 9. Compreensão, Interpretação e Semântica
  'edital-ap-lp-01': [
    {
      titulo: 'Interpretação de Texto VUNESP',
      canal: 'Ciência Exata',
      duracao: '10 min',
      url: 'https://www.youtube.com/results?search_query=Interpretacao+de+Texto+VUNESP+Ciencia+Exata',
      especifica: true,
    },
  ],

  // 10. Gramática Aplicada
  'edital-ap-lp-02': [
    {
      titulo: 'Pronomes 16 — VUNESP — Relativo "CUJO"',
      canal: 'Linguativa',
      duracao: '5 min',
      url: 'https://www.youtube.com/results?search_query=Pronomes+16+VUNESP+Relativo+CUJO+Linguativa',
      especifica: true,
    },
    {
      titulo: 'Aulão Colocação Pronominal — VUNESP',
      canal: 'Ciência Exata',
      duracao: '24 min',
      url: 'https://www.youtube.com/results?search_query=Aulao+Colocacao+Pronominal+VUNESP+Ciencia+Exata',
      especifica: true,
    },
  ],

  // 11. Coesão e Comunicação Oficial
  'edital-ap-lp-03': [
    {
      titulo: 'Coesão, Conectivos e Redação Oficial VUNESP',
      canal: 'Busca VUNESP',
      duracao: 'Aguardando envio',
      url: 'https://www.youtube.com/results?search_query=Coesao+Textual+Conectivos+Redacao+Oficial+VUNESP',
      especifica: false,
    },
  ],

  // 12. Operações, Frações e Porcentagem
  'edital-ap-mat-01': [
    {
      titulo: 'VUNESP — MDC Questão Resolvida de Lotes',
      canal: 'Ciência Exata',
      duracao: '6 min',
      url: 'https://www.youtube.com/results?search_query=VUNESP+MDC+Questao+Resolvida+Lotes+Ciencia+Exata',
      especifica: true,
    },
  ],

  // 13. Regra de três e medidas
  'edital-ap-mat-02': [
    {
      titulo: 'Regra de Três Simples e Unidades de Medida VUNESP',
      canal: 'Busca VUNESP',
      duracao: 'Aguardando envio',
      url: 'https://www.youtube.com/results?search_query=Regra+de+Tres+Simples+Unidades+de+Medida+VUNESP',
      especifica: false,
    },
  ],

  // 14. Geometria e lógica básica
  'edital-ap-mat-03': [
    {
      titulo: 'Geometria Básica e Raciocínio Lógico VUNESP',
      canal: 'Busca VUNESP',
      duracao: 'Aguardando envio',
      url: 'https://www.youtube.com/results?search_query=Geometria+Plana+Perimetro+Area+Logica+VUNESP',
      especifica: false,
    },
  ],

  // 15. Guarda, vigilância e controle de acesso
  'edital-ap-esp-01': [
    {
      titulo: 'Noções de Portaria, Guarda e Segurança Patrimonial',
      canal: 'Busca VUNESP',
      duracao: 'Aguardando envio',
      url: 'https://www.youtube.com/results?search_query=Guarda+Vigilancia+Controle+de+Acesso+Concurso',
      especifica: false,
    },
  ],

  // 16. Prevenção de incêndios e primeiros socorros
  'edital-ap-esp-02': [
    {
      titulo: 'Prevenção e Combate a Incêndios (Extintores) e Primeiros Socorros',
      canal: 'Busca VUNESP',
      duracao: 'Aguardando envio',
      url: 'https://www.youtube.com/results?search_query=Prevencao+de+Incendios+Extintores+Classes+Fogo+Primeiros+Socorros',
      especifica: false,
    },
  ],

  // 17. Atendimento e ética no serviço público
  'edital-ap-esp-03': [
    {
      titulo: 'Atendimento ao Cidadão e Ética no Serviço Público VUNESP',
      canal: 'Busca VUNESP',
      duracao: 'Aguardando envio',
      url: 'https://www.youtube.com/results?search_query=Atendimento+ao+Publico+Etica+no+Servico+Publico+VUNESP',
      especifica: false,
    },
  ],

  // 18. Simulado Real VUNESP (Chefão Final)
  'boss-simulado': [
    {
      titulo: 'Revisão Rápida dos 15 Pontos da VUNESP',
      canal: 'Ciência Exata / Aprovados',
      duracao: '15 min',
      url: 'https://www.youtube.com/results?search_query=Revisao+VUNESP+Itanhaem+Agente+Patrimonial',
      especifica: true,
    },
  ],
};

export const getAulasPorTopico = (topicoId: string): AulaItem[] => {
  return TOPICOS_AULAS[topicoId] || [];
};
