import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Modal,
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
} from './src/types';
import {
  loadInitialStats,
  saveAttemptToStorage,
  saveSimuladoToStorage,
  clearUserStats,
  loadStoredTheme,
  saveStoredTheme,
  loadFavoriteIds,
  toggleFavoriteId,
  triggerLightHaptic,
} from './src/utils/storage';
import { MuralDeMacetes } from './src/components/MuralDeMacetes';
import { SimuladoScreen } from './src/components/SimuladoScreen';
import { EditalScreen } from './src/components/EditalScreen';
import { FilaDoDiaBanner } from './src/components/FilaDoDiaBanner';
import { FiltrosModal } from './src/components/FiltrosModal';
import { gerarFilaDoDia, resumirSRS } from './src/services/srsEngine';
import { filtrarQuestoes, QuestionFilters } from './src/services/filterEngine';

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

type TabType = 'drill' | 'simulado' | 'edital' | 'mural';

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

  // Main screen navigation tab: 'drill' (Quiz/Treino) | 'simulado' | 'edital' | 'mural'
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

  // Session stats (tracks only the current app session)
  const [sessionStats, setSessionStats] = useState<{ attempts: number; correct: number }>({
    attempts: 0,
    correct: 0,
  });

  const [isDashboardOpen, setIsDashboardOpen] = useState<boolean>(false);

  // Load theme, stats, and favorites on startup
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

  const srsSummary = useMemo(() => {
    return resumirSRS(questionsData as Question[], stats.revisoesSRS || {});
  }, [stats.revisoesSRS]);

  // Filter & shuffle questions
  const filteredQuestions = useMemo(() => {
    const allQuestions = questionsData as Question[];

    if (isFilaSRSActive) {
      // Prioritize SRS pending reviews then new questions
      const fila = [...filaDoDia.revisoesPendentes, ...filaDoDia.novasQuestoes];
      if (selectedCategory !== 'all') {
        return fila.filter((q) => q.category === selectedCategory);
      }
      return fila;
    }

    // Merge standard category chips with custom modal filters
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
    async (optionIndex: number) => {
      if (isAnswered || !currentQuestion) return;

      const isCorrect = optionIndex === currentQuestion.correctIndex;
      const { newStats, classification } = await saveAttemptToStorage(
        stats,
        currentQuestion.id,
        currentQuestion.category,
        optionIndex,
        isCorrect,
        selectedCertainty
      );

      setStats(newStats);
      setSessionStats((prev) => ({
        attempts: prev.attempts + 1,
        correct: isCorrect ? prev.correct + 1 : prev.correct,
      }));
      setSelectedOptionIndex(optionIndex);
      setLastClassification(classification);
      setIsAnswered(true);
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
    async (resultado: SimuladoResultado) => {
      const updated = await saveSimuladoToStorage(stats, resultado);
      setStats(updated);
    },
    [stats]
  );

  const totalAttempts = stats.attempts.length;
  const correctCount = stats.attempts.filter((a) => a.isCorrect).length;
  const accuracyRate = totalAttempts > 0 ? Math.round((correctCount / totalAttempts) * 100) : 0;

  // Session rate
  const sessionRate =
    sessionStats.attempts > 0
      ? Math.round((sessionStats.correct / sessionStats.attempts) * 100)
      : 0;

  // Colors based on theme
  const isDark = theme === 'dark';
  const colors = {
    bg: isDark ? '#080d1a' : '#f8fafc',
    cardBg: isDark ? '#10172a' : '#ffffff',
    cardBorder: isDark ? '#1e293b' : '#e2e8f0',
    text: isDark ? '#f8fafc' : '#0f172a',
    textMuted: isDark ? '#94a3b8' : '#64748b',
    primary: '#3b82f6',
    primarySoft: isDark ? '#1e3a8a35' : '#dbeafe',
    emerald: '#10b981',
    emeraldSoft: isDark ? '#064e3b45' : '#d1fae5',
    amber: '#f59e0b',
    amberSoft: isDark ? '#78350f35' : '#fef3c7',
    rose: '#f43f5e',
    roseSoft: isDark ? '#88133740' : '#ffe4e6',
    subtle: isDark ? '#182238' : '#f1f5f9',
  };

  // Category Accent Colors
  const getCategoryColor = (cat: CategoryType) => {
    switch (cat) {
      case 'Crase (VUNESP)':
        return {
          accent: '#6366f1',
          soft: isDark ? '#312e81' : '#e0e7ff',
          badgeText: isDark ? '#c7d2fe' : '#4338ca',
        };
      case 'Sujeito Oracional e Transitividade':
        return {
          accent: '#a855f7',
          soft: isDark ? '#581c87' : '#f3e8ff',
          badgeText: isDark ? '#e9d5ff' : '#7e22ce',
        };
      case 'Gestão de Patrimônio e Bens Públicos':
        return {
          accent: '#0d9488',
          soft: isDark ? '#134e4a' : '#ccfbf1',
          badgeText: isDark ? '#99f6e4' : '#0f766e',
        };
      case 'Nova Lei de Licitações (Lei 14.133/2021)':
        return {
          accent: '#ea580c',
          soft: isDark ? '#7c2d12' : '#ffedd5',
          badgeText: isDark ? '#fed7aa' : '#c2410c',
        };
    }
  };

  const getDifficultyColor = (diff: Question['difficulty']) => {
    switch (diff) {
      case 'Fácil':
        return { bg: isDark ? '#064e3b' : '#d1fae5', text: isDark ? '#6ee7b7' : '#065f46' };
      case 'Média':
        return { bg: isDark ? '#78350f' : '#fef3c7', text: isDark ? '#fcd34d' : '#92400e' };
      case 'Difícil':
        return { bg: isDark ? '#881337' : '#ffe4e6', text: isDark ? '#fda4af' : '#9f1239' };
    }
  };

  // Streak milestone message
  const getStreakMilestone = (streak: number) => {
    if (streak >= 20) return { title: 'Mestre de Itanhaém!', icon: 'trophy', badge: '👑 20x' };
    if (streak >= 15) return { title: 'Padrão Gabarito VUNESP!', icon: 'ribbon', badge: '🏆 15x' };
    if (streak >= 10) return { title: 'Raciocínio Imbatível!', icon: 'flash', badge: '⚡ 10x' };
    if (streak >= 5) return { title: 'Combo em Chamas!', icon: 'flame', badge: '🔥 5x' };
    return null;
  };

  const milestone = getStreakMilestone(stats.streak);

  // Render text statement with lacuna badge
  const renderStatement = (text: string, accentColor: string, softBg: string) => {
    const parts = text.split('_____');
    if (parts.length === 1) {
      return <Text style={[styles.statementText, { color: colors.text }]}>{text}</Text>;
    }
    return (
      <Text style={[styles.statementText, { color: colors.text }]}>
        {parts[0]}
        <Text style={[styles.lacunaBadge, { color: accentColor, backgroundColor: softBg }]}>
          {' [ ? ] '}
        </Text>
        {parts[1]}
      </Text>
    );
  };

  const currentCatColors = currentQuestion
    ? getCategoryColor(currentQuestion.category)
    : { accent: colors.primary, soft: colors.primarySoft, badgeText: colors.primary };

  const currentDiffColors = currentQuestion ? getDifficultyColor(currentQuestion.difficulty) : null;
  const isCurrentBlindSpot = currentQuestion ? stats.blindSpotQueue.includes(currentQuestion.id) : false;

  const progressRatio =
    filteredQuestions.length > 0 ? (currentIndex + 1) / filteredQuestions.length : 0;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* TOP HEADER */}
      <View
        style={[
          styles.header,
          { borderBottomColor: colors.cardBorder, backgroundColor: colors.cardBg },
        ]}
      >
        <View style={styles.headerLeft}>
          <View style={[styles.headerIcon, { backgroundColor: currentCatColors.accent }]}>
            <Ionicons name="business" size={18} color="#ffffff" />
          </View>
          <View>
            <View style={styles.titleRow}>
              <Text style={[styles.headerTitle, { color: colors.text }]}>VUNESP QuickDrill</Text>
              <View style={[styles.tagBadge, { backgroundColor: currentCatColors.soft }]}>
                <Text style={[styles.tagBadgeText, { color: currentCatColors.badgeText }]}>
                  Itanhaém
                </Text>
              </View>
            </View>
            <Text style={[styles.headerSub, { color: colors.textMuted }]}>
              {questionsData.length} questões táticas
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          {/* Streak Flame Badge */}
          <View
            style={[
              styles.streakBadge,
              { backgroundColor: colors.amberSoft, borderColor: colors.amber },
            ]}
          >
            <Ionicons name="flame" size={15} color={colors.amber} />
            <Text style={[styles.streakText, { color: colors.amber }]}>{stats.streak}</Text>
          </View>

          {/* Shuffle Button (visible in drill tab) */}
          {activeTab === 'drill' && (
            <TouchableOpacity
              onPress={handleShuffle}
              style={[styles.headerActionBtn, { backgroundColor: colors.subtle }]}
              accessibilityLabel="Embaralhar questões"
            >
              <Ionicons name="shuffle" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}

          {/* Stats Button */}
          <TouchableOpacity
            onPress={() => {
              triggerLightHaptic();
              setIsDashboardOpen(true);
            }}
            style={[styles.headerActionBtn, { backgroundColor: colors.subtle }]}
          >
            <Ionicons name="bar-chart" size={16} color={colors.primary} />
            {totalAttempts > 0 && (
              <Text style={[styles.headerActionText, { color: colors.primary }]}>
                {accuracyRate}%
              </Text>
            )}
            {stats.blindSpotQueue.length > 0 && (
              <View style={[styles.dotAlert, { backgroundColor: colors.rose }]} />
            )}
          </TouchableOpacity>

          {/* Theme Toggle */}
          <TouchableOpacity
            onPress={toggleTheme}
            style={[styles.headerActionBtn, { backgroundColor: colors.subtle }]}
          >
            <Ionicons
              name={isDark ? 'sunny' : 'moon'}
              size={16}
              color={isDark ? colors.amber : colors.textMuted}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* MAIN TOP NAVIGATION BAR (4 TABS) */}
      <View
        style={[
          styles.mainTabNav,
          { backgroundColor: colors.cardBg, borderBottomColor: colors.cardBorder },
        ]}
      >
        {/* TAB 1: TREINO */}
        <TouchableOpacity
          onPress={() => {
            triggerLightHaptic();
            setActiveTab('drill');
          }}
          style={[
            styles.mainTabItem,
            activeTab === 'drill' && [
              styles.mainTabItemActive,
              { borderBottomColor: colors.primary },
            ],
          ]}
        >
          <Ionicons
            name="flash"
            size={16}
            color={activeTab === 'drill' ? colors.primary : colors.textMuted}
          />
          <Text
            style={[
              styles.mainTabItemText,
              { color: activeTab === 'drill' ? colors.primary : colors.textMuted },
              activeTab === 'drill' && { fontWeight: '800' },
            ]}
          >
            Treino
          </Text>
        </TouchableOpacity>

        {/* TAB 2: SIMULADO */}
        <TouchableOpacity
          onPress={() => {
            triggerLightHaptic();
            setActiveTab('simulado');
          }}
          style={[
            styles.mainTabItem,
            activeTab === 'simulado' && [
              styles.mainTabItemActive,
              { borderBottomColor: colors.rose },
            ],
          ]}
        >
          <Ionicons
            name="stopwatch"
            size={16}
            color={activeTab === 'simulado' ? colors.rose : colors.textMuted}
          />
          <Text
            style={[
              styles.mainTabItemText,
              { color: activeTab === 'simulado' ? colors.rose : colors.textMuted },
              activeTab === 'simulado' && { fontWeight: '800' },
            ]}
          >
            Simulado
          </Text>
        </TouchableOpacity>

        {/* TAB 3: EDITAL */}
        <TouchableOpacity
          onPress={() => {
            triggerLightHaptic();
            setActiveTab('edital');
          }}
          style={[
            styles.mainTabItem,
            activeTab === 'edital' && [
              styles.mainTabItemActive,
              { borderBottomColor: colors.emerald },
            ],
          ]}
        >
          <Ionicons
            name="map"
            size={16}
            color={activeTab === 'edital' ? colors.emerald : colors.textMuted}
          />
          <Text
            style={[
              styles.mainTabItemText,
              { color: activeTab === 'edital' ? colors.emerald : colors.textMuted },
              activeTab === 'edital' && { fontWeight: '800' },
            ]}
          >
            Edital
          </Text>
        </TouchableOpacity>

        {/* TAB 4: MURAL DE MACETES */}
        <TouchableOpacity
          onPress={() => {
            triggerLightHaptic();
            setActiveTab('mural');
          }}
          style={[
            styles.mainTabItem,
            activeTab === 'mural' && [
              styles.mainTabItemActive,
              { borderBottomColor: colors.amber },
            ],
          ]}
        >
          <Ionicons
            name="bulb"
            size={16}
            color={activeTab === 'mural' ? colors.amber : colors.textMuted}
          />
          <Text
            style={[
              styles.mainTabItemText,
              { color: activeTab === 'mural' ? colors.amber : colors.textMuted },
              activeTab === 'mural' && { fontWeight: '800' },
            ]}
          >
            Macetes
          </Text>
          {favorites.length > 0 && (
            <View style={[styles.miniStarBadge, { backgroundColor: colors.amberSoft }]}>
              <Text style={[styles.miniStarText, { color: colors.amber }]}>★{favorites.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* CONTENT AREA */}
      {activeTab === 'simulado' ? (
        <SimuladoScreen
          questions={questionsData as Question[]}
          simuladosHistorico={stats.simuladosHistorico}
          onSalvarResultado={handleSaveSimulado}
          colors={colors}
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
          colors={colors}
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
            colors={colors}
            getCategoryColor={getCategoryColor}
          />
        </View>
      ) : (
        /* TAB TREINO RÁPIDO */
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* BANNER FILA DO DIA (SRS) */}
          <FilaDoDiaBanner
            fila={filaDoDia}
            isFilaActive={isFilaSRSActive}
            onToggleFila={() => {
              setIsFilaSRSActive((prev) => !prev);
              setCurrentIndex(0);
            }}
            colors={colors}
            isDark={isDark}
          />

          {/* STREAK MILESTONE TOAST */}
          {milestone && stats.streak >= 5 && isAnswered && selectedOptionIndex === currentQuestion?.correctIndex && (
            <View
              style={[
                styles.milestoneBanner,
                { backgroundColor: colors.amberSoft, borderColor: colors.amber },
              ]}
            >
              <Ionicons name="sparkles" size={16} color={colors.amber} />
              <Text style={[styles.milestoneText, { color: colors.amber }]}>
                <Text style={{ fontWeight: '900' }}>{milestone.badge} </Text>
                {milestone.title}
              </Text>
            </View>
          )}

          {/* MODE SELECTOR & ADVANCED FILTER BUTTON */}
          <View style={styles.modeRowOuter}>
            <View style={[styles.modeRow, { backgroundColor: colors.subtle }]}>
              <TouchableOpacity
                onPress={() => {
                  triggerLightHaptic();
                  setIsFilaSRSActive(false);
                  setMode('all');
                }}
                style={[
                  styles.modeBtn,
                  !isFilaSRSActive && mode === 'all' && [styles.modeBtnActive, { backgroundColor: colors.cardBg }],
                ]}
              >
                <Ionicons
                  name="sparkles"
                  size={13}
                  color={!isFilaSRSActive && mode === 'all' ? colors.primary : colors.textMuted}
                />
                <Text
                  style={[
                    styles.modeText,
                    { color: !isFilaSRSActive && mode === 'all' ? colors.primary : colors.textMuted },
                  ]}
                >
                  Todas ({questionsData.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  triggerLightHaptic();
                  setIsFilaSRSActive(false);
                  setMode('errors_only');
                }}
                style={[
                  styles.modeBtn,
                  mode === 'errors_only' && [styles.modeBtnActive, { backgroundColor: colors.cardBg }],
                ]}
              >
                <Ionicons
                  name="refresh"
                  size={13}
                  color={mode === 'errors_only' ? colors.amber : colors.textMuted}
                />
                <Text
                  style={[
                    styles.modeText,
                    { color: mode === 'errors_only' ? colors.amber : colors.textMuted },
                  ]}
                >
                  Erros ({stats.errorQueue.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  triggerLightHaptic();
                  setIsFilaSRSActive(false);
                  setMode('blind_spots_only');
                }}
                style={[
                  styles.modeBtn,
                  mode === 'blind_spots_only' && [styles.modeBtnActive, { backgroundColor: colors.cardBg }],
                ]}
              >
                <Ionicons
                  name="warning"
                  size={13}
                  color={mode === 'blind_spots_only' ? colors.rose : colors.textMuted}
                />
                <Text
                  style={[
                    styles.modeText,
                    { color: mode === 'blind_spots_only' ? colors.rose : colors.textMuted },
                  ]}
                >
                  Pontos Cegos ({stats.blindSpotQueue.length})
                </Text>
              </TouchableOpacity>
            </View>

            {/* Advanced Filters Button */}
            <TouchableOpacity
              onPress={() => {
                triggerLightHaptic();
                setFiltrosModalOpen(true);
              }}
              style={[styles.filtersModalBtn, { backgroundColor: colors.subtle, borderColor: colors.cardBorder }]}
              accessibilityLabel="Filtros avançados"
            >
              <Ionicons name="options" size={16} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {/* CATEGORY SCROLLER */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.catScroll}
          >
            <TouchableOpacity
              onPress={() => {
                triggerLightHaptic();
                setSelectedCategory('all');
              }}
              style={[
                styles.catChip,
                selectedCategory === 'all'
                  ? { backgroundColor: colors.primary, borderColor: colors.primary }
                  : { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
              ]}
            >
              <Text
                style={[
                  styles.catChipText,
                  { color: selectedCategory === 'all' ? '#ffffff' : colors.textMuted },
                ]}
              >
                Todas (60)
              </Text>
            </TouchableOpacity>

            {CATEGORIES.map((cat) => {
              const isSel = selectedCategory === cat;
              const catColors = getCategoryColor(cat);
              return (
                <TouchableOpacity
                  key={cat}
                  onPress={() => {
                    triggerLightHaptic();
                    setSelectedCategory(cat);
                  }}
                  style={[
                    styles.catChip,
                    isSel
                      ? { backgroundColor: catColors.accent, borderColor: catColors.accent }
                      : { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
                  ]}
                >
                  <Text
                    style={[
                      styles.catChipText,
                      { color: isSel ? '#ffffff' : colors.textMuted },
                    ]}
                  >
                    {cat.split(' ')[0]} (15)
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* DRILL CARD OR EMPTY STATE */}
          {filteredQuestions.length === 0 ? (
            <View
              style={[
                styles.emptyCard,
                { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
              ]}
            >
              <Ionicons name="checkmark-circle" size={54} color={colors.emerald} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                {isFilaSRSActive
                  ? 'Fila do Dia Concluída!'
                  : mode === 'blind_spots_only'
                  ? 'Sem Pontos Cegos!'
                  : 'Fila Vazia!'}
              </Text>
              <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>
                {isFilaSRSActive
                  ? 'Você concluiu todas as revisões agendadas para hoje pelo algoritmo SRS!'
                  : mode === 'blind_spots_only'
                  ? 'Você não possui nenhuma ilusão de competência pendente no momento ou já superou todos os seus pontos cegos com certeza!'
                  : mode === 'errors_only'
                  ? 'Você não tem questões erradas pendentes neste filtro.'
                  : 'Nenhuma questão encontrada com estes critérios.'}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  triggerLightHaptic();
                  setIsFilaSRSActive(false);
                  setMode('all');
                  setSelectedCategory('all');
                  setFiltros({ category: 'all', dificuldade: 'all', statusEstudo: 'todas', termoBusca: '' });
                }}
                style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
              >
                <Text style={styles.emptyBtnText}>Voltar ao Treino Completo (60 Questões)</Text>
              </TouchableOpacity>
            </View>
          ) : !isAnswered ? (
            /* QUESTION CARD */
            <View
              style={[
                styles.card,
                {
                  backgroundColor: colors.cardBg,
                  borderColor: isCurrentBlindSpot ? colors.rose : colors.cardBorder,
                  borderTopColor: currentCatColors.accent,
                  borderTopWidth: 3,
                },
              ]}
            >
              {/* Thin Progress Bar */}
              <View style={[styles.progressBarTrack, { backgroundColor: colors.subtle }]}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${Math.round(progressRatio * 100)}%`,
                      backgroundColor: currentCatColors.accent,
                    },
                  ]}
                />
              </View>

              {/* Meta Row: Subtopic, Difficulty, Progress */}
              <View style={styles.cardHeader}>
                <View style={[styles.subtopicBadge, { backgroundColor: currentCatColors.soft }]}>
                  <Text style={[styles.subtopicText, { color: currentCatColors.badgeText }]}>
                    {currentQuestion!.subtopic}
                  </Text>
                </View>

                <View style={styles.headerRightMeta}>
                  {currentDiffColors && (
                    <View style={[styles.diffBadge, { backgroundColor: currentDiffColors.bg }]}>
                      <Text style={[styles.diffText, { color: currentDiffColors.text }]}>
                        {currentQuestion!.difficulty}
                      </Text>
                    </View>
                  )}

                  <Text style={[styles.progressText, { color: colors.textMuted }]}>
                    {currentIndex + 1}/{filteredQuestions.length}
                  </Text>
                </View>
              </View>

              {/* BLIND SPOT ACTIVE BANNER */}
              {isCurrentBlindSpot && (
                <View
                  style={[
                    styles.blindSpotPill,
                    { backgroundColor: colors.roseSoft, borderColor: colors.rose },
                  ]}
                >
                  <Ionicons name="warning" size={14} color={colors.rose} />
                  <Text style={[styles.blindSpotPillText, { color: colors.rose }]}>
                    Ponto Cego Ativo — Treino Prioritário
                  </Text>
                </View>
              )}

              {/* Statement */}
              <View style={styles.statementBox}>
                <View style={styles.statementTag}>
                  <Ionicons name="flash" size={13} color={currentCatColors.accent} />
                  <Text style={[styles.statementTagText, { color: currentCatColors.accent }]}>
                    PREENCHA A LACUNA (PADRÃO VUNESP):
                  </Text>
                </View>
                {renderStatement(
                  currentQuestion!.statement,
                  currentCatColors.accent,
                  currentCatColors.soft
                )}
              </View>

              {/* CERTAINTY SELECTOR */}
              <View style={[styles.divider, { borderTopColor: colors.cardBorder }]}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="shield-checkmark" size={15} color={colors.primary} />
                  <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
                    1. SEU NÍVEL DE CERTEZA:
                  </Text>
                </View>

                <View style={styles.certaintyRow}>
                  {/* 1 - Chute */}
                  <TouchableOpacity
                    onPress={() => {
                      triggerLightHaptic();
                      setSelectedCertainty(1);
                    }}
                    style={[
                      styles.certaintyBtn,
                      {
                        backgroundColor: selectedCertainty === 1 ? colors.amberSoft : colors.subtle,
                        borderColor: selectedCertainty === 1 ? colors.amber : colors.cardBorder,
                      },
                    ]}
                  >
                    <Ionicons
                      name="dice"
                      size={15}
                      color={selectedCertainty === 1 ? colors.amber : colors.textMuted}
                    />
                    <Text
                      style={[
                        styles.certaintyText,
                        { color: selectedCertainty === 1 ? colors.amber : colors.textMuted },
                      ]}
                    >
                      1 - Chute
                    </Text>
                  </TouchableOpacity>

                  {/* 2 - Dúvida */}
                  <TouchableOpacity
                    onPress={() => {
                      triggerLightHaptic();
                      setSelectedCertainty(2);
                    }}
                    style={[
                      styles.certaintyBtn,
                      {
                        backgroundColor: selectedCertainty === 2 ? colors.primarySoft : colors.subtle,
                        borderColor: selectedCertainty === 2 ? colors.primary : colors.cardBorder,
                      },
                    ]}
                  >
                    <Ionicons
                      name="help-circle"
                      size={15}
                      color={selectedCertainty === 2 ? colors.primary : colors.textMuted}
                    />
                    <Text
                      style={[
                        styles.certaintyText,
                        { color: selectedCertainty === 2 ? colors.primary : colors.textMuted },
                      ]}
                    >
                      2 - Dúvida
                    </Text>
                  </TouchableOpacity>

                  {/* 3 - Certeza */}
                  <TouchableOpacity
                    onPress={() => {
                      triggerLightHaptic();
                      setSelectedCertainty(3);
                    }}
                    style={[
                      styles.certaintyBtn,
                      {
                        backgroundColor: selectedCertainty === 3 ? colors.emeraldSoft : colors.subtle,
                        borderColor: selectedCertainty === 3 ? colors.emerald : colors.cardBorder,
                      },
                    ]}
                  >
                    <Ionicons
                      name="shield-checkmark"
                      size={15}
                      color={selectedCertainty === 3 ? colors.emerald : colors.textMuted}
                    />
                    <Text
                      style={[
                        styles.certaintyText,
                        { color: selectedCertainty === 3 ? colors.emerald : colors.textMuted },
                      ]}
                    >
                      3 - Certeza
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* QUICK ANSWER BUTTONS */}
              <View style={[styles.divider, { borderTopColor: colors.cardBorder }]}>
                <View style={styles.sectionHeaderBetween}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="flash" size={15} color={currentCatColors.accent} />
                    <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
                      2. RESPOSTA RÁPIDA:
                    </Text>
                  </View>

                  {/* Skip button */}
                  <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
                    <Text style={[styles.skipBtnText, { color: colors.textMuted }]}>Pular</Text>
                    <Ionicons name="arrow-forward" size={12} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>

                <View style={styles.optionsList}>
                  {currentQuestion!.options.map((option, idx) => {
                    const letter = String.fromCharCode(65 + idx);
                    return (
                      <TouchableOpacity
                        key={option}
                        onPress={() => handleAnswer(idx)}
                        style={[
                          styles.optionBtn,
                          { backgroundColor: colors.subtle, borderColor: colors.cardBorder },
                        ]}
                      >
                        <View style={styles.optionLeft}>
                          <View
                            style={[
                              styles.optionLetterBadge,
                              { backgroundColor: colors.cardBg },
                            ]}
                          >
                            <Text
                              style={[
                                styles.optionLetterText,
                                { color: currentCatColors.accent },
                              ]}
                            >
                              {letter}
                            </Text>
                          </View>
                          <Text style={[styles.optionText, { color: colors.text }]}>{option}</Text>
                        </View>
                        <Ionicons name="checkmark" size={16} color={colors.textMuted} />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>
          ) : (
            /* FEEDBACK CARD */
            <View
              style={[
                styles.card,
                {
                  backgroundColor: colors.cardBg,
                  borderColor: colors.cardBorder,
                  borderTopColor:
                    selectedOptionIndex === currentQuestion!.correctIndex
                      ? colors.emerald
                      : colors.rose,
                  borderTopWidth: 3,
                },
              ]}
            >
              {/* Status Header */}
              <View
                style={[
                  styles.feedbackHeader,
                  {
                    backgroundColor:
                      selectedOptionIndex === currentQuestion!.correctIndex
                        ? colors.emeraldSoft
                        : colors.roseSoft,
                    borderColor:
                      selectedOptionIndex === currentQuestion!.correctIndex
                        ? colors.emerald
                        : colors.rose,
                  },
                ]}
              >
                <Ionicons
                  name={
                    selectedOptionIndex === currentQuestion!.correctIndex
                      ? 'checkmark-circle'
                      : 'close-circle'
                  }
                  size={28}
                  color={
                    selectedOptionIndex === currentQuestion!.correctIndex
                      ? colors.emerald
                      : colors.rose
                  }
                />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text
                    style={[
                      styles.feedbackTitle,
                      {
                        color:
                          selectedOptionIndex === currentQuestion!.correctIndex
                            ? colors.emerald
                            : colors.rose,
                      },
                    ]}
                  >
                    {selectedOptionIndex === currentQuestion!.correctIndex
                      ? 'RESPOSTA CORRETA!'
                      : 'RESPOSTA INCORRETA!'}
                  </Text>
                  <Text style={[styles.feedbackSub, { color: colors.text }]}>
                    Gabarito:{' '}
                    <Text style={{ fontWeight: 'bold' }}>
                      {currentQuestion!.options[currentQuestion!.correctIndex]}
                    </Text>
                  </Text>
                </View>

                {/* Favorite from feedback card */}
                <TouchableOpacity
                  onPress={() => handleToggleFavorite(currentQuestion!.id)}
                  style={{ padding: 6 }}
                >
                  <Ionicons
                    name={favorites.includes(currentQuestion!.id) ? 'star' : 'star-outline'}
                    size={22}
                    color={favorites.includes(currentQuestion!.id) ? colors.amber : colors.textMuted}
                  />
                </TouchableOpacity>
              </View>

              {/* PONTO CEGO ALERTA */}
              {lastClassification === 'blind_spot' && (
                <View
                  style={[
                    styles.blindSpotAlert,
                    { backgroundColor: colors.roseSoft, borderColor: colors.rose },
                  ]}
                >
                  <View style={styles.blindSpotAlertHeader}>
                    <Ionicons name="warning" size={18} color={colors.rose} />
                    <Text style={[styles.blindSpotAlertTitle, { color: colors.rose }]}>
                      🚨 PONTO CEGO DETECTADO! (Ilusão de Competência)
                    </Text>
                  </View>
                  <Text style={[styles.blindSpotAlertText, { color: colors.text }]}>
                    Você marcou <Text style={{ fontWeight: 'bold' }}>[3 - Certeza]</Text>, porém a
                    banca VUNESP aplicou uma pegadinha clássica. Esta questão caiu no seu{' '}
                    <Text style={{ fontWeight: 'bold' }}>Banco de Erros & Repetição Espaçada (SRS)</Text>!
                  </Text>
                </View>
              )}

              {/* Lucky Guess notice */}
              {lastClassification === 'lucky_guess' && (
                <View
                  style={[
                    styles.luckyGuessBox,
                    { backgroundColor: colors.amberSoft, borderColor: colors.amber },
                  ]}
                >
                  <Ionicons name="dice" size={16} color={colors.amber} />
                  <Text style={[styles.luckyGuessText, { color: colors.text }]}>
                    <Text style={{ fontWeight: 'bold' }}>Acerto por Chute:</Text> Você acertou, mas
                    estava inseguro. Memorize o macete abaixo para transformar sorte em Domínio Real!
                  </Text>
                </View>
              )}

              {/* RAIO-X DA PEGADINHA */}
              <View
                style={[
                  styles.raioXBox,
                  {
                    backgroundColor: currentCatColors.soft,
                    borderColor: currentCatColors.accent,
                  },
                ]}
              >
                <View style={styles.raioXHeader}>
                  <Ionicons name="bulb" size={17} color={colors.amber} />
                  <Text style={[styles.raioXTitle, { color: currentCatColors.accent }]}>
                    RAIO-X DA PEGADINHA (MACETE VUNESP):
                  </Text>
                </View>
                <Text style={[styles.raioXText, { color: colors.text }]}>
                  "{currentQuestion!.raioX}"
                </Text>
              </View>

              {/* FUNDAMENTAÇÃO */}
              {currentQuestion!.legalBasis && (
                <View
                  style={[
                    styles.basisBox,
                    { backgroundColor: colors.subtle, borderColor: colors.cardBorder },
                  ]}
                >
                  <View style={styles.basisHeader}>
                    <Ionicons name="book" size={14} color={colors.textMuted} />
                    <Text style={[styles.basisTitle, { color: colors.textMuted }]}>
                      Fundamentação:
                    </Text>
                  </View>
                  <Text style={[styles.basisText, { color: colors.text }]}>
                    {currentQuestion!.legalBasis}
                  </Text>
                </View>
              )}

              {/* NEXT BUTTON */}
              <TouchableOpacity
                onPress={handleNext}
                style={[styles.nextBtn, { backgroundColor: currentCatColors.accent }]}
              >
                <Text style={styles.nextBtnText}>Próxima Questão</Text>
                <Ionicons name="arrow-forward" size={18} color="#ffffff" />
              </TouchableOpacity>
            </View>
          )}

          {/* SESSION METRICS FOOTER */}
          <View style={styles.sessionFooter}>
            <Text style={[styles.sessionFooterText, { color: colors.textMuted }]}>
              Sessão: {sessionStats.attempts} respondidas • {sessionStats.correct} acertos ({sessionRate}%) • Foco: Câmara de Itanhaém
            </Text>
          </View>
        </ScrollView>
      )}

      {/* ADVANCED FILTERS MODAL */}
      <FiltrosModal
        visible={filtrosModalOpen}
        onClose={() => setFiltrosModalOpen(false)}
        filtros={filtros}
        onChangeFiltros={(novos) => setFiltros(novos)}
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
        colors={colors}
        isDark={isDark}
      />

      {/* PERFORMANCE DASHBOARD MODAL */}
      <Modal visible={isDashboardOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
            ]}
          >
            {/* Modal Header */}
            <View style={[styles.modalHeader, { borderBottomColor: colors.cardBorder }]}>
              <View style={styles.modalHeaderLeft}>
                <Ionicons name="locate" size={18} color={colors.primary} />
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  Metacognição VUNESP
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  triggerLightHaptic();
                  setIsDashboardOpen(false);
                }}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {/* Stat Grid */}
              <View style={styles.gridRow}>
                <View style={[styles.statBox, { backgroundColor: colors.subtle }]}>
                  <Text style={[styles.statLabel, { color: colors.textMuted }]}>Treinadas</Text>
                  <Text style={[styles.statVal, { color: colors.text }]}>{totalAttempts}</Text>
                </View>

                <View style={[styles.statBox, { backgroundColor: colors.subtle }]}>
                  <Text style={[styles.statLabel, { color: colors.textMuted }]}>Acertos</Text>
                  <Text style={[styles.statVal, { color: colors.primary }]}>{accuracyRate}%</Text>
                </View>

                <View style={[styles.statBox, { backgroundColor: colors.subtle }]}>
                  <Text style={[styles.statLabel, { color: colors.textMuted }]}>Sequência</Text>
                  <Text style={[styles.statVal, { color: colors.amber }]}>{stats.streak}🔥</Text>
                </View>

                <View style={[styles.statBox, { backgroundColor: colors.subtle }]}>
                  <Text style={[styles.statLabel, { color: colors.textMuted }]}>Recorde</Text>
                  <Text style={[styles.statVal, { color: colors.emerald }]}>{stats.bestStreak}</Text>
                </View>
              </View>

              {/* SRS LEITNER STATUS */}
              <Text style={[styles.subSectionTitle, { color: colors.text }]}>
                Repetição Espaçada (Leitner / SM-2)
              </Text>
              <View style={styles.srsStatsRow}>
                <View style={[styles.srsStatPill, { backgroundColor: colors.subtle }]}>
                  <Text style={[styles.srsPillVal, { color: colors.text }]}>{srsSummary.novas}</Text>
                  <Text style={[styles.srsPillLabel, { color: colors.textMuted }]}>Novas</Text>
                </View>
                <View style={[styles.srsStatPill, { backgroundColor: colors.amberSoft }]}>
                  <Text style={[styles.srsPillVal, { color: colors.amber }]}>
                    {srsSummary.pendentesHoje}
                  </Text>
                  <Text style={[styles.srsPillLabel, { color: colors.amber }]}>Revisar Hoje</Text>
                </View>
                <View style={[styles.srsStatPill, { backgroundColor: colors.primarySoft }]}>
                  <Text style={[styles.srsPillVal, { color: colors.primary }]}>
                    {srsSummary.emRevisao}
                  </Text>
                  <Text style={[styles.srsPillLabel, { color: colors.primary }]}>Em Revisão</Text>
                </View>
                <View style={[styles.srsStatPill, { backgroundColor: colors.emeraldSoft }]}>
                  <Text style={[styles.srsPillVal, { color: colors.emerald }]}>
                    {srsSummary.dominadas}
                  </Text>
                  <Text style={[styles.srsPillLabel, { color: colors.emerald }]}>Dominadas</Text>
                </View>
              </View>

              {/* COGNITIVE MATRIX */}
              <Text style={[styles.subSectionTitle, { color: colors.text }]}>
                Domínio Real vs. Ilusão de Competência
              </Text>

              <View style={styles.matrixGrid}>
                {/* Domínio Real */}
                <View
                  style={[
                    styles.matrixCard,
                    { backgroundColor: colors.emeraldSoft, borderColor: colors.emerald },
                  ]}
                >
                  <Ionicons name="shield-checkmark" size={20} color={colors.emerald} />
                  <View style={{ marginLeft: 10, flex: 1 }}>
                    <Text style={[styles.matrixName, { color: colors.emerald }]}>
                      Domínio Real
                    </Text>
                    <Text style={[styles.matrixDesc, { color: colors.textMuted }]}>
                      Certeza [3] + Acerto
                    </Text>
                  </View>
                  <Text style={[styles.matrixCount, { color: colors.emerald }]}>
                    {stats.attempts.filter((a) => a.classification === 'real_mastery').length}
                  </Text>
                </View>

                {/* Ilusão de Competência */}
                <View
                  style={[
                    styles.matrixCard,
                    { backgroundColor: colors.roseSoft, borderColor: colors.rose },
                  ]}
                >
                  <Ionicons name="warning" size={20} color={colors.rose} />
                  <View style={{ marginLeft: 10, flex: 1 }}>
                    <Text style={[styles.matrixName, { color: colors.rose }]}>
                      Ilusão de Competência
                    </Text>
                    <Text style={[styles.matrixDesc, { color: colors.textMuted }]}>
                      Certeza [3] + Erro (Ponto Cego)
                    </Text>
                  </View>
                  <Text style={[styles.matrixCount, { color: colors.rose }]}>
                    {stats.blindSpotQueue.length}
                  </Text>
                </View>

                {/* Sorte / Chute */}
                <View
                  style={[
                    styles.matrixCard,
                    { backgroundColor: colors.amberSoft, borderColor: colors.amber },
                  ]}
                >
                  <Ionicons name="dice" size={20} color={colors.amber} />
                  <View style={{ marginLeft: 10, flex: 1 }}>
                    <Text style={[styles.matrixName, { color: colors.amber }]}>
                      Sorte / Acerto Frágil
                    </Text>
                    <Text style={[styles.matrixDesc, { color: colors.textMuted }]}>
                      Chute [1] + Acerto
                    </Text>
                  </View>
                  <Text style={[styles.matrixCount, { color: colors.amber }]}>
                    {stats.attempts.filter((a) => a.classification === 'lucky_guess').length}
                  </Text>
                </View>
              </View>

              {/* ACTION BUTTONS */}
              <View style={styles.actionSection}>
                <TouchableOpacity
                  disabled={stats.blindSpotQueue.length === 0}
                  onPress={() => {
                    triggerLightHaptic();
                    setIsDashboardOpen(false);
                    setActiveTab('drill');
                    setIsFilaSRSActive(false);
                    setMode('blind_spots_only');
                  }}
                  style={[
                    styles.drillModeActionBtn,
                    {
                      backgroundColor: stats.blindSpotQueue.length > 0 ? colors.rose : colors.subtle,
                      opacity: stats.blindSpotQueue.length > 0 ? 1 : 0.5,
                    },
                  ]}
                >
                  <Ionicons name="warning" size={17} color="#ffffff" />
                  <Text style={styles.drillModeActionText}>
                    Treinar Pontos Cegos ({stats.blindSpotQueue.length})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  disabled={stats.errorQueue.length === 0}
                  onPress={() => {
                    triggerLightHaptic();
                    setIsDashboardOpen(false);
                    setActiveTab('drill');
                    setIsFilaSRSActive(false);
                    setMode('errors_only');
                  }}
                  style={[
                    styles.drillModeActionBtn,
                    {
                      backgroundColor: stats.errorQueue.length > 0 ? colors.amber : colors.subtle,
                      opacity: stats.errorQueue.length > 0 ? 1 : 0.5,
                    },
                  ]}
                >
                  <Ionicons name="refresh" size={17} color="#ffffff" />
                  <Text style={styles.drillModeActionText}>
                    Treinar Meus Erros ({stats.errorQueue.length})
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Reset History */}
              <TouchableOpacity
                onPress={() => {
                  Alert.alert(
                    'Resetar Estatísticas',
                    'Deseja limpar todo o histórico de tentativas e pontos cegos?',
                    [
                      { text: 'Cancelar', style: 'cancel' },
                      {
                        text: 'Sim, Resetar',
                        style: 'destructive',
                        onPress: async () => {
                          const res = await clearUserStats();
                          setStats(res);
                        },
                      },
                    ]
                  );
                }}
                style={styles.resetBtn}
              >
                <Ionicons name="trash" size={15} color={colors.rose} />
                <Text style={[styles.resetText, { color: colors.rose }]}>Resetar Estatísticas</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
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
    paddingVertical: 1,
    borderRadius: 4,
  },
  tagBadgeText: {
    fontSize: 10,
    fontWeight: '700',
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
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  streakText: {
    fontSize: 12,
    fontWeight: '800',
  },
  headerActionBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    flexDirection: 'row',
    gap: 2,
  },
  headerActionText: {
    fontSize: 10,
    fontWeight: '800',
  },
  dotAlert: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  mainTabNav: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  mainTabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 11,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  mainTabItemActive: {},
  mainTabItemText: {
    fontSize: 13,
    fontWeight: '600',
  },
  miniStarBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
  },
  miniStarText: {
    fontSize: 10,
    fontWeight: '800',
  },
  scrollContent: {
    padding: 14,
    paddingBottom: 40,
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
    fontSize: 13,
  },
  modeRowOuter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  modeRow: {
    flex: 1,
    flexDirection: 'row',
    borderRadius: 10,
    padding: 3,
  },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 7,
    borderRadius: 8,
  },
  modeBtnActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  modeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  filtersModalBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catScroll: {
    gap: 6,
    paddingBottom: 10,
  },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  catChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  emptyCard: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 12,
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 18,
  },
  emptyBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  emptyBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  card: {
    borderRadius: 16,
    borderWidth: 1.5,
    overflow: 'hidden',
    padding: 16,
  },
  progressBarTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  subtopicBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  subtopicText: {
    fontSize: 11,
    fontWeight: '800',
  },
  headerRightMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  diffBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  diffText: {
    fontSize: 11,
    fontWeight: '800',
  },
  progressText: {
    fontSize: 12,
    fontWeight: '700',
  },
  blindSpotPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  blindSpotPillText: {
    fontSize: 12,
    fontWeight: '800',
  },
  statementBox: {
    marginBottom: 16,
  },
  statementTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  statementTagText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  statementText: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
  },
  lacunaBadge: {
    fontWeight: '900',
    borderRadius: 4,
    overflow: 'hidden',
  },
  divider: {
    borderTopWidth: 1,
    paddingTop: 14,
    marginTop: 10,
  },
  sectionHeader: {
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
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  skipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  skipBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  certaintyRow: {
    flexDirection: 'row',
    gap: 8,
  },
  certaintyBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  certaintyText: {
    fontSize: 12,
    fontWeight: '800',
  },
  optionsList: {
    gap: 8,
  },
  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  optionLetterBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLetterText: {
    fontSize: 13,
    fontWeight: '800',
  },
  optionText: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  feedbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    marginBottom: 12,
  },
  feedbackTitle: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  feedbackSub: {
    fontSize: 13,
    marginTop: 2,
  },
  blindSpotAlert: {
    borderWidth: 1.5,
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  blindSpotAlertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  blindSpotAlertTitle: {
    fontSize: 12,
    fontWeight: '900',
  },
  blindSpotAlertText: {
    fontSize: 12,
    lineHeight: 17,
  },
  luckyGuessBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
  },
  luckyGuessText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
  raioXBox: {
    borderWidth: 1.5,
    padding: 12,
    borderRadius: 12,
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
  basisBox: {
    borderWidth: 1,
    padding: 10,
    borderRadius: 10,
    marginBottom: 14,
  },
  basisHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  basisTitle: {
    fontSize: 11,
    fontWeight: '700',
  },
  basisText: {
    fontSize: 12,
    lineHeight: 17,
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
  },
  nextBtnText: {
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  closeBtn: {
    padding: 4,
  },
  modalScroll: {
    padding: 16,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
  },
  statVal: {
    fontSize: 16,
    fontWeight: '900',
    marginTop: 2,
  },
  subSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 10,
  },
  srsStatsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  srsStatPill: {
    flex: 1,
    padding: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  srsPillVal: {
    fontSize: 15,
    fontWeight: '900',
  },
  srsPillLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  matrixGrid: {
    gap: 8,
    marginBottom: 16,
  },
  matrixCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  matrixName: {
    fontSize: 13,
    fontWeight: '800',
  },
  matrixDesc: {
    fontSize: 11,
    marginTop: 2,
  },
  matrixCount: {
    fontSize: 18,
    fontWeight: '900',
  },
  actionSection: {
    gap: 8,
    marginBottom: 16,
  },
  drillModeActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  drillModeActionText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    marginBottom: 30,
  },
  resetText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
