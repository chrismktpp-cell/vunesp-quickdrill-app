import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import questionsData from './src/data/questions.json';
import type {
  Question,
  CategoryType,
  CertaintyLevel,
  PerformanceClassification,
  DrillMode,
  UserStats,
  SimuladoResultado,
} from './src/types/schema';
import {
  loadInitialStats,
  aplicarResposta,
  saveAttemptToStorage,
  saveSimuladoToStorage,
  clearUserStats,
  loadStoredTheme,
  saveStoredTheme,
  loadFavoriteIds,
  toggleFavoriteId,
  hasSeenOnboarding,
  markOnboardingSeen,
  restaurarBackup,
} from './src/utils/storage';
import { triggerResponseHaptic, triggerLightHaptic } from './src/utils/haptics';
import { darkTheme, lightTheme, categoryColors } from './src/theme/tokens';
import { aprovaFoxColors } from './src/theme/aprovafox';
import { AprovaFoxLogo } from './src/components/AprovaFoxLogo';
import { MuralDeMacetes } from './src/components/MuralDeMacetes';
import { SimuladoScreen } from './src/components/SimuladoScreen';
import { EditalScreen } from './src/components/EditalScreen';
import { TrilhaConhecimentoScreen } from './src/components/TrilhaConhecimentoScreen';
import { DashboardScreen } from './src/components/DashboardScreen';
import { DrillScreen } from './src/components/DrillScreen';
import { HomeScreen } from './src/components/HomeScreen';
import { ProfileScreen } from './src/components/ProfileScreen';
import { SessionSummary, SessionSummaryData } from './src/components/SessionSummary';
import { FiltrosModal } from './src/components/FiltrosModal';
import { gerarFilaDoDia } from './src/services/srsEngine';
import { filtrarQuestoes, QuestionFilters } from './src/services/filterEngine';
import { DEFAULT_FILTERS } from './src/constants/filters';
import { converterErrosSimuladoParaSRS } from './src/services/simuladoService';
import { filtrarQuestoesDoDia, registrarConclusaoDiaTrilha } from './src/services/trilhaService';
import type { DiaRoteiro } from './src/data/planoEstudosRoteiro';
import {
  carregarSessaoEstudoAtiva,
  salvarSessaoEstudoAtiva,
  limparSessaoEstudoAtiva,
} from './src/services/activeStudySessionStorage';
import {
  calcularXpResposta,
  XP_BONUS_SESSAO_PERFEITA,
  calcularNivel,
} from './src/services/xpEngine';
import { CATEGORIES } from './src/types/schema';
import { getCategoryColor as getCategoryColorTheme } from './src/theme/categoryPalettes';

// Fisher-Yates shuffle
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export type TabType = 'inicio' | 'estudar' | 'simulado' | 'progresso' | 'perfil';

interface ActiveStudySession {
  title: string;
  questions: Question[];
  currentIndex: number;
  attempts: number;
  correct: number;
  xpGained: number;
  errorTopics: Record<string, number>;
  sourceQuestions: Question[];
  diaTrilha?: number;
}

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [stats, setStats] = useState<UserStats>({
    attempts: [],
    streak: 0,
    bestStreak: 0,
    blindSpotQueue: [],
    errorQueue: [],
    revisoesSRS: {},
    simuladosHistorico: [],
    xp: 0,
    nivel: 1,
    metaDiaria: 15,
    questoesHoje: 0,
  });

  // 5 Tabs principais: estudar (Trilha) | inicio (Painel) | simulado | progresso | perfil
  const [activeTab, setActiveTab] = useState<TabType>('estudar');
  const [favorites, setFavorites] = useState<string[]>([]);

  // Sessão de estudo finita ativa (estilo Duolingo)
  const [activeSession, setActiveSession] = useState<ActiveStudySession | null>(null);
  const [sessionSummaryData, setSessionSummaryData] = useState<SessionSummaryData | null>(null);

  // Modo livre / Drill tradicional (quando não estiver em sessão fechada)
  const [selectedCategory, setSelectedCategory] = useState<CategoryType | 'all'>('all');
  const [mode, setMode] = useState<DrillMode>('all');
  const [isFilaSRSActive, setIsFilaSRSActive] = useState<boolean>(false);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [shuffleSeed, setShuffleSeed] = useState<number>(0);

  // Modal de Mural de Macetes
  const [isMuralOpen, setIsMuralOpen] = useState<boolean>(false);

  // Modal de Filtros Avançados
  const [filtrosModalOpen, setFiltrosModalOpen] = useState<boolean>(false);
  const [filtros, setFiltros] = useState<QuestionFilters>(DEFAULT_FILTERS);

  const [selectedCertainty, setSelectedCertainty] = useState<CertaintyLevel>(3);
  const [isAnswered, setIsAnswered] = useState<boolean>(false);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const [lastClassification, setLastClassification] = useState<PerformanceClassification | null>(null);
  const [feedbackTip, setLastFeedbackTip] = useState<string | undefined>(undefined);
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);

  useEffect(() => {
    hasSeenOnboarding()
      .then((seen) => {
        if (!seen) setShowOnboarding(true);
      })
      .catch(() => {});
  }, []);

  // Stats da sessão contínua
  const [sessionStats, setSessionStats] = useState<{ attempts: number; correct: number }>({
    attempts: 0,
    correct: 0,
  });

  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  // Carrega persistência inicial de forma atômica e coordenada (incluindo rascunho de sessão ativa)
  useEffect(() => {
    Promise.all([
      loadStoredTheme(),
      loadInitialStats(),
      loadFavoriteIds(),
      carregarSessaoEstudoAtiva(),
    ])
      .then(([t, s, favs, savedSession]) => {
        setTheme(t);
        setStats(s);
        setFavorites(favs);
        if (savedSession) {
          setActiveSession({
            title: savedSession.title,
            questions: savedSession.questions,
            currentIndex: savedSession.currentIndex,
            attempts: savedSession.attempts,
            correct: savedSession.correct,
            xpGained: savedSession.xpGained,
            errorTopics: savedSession.errorTopics,
            sourceQuestions: savedSession.sourceQuestions,
            diaTrilha: savedSession.diaTrilha,
          });
        }
        setIsLoaded(true);
      })
      .catch((err) => {
        console.error('Erro na carga inicial do storage:', err);
        setIsLoaded(true);
      });
  }, []);

  // Persistência contínua resiliente (debounce 300ms) para salvar progresso da sessão ativa
  useEffect(() => {
    if (!activeSession) return;
    const timer = setTimeout(() => {
      void salvarSessaoEstudoAtiva(activeSession);
    }, 300);
    return () => clearTimeout(timer);
  }, [activeSession]);

  const toggleTheme = useCallback(() => {
    triggerLightHaptic();
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      saveStoredTheme(next);
      return next;
    });
  }, []);

  const handleToggleFavorite = useCallback(
    async (questionId: string) => {
      const updated = await toggleFavoriteId(questionId, favorites);
      setFavorites(updated);
    },
    [favorites]
  );

  // Fila do dia SRS
  const filaDoDia = useMemo(() => {
    return gerarFilaDoDia(questionsData as Question[], stats.revisoesSRS || {}, 10);
  }, [stats.revisoesSRS]);

  // Questões filtradas para modo livre
  const filteredQuestions = useMemo(() => {
    const allQuestions = questionsData as Question[];

    if (isFilaSRSActive) {
      const fila = [...filaDoDia.revisoesPendentes, ...filaDoDia.novasQuestoes];
      if (selectedCategory !== 'all') {
        return fila.filter((q) => q.category === selectedCategory);
      }
      return fila;
    }

    const combinedFilters: QuestionFilters = {
      ...filtros,
      category: selectedCategory !== 'all' ? selectedCategory : filtros.category,
      statusEstudo:
        mode === 'errors_only'
          ? 'erros'
          : mode === 'blind_spots_only'
          ? 'pontos_cegos'
          : filtros.statusEstudo,
    };

    const filtradas = filtrarQuestoes(
      allQuestions,
      combinedFilters,
      stats,
      stats.revisoesSRS || {}
    );

    return shuffleArray(filtradas);
  }, [
    selectedCategory,
    mode,
    isFilaSRSActive,
    filaDoDia,
    filtros,
    stats.errorQueue,
    stats.blindSpotQueue,
    stats.revisoesSRS,
    shuffleSeed,
  ]);

  // Reseta estado ao mudar filtros
  useEffect(() => {
    if (currentIndex >= filteredQuestions.length) {
      setCurrentIndex(0);
    }
    setIsAnswered(false);
    setSelectedOptionIndex(null);
    setLastClassification(null);
    setLastFeedbackTip(undefined);
  }, [selectedCategory, mode, isFilaSRSActive, filteredQuestions.length]);

  // Questão atual (se em sessão fechada, usa activeSession; senão, modo livre)
  const currentQuestion = activeSession
    ? activeSession.questions[activeSession.currentIndex] || null
    : filteredQuestions[currentIndex] || null;

  // INICIADOR DE SESSÕES CURTAS (5 A 10 QUESTÕES)
  const startStudySession = useCallback(
    (title: string, questionsPool: Question[], diaTrilha?: number) => {
      triggerLightHaptic();
      if (!questionsPool || questionsPool.length === 0) {
        Alert.alert('Sem questões', 'Nenhuma questão encontrada para esta sessão no momento.');
        return;
      }
      const sessionQuestions = shuffleArray(questionsPool).slice(0, 10);
      setActiveSession({
        title,
        questions: sessionQuestions,
        currentIndex: 0,
        attempts: 0,
        correct: 0,
        xpGained: 0,
        errorTopics: {},
        sourceQuestions: sessionQuestions,
        diaTrilha,
      });
      setSessionSummaryData(null);
      setIsAnswered(false);
      setSelectedOptionIndex(null);
      setLastClassification(null);
      setLastFeedbackTip(undefined);
    },
    []
  );

  // Iniciar missão de um dia específico da Trilha do Conhecimento
  const handleIniciarTreinoDia = useCallback(
    (diaRoteiro: DiaRoteiro) => {
      const allQuestions = questionsData as Question[];
      const questoesDia = filtrarQuestoesDoDia(allQuestions, diaRoteiro);
      if (questoesDia.length === 0) {
        Alert.alert('Aviso', 'Nenhuma questão encontrada para os filtros deste dia.');
        return;
      }
      startStudySession(
        `Dia ${diaRoteiro.dia} · ${diaRoteiro.titulo}`,
        questoesDia,
        diaRoteiro.dia
      );
    },
    [startStudySession]
  );

  // Iniciar sessão recomendada inteligente
  const handleStartRecommendedSession = useCallback(() => {
    const allQuestions = questionsData as Question[];

    if (filaDoDia.revisoesPendentes.length > 0) {
      startStudySession(
        `Revisão do Dia (${filaDoDia.revisoesPendentes.length} pendentes)`,
        filaDoDia.revisoesPendentes
      );
      return;
    }

    if (stats.blindSpotQueue && stats.blindSpotQueue.length > 0) {
      const blindQuestions = allQuestions.filter((q) =>
        stats.blindSpotQueue.includes(q.id)
      );
      if (blindQuestions.length > 0) {
        startStudySession('Treino de Pontos Cegos', blindQuestions);
        return;
      }
    }

    if (stats.errorQueue && stats.errorQueue.length > 0) {
      const errorQuestions = allQuestions.filter((q) =>
        stats.errorQueue.includes(q.id)
      );
      if (errorQuestions.length > 0) {
        startStudySession('Revisão de Erros Recentes', errorQuestions);
        return;
      }
    }

    // Default: sessão do edital geral
    startStudySession('Sessão Geral do Edital (10 Questões)', allQuestions);
  }, [filaDoDia, stats, startStudySession]);

  // Iniciar sessão de um tópico específico
  const handleStartTopicSession = useCallback(
    (category: CategoryType) => {
      const allQuestions = questionsData as Question[];
      const catQuestions = allQuestions.filter((q) => q.category === category);
      startStudySession(`${category.split(' ')[0]} · Treino Focado`, catQuestions);
    },
    [startStudySession]
  );

  // Iniciar sessão de revisão de erros
  const handleStartErrorSession = useCallback(() => {
    const allQuestions = questionsData as Question[];
    const errorQuestions = allQuestions.filter((q) =>
      stats.errorQueue.includes(q.id)
    );
    if (errorQuestions.length === 0) {
      Alert.alert('Parabéns!', 'Você não possui nenhum erro pendente de revisão.');
      return;
    }
    startStudySession('Revisão de Erros', errorQuestions);
  }, [stats.errorQueue, startStudySession]);

  // Iniciar sessão de pontos cegos
  const handleStartBlindSpotSession = useCallback(() => {
    const allQuestions = questionsData as Question[];
    const blindQuestions = allQuestions.filter((q) =>
      stats.blindSpotQueue.includes(q.id)
    );
    if (blindQuestions.length === 0) {
      Alert.alert('Tudo limpo!', 'Nenhum ponto cego ativo no momento.');
      return;
    }
    startStudySession('Treino de Pontos Cegos', blindQuestions);
  }, [stats.blindSpotQueue, startStudySession]);

  // Resposta da questão (unificada para sessão e modo livre)
  const handleAnswer = useCallback(
    (optionIndex: number, tempoGastoMs?: number) => {
      if (isAnswered || !currentQuestion) return;

      const isCorrect = optionIndex === currentQuestion.correctIndex;
      const { newStats, classification, feedbackTip: tip } = aplicarResposta(stats, {
        questionId: currentQuestion.id,
        category: currentQuestion.category,
        selectedOptionIndex: optionIndex,
        isCorrect,
        certainty: selectedCertainty,
        tempoGastoMs,
      });

      triggerResponseHaptic(isCorrect, selectedCertainty, classification);
      setStats(newStats);

      const xpThisAnswer = calcularXpResposta(isCorrect, selectedCertainty);

      if (activeSession) {
        const updatedErrors = { ...activeSession.errorTopics };
        if (!isCorrect) {
          updatedErrors[currentQuestion.category] =
            (updatedErrors[currentQuestion.category] || 0) + 1;
        }

        setActiveSession((prev) =>
          prev
            ? {
                ...prev,
                attempts: prev.attempts + 1,
                correct: isCorrect ? prev.correct + 1 : prev.correct,
                xpGained: prev.xpGained + xpThisAnswer,
                errorTopics: updatedErrors,
              }
            : null
        );
      }

      setSessionStats((prev) => ({
        attempts: prev.attempts + 1,
        correct: isCorrect ? prev.correct + 1 : prev.correct,
      }));

      setSelectedOptionIndex(optionIndex);
      setLastClassification(classification);
      setLastFeedbackTip(tip);
      setIsAnswered(true);

      void saveAttemptToStorage(newStats).catch(console.error);
    },
    [isAnswered, currentQuestion, stats, selectedCertainty, activeSession]
  );

  // Próxima questão / Concluir sessão
  const handleNext = useCallback(() => {
    triggerLightHaptic();
    setIsAnswered(false);
    setSelectedOptionIndex(null);
    setLastClassification(null);
    setLastFeedbackTip(undefined);

    if (activeSession) {
      if (activeSession.currentIndex < activeSession.questions.length - 1) {
        setActiveSession((prev) =>
          prev ? { ...prev, currentIndex: prev.currentIndex + 1 } : null
        );
      } else {
        // Conclusão da sessão finita
        const isPerfect =
          activeSession.attempts > 0 && activeSession.correct === activeSession.attempts;
        const totalXp = activeSession.xpGained + (isPerfect ? XP_BONUS_SESSAO_PERFEITA : 0);

        if (isPerfect) {
          setStats((prev) => {
            const updated = { ...prev, xp: (prev.xp || 0) + XP_BONUS_SESSAO_PERFEITA };
            void saveAttemptToStorage(updated).catch(console.error);
            return updated;
          });
        }

        // Se for missão da Trilha do Conhecimento, registra a conclusão e destrava o próximo dia
        if (activeSession.diaTrilha) {
          setStats((prev) => {
            const updated = registrarConclusaoDiaTrilha(
              prev,
              activeSession.diaTrilha!,
              activeSession.attempts,
              activeSession.correct
            );
            void saveAttemptToStorage(updated).catch(console.error);
            return updated;
          });
        }

        const summary: SessionSummaryData = {
          attempts: activeSession.attempts,
          correct: activeSession.correct,
          errors: activeSession.attempts - activeSession.correct,
          xpGained: totalXp,
          accuracy:
            activeSession.attempts > 0
              ? (activeSession.correct / activeSession.attempts) * 100
              : 0,
          errorTopics: Object.entries(activeSession.errorTopics).map(([topic, count]) => ({
            topic,
            count,
          })),
        };

        setSessionSummaryData(summary);
        setActiveSession(null);
        void limparSessaoEstudoAtiva();
      }
    } else {
      if (filteredQuestions.length > 0) {
        setCurrentIndex((prev) => (prev + 1) % filteredQuestions.length);
      }
    }
  }, [activeSession, filteredQuestions.length]);

  const handleSkip = useCallback(() => {
    triggerLightHaptic();
    setIsAnswered(false);
    setSelectedOptionIndex(null);
    setLastClassification(null);
    setLastFeedbackTip(undefined);

    if (activeSession) {
      if (activeSession.currentIndex < activeSession.questions.length - 1) {
        setActiveSession((prev) =>
          prev ? { ...prev, currentIndex: prev.currentIndex + 1 } : null
        );
      } else {
        setActiveSession(null);
        void limparSessaoEstudoAtiva();
      }
    } else {
      if (filteredQuestions.length > 0) {
        setCurrentIndex((prev) => (prev + 1) % filteredQuestions.length);
      }
    }
  }, [activeSession, filteredQuestions.length]);

  const handleShuffle = useCallback(() => {
    triggerLightHaptic();
    setShuffleSeed((prev) => prev + 1);
    setCurrentIndex(0);
    setIsAnswered(false);
    setSelectedOptionIndex(null);
    setLastClassification(null);
    setLastFeedbackTip(undefined);
  }, []);

  const handleSaveSimulado = useCallback(
    (resultado: SimuladoResultado) => {
      saveSimuladoToStorage(stats, resultado)
        .then((updated) => setStats(updated))
        .catch((e) => console.error('Falha ao salvar simulado em background', e));
    },
    [stats]
  );

  const handleEnviarErrosSimuladoParaSRS = useCallback(
    (resultado: SimuladoResultado) => {
      const { newStats, totalConvertidos } = converterErrosSimuladoParaSRS(resultado, stats);
      if (totalConvertidos > 0) {
        setStats(newStats);
        void saveAttemptToStorage(newStats).catch(console.error);
      }
    },
    [stats]
  );

  const handleResetStats = useCallback(async () => {
    const res = await clearUserStats();
    setStats(res);
  }, []);

  const handleRestaurarBackup = useCallback(
    async (backupData: any) => {
      try {
        const updated = await restaurarBackup(backupData, stats);
        setStats(updated);
        Alert.alert('Sucesso', 'Progresso restaurado com sucesso neste aparelho!');
      } catch (err: any) {
        Alert.alert('Erro ao Restaurar', err?.message || 'Falha ao restaurar backup.');
      }
    },
    [stats]
  );

  const handleUpdateDailyGoal = useCallback(
    (newGoal: number) => {
      setStats((prev) => {
        const updated = { ...prev, metaDiaria: newGoal };
        void saveAttemptToStorage(updated).catch(console.error);
        return updated;
      });
    },
    []
  );

  const handleDismissOnboarding = useCallback(() => {
    setShowOnboarding(false);
    void markOnboardingSeen();
  }, []);

  // Design Tokens
  const isDark = theme === 'dark';
  const tokens = isDark ? darkTheme : lightTheme;

  const legacyColors = {
    bg: tokens.bg,
    cardBg: tokens.cardBg,
    cardBorder: tokens.cardBorder,
    text: tokens.textPrimary,
    textMuted: tokens.textMuted,
    primary: tokens.primary,
    primarySoft: tokens.primarySoft,
    emerald: tokens.success,
    emeraldSoft: tokens.successSoft,
    amber: tokens.warning,
    amberSoft: tokens.warningSoft,
    rose: tokens.danger,
    roseSoft: tokens.dangerSoft,
    subtle: tokens.surface,
  };

  const getCategoryColor = (cat: CategoryType) => getCategoryColorTheme(cat, isDark);

  const getDifficultyColor = (diff: Question['difficulty']) => {
    switch (diff) {
      case 'Fácil':
        return {
          bg: isDark ? 'rgba(16, 185, 129, 0.15)' : '#d1fae5',
          text: isDark ? '#6ee7b7' : '#065f46',
          border: isDark ? '#059669' : '#a7f3d0',
        };
      case 'Média':
        return {
          bg: isDark ? 'rgba(245, 158, 11, 0.15)' : '#fef3c7',
          text: isDark ? '#fcd34d' : '#92400e',
          border: isDark ? '#d97706' : '#fde68a',
        };
      case 'Difícil':
        return {
          bg: isDark ? 'rgba(244, 63, 94, 0.15)' : '#ffe4e6',
          text: isDark ? '#fda4af' : '#9f1239',
          border: isDark ? '#e11d48' : '#fecdd3',
        };
    }
  };

  const nivelInfo = useMemo(() => calcularNivel(stats.xp || 0), [stats.xp]);

  if (!isLoaded) {
    return (
      <View
        style={[
          styles.safeArea,
          {
            backgroundColor: tokens.bg,
            justifyContent: 'center',
            alignItems: 'center',
          },
        ]}
      >
        <AprovaFoxLogo size={72} />
        <ActivityIndicator
          size="large"
          color={aprovaFoxColors.amber}
          style={{ marginTop: 24 }}
        />
        <Text
          style={{
            marginTop: 14,
            fontSize: 16,
            fontWeight: '700',
            color: tokens.textPrimary,
          }}
        >
          Carregando VUNESP QuickDrill...
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: tokens.bg }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* HEADER SUPERIOR VISÍVEL FORA DE SESSÕES FECHADAS */}
      {!activeSession && !sessionSummaryData && !isMuralOpen && (
        <View
          style={[
            styles.header,
            { borderBottomColor: tokens.cardBorder, backgroundColor: tokens.cardBg },
          ]}
        >
          <View style={styles.headerLeft}>
            <AprovaFoxLogo size={32} />
            <Text style={[styles.headerTitle, { color: tokens.textPrimary }]}>
              AprovaFox
            </Text>
            <View style={[styles.tagBadge, { backgroundColor: aprovaFoxColors.violetSoft }]}>
              <Text style={[styles.tagBadgeText, { color: aprovaFoxColors.violetLight }]}>
                Nível {nivelInfo.nivel}
              </Text>
            </View>
          </View>

          <View style={styles.headerRight}>
            {/* XP Badge */}
            <View
              style={[
                styles.xpBadgeHeader,
                {
                  backgroundColor: aprovaFoxColors.amberSoft,
                  borderColor: aprovaFoxColors.amber,
                },
              ]}
            >
              <Ionicons name="sparkles" size={14} color={aprovaFoxColors.amber} />
              <Text style={[styles.xpTextHeader, { color: aprovaFoxColors.amber }]}>
                {stats.xp || 0} XP
              </Text>
            </View>

            {/* Streak Badge */}
            <View
              style={[
                styles.streakBadge,
                {
                  backgroundColor: aprovaFoxColors.amberSoft,
                  borderColor: aprovaFoxColors.amber,
                },
              ]}
            >
              <Ionicons name="flame" size={15} color={aprovaFoxColors.amber} />
              <Text style={[styles.streakText, { color: aprovaFoxColors.amber }]}>
                {stats.streak || 0}
              </Text>
            </View>

            {/* Theme Switcher */}
            <TouchableOpacity
              onPress={toggleTheme}
              style={[styles.headerIconBtn, { backgroundColor: tokens.surface }]}
              activeOpacity={0.85}
              accessibilityLabel="Alternar tema claro/escuro"
            >
              <Ionicons
                name={isDark ? 'sunny' : 'moon'}
                size={16}
                color={isDark ? tokens.warning : tokens.textMuted}
              />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ================= CORPO PRINCIPAL ================= */}
      <View style={styles.mainContent}>
        {/* CASO 1: TELA DE CONCLUSÃO DE SESSÃO */}
        {sessionSummaryData ? (
          <SessionSummary
            data={sessionSummaryData}
            streak={stats.streak || 0}
            dailyGoal={stats.metaDiaria || 15}
            questionsToday={stats.questoesHoje || 0}
            onContinue={handleStartRecommendedSession}
            onReviewErrors={
              sessionSummaryData.errors > 0 ? handleStartErrorSession : undefined
            }
            onGoHome={() => {
              setSessionSummaryData(null);
              setActiveTab('inicio');
            }}
            tokens={tokens}
            isDark={isDark}
          />
        ) : activeSession ? (
          /* CASO 2: SESSÃO DE ESTUDO FINITA (RESOLUÇÃO DE QUESTÕES) */
          <DrillScreen
            questionsData={questionsData as Question[]}
            filteredQuestions={activeSession.questions}
            currentQuestion={currentQuestion}
            currentIndex={activeSession.currentIndex}
            isAnswered={isAnswered}
            selectedOptionIndex={selectedOptionIndex}
            lastClassification={lastClassification}
            selectedCertainty={selectedCertainty}
            setSelectedCertainty={setSelectedCertainty}
            mode="all"
            setMode={() => {}}
            selectedCategory="all"
            setSelectedCategory={() => {}}
            isFilaSRSActive={false}
            setIsFilaSRSActive={() => {}}
            filaDoDia={filaDoDia}
            stats={stats}
            sessionStats={sessionStats}
            favorites={favorites}
            feedbackTip={feedbackTip}
            showOnboarding={showOnboarding}
            onDismissOnboarding={handleDismissOnboarding}
            onAnswer={handleAnswer}
            onNext={handleNext}
            onSkip={handleSkip}
            onShuffle={undefined}
            filtros={filtros}
            onToggleFavorite={handleToggleFavorite}
            onOpenMural={() => setIsMuralOpen(true)}
            onOpenFiltersModal={() => setFiltrosModalOpen(true)}
            onResetFilters={() => {
              setFiltros(DEFAULT_FILTERS);
              setSelectedCategory('all');
              setMode('all');
            }}
            setCurrentIndex={() => {}}
            tokens={tokens}
            legacyColors={legacyColors}
            isDark={isDark}
            categories={CATEGORIES}
            getCategoryColor={getCategoryColor}
            getDifficultyColor={getDifficultyColor}
            isSessionMode={true}
            sessionTitle={activeSession.title}
            onExitSession={() => {
              Alert.alert(
                'Pausar ou Sair da Sessão',
                'Seu progresso até aqui está salvo. Deseja pausar para continuar depois ou descartar esta sessão?',
                [
                  { text: 'Continuar Treinando', style: 'cancel' },
                  {
                    text: 'Pausar (Salvar)',
                    onPress: () => setActiveSession(null),
                  },
                  {
                    text: 'Descartar Treino',
                    style: 'destructive',
                    onPress: () => {
                      setActiveSession(null);
                      void limparSessaoEstudoAtiva();
                    },
                  },
                ]
              );
            }}
          />
        ) : isMuralOpen ? (
          /* CASO 3: MURAL DE MACETES EM DESTAQUE */
          <View style={{ flex: 1 }}>
            <View
              style={[
                styles.muralHeader,
                { backgroundColor: tokens.cardBg, borderBottomColor: tokens.cardBorder },
              ]}
            >
              <TouchableOpacity
                onPress={() => setIsMuralOpen(false)}
                activeOpacity={0.85}
                style={[
                  styles.muralBackBtn,
                  { backgroundColor: tokens.surface, borderColor: tokens.cardBorder },
                ]}
              >
                <Ionicons name="arrow-back" size={18} color={tokens.textPrimary} />
                <Text style={[styles.muralBackText, { color: tokens.textPrimary }]}>
                  Voltar
                </Text>
              </TouchableOpacity>
              <Text style={[styles.muralHeaderTitle, { color: tokens.textPrimary }]}>
                Mural de Macetes & Raio-X
              </Text>
            </View>
            <View style={{ flex: 1, padding: 14 }}>
              <MuralDeMacetes
                questions={questionsData as Question[]}
                categories={CATEGORIES}
                favorites={favorites}
                blindSpots={stats.blindSpotQueue}
                onToggleFavorite={handleToggleFavorite}
                isDark={isDark}
                colors={legacyColors}
                getCategoryColor={getCategoryColor}
              />
            </View>
          </View>
        ) : (
          /* CASO 4: 5 TABS PRINCIPAIS */
          <>
            {activeTab === 'inicio' && (
              <HomeScreen
                stats={stats}
                totalQuestoesDisponiveis={questionsData.length}
                revisoesPendentesCount={filaDoDia.revisoesPendentes.length}
                novasQuestoesCount={filaDoDia.novasQuestoes.length}
                onContinuarEstudando={handleStartRecommendedSession}
                onIniciarTreinoTrilha={handleIniciarTreinoDia}
                onIniciarSimulado={() => setActiveTab('simulado')}
                onIrParaEstudo={(category) => {
                  if (category) {
                    handleStartTopicSession(category);
                  } else {
                    setActiveTab('estudar');
                  }
                }}
                onIrParaMural={() => setIsMuralOpen(true)}
                onToggleTheme={toggleTheme}
                tokens={tokens}
                isDark={isDark}
                categories={CATEGORIES}
                getCategoryColor={getCategoryColor}
              />
            )}

            {activeTab === 'estudar' && (
              <TrilhaConhecimentoScreen
                questions={questionsData as Question[]}
                stats={stats}
                onIniciarTreinoDia={handleIniciarTreinoDia}
                onTreinarTopico={(category) => handleStartTopicSession(category)}
                onIniciarSimulado={() => setActiveTab('simulado')}
                colors={legacyColors}
                isDark={isDark}
              />
            )}

            <View style={{ flex: 1, display: activeTab === 'simulado' ? 'flex' : 'none' }}>
              <SimuladoScreen
                questions={questionsData as Question[]}
                simuladosHistorico={stats.simuladosHistorico}
                onSalvarResultado={handleSaveSimulado}
                onEnviarErrosParaSRS={handleEnviarErrosSimuladoParaSRS}
                colors={legacyColors}
                isDark={isDark}
                getCategoryColor={getCategoryColor}
              />
            </View>

            {activeTab === 'progresso' && (
              <DashboardScreen
                questions={questionsData as Question[]}
                stats={stats}
                categories={CATEGORIES}
                onIniciarFilaDoDia={handleStartRecommendedSession}
                onTreinarErros={handleStartErrorSession}
                onTreinarPontosCegos={handleStartBlindSpotSession}
                onTreinarCategoria={handleStartTopicSession}
                onResetStats={handleResetStats}
                onRestaurarBackup={handleRestaurarBackup}
                colors={legacyColors}
                isDark={isDark}
                getCategoryColor={getCategoryColor}
              />
            )}

            {activeTab === 'perfil' && (
              <ProfileScreen
                stats={stats}
                theme={theme}
                onToggleTheme={toggleTheme}
                onOpenMural={() => setIsMuralOpen(true)}
                onUpdateDailyGoal={handleUpdateDailyGoal}
                onResetStats={handleResetStats}
                onRestaurarBackup={handleRestaurarBackup}
                tokens={tokens}
                isDark={isDark}
              />
            )}
          </>
        )}
      </View>

      {/* ================= NAVEGAÇÃO INFERIOR MODERNA (5 TABS) ================= */}
      {!activeSession && !sessionSummaryData && !isMuralOpen && (
        <View
          style={[
            styles.bottomTabBar,
            { backgroundColor: tokens.navBg, borderTopColor: tokens.navBorder },
          ]}
        >
          {/* TAB 1: TRILHA (DUOLINGO LEARNING PATH) */}
          <TouchableOpacity
            onPress={() => {
              triggerLightHaptic();
              setActiveTab('estudar');
            }}
            activeOpacity={0.85}
            style={styles.tabBarItem}
          >
            <View style={styles.tabIconWrapper}>
              <Ionicons
                name={activeTab === 'estudar' ? 'map' : 'map-outline'}
                size={22}
                color={activeTab === 'estudar' ? tokens.primary : tokens.textMuted}
              />
              {filaDoDia.revisoesPendentes.length > 0 && (
                <View style={[styles.tabBadgeDot, { backgroundColor: tokens.warning }]} />
              )}
            </View>
            <Text
              style={[
                styles.tabBarLabel,
                {
                  color: activeTab === 'estudar' ? tokens.primary : tokens.textMuted,
                  fontWeight: activeTab === 'estudar' ? '600' : '500',
                },
              ]}
            >
              Trilha
            </Text>
          </TouchableOpacity>

          {/* TAB 2: PAINEL */}
          <TouchableOpacity
            onPress={() => {
              triggerLightHaptic();
              setActiveTab('inicio');
            }}
            activeOpacity={0.85}
            style={styles.tabBarItem}
          >
            <View style={styles.tabIconWrapper}>
              <Ionicons
                name={activeTab === 'inicio' ? 'home' : 'home-outline'}
                size={22}
                color={activeTab === 'inicio' ? tokens.primary : tokens.textMuted}
              />
            </View>
            <Text
              style={[
                styles.tabBarLabel,
                {
                  color: activeTab === 'inicio' ? tokens.primary : tokens.textMuted,
                  fontWeight: activeTab === 'inicio' ? '600' : '500',
                },
              ]}
            >
              Painel
            </Text>
          </TouchableOpacity>

          {/* TAB 3: SIMULADOS */}
          <TouchableOpacity
            onPress={() => {
              triggerLightHaptic();
              setActiveTab('simulado');
            }}
            activeOpacity={0.85}
            style={styles.tabBarItem}
          >
            <View style={styles.tabIconWrapper}>
              <Ionicons
                name={activeTab === 'simulado' ? 'stopwatch' : 'stopwatch-outline'}
                size={22}
                color={activeTab === 'simulado' ? tokens.primary : tokens.textMuted}
              />
            </View>
            <Text
              style={[
                styles.tabBarLabel,
                {
                  color: activeTab === 'simulado' ? tokens.primary : tokens.textMuted,
                  fontWeight: activeTab === 'simulado' ? '600' : '500',
                },
              ]}
            >
              Simulados
            </Text>
          </TouchableOpacity>

          {/* TAB 4: PROGRESSO */}
          <TouchableOpacity
            onPress={() => {
              triggerLightHaptic();
              setActiveTab('progresso');
            }}
            activeOpacity={0.85}
            style={styles.tabBarItem}
          >
            <View style={styles.tabIconWrapper}>
              <Ionicons
                name={activeTab === 'progresso' ? 'bar-chart' : 'bar-chart-outline'}
                size={22}
                color={activeTab === 'progresso' ? tokens.primary : tokens.textMuted}
              />
              {stats.blindSpotQueue.length > 0 && (
                <View style={[styles.tabBadgeDot, { backgroundColor: tokens.danger }]} />
              )}
            </View>
            <Text
              style={[
                styles.tabBarLabel,
                {
                  color: activeTab === 'progresso' ? tokens.primary : tokens.textMuted,
                  fontWeight: activeTab === 'progresso' ? '600' : '500',
                },
              ]}
            >
              Progresso
            </Text>
          </TouchableOpacity>

          {/* TAB 5: PERFIL */}
          <TouchableOpacity
            onPress={() => {
              triggerLightHaptic();
              setActiveTab('perfil');
            }}
            activeOpacity={0.85}
            style={styles.tabBarItem}
          >
            <View style={styles.tabIconWrapper}>
              <Ionicons
                name={activeTab === 'perfil' ? 'person' : 'person-outline'}
                size={22}
                color={activeTab === 'perfil' ? tokens.primary : tokens.textMuted}
              />
            </View>
            <Text
              style={[
                styles.tabBarLabel,
                {
                  color: activeTab === 'perfil' ? tokens.primary : tokens.textMuted,
                  fontWeight: activeTab === 'perfil' ? '600' : '500',
                },
              ]}
            >
              Perfil
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* MODAL DE FILTROS AVANÇADOS */}
      <FiltrosModal
        visible={filtrosModalOpen}
        onClose={() => setFiltrosModalOpen(false)}
        filtros={filtros}
        onChangeFiltros={(novos: QuestionFilters) => setFiltros(novos)}
        onLimparFiltros={() => setFiltros(DEFAULT_FILTERS)}
        totalEncontradas={filteredQuestions.length}
        categories={CATEGORIES}
        colors={legacyColors}
        isDark={isDark}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  mainContent: {
    flex: 1,
  },
  header: {
    height: 56,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  tagBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  tagBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  xpBadgeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  xpTextHeader: {
    fontSize: 12,
    fontWeight: '700',
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  streakText: {
    fontSize: 12,
    fontWeight: '700',
  },
  headerIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  muralHeader: {
    height: 52,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
  },
  muralBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  muralBackText: {
    fontSize: 13,
    fontWeight: '600',
  },
  muralHeaderTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  bottomTabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  tabBarItem: {
    flex: 1,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  tabIconWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBarLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  tabBadgeDot: {
    position: 'absolute',
    top: -1,
    right: -4,
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
});
