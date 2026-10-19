import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
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
  triggerLightHaptic,
} from './src/utils/storage';
import { darkTheme, lightTheme, categoryColors } from './src/theme/tokens';
import { MuralDeMacetes } from './src/components/MuralDeMacetes';
import { SimuladoScreen } from './src/components/SimuladoScreen';
import { EditalScreen } from './src/components/EditalScreen';
import { DashboardScreen } from './src/components/DashboardScreen';
import { DrillScreen } from './src/components/DrillScreen';
import { FiltrosModal } from './src/components/FiltrosModal';
import { gerarFilaDoDia, resumirSRS } from './src/services/srsEngine';
import { filtrarQuestoes, QuestionFilters } from './src/services/filterEngine';
import { converterErrosSimuladoParaSRS } from './src/services/simuladoService';

const CATEGORIES: CategoryType[] = [
  'Crase (VUNESP)',
  'Sujeito Oracional e Transitividade',
  'Gestão de Patrimônio e Bens Públicos',
  'Nova Lei de Licitações (Lei 14.133/2021)',
];

// Fisher-Yates shuffle
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

type TabType = 'drill' | 'dashboard' | 'simulado' | 'edital' | 'mural';

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
  });

  // Navigation tab: 'drill' | 'dashboard' | 'simulado' | 'edital' | 'mural'
  const [activeTab, setActiveTab] = useState<TabType>('drill');
  const [favorites, setFavorites] = useState<string[]>([]);

  const [selectedCategory, setSelectedCategory] = useState<CategoryType | 'all'>('all');
  const [mode, setMode] = useState<DrillMode>('all');
  const [isFilaSRSActive, setIsFilaSRSActive] = useState<boolean>(false);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [shuffleSeed, setShuffleSeed] = useState<number>(0);

  // Advanced filters modal
  const [filtrosModalOpen, setFiltrosModalOpen] = useState<boolean>(false);
  const [filtros, setFiltros] = useState<QuestionFilters>({
    category: 'all',
    dificuldade: 'all',
    statusEstudo: 'todas',
    termoBusca: '',
  });

  const [selectedCertainty, setSelectedCertainty] = useState<CertaintyLevel>(3);
  const [isAnswered, setIsAnswered] = useState<boolean>(false);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const [lastClassification, setLastClassification] = useState<PerformanceClassification | null>(null);

  // Session stats
  const [sessionStats, setSessionStats] = useState<{ attempts: number; correct: number }>({
    attempts: 0,
    correct: 0,
  });

  // Load initial persistence
  useEffect(() => {
    loadStoredTheme().then((t) => setTheme(t));
    loadInitialStats().then((s) => setStats(s));
    loadFavoriteIds().then((favs) => setFavorites(favs));
  }, []);

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

  // SRS calculations
  const filaDoDia = useMemo(() => {
    return gerarFilaDoDia(questionsData as Question[], stats.revisoesSRS || {}, 10);
  }, [stats.revisoesSRS]);

  // Questions filtering
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
    stats,
    shuffleSeed,
  ]);

  useEffect(() => {
    if (currentIndex >= filteredQuestions.length) {
      setCurrentIndex(0);
    }
    setIsAnswered(false);
    setSelectedOptionIndex(null);
    setLastClassification(null);
  }, [selectedCategory, mode, isFilaSRSActive, filteredQuestions.length]);

  const currentQuestion = filteredQuestions[currentIndex] || null;

  const handleShuffle = useCallback(() => {
    triggerLightHaptic();
    setShuffleSeed((prev) => prev + 1);
    setCurrentIndex(0);
    setIsAnswered(false);
    setSelectedOptionIndex(null);
    setLastClassification(null);
  }, []);

  const handleAnswer = useCallback(
    (optionIndex: number, tempoGastoMs?: number) => {
      if (isAnswered || !currentQuestion) return;

      const isCorrect = optionIndex === currentQuestion.correctIndex;
      const { newStats, classification } = aplicarResposta(stats, {
        questionId: currentQuestion.id,
        category: currentQuestion.category,
        selectedOptionIndex: optionIndex,
        isCorrect,
        certainty: selectedCertainty,
        tempoGastoMs,
      });

      // 1. Atualização otimista imediata antes de qualquer I/O assíncrono
      setStats(newStats);
      setSessionStats((prev) => ({
        attempts: prev.attempts + 1,
        correct: isCorrect ? prev.correct + 1 : prev.correct,
      }));
      setSelectedOptionIndex(optionIndex);
      setLastClassification(classification);
      setIsAnswered(true);

      // 2. Gravação na fila sem bloquear a tela (não reverte tela em caso de falha)
      void saveAttemptToStorage(newStats).catch(console.error);
    },
    [isAnswered, currentQuestion, stats, selectedCertainty]
  );

  const handleNext = useCallback(() => {
    triggerLightHaptic();
    setIsAnswered(false);
    setSelectedOptionIndex(null);
    setLastClassification(null);

    if (filteredQuestions.length > 0) {
      setCurrentIndex((prev) => (prev + 1) % filteredQuestions.length);
    }
  }, [filteredQuestions.length]);

  const handleSkip = useCallback(() => {
    triggerLightHaptic();
    setIsAnswered(false);
    setSelectedOptionIndex(null);
    setLastClassification(null);

    if (filteredQuestions.length > 0) {
      setCurrentIndex((prev) => (prev + 1) % filteredQuestions.length);
    }
  }, [filteredQuestions.length]);

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

  // Design Tokens & Colors
  const isDark = theme === 'dark';
  const tokens = isDark ? darkTheme : lightTheme;

  // Colors adapter for existing child components
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

  // Category Color resolver
  const getCategoryColor = (cat: CategoryType) => {
    const modeKey = isDark ? 'dark' : 'light';
    switch (cat) {
      case 'Crase (VUNESP)':
        return categoryColors.crase[modeKey];
      case 'Sujeito Oracional e Transitividade':
        return categoryColors.sujeito[modeKey];
      case 'Gestão de Patrimônio e Bens Públicos':
        return categoryColors.patrimonio[modeKey];
      case 'Nova Lei de Licitações (Lei 14.133/2021)':
        return categoryColors.licitacao[modeKey];
    }
  };

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

  const currentCatColors = currentQuestion
    ? getCategoryColor(currentQuestion.category)
    : {
        accent: tokens.primary,
        soft: tokens.primarySoft,
        border: tokens.cardBorder,
        badgeText: tokens.primary,
      };

  const currentDiffColors = currentQuestion ? getDifficultyColor(currentQuestion.difficulty) : null;
  const isCurrentBlindSpot = currentQuestion ? stats.blindSpotQueue.includes(currentQuestion.id) : false;

  const progressRatio =
    filteredQuestions.length > 0 ? (currentIndex + 1) / filteredQuestions.length : 0;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: tokens.bg }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* ================= HEADER SUPERIOR ELEGANTE ================= */}
      <View
        style={[
          styles.header,
          { borderBottomColor: tokens.cardBorder, backgroundColor: tokens.cardBg },
        ]}
      >
        <View style={styles.headerLeft}>
          <View
            style={[
              styles.headerLogoSquircle,
              { backgroundColor: currentCatColors.soft, borderColor: currentCatColors.border },
            ]}
          >
            <Ionicons name="sparkles" size={17} color={currentCatColors.accent} />
          </View>
          <View>
            <View style={styles.titleRow}>
              <Text style={[styles.headerTitle, { color: tokens.textPrimary }]}>
                QuickDrill
              </Text>
              <View style={[styles.tagBadge, { backgroundColor: tokens.primarySoft }]}>
                <Text style={[styles.tagBadgeText, { color: tokens.primary }]}>VUNESP</Text>
              </View>
              <View
                style={[
                  styles.tagBadge,
                  { backgroundColor: isDark ? 'rgba(148, 163, 184, 0.15)' : '#e2e8f0' },
                ]}
              >
                <Text style={[styles.tagBadgeText, { color: tokens.textMuted }]}>Itanhaém</Text>
              </View>
            </View>
            <Text style={[styles.headerSub, { color: tokens.textMuted }]}>
              {questionsData.length} questões táticas comentadas
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          {/* Streak Badge */}
          <View
            style={[
              styles.streakBadge,
              { backgroundColor: tokens.warningSoft, borderColor: tokens.warningBorder },
            ]}
          >
            <Ionicons name="flame" size={15} color={tokens.warning} />
            <Text style={[styles.streakText, { color: tokens.warning }]}>{stats.streak}</Text>
          </View>

          {/* Shuffle (Treino) */}
          {activeTab === 'drill' && (
            <TouchableOpacity
              onPress={handleShuffle}
              style={[styles.headerIconBtn, { backgroundColor: tokens.surface }]}
              accessibilityLabel="Embaralhar questões"
            >
              <Ionicons name="shuffle" size={16} color={tokens.textMuted} />
            </TouchableOpacity>
          )}

          {/* Theme Switcher */}
          <TouchableOpacity
            onPress={toggleTheme}
            style={[styles.headerIconBtn, { backgroundColor: tokens.surface }]}
          >
            <Ionicons
              name={isDark ? 'sunny' : 'moon'}
              size={16}
              color={isDark ? tokens.warning : tokens.textMuted}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* ================= ÁREA DE CONTEÚDO PRINCIPAL ================= */}
      <View style={styles.mainContent}>
        {activeTab === 'dashboard' ? (
          <DashboardScreen
            questions={questionsData as Question[]}
            stats={stats}
            categories={CATEGORIES}
            onIniciarFilaDoDia={() => {
              setIsFilaSRSActive(true);
              setActiveTab('drill');
            }}
            onTreinarErros={() => {
              setIsFilaSRSActive(false);
              setMode('errors_only');
              setActiveTab('drill');
            }}
            onTreinarPontosCegos={() => {
              setIsFilaSRSActive(false);
              setMode('blind_spots_only');
              setActiveTab('drill');
            }}
            onTreinarCategoria={(cat) => {
              setSelectedCategory(cat);
              setIsFilaSRSActive(false);
              setMode('all');
              setActiveTab('drill');
            }}
            onResetStats={handleResetStats}
            colors={legacyColors}
            isDark={isDark}
            getCategoryColor={getCategoryColor}
          />
        ) : activeTab === 'simulado' ? (
          <SimuladoScreen
            questions={questionsData as Question[]}
            simuladosHistorico={stats.simuladosHistorico}
            onSalvarResultado={handleSaveSimulado}
            onEnviarErrosParaSRS={handleEnviarErrosSimuladoParaSRS}
            colors={legacyColors}
            isDark={isDark}
            getCategoryColor={getCategoryColor}
          />
        ) : activeTab === 'edital' ? (
          <EditalScreen
            questions={questionsData as Question[]}
            attempts={stats.attempts}
            onTreinarTopico={(cat) => {
              setSelectedCategory(cat);
              setIsFilaSRSActive(false);
              setActiveTab('drill');
              setMode('all');
            }}
            colors={legacyColors}
            isDark={isDark}
            getCategoryColor={getCategoryColor}
          />
        ) : activeTab === 'mural' ? (
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
        ) : (
          <DrillScreen
            questionsData={questionsData as Question[]}
            filteredQuestions={filteredQuestions}
            currentQuestion={currentQuestion}
            currentIndex={currentIndex}
            isAnswered={isAnswered}
            selectedOptionIndex={selectedOptionIndex}
            lastClassification={lastClassification}
            selectedCertainty={selectedCertainty}
            setSelectedCertainty={setSelectedCertainty}
            mode={mode}
            setMode={setMode}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            isFilaSRSActive={isFilaSRSActive}
            setIsFilaSRSActive={setIsFilaSRSActive}
            filaDoDia={filaDoDia}
            stats={stats}
            sessionStats={sessionStats}
            favorites={favorites}
            onAnswer={handleAnswer}
            onNext={handleNext}
            onSkip={handleSkip}
            onToggleFavorite={handleToggleFavorite}
            onOpenFiltersModal={() => setFiltrosModalOpen(true)}
            onResetFilters={() => {
              setIsFilaSRSActive(false);
              setMode('all');
              setSelectedCategory('all');
              setFiltros({
                category: 'all',
                dificuldade: 'all',
                statusEstudo: 'todas',
                termoBusca: '',
              });
            }}
            setCurrentIndex={setCurrentIndex}
            tokens={tokens}
            legacyColors={legacyColors}
            isDark={isDark}
            categories={CATEGORIES}
            getCategoryColor={getCategoryColor}
            getDifficultyColor={getDifficultyColor}
          />
        )}
      </View>

      {/* ================= NAVEGAÇÃO INFERIOR MODERNA (5 TABS) ================= */}
      <View
        style={[
          styles.bottomTabBar,
          { backgroundColor: tokens.navBg, borderTopColor: tokens.navBorder },
        ]}
      >
        {/* TAB 1: TREINO */}
        <TouchableOpacity
          onPress={() => {
            triggerLightHaptic();
            setActiveTab('drill');
          }}
          style={styles.tabBarItem}
        >
          <View style={styles.tabIconWrapper}>
            <Ionicons
              name={activeTab === 'drill' ? 'flash' : 'flash-outline'}
              size={20}
              color={activeTab === 'drill' ? tokens.primary : tokens.textMuted}
            />
            {filaDoDia.revisoesPendentes.length > 0 && (
              <View style={[styles.tabBadgeDot, { backgroundColor: tokens.warning }]} />
            )}
          </View>
          <Text
            style={[
              styles.tabBarLabel,
              { color: activeTab === 'drill' ? tokens.primary : tokens.textMuted },
              activeTab === 'drill' && { fontWeight: '900' },
            ]}
          >
            Treino
          </Text>
        </TouchableOpacity>

        {/* TAB 2: MÉTRICAS (DASHBOARD) */}
        <TouchableOpacity
          onPress={() => {
            triggerLightHaptic();
            setActiveTab('dashboard');
          }}
          style={styles.tabBarItem}
        >
          <View style={styles.tabIconWrapper}>
            <Ionicons
              name={activeTab === 'dashboard' ? 'bar-chart' : 'bar-chart-outline'}
              size={20}
              color={activeTab === 'dashboard' ? tokens.primary : tokens.textMuted}
            />
            {stats.blindSpotQueue.length > 0 && (
              <View style={[styles.tabBadgeDot, { backgroundColor: tokens.danger }]} />
            )}
          </View>
          <Text
            style={[
              styles.tabBarLabel,
              { color: activeTab === 'dashboard' ? tokens.primary : tokens.textMuted },
              activeTab === 'dashboard' && { fontWeight: '900' },
            ]}
          >
            Métricas
          </Text>
        </TouchableOpacity>

        {/* TAB 3: SIMULADO */}
        <TouchableOpacity
          onPress={() => {
            triggerLightHaptic();
            setActiveTab('simulado');
          }}
          style={styles.tabBarItem}
        >
          <View style={styles.tabIconWrapper}>
            <Ionicons
              name={activeTab === 'simulado' ? 'stopwatch' : 'stopwatch-outline'}
              size={20}
              color={activeTab === 'simulado' ? tokens.danger : tokens.textMuted}
            />
          </View>
          <Text
            style={[
              styles.tabBarLabel,
              { color: activeTab === 'simulado' ? tokens.danger : tokens.textMuted },
              activeTab === 'simulado' && { fontWeight: '900' },
            ]}
          >
            Simulado
          </Text>
        </TouchableOpacity>

        {/* TAB 4: EDITAL */}
        <TouchableOpacity
          onPress={() => {
            triggerLightHaptic();
            setActiveTab('edital');
          }}
          style={styles.tabBarItem}
        >
          <View style={styles.tabIconWrapper}>
            <Ionicons
              name={activeTab === 'edital' ? 'map' : 'map-outline'}
              size={20}
              color={activeTab === 'edital' ? tokens.success : tokens.textMuted}
            />
          </View>
          <Text
            style={[
              styles.tabBarLabel,
              { color: activeTab === 'edital' ? tokens.success : tokens.textMuted },
              activeTab === 'edital' && { fontWeight: '900' },
            ]}
          >
            Edital
          </Text>
        </TouchableOpacity>

        {/* TAB 5: MACETES */}
        <TouchableOpacity
          onPress={() => {
            triggerLightHaptic();
            setActiveTab('mural');
          }}
          style={styles.tabBarItem}
        >
          <View style={styles.tabIconWrapper}>
            <Ionicons
              name={activeTab === 'mural' ? 'bulb' : 'bulb-outline'}
              size={20}
              color={activeTab === 'mural' ? tokens.warning : tokens.textMuted}
            />
            {favorites.length > 0 && (
              <View style={[styles.tabBadgeCount, { backgroundColor: tokens.warning }]}>
                <Text style={styles.tabBadgeCountText}>{favorites.length}</Text>
              </View>
            )}
          </View>
          <Text
            style={[
              styles.tabBarLabel,
              { color: activeTab === 'mural' ? tokens.warning : tokens.textMuted },
              activeTab === 'mural' && { fontWeight: '900' },
            ]}
          >
            Macetes
          </Text>
        </TouchableOpacity>
      </View>

      {/* MODAL DE FILTROS AVANÇADOS */}
      <FiltrosModal
        visible={filtrosModalOpen}
        onClose={() => setFiltrosModalOpen(false)}
        filtros={filtros}
        onChangeFiltros={(novos: QuestionFilters) => setFiltros(novos)}
        onLimparFiltros={() =>
          setFiltros({
            category: 'all',
            dificuldade: 'all',
            statusEstudo: 'todas',
            termoBusca: '',
          })
        }
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerLogoSquircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  tagBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  tagBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  headerSub: {
    fontSize: 11,
    marginTop: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  streakText: {
    fontSize: 12,
    fontWeight: '900',
  },
  headerIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 14,
    paddingBottom: 24,
  },
  milestoneBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  milestoneText: {
    fontSize: 12,
  },
  filterBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  segmentedPills: {
    flex: 1,
    flexDirection: 'row',
    borderRadius: 10,
    padding: 3,
  },
  segmentedBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 7,
  },
  segmentedBtnActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentedText: {
    fontSize: 11,
    fontWeight: '600',
  },
  filterModalTrigger: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryScroll: {
    gap: 6,
    paddingBottom: 10,
  },
  categoryPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  emptyCard: {
    padding: 26,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    marginTop: 14,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    marginTop: 10,
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  emptyActionBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  emptyActionBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  questionCard: {
    borderRadius: 18,
    borderWidth: 1.5,
    borderTopWidth: 3.5,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  subtopicBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  subtopicBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  metaRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  diffBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
    borderWidth: 1,
  },
  diffBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  counterText: {
    fontSize: 12,
    fontWeight: '700',
  },
  blindSpotWarningPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  blindSpotWarningText: {
    fontSize: 12,
    fontWeight: '800',
  },
  statementArea: {
    marginBottom: 16,
  },
  statementTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  statementTypeBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  statementText: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
  },
  lacunaBox: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  lacunaText: {
    fontWeight: '900',
  },
  cardDivider: {
    borderTopWidth: 1,
    paddingTop: 14,
    marginTop: 10,
  },
  sectionHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  sectionHeaderBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionHeadingText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  skipButtonText: {
    fontSize: 11,
    fontWeight: '700',
  },
  certaintyRow: {
    flexDirection: 'row',
    gap: 8,
  },
  certaintyCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 2,
  },
  certaintyCardTitle: {
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2,
  },
  certaintyCardSub: {
    fontSize: 10,
    fontWeight: '500',
  },
  optionsList: {
    gap: 8,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  optionLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  optionLetterCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLetterText: {
    fontSize: 13,
    fontWeight: '900',
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  feedbackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    marginBottom: 12,
  },
  feedbackTitle: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  feedbackGabarito: {
    fontSize: 13,
    marginTop: 2,
  },
  classificationBox: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    marginBottom: 10,
  },
  classificationTitle: {
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 2,
  },
  classificationDesc: {
    fontSize: 12,
    lineHeight: 17,
  },
  raioXBox: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    marginBottom: 10,
  },
  raioXHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  raioXTitle: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  raioXText: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },
  legalBasisBox: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 14,
  },
  legalBasisTitle: {
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 2,
  },
  legalBasisContent: {
    fontSize: 12,
    lineHeight: 17,
  },
  nextActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  nextActionButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  sessionFooter: {
    alignItems: 'center',
    marginTop: 16,
  },
  sessionFooterText: {
    fontSize: 11,
    textAlign: 'center',
  },
  bottomTabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  tabBarItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
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
    top: -2,
    right: -6,
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  tabBadgeCount: {
    position: 'absolute',
    top: -4,
    right: -10,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 8,
  },
  tabBadgeCountText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '900',
  },
});
