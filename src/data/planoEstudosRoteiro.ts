import type { CategoryType } from '../types/schema';

export interface AulaRoteiro {
  caderno: string;
  videoaulaTitulo: string;
  videoaulaCanal: string;
  videoaulaDuracao: string;
  videoUrl: string;
}

export interface RegraBlindagem {
  topico: string;
  armadilha: string;
  regraOuro: string;
}

export interface DiaRoteiro {
  dia: number;
  diaSemana: string;
  titulo: string;
  focoPrincipal: string;
  resumoAtaque: string;
  metaQuestoes: number;
  tipo: 'dia_estudo' | 'boss_semanal';
  icone: string;
  aulas: AulaRoteiro[];
  regrasBlindagem: RegraBlindagem[];
  filtroCategorias: CategoryType[];
  subtopicosFoco?: string[];
}

export const PLANO_7_DIAS: DiaRoteiro[] = [
  {
    dia: 1,
    diaSemana: 'Segunda',
    titulo: 'Concordância Verbal & Nominal',
    focoPrincipal: 'Haver impessoal, Sujeito Oracional e "É proibida a entrada"',
    resumoAtaque: 'Atacar as regras que mais geram dúvidas: verbo haver existencial sempre no singular, sujeito oracional no singular e a regra "Tem A, Bota A".',
    metaQuestoes: 10,
    tipo: 'dia_estudo',
    icone: 'checkmark-done-circle',
    aulas: [
      {
        caderno: 'Caderno Tático de Concordância (PDF) (Módulos 3 e 4) + Guia Definitivo do Sujeito Oracional',
        videoaulaTitulo: 'Aulão Concordância Verbal e Nominal VUNESP',
        videoaulaCanal: 'Ciência Exata',
        videoaulaDuracao: '37 min',
        videoUrl: 'https://www.youtube.com/results?search_query=Concordancia+Verbal+e+Nominal+VUNESP+Ciencia+Exata',
      },
      {
        caderno: 'Guia do Sujeito Oracional (PDF)',
        videoaulaTitulo: 'Concordância e Sujeito Oracional VUNESP',
        videoaulaCanal: 'Ciência Exata',
        videoaulaDuracao: '5 min',
        videoUrl: 'https://www.youtube.com/results?search_query=Concordancia+e+Sujeito+Oracional+VUNESP',
      },
    ],
    regrasBlindagem: [
      {
        topico: 'Verbo HAVER Impessoal',
        armadilha: 'Escrever "Haviam muitos processos" ou "Devem haver soluções".',
        regraOuro: 'No sentido de existir, ocorrer ou acontecer, o verbo Haver é impessoal: fica SEMPRE no singular (Havia / Deve haver).',
      },
      {
        topico: 'Regra "É proibido" / "É proibida"',
        armadilha: 'Marcar "É proibido a entrada" quando há o artigo "a" antes do substantivo.',
        regraOuro: 'Regra "Tem A, Bota A": Sem artigo = "É proibido entrada". Com artigo "a" = "É proibida a entrada!".',
      },
      {
        topico: 'Sujeito Oracional',
        armadilha: 'Concordar o verbo principal com o termo interno da oração subordinada.',
        regraOuro: 'Faça o teste do "ISSO": "Convém que todos estudem" = "Convém ISSO". O verbo fica sempre no singular (3ª pessoa).',
      },
    ],
    filtroCategorias: ['Sujeito Oracional e Transitividade', 'Língua Portuguesa (Agente Patrimonial)'],
    subtopicosFoco: ['Concordância', 'Haver', 'Sujeito oracional', 'ser'],
  },
  {
    dia: 2,
    diaSemana: 'Terça',
    titulo: 'Gestão de Materiais & Estoques',
    focoPrincipal: 'As 6 Etapas (Simplificação vs. Normalização) e Lote Econômico (LEC)',
    resumoAtaque: 'Consolidar a diferença técnica entre Simplificação e Normalização e dominar o ponto ótimo do LEC (Custo de Armazenagem = Custo de Pedido).',
    metaQuestoes: 10,
    tipo: 'dia_estudo',
    icone: 'cube',
    aulas: [
      {
        caderno: 'Caderno Tático — Gestão de Materiais e Estoques (PDF) (Módulos 1, 2 e 3) + Mapa Mental',
        videoaulaTitulo: 'Lote Econômico de Compra — LEC em 4 Minutos',
        videoaulaCanal: 'Prof. Wendell Léo',
        videoaulaDuracao: '4 min 03s',
        videoUrl: 'https://www.youtube.com/results?search_query=Lote+Economico+de+Compra+LEC+Wendell+Leo',
      },
      {
        caderno: 'Apostila Estoques — Classificação de Materiais',
        videoaulaTitulo: 'Classificação de Materiais: Atributos e 6 Etapas',
        videoaulaCanal: 'Prof. Flávio Toledo',
        videoaulaDuracao: '30 min',
        videoUrl: 'https://www.youtube.com/results?search_query=Classificacao+de+Materiais+Atributos+Flavio+Toledo',
      },
    ],
    regrasBlindagem: [
      {
        topico: 'Simplificação vs. Normalização',
        armadilha: 'Chamar a redução de 9 modelos iguais para 1 modelo de "Normalização".',
        regraOuro: 'Reduzir a variedade de itens = Simplificação. Seguir normas oficiais da ABNT/INMETRO = Normalização.',
      },
      {
        topico: 'Gráfico do LEC (Ponto Ótimo)',
        armadilha: 'Achar que no Lote Econômico de Compra o estoque de segurança zera.',
        regraOuro: 'No ponto ótimo do LEC (cruzamento do "X"), o Custo de Armazenagem iguala-se ao Custo de Pedido (CA = CP).',
      },
    ],
    filtroCategorias: ['Gestão de Patrimônio e Bens Públicos', 'Conhecimentos Específicos - Agente Patrimonial'],
    subtopicosFoco: ['Inventário', 'Bens permanentes vs consumo', 'consumo', 'Termo de responsabilidade'],
  },
  {
    dia: 3,
    diaSemana: 'Quarta',
    titulo: 'Pronomes & Colocação Pronominal',
    focoPrincipal: 'Pronome Cujo, Possessivos (nos/lhe) e Ímãs de Próclise (QUE + SE)',
    resumoAtaque: 'Fixar a proibição absoluta de artigo após cujo, o uso do pronome oblíquo com valor possessivo e as palavras atrativas de próclise.',
    metaQuestoes: 10,
    tipo: 'dia_estudo',
    icone: 'swap-horizontal',
    aulas: [
      {
        caderno: 'Apostila PT-Completo: Pronomes 9 (PDF) + Funções do Relativo',
        videoaulaTitulo: 'Pronomes 16 — VUNESP — Relativo "CUJO"',
        videoaulaCanal: 'Linguativa',
        videoaulaDuracao: '4 min 51s',
        videoUrl: 'https://www.youtube.com/results?search_query=Pronomes+16+VUNESP+Relativo+CUJO+Linguativa',
      },
      {
        caderno: 'Caderno Tático: Colocação Pronominal e Pontuação (Módulo 3)',
        videoaulaTitulo: 'Aulão Colocação Pronominal — VUNESP',
        videoaulaCanal: 'Ciência Exata',
        videoaulaDuracao: '24 min',
        videoUrl: 'https://www.youtube.com/results?search_query=Aulao+Colocacao+Pronominal+VUNESP+Ciencia+Exata',
      },
    ],
    regrasBlindagem: [
      {
        topico: 'Relativo CUJO',
        armadilha: 'Aceitar artigo depois de cujo ("cujo o nome", "cujas as chaves").',
        regraOuro: 'Depois de cujo, cuja, cujos, cujas é PROIBIDO usar artigo: diga sempre "cujo nome", "cujas chaves".',
      },
      {
        topico: 'Palavra QUE + SE (Próclise)',
        armadilha: 'Deixar o pronome depois do verbo após que ("que inscreveram-se").',
        regraOuro: 'As palavras QUE, NÃO, NUNCA, SE, QUANDO, EMBORA são ímãs de próclise: "que se inscreveram".',
      },
      {
        topico: 'Pronome de Posse',
        armadilha: 'Confundir pronome oblíquo ("Não o encontramos") com valor possessivo.',
        regraOuro: 'Substitua por meu/sua/nossas antes do substantivo: "revisaram-nos as planilhas" = "revisaram as nossas planilhas".',
      },
    ],
    filtroCategorias: ['Crase (VUNESP)', 'Sujeito Oracional e Transitividade', 'Língua Portuguesa (Agente Patrimonial)'],
    subtopicosFoco: ['Pronomes', 'Crase', 'Partícula'],
  },
  {
    dia: 4,
    diaSemana: 'Quinta',
    titulo: 'Matemática & Depreciação',
    focoPrincipal: 'MDC (Divisão de Lotes/Pilhas), Comando Final e Depreciação Linear',
    resumoAtaque: 'Treinar a fatoração simultânea de MDC somando o pé da tabela, circular a pergunta final ("reduzido em", "80%") e fixar o cálculo residual da depreciação.',
    metaQuestoes: 10,
    tipo: 'dia_estudo',
    icone: 'calculator',
    aulas: [
      {
        caderno: 'Caderno Ilustrado de Matemática Descomplicada (Págs. 4, 6 e 9: MMC, MDC e Gangorra da Regra de 3)',
        videoaulaTitulo: 'VUNESP — MDC Questão Resolvida de Lotes',
        videoaulaCanal: 'Ciência Exata',
        videoaulaDuracao: '5 min 52s',
        videoUrl: 'https://www.youtube.com/results?search_query=VUNESP+MDC+Questao+Resolvida+Lotes+Ciencia+Exata',
      },
      {
        caderno: 'Aula Completa — Gestão de Patrimônio Público (Módulo 6: Depreciação e Impairment)',
        videoaulaTitulo: 'Administração Patrimonial Completa',
        videoaulaCanal: 'Prof.ª Izabel Ataíde',
        videoaulaDuracao: '37 min',
        videoUrl: 'https://www.youtube.com/results?search_query=Administracao+Patrimonial+Izabel+Ataide',
      },
    ],
    regrasBlindagem: [
      {
        topico: 'MDC em Lotes e Pilhas',
        armadilha: 'Parar a fatoração antes do fim ou marcar o tamanho da caixa em vez do total de caixas.',
        regraOuro: 'Fatore até o fim pelo divisor comum; os números que sobram no pé da coluna já são a quantidade de pilhas de cada tipo (basta somá-los!).',
      },
      {
        topico: 'Blindagem do Comando Final',
        armadilha: 'Calcular o valor intermediário e esquecer de aplicar o desconto ("reduzido em") ou a fração pedida.',
        regraOuro: 'Circule com atenção a última linha do enunciado: a VUNESP quase sempre coloca o valor intermediário na alternativa A como distrator!',
      },
      {
        topico: 'Depreciação Linear e Impairment',
        armadilha: 'Subtrair o valor residual diretamente sem calcular a porcentagem sobre o valor inicial.',
        regraOuro: 'Calcule primeiro o valor em R$ do percentual residual (ex.: 20% de 120 mil = 24 mil) antes de subtrair e dividir pelos anos.',
      },
    ],
    filtroCategorias: ['Matemática e Raciocínio Lógico', 'Gestão de Patrimônio e Bens Públicos'],
    subtopicosFoco: ['Operações', 'Depreciação', 'Frações', 'Porcentagem', 'Regra de três'],
  },
  {
    dia: 5,
    diaSemana: 'Sexta',
    titulo: 'Nova Lei de Licitações (Lei 14.133)',
    focoPrincipal: 'SRP (1+1 ano), Limites de Aditivos (25%/50%) e Dispensa Emergencial (1 ano)',
    resumoAtaque: 'Dominar os prazos e números mágicos da 14.133: Ata do SRP vale 1 ano prorrogável por mais 1, aditivo geral até 25% e reforma até 50%.',
    metaQuestoes: 10,
    tipo: 'dia_estudo',
    icone: 'document-text',
    aulas: [
      {
        caderno: 'Caderno Tático — Nova Lei de Licitações 14.133/2021 (Módulos 3, 4 e 5) + Mapa Mental',
        videoaulaTitulo: 'Resumo Rápido da Nova Lei de Licitações 14.133/2021',
        videoaulaCanal: 'Cíntia Brunelli',
        videoaulaDuracao: '9 min 18s',
        videoUrl: 'https://www.youtube.com/results?search_query=Resumo+Nova+Lei+de+Licitacoes+14133+Cintia+Brunelli',
      },
      {
        caderno: 'Apostila 14.133 — Procedimentos Auxiliares e SRP',
        videoaulaTitulo: 'Sistema de Registro de Preços na Lei 14.133/2021',
        videoaulaCanal: 'Prof. Bruno Lira',
        videoaulaDuracao: '34 min',
        videoUrl: 'https://www.youtube.com/results?search_query=Sistema+de+Registro+de+Precos+Lei+14133+Bruno+Lira',
      },
    ],
    regrasBlindagem: [
      {
        topico: 'Prazos e % da Lei 14.133',
        armadilha: 'Confundir o SRP com modalidade ou trocar os percentuais de aditivo contratual.',
        regraOuro: 'SRP = procedimento auxiliar (Ata vale 1 + 1 ano). Aditivos = 25% acréscimo geral e 50% reforma de edifício. Emergência = até 1 ano (sem prorrogar).',
      },
      {
        topico: 'Dispensa vs. Inexigibilidade',
        armadilha: 'Marcar dispensa para contratação de artista consagrado ou advogado renomado.',
        regraOuro: 'Inviabilidade de competição = INEXIGIBILIDADE (art. 74). Hipóteses taxativas com valor limite = DISPENSA (art. 75).',
      },
    ],
    filtroCategorias: ['Nova Lei de Licitações (Lei 14.133/2021)'],
    subtopicosFoco: ['Registro de preços', 'Dispensa por emergência', 'Vigência', 'Garantia', 'Pregão'],
  },
  {
    dia: 6,
    diaSemana: 'Sábado',
    titulo: 'Ortografia & Interpretação Textual',
    focoPrincipal: 'Grafias de exceção, paroxítonas sem acento e diferenciação de paráfrase vs extrapolação',
    resumoAtaque: 'Blindar os detalhes de ortografia que a VUNESP adora (itens, rubrica, paralisação, exceção) e eliminar erros de extrapolação em textos.',
    metaQuestoes: 10,
    tipo: 'dia_estudo',
    icone: 'book',
    aulas: [
      {
        caderno: 'Módulo 1 — Resumos Português Completo (Acentuação e Ortografia)',
        videoaulaTitulo: 'Ortografia VUNESP — Português',
        videoaulaCanal: 'Ciência Exata',
        videoaulaDuracao: '10 min 57s',
        videoUrl: 'https://www.youtube.com/results?search_query=Ortografia+VUNESP+Portugues+Ciencia+Exata',
      },
      {
        caderno: 'Bônus — Resumo de Interpretação de Texto + Questões',
        videoaulaTitulo: 'Interpretação de Texto VUNESP',
        videoaulaCanal: 'Ciência Exata',
        videoaulaDuracao: '9 min 43s',
        videoUrl: 'https://www.youtube.com/results?search_query=Interpretacao+de+Texto+VUNESP+Ciencia+Exata',
      },
    ],
    regrasBlindagem: [
      {
        topico: 'Acentuação e Grafia VUNESP',
        armadilha: 'Aceitar acento em "ítens", "rúbrica" ou "gratuíta", ou grafar "excessão".',
        regraOuro: 'Grafia certa: exceção e paralisação. E NUNCA têm acento: itens, rubrica, gratuita, intuito.',
      },
      {
        topico: 'Interpretação de Texto (Paráfrase vs Extrapolação)',
        armadilha: 'Escolher alternativas com palavras restritivas inventadas que não estão no texto.',
        regraOuro: 'Desconfie de termos radicais como "prioritariamente, exclusivamente, apenas". A resposta certa da VUNESP costuma ser uma paráfrase suave do próprio texto.',
      },
    ],
    filtroCategorias: ['Língua Portuguesa (Agente Patrimonial)', 'Sujeito Oracional e Transitividade'],
    subtopicosFoco: ['Interpretação de texto', 'Acentuação', 'Emprego dos porquês', 'Sinônimos'],
  },
  {
    dia: 7,
    diaSemana: 'Domingo',
    titulo: 'Chefão da Semana: Mini-Simulado 90%+',
    focoPrincipal: 'Mini-Simulado de Verificação dos 15 Tópicos Revisados no Ciclo',
    resumoAtaque: 'Verificação prática de alto impacto com 15 questões inéditas cobrindo os 15 pontos exatos trabalhados durante toda a semana.',
    metaQuestoes: 15,
    tipo: 'boss_semanal',
    icone: 'trophy',
    aulas: [
      {
        caderno: 'Leitura visual de 15 min dos Mapas Mentais (Crase, Licitações e Patrimônio) + Caderno de Legislação',
        videoaulaTitulo: 'Revisão Rápida dos 15 Pontos da VUNESP',
        videoaulaCanal: 'Ciência Exata / Aprovados',
        videoaulaDuracao: '15 min',
        videoUrl: 'https://www.youtube.com/results?search_query=Revisao+VUNESP+Itanhaem+Agente+Patrimonial',
      },
    ],
    regrasBlindagem: [
      {
        topico: 'Cartão de Blindagem Consolidado',
        armadilha: 'Cair na pressa ou em pegadinha de leitura rápida da banca.',
        regraOuro: 'Aplique as 10 regras de ouro cravadas nos dias 1 a 6. Sua meta hoje é atingir 88% a 92% de aproveitamento!',
      },
    ],
    filtroCategorias: [
      'Crase (VUNESP)',
      'Sujeito Oracional e Transitividade',
      'Gestão de Patrimônio e Bens Públicos',
      'Nova Lei de Licitações (Lei 14.133/2021)',
      'Matemática e Raciocínio Lógico',
      'Língua Portuguesa (Agente Patrimonial)',
    ],
  },
];

