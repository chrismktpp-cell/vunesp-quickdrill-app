import React, { useRef, useEffect, useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type {
  Question,
  CategoryType,
  CertaintyLevel,
  PerformanceClassification,
  DrillMode,
  UserStats,
  FilaDoDia,
  Dificuldade,
} from '../types/schema';
import type { QuestionFilters } from '../services/filterEngine';
import { FilaDoDiaBanner } from './FilaDoDiaBanner';
import { triggerLightHaptic, triggerSuccessHaptic } from '../utils/haptics';
import { radius, typography, weights, spacing } from '../theme/tokens';
import { getDeterministicOptionOrder } from '../utils/shuffleOptions';

export interface DrillScreenProps {
  questionsData: Question[];
  filteredQuestions: Question[];
  currentQuestion: Question | null;
  currentIndex: number;
  isAnswered: boolean;
  selectedOptionIndex: number | null;
  lastClassification: PerformanceClassification | null;
  selectedCertainty: CertaintyLevel;
  setSelectedCertainty: (c: CertaintyLevel) => void;
  mode: DrillMode;
  setMode: (m: DrillMode) => void;
  selectedCategory: CategoryType | 'all';
  setSelectedCategory: (c: CategoryType | 'all') => void;
  isFilaSRSActive: boolean;
  setIsFilaSRSActive: React.Dispatch<React.SetStateAction<boolean>>;
  filaDoDia: FilaDoDia;
  stats: UserStats;
  sessionStats: { attempts: number; correct: number };
  favorites: string[];
  feedbackTip?: string;
  showOnboarding?: boolean;
  onDismissOnboarding?: () => void;
  onAnswer: (optionIndex: number, tempoGastoMs?: number) => void;
  onNext: () => void;
  onSkip: () => void;
  onShuffle?: () => void;
  filtros?: QuestionFilters;
  onOpenMural?: () => void;
  onToggleFavorite: (questionId: string) => void;
  onOpenFiltersModal: () => void;
  onResetFilters: () => void;
  setCurrentIndex: React.Dispatch<React.SetStateAction<number>>;
  tokens: any;
  legacyColors: any;
  isDark: boolean;
  categories: CategoryType[];
  getCategoryColor: (cat: CategoryType) => {
    accent: string;
    soft: string;
    border: string;
    badgeText: string;
  };
  getDifficultyColor: (diff: Dificuldade) => {
    bg: string;
    text: string;
    border: string;
  };
  // Propriedades para sessões gamificadas (opcionais para manter compatibilidade)
  isSessionMode?: boolean;
  sessionTitle?: string;
  onExitSession?: () => void;
}

export const DrillScreen: React.FC<DrillScreenProps> = ({
  questionsData,
  filteredQuestions,
  currentQuestion,
  currentIndex,
  isAnswered,
  selectedOptionIndex,
  lastClassification,
  selectedCertainty,
  setSelectedCertainty,
  mode,
  setMode,
  selectedCategory,
  setSelectedCategory,
  isFilaSRSActive,
  setIsFilaSRSActive,
  filaDoDia,
  stats,
  sessionStats,
  favorites,
  feedbackTip,
  showOnboarding,
  onDismissOnboarding,
  onAnswer,
  onNext,
  onSkip,
  onShuffle,
  filtros,
  onOpenMural,
  onToggleFavorite,
  onOpenFiltersModal,
  onResetFilters,
  setCurrentIndex,
  tokens,
  legacyColors,
  isDark,
  categories,
  isSessionMode = false,
  sessionTitle,
  onExitSession,
}) => {
  // Cronômetro de tempo gasto na questão
  const questionStartTimeRef = useRef<number>(Date.now());
  const [pendingOptionIndex, setPendingOptionIndex] = useState<number | null>(null);

  // Modo Lápis (riscar/descartar alternativas incorretas)
  const [isLapisActive, setIsLapisActive] = useState<boolean>(false);
  const [discardedOptionIndices, setDiscardedOptionIndices] = useState<number[]>([]);

  // Modo Marca-Texto (destaque de palavras no enunciado e pegadinhas da VUNESP)
  const [isHighlighterActive, setIsHighlighterActive] = useState<boolean>(false);
  const [highlightedWordIndices, setHighlightedWordIndices] = useState<number[]>([]);

  // Ajuste de Tamanho de Fonte (-1: P, 0: M, 1: G, 2: GG)
  const [fontScaleStep, setFontScaleStep] = useState<number>(0);
  const fontDelta = fontScaleStep * 2;

  // Efeito Visual de Combo (sequência de acertos seguidos)
  const [comboCount, setComboCount] = useState<number>(0);
  const [showComboBanner, setShowComboBanner] = useState<boolean>(false);

  // Permutação determinística de alternativas para remover o viés de 67% na alternativa A
  const optionOrder = useMemo(() => {
    if (!currentQuestion) return [];
    return getDeterministicOptionOrder(currentQuestion.id, currentQuestion.options.length);
  }, [currentQuestion?.id, currentQuestion?.options?.length]);

  useEffect(() => {
    questionStartTimeRef.current = Date.now();
    setPendingOptionIndex(null);
    setDiscardedOptionIndices([]);
    setHighlightedWordIndices([]);
    setShowComboBanner(false);
  }, [currentQuestion?.id, currentIndex]);

  const handleToggleDiscardOption = (idx: number) => {
    if (isAnswered) return;
    triggerLightHaptic();
    setDiscardedOptionIndices((prev) => {
      if (prev.includes(idx)) {
        return prev.filter((i) => i !== idx);
      } else {
        if (pendingOptionIndex === idx) {
          setPendingOptionIndex(null);
        }
        return [...prev, idx];
      }
    });
  };

  const handleSelectPendingOption = (idx: number) => {
    if (isAnswered) return;
    triggerLightHaptic();

    if (isLapisActive) {
      handleToggleDiscardOption(idx);
      return;
    }

    if (discardedOptionIndices.includes(idx)) {
      setDiscardedOptionIndices((prev) => prev.filter((i) => i !== idx));
    }
    setPendingOptionIndex(idx);
  };

  const handleToggleHighlightWord = (tokenIdx: number) => {
    triggerLightHaptic();
    setHighlightedWordIndices((prev) => {
      if (prev.includes(tokenIdx)) {
        return prev.filter((i) => i !== tokenIdx);
      } else {
        return [...prev, tokenIdx];
      }
    });
  };

  const handleAutoHighlightPegadinhas = () => {
    triggerLightHaptic();
    if (!currentQuestion) return;
    const tokensList = currentQuestion.statement.split(/(\s+)/);
    const trapRegex = /^(exceto|não|incorreta|incorreto|errada|errado|falsa|falso|apenas|somente|nunca|sempre|salvo|vedado|proibido|exclusivamente)[\.,;:?!]?$/i;
    const newIndices: number[] = [];
    tokensList.forEach((token, idx) => {
      if (trapRegex.test(token.trim())) {
        newIndices.push(idx);
      }
    });
    setHighlightedWordIndices((prev) => Array.from(new Set([...prev, ...newIndices])));
  };

  const handleDecreaseFont = () => {
    triggerLightHaptic();
    setFontScaleStep((prev) => Math.max(-1, prev - 1));
  };

  const handleIncreaseFont = () => {
    triggerLightHaptic();
    setFontScaleStep((prev) => Math.min(2, prev + 1));
  };

  const handleConfirmAnswer = () => {
    if (pendingOptionIndex === null || isAnswered || !currentQuestion) return;
    const isCorrect = pendingOptionIndex === currentQuestion.correctIndex;
    if (isCorrect) {
      const nextCombo = comboCount + 1;
      setComboCount(nextCombo);
      if (nextCombo >= 2) {
        setShowComboBanner(true);
        triggerSuccessHaptic();
      }
    } else {
      setComboCount(0);
      setShowComboBanner(false);
    }
    const tempoGastoMs = Math.max(0, Date.now() - questionStartTimeRef.current);
    onAnswer(pendingOptionIndex, tempoGastoMs);
  };

  const progressRatio =
    filteredQuestions.length > 0 ? (currentIndex + 1) / filteredQuestions.length : 0;

  const isLastQuestion =
    filteredQuestions.length > 0 && currentIndex === filteredQuestions.length - 1;

  // Render text statement com destaque para lacuna [ ? ] e marca-texto interativo
  const renderStatement = (text: string) => {
    const tokensList = text.split(/(\s+)/);
    return (
      <Text
        style={[
          styles.statementText,
          {
            color: tokens.textPrimary,
            fontSize: typography.statement + fontDelta,
            lineHeight: (typography.statement + fontDelta) * 1.5,
          },
        ]}
      >
        {tokensList.map((token, tokenIdx) => {
          const isHighlighted = highlightedWordIndices.includes(tokenIdx);
          const isBlank = token === '_____';
          if (isBlank) {
            return (
              <Text
                key={tokenIdx}
                style={{ color: tokens.primary, fontWeight: weights.title }}
              >
                [ ? ]
              </Text>
            );
          }
          if (isHighlighted) {
            return (
              <Text
                key={tokenIdx}
                onPress={isHighlighterActive ? () => handleToggleHighlightWord(tokenIdx) : undefined}
                style={[
                  styles.highlightedWordText,
                  {
                    backgroundColor: isDark ? '#eab308' : '#fef08a',
                    color: '#0f172a',
                  },
                ]}
              >
                {token}
              </Text>
            );
          }
          if (isHighlighterActive && token.trim().length > 0) {
            return (
              <Text
                key={tokenIdx}
                onPress={() => handleToggleHighlightWord(tokenIdx)}
                style={styles.highlighterInteractiveWord}
              >
                {token}
              </Text>
            );
          }
          return <Text key={tokenIdx}>{token}</Text>;
        })}
      </Text>
    );
  };

  const isCurrentFavorite = currentQuestion ? favorites.includes(currentQuestion.id) : false;

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      {/* MODO SESSÃO: BARRA SUPERIOR DEDICADA */}
      {isSessionMode ? (
        <View style={styles.sessionHeaderRow}>
          {onExitSession && (
            <TouchableOpacity
              onPress={() => {
                triggerLightHaptic();
                onExitSession();
              }}
              activeOpacity={0.85}
              style={[
                styles.exitBtn,
                { backgroundColor: tokens.surface, borderColor: tokens.cardBorder },
              ]}
              accessibilityLabel="Pausar ou sair da sessão"
            >
              <Ionicons name="close" size={20} color={tokens.textPrimary} />
            </TouchableOpacity>
          )}

          <View style={styles.sessionHeaderInfo}>
            {sessionTitle && (
              <Text
                style={[styles.sessionHeaderTitle, { color: tokens.textPrimary }]}
                numberOfLines={1}
              >
                {sessionTitle}
              </Text>
            )}
            <View style={[styles.sessionProgressTrack, { backgroundColor: tokens.surface }]}>
              <View
                style={[
                  styles.sessionProgressFill,
                  {
                    width: `${Math.round(progressRatio * 100)}%`,
                    backgroundColor: tokens.primary,
                  },
                ]}
              />
            </View>
          </View>

          <View
            style={[
              styles.sessionCounterBadge,
              { backgroundColor: tokens.surface, borderColor: tokens.cardBorder },
            ]}
          >
            <Text style={[styles.sessionCounterText, { color: tokens.primary }]}>
              {currentIndex + 1}/{filteredQuestions.length}
            </Text>
          </View>
        </View>
      ) : (
        <>
          {/* Onboarding de primeira abertura (dispensável, 3 linhas, botão Começar) */}
          {showOnboarding && (
            <View
              style={[
                styles.onboardingCard,
                { backgroundColor: tokens.cardBg, borderColor: tokens.cardBorder },
              ]}
            >
              <View style={styles.onboardingLines}>
                <Text style={[styles.onboardingLine, { color: tokens.textPrimary }]}>
                  • Chute, dúvida e certeza mudam a revisão.
                </Text>
                <Text style={[styles.onboardingLine, { color: tokens.textPrimary }]}>
                  • Certeza + erro vira ponto cego e volta logo.
                </Text>
                <Text style={[styles.onboardingLine, { color: tokens.textPrimary }]}>
                  • Dúvida acertada não conta como domínio.
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  triggerLightHaptic();
                  onDismissOnboarding?.();
                }}
                activeOpacity={0.85}
                style={[styles.onboardingBtn, { backgroundColor: tokens.primary }]}
              >
                <Text style={styles.onboardingBtnText}>Começar</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* 1. Banner Fila do Dia (64px, bloco único) */}
          <FilaDoDiaBanner
            fila={filaDoDia}
            isFilaActive={isFilaSRSActive}
            onToggleFila={() => {
              setIsFilaSRSActive((prev) => !prev);
              setCurrentIndex(0);
            }}
            colors={legacyColors}
            isDark={isDark}
          />

          {/* 2. Linha de controles (32px) */}
          <View style={styles.controlsRow}>
            <View style={styles.controlsLeft}>
              {/* Chip da categoria ativa */}
              <View
                style={[
                  styles.controlChip,
                  { backgroundColor: tokens.surface, borderColor: tokens.cardBorder },
                ]}
              >
                <Text style={[styles.controlChipText, { color: tokens.textPrimary }]}>
                  {selectedCategory === 'all' ? 'Todas' : selectedCategory.split(' ')[0]}
                </Text>
              </View>

              {/* Chip da dificuldade */}
              <View
                style={[
                  styles.controlChip,
                  { backgroundColor: tokens.surface, borderColor: tokens.cardBorder },
                ]}
              >
                <Text style={[styles.controlChipText, { color: tokens.textMuted }]}>
                  {filtros?.dificuldade && filtros.dificuldade !== 'all'
                    ? filtros.dificuldade
                    : currentQuestion
                    ? currentQuestion.difficulty
                    : 'Todas'}
                </Text>
              </View>
            </View>

            <View style={styles.controlsRight}>
              {/* Botão Shuffle */}
              {onShuffle && (
                <TouchableOpacity
                  onPress={onShuffle}
                  activeOpacity={0.85}
                  style={[
                    styles.controlIconBtn,
                    { backgroundColor: tokens.surface, borderColor: tokens.cardBorder },
                  ]}
                  accessibilityLabel="Embaralhar questões"
                >
                  <Ionicons name="shuffle" size={16} color={tokens.textMuted} />
                </TouchableOpacity>
              )}

              {/* Botão Atalho Mural de Macetes */}
              {onOpenMural && (
                <TouchableOpacity
                  onPress={() => {
                    triggerLightHaptic();
                    onOpenMural();
                  }}
                  activeOpacity={0.85}
                  style={[
                    styles.maceteQuickBtn,
                    {
                      backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#fef3c7',
                      borderColor: tokens.warning,
                    },
                  ]}
                  accessibilityLabel="Ver mural de macetes"
                >
                  <Ionicons name="bulb" size={15} color={tokens.warning} />
                  <Text style={[styles.maceteQuickText, { color: tokens.warning }]}>Macetes</Text>
                </TouchableOpacity>
              )}

              {/* Botão Filtros */}
              <TouchableOpacity
                onPress={() => {
                  triggerLightHaptic();
                  onOpenFiltersModal();
                }}
                activeOpacity={0.85}
                style={[
                  styles.controlIconBtn,
                  { backgroundColor: tokens.surface, borderColor: tokens.cardBorder },
                ]}
                accessibilityLabel="Abrir filtros"
              >
                <Ionicons name="options-outline" size={16} color={tokens.primary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* 3. Carrossel de Categorias (32px de altura) */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScroll}
          >
            <TouchableOpacity
              onPress={() => {
                triggerLightHaptic();
                setSelectedCategory('all');
              }}
              activeOpacity={0.85}
              style={[
                styles.categoryPill,
                selectedCategory === 'all'
                  ? { backgroundColor: tokens.primary, borderColor: tokens.primary }
                  : { backgroundColor: tokens.cardBg, borderColor: tokens.cardBorder },
              ]}
            >
              <Text
                style={[
                  styles.categoryPillText,
                  { color: selectedCategory === 'all' ? '#ffffff' : tokens.textMuted },
                ]}
              >
                Todas ({questionsData.length})
              </Text>
            </TouchableOpacity>

            {categories.map((cat) => {
              const isSel = selectedCategory === cat;
              const count = questionsData.filter((q) => q.category === cat).length;
              return (
                <TouchableOpacity
                  key={cat}
                  onPress={() => {
                    triggerLightHaptic();
                    setSelectedCategory(cat);
                  }}
                  activeOpacity={0.85}
                  style={[
                    styles.categoryPill,
                    isSel
                      ? { backgroundColor: tokens.primary, borderColor: tokens.primary }
                      : { backgroundColor: tokens.cardBg, borderColor: tokens.cardBorder },
                  ]}
                >
                  <Text
                    style={[
                      styles.categoryPillText,
                      { color: isSel ? '#ffffff' : tokens.textMuted },
                    ]}
                  >
                    {cat.split(' ')[0]} ({count})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* 4. Barra de progresso */}
          <View style={styles.progressRow}>
            <View style={[styles.progressTrack, { backgroundColor: tokens.surface }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.round(progressRatio * 100)}%`,
                    backgroundColor: tokens.primary,
                  },
                ]}
              />
            </View>
            <Text style={[styles.progressFraction, { color: tokens.textMuted }]}>
              {filteredQuestions.length > 0
                ? `${currentIndex + 1}/${filteredQuestions.length}`
                : '0/0'}
            </Text>
          </View>
        </>
      )}

      {/* 5. CARD ÚNICO — A questão é o herói */}
      {filteredQuestions.length === 0 ? (
        <View
          style={[
            styles.emptyCard,
            { backgroundColor: tokens.cardBg, borderColor: tokens.cardBorder },
          ]}
        >
          <Ionicons name="checkmark-done-circle" size={40} color={tokens.success} />
          <Text style={[styles.emptyTitle, { color: tokens.textPrimary }]}>
            {isFilaSRSActive
              ? 'Fila do dia concluída'
              : mode === 'blind_spots_only'
              ? 'Nenhum ponto cego ativo'
              : 'Nenhuma questão encontrada'}
          </Text>
          <Text style={[styles.emptyDesc, { color: tokens.textMuted }]}>
            {isFilaSRSActive
              ? 'Você completou todas as revisões programadas para hoje.'
              : 'Ajuste os filtros para continuar praticando.'}
          </Text>
          <TouchableOpacity
            onPress={() => {
              triggerLightHaptic();
              onResetFilters();
            }}
            activeOpacity={0.85}
            style={[styles.emptyActionBtn, { backgroundColor: tokens.primary }]}
          >
            <Text style={styles.emptyActionBtnText}>Voltar ao banco geral</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View
          style={[
            styles.questionCard,
            { backgroundColor: tokens.cardBg, borderColor: tokens.cardBorder },
          ]}
        >
          {/* Header do Card: Dificuldade badge + Subtópico à esquerda, Estrela de favorito à direita */}
          <View style={styles.cardMetaRow}>
            <View style={styles.cardMetaLeft}>
              <View style={styles.metaBadgeRow}>
                <View
                  style={[
                    styles.difficultyBadge,
                    {
                      backgroundColor:
                        currentQuestion!.difficulty === 'Fácil'
                          ? tokens.successSoft
                          : currentQuestion!.difficulty === 'Difícil'
                          ? tokens.dangerSoft
                          : tokens.warningSoft,
                      borderColor:
                        currentQuestion!.difficulty === 'Fácil'
                          ? tokens.success
                          : currentQuestion!.difficulty === 'Difícil'
                          ? tokens.danger
                          : tokens.warning,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.difficultyBadgeText,
                      {
                        color:
                          currentQuestion!.difficulty === 'Fácil'
                            ? tokens.success
                            : currentQuestion!.difficulty === 'Difícil'
                            ? tokens.danger
                            : tokens.warning,
                      },
                    ]}
                  >
                    {currentQuestion!.difficulty}
                  </Text>
                </View>

                <Text
                  style={[styles.metaSubtopicText, { color: tokens.textMuted }]}
                  numberOfLines={1}
                >
                  {currentQuestion!.subtopic}
                </Text>
              </View>
            </View>

            {/* Ações do Card: Favoritar */}
            <View style={styles.cardMetaRightActions}>
              <TouchableOpacity
                onPress={() => onToggleFavorite(currentQuestion!.id)}
                activeOpacity={0.85}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel={isCurrentFavorite ? 'Remover dos favoritos' : 'Favoritar questão'}
              >
                <Ionicons
                  name={isCurrentFavorite ? 'star' : 'star-outline'}
                  size={22}
                  color={isCurrentFavorite ? tokens.warning : tokens.textMuted}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* BARRA DE FERRAMENTAS DE ESTUDO: LÁPIS + MARCA-TEXTO + FONTE A-/A+ */}
          <View style={styles.studyToolbarRow}>
            <View style={styles.studyToolbarTools}>
              {!isAnswered && (
                <>
                  {/* Botão Lápis */}
                  <TouchableOpacity
                    onPress={() => {
                      triggerLightHaptic();
                      setIsLapisActive((prev) => {
                        if (!prev) setIsHighlighterActive(false);
                        return !prev;
                      });
                    }}
                    activeOpacity={0.8}
                    style={[
                      styles.toolbarActionBtn,
                      isLapisActive
                        ? {
                            backgroundColor: isDark
                              ? 'rgba(255, 181, 71, 0.22)'
                              : '#fef3c7',
                            borderColor: tokens.warning,
                          }
                        : {
                            backgroundColor: tokens.surface,
                            borderColor: tokens.cardBorder,
                          },
                    ]}
                    accessibilityLabel="Ativar modo lápis para riscar alternativas"
                  >
                    <Ionicons
                      name={isLapisActive ? 'pencil' : 'pencil-outline'}
                      size={13}
                      color={isLapisActive ? tokens.warning : tokens.textMuted}
                    />
                    <Text
                      style={[
                        styles.toolbarActionBtnText,
                        {
                          color: isLapisActive ? tokens.warning : tokens.textMuted,
                          fontWeight: isLapisActive ? weights.title : weights.meta,
                        },
                      ]}
                    >
                      {isLapisActive ? 'Lápis ON' : 'Lápis'}
                    </Text>
                  </TouchableOpacity>

                  {/* Botão Marca-Texto */}
                  <TouchableOpacity
                    onPress={() => {
                      triggerLightHaptic();
                      setIsHighlighterActive((prev) => {
                        if (!prev) setIsLapisActive(false);
                        return !prev;
                      });
                    }}
                    activeOpacity={0.8}
                    style={[
                      styles.toolbarActionBtn,
                      isHighlighterActive
                        ? {
                            backgroundColor: isDark
                              ? 'rgba(234, 179, 8, 0.22)'
                              : '#fef9c3',
                            borderColor: '#eab308',
                          }
                        : {
                            backgroundColor: tokens.surface,
                            borderColor: tokens.cardBorder,
                          },
                    ]}
                    accessibilityLabel="Ativar modo marca-texto no enunciado"
                  >
                    <Ionicons
                      name={isHighlighterActive ? 'color-wand' : 'color-wand-outline'}
                      size={13}
                      color={isHighlighterActive ? '#eab308' : tokens.textMuted}
                    />
                    <Text
                      style={[
                        styles.toolbarActionBtnText,
                        {
                          color: isHighlighterActive
                            ? (isDark ? '#fef08a' : '#854d0e')
                            : tokens.textMuted,
                          fontWeight: isHighlighterActive ? weights.title : weights.meta,
                        },
                      ]}
                    >
                      {isHighlighterActive ? 'Marca-Texto ON' : 'Marca-Texto'}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>

            {/* Controle de Tamanho de Fonte (A- / A+) */}
            <View
              style={[
                styles.fontSizePill,
                { backgroundColor: tokens.surface, borderColor: tokens.cardBorder },
              ]}
            >
              <TouchableOpacity
                onPress={handleDecreaseFont}
                activeOpacity={0.7}
                style={[
                  styles.fontSizeBtn,
                  fontScaleStep === -1 && { opacity: 0.35 },
                ]}
                disabled={fontScaleStep <= -1}
                accessibilityLabel="Diminuir tamanho da fonte"
              >
                <Text style={[styles.fontSizeBtnText, { color: tokens.textMuted }]}>
                  A-
                </Text>
              </TouchableOpacity>
              <View style={[styles.fontSizeDivider, { backgroundColor: tokens.cardBorder }]} />
              <TouchableOpacity
                onPress={handleIncreaseFont}
                activeOpacity={0.7}
                style={[
                  styles.fontSizeBtn,
                  fontScaleStep === 2 && { opacity: 0.35 },
                ]}
                disabled={fontScaleStep >= 2}
                accessibilityLabel="Aumentar tamanho da fonte"
              >
                <Text
                  style={[
                    styles.fontSizeBtnText,
                    {
                      color: fontScaleStep > 0 ? tokens.primary : tokens.textMuted,
                      fontWeight: fontScaleStep > 0 ? '700' : '500',
                    },
                  ]}
                >
                  A+
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Texto de Apoio (se houver) */}
          {currentQuestion!.supportText && (
            <View
              style={[
                styles.supportTextBox,
                {
                  backgroundColor: tokens.surface,
                  borderColor: tokens.cardBorder,
                  borderLeftColor: tokens.primary,
                },
              ]}
            >
              <View style={styles.supportTextHeader}>
                <Ionicons name="document-text-outline" size={14} color={tokens.primary} />
                <Text style={[styles.supportTextHeaderTitle, { color: tokens.primary }]}>
                  Texto de Apoio
                </Text>
              </View>
              <Text
                style={[
                  styles.supportTextContent,
                  {
                    color: tokens.textSecondary,
                    fontSize: 13 + fontDelta,
                    lineHeight: (13 + fontDelta) * 1.45,
                  },
                ]}
              >
                {currentQuestion!.supportText}
              </Text>
            </View>
          )}

          {/* Enunciado da Questão: tipografia respirável e destaque visual */}
          <View style={styles.statementBox}>
            {renderStatement(currentQuestion!.statement)}
          </View>

          {/* Aviso Flutuante de Modo Marca-Texto Ativo */}
          {isHighlighterActive && !isAnswered && (
            <View
              style={[
                styles.highlighterActiveBanner,
                {
                  backgroundColor: isDark ? 'rgba(234, 179, 8, 0.15)' : '#fef9c3',
                  borderColor: '#eab308',
                },
              ]}
            >
              <View style={styles.highlighterBannerLeft}>
                <Ionicons name="color-wand" size={13} color="#eab308" />
                <Text
                  style={[
                    styles.highlighterActiveBannerText,
                    { color: isDark ? '#fef08a' : '#854d0e' },
                  ]}
                >
                  Toque no texto para grifar
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleAutoHighlightPegadinhas}
                activeOpacity={0.8}
                style={styles.autoPegadinhasBtn}
                accessibilityLabel="Destacar termos de pegadinha da VUNESP"
              >
                <Ionicons name="flash" size={11} color="#ffffff" />
                <Text style={styles.autoPegadinhasBtnText}>⚡ Pegadinhas</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Aviso Flutuante de Modo Lápis Ativo */}
          {isLapisActive && !isAnswered && (
            <View
              style={[
                styles.lapisActiveBanner,
                {
                  backgroundColor: isDark ? 'rgba(255, 181, 71, 0.15)' : '#fef3c7',
                  borderColor: tokens.warning,
                },
              ]}
            >
              <Ionicons name="pencil" size={14} color={tokens.warning} />
              <Text
                style={[
                  styles.lapisActiveBannerText,
                  { color: isDark ? tokens.warning : '#b45309' },
                ]}
              >
                Modo Lápis Ativo: toque nas alternativas para riscá-las.
              </Text>
            </View>
          )}

          {/* Alternativas em botões grandes e táteis com 4 estados distintos */}
          <View style={styles.optionsList}>
            {optionOrder.map((originalIdx, displayIdx) => {
              const option = currentQuestion!.options[originalIdx];
              const letter = String.fromCharCode(65 + displayIdx);
              const isConfirmed = isAnswered;
              const isSelectedPending = pendingOptionIndex === originalIdx;
              const isConfirmedSelected = selectedOptionIndex === originalIdx;
              const isCorrectOption = originalIdx === currentQuestion!.correctIndex;
              const isDiscarded = discardedOptionIndices.includes(originalIdx);

              let optBg = tokens.cardBg;
              let optBorder = tokens.cardBorder;
              let optBorderWidth = 1.5;
              let letterBg = tokens.surface;
              let letterBorderColor = tokens.cardBorder;
              let letterColor = tokens.textPrimary;
              let rightIcon: any = null;

              if (!isConfirmed) {
                // Estado 1: Descartado com lápis
                if (isDiscarded) {
                  optBg = isDark ? 'rgba(15, 23, 42, 0.4)' : '#f1f5f9';
                  optBorder = isDark ? 'rgba(255, 255, 255, 0.08)' : '#cbd5e1';
                  letterBg = isDark ? 'rgba(255, 255, 255, 0.04)' : '#e2e8f0';
                  letterBorderColor = isDark ? 'rgba(255, 255, 255, 0.08)' : '#cbd5e1';
                  letterColor = tokens.textMuted;
                } else if (isSelectedPending) {
                  // Estado 2: Selecionado pré-confirmação
                  optBg = tokens.primarySoft;
                  optBorder = tokens.primary;
                  optBorderWidth = 2;
                  letterBg = tokens.primary;
                  letterBorderColor = tokens.primary;
                  letterColor = '#ffffff';
                }
              } else {
                // Estado 3: Correto
                // Estado 4: Incorreto
                if (isCorrectOption) {
                  optBg = tokens.successSoft;
                  optBorder = tokens.success;
                  optBorderWidth = 2;
                  letterBg = tokens.success;
                  letterBorderColor = tokens.success;
                  letterColor = '#ffffff';
                  rightIcon = <Ionicons name="checkmark-circle" size={22} color={tokens.success} />;
                } else if (isConfirmedSelected && !isCorrectOption) {
                  optBg = tokens.dangerSoft;
                  optBorder = tokens.danger;
                  optBorderWidth = 2;
                  letterBg = tokens.danger;
                  letterBorderColor = tokens.danger;
                  letterColor = '#ffffff';
                  rightIcon = <Ionicons name="close-circle" size={22} color={tokens.danger} />;
                }
              }

              return (
                <TouchableOpacity
                  key={`${currentQuestion!.id}-opt-${originalIdx}`}
                  onPress={() => handleSelectPendingOption(originalIdx)}
                  disabled={isAnswered}
                  activeOpacity={0.85}
                  style={[
                    styles.optionRow,
                    {
                      backgroundColor: optBg,
                      borderColor: optBorder,
                      borderWidth: optBorderWidth,
                    },
                    isSelectedPending && !isConfirmed && styles.optionRowSelectedPending,
                    isDiscarded && !isConfirmed && styles.optionRowDiscarded,
                  ]}
                >
                  <View
                    style={[
                      styles.letterCircle,
                      {
                        backgroundColor: letterBg,
                        borderColor: letterBorderColor,
                        borderWidth:
                          isSelectedPending || (isConfirmed && (isCorrectOption || isConfirmedSelected))
                            ? 0
                            : 1,
                        opacity: isDiscarded && !isConfirmed ? 0.45 : 1,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.letterText,
                        { color: letterColor },
                        isDiscarded && !isConfirmed && { textDecorationLine: 'line-through' },
                      ]}
                    >
                      {letter}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.optionText,
                      {
                        color: tokens.textPrimary,
                        fontSize: 14 + fontDelta,
                        lineHeight: (14 + fontDelta) * 1.4,
                      },
                      isDiscarded &&
                        !isConfirmed && {
                          textDecorationLine: 'line-through',
                          textDecorationStyle: 'solid',
                          color: tokens.textMuted,
                          opacity: 0.55,
                        },
                    ]}
                  >
                    {option}
                  </Text>

                  {/* Ícone de feedback/gabarito OU Botão de Lápis Individual na Linha */}
                  {rightIcon ? (
                    <View style={styles.optionRightIcon}>{rightIcon}</View>
                  ) : (
                    !isAnswered && (
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          handleToggleDiscardOption(originalIdx);
                        }}
                        activeOpacity={0.7}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        style={[
                          styles.inlineLapisBtn,
                          isDiscarded && {
                            backgroundColor: isDark
                              ? 'rgba(255, 181, 71, 0.22)'
                              : '#fef3c7',
                            borderColor: tokens.warning,
                          },
                        ]}
                        accessibilityLabel={`Riscar alternativa ${letter}`}
                      >
                        <Ionicons
                          name={isDiscarded ? 'pencil' : 'pencil-outline'}
                          size={15}
                          color={isDiscarded ? tokens.warning : tokens.textMuted}
                        />
                      </TouchableOpacity>
                    )
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* BLOCO DE CERTEZA & BOTÃO CONFIRMAR (ANTES DE RESPONDER) */}
          {!isAnswered ? (
            <View style={styles.certaintySection}>
              <Text style={[styles.certaintySectionTitle, { color: tokens.textMuted }]}>
                Seu nível de confiança nesta resposta:
              </Text>
              <View style={styles.certaintySegments}>
                {/* Chute */}
                <TouchableOpacity
                  onPress={() => {
                    triggerLightHaptic();
                    setSelectedCertainty(1);
                  }}
                  activeOpacity={0.85}
                  style={[
                    styles.certaintySegment,
                    selectedCertainty === 1
                      ? {
                          backgroundColor: tokens.warning,
                          borderColor: tokens.warning,
                        }
                      : {
                          backgroundColor: tokens.surface,
                          borderColor: tokens.cardBorder,
                          borderWidth: 1,
                        },
                  ]}
                >
                  <Text
                    style={[
                      styles.certaintyText,
                      {
                        color: selectedCertainty === 1 ? '#0B1020' : tokens.textMuted,
                        fontWeight: selectedCertainty === 1 ? weights.title : weights.meta,
                      },
                    ]}
                  >
                    🎲 Chute
                  </Text>
                </TouchableOpacity>

                {/* Dúvida */}
                <TouchableOpacity
                  onPress={() => {
                    triggerLightHaptic();
                    setSelectedCertainty(2);
                  }}
                  activeOpacity={0.85}
                  style={[
                    styles.certaintySegment,
                    selectedCertainty === 2
                      ? {
                          backgroundColor: tokens.primary,
                          borderColor: tokens.primary,
                        }
                      : {
                          backgroundColor: tokens.surface,
                          borderColor: tokens.cardBorder,
                          borderWidth: 1,
                        },
                  ]}
                >
                  <Text
                    style={[
                      styles.certaintyText,
                      {
                        color: selectedCertainty === 2 ? '#ffffff' : tokens.textMuted,
                        fontWeight: selectedCertainty === 2 ? weights.title : weights.meta,
                      },
                    ]}
                  >
                    🤔 Dúvida
                  </Text>
                </TouchableOpacity>

                {/* Certeza */}
                <TouchableOpacity
                  onPress={() => {
                    triggerLightHaptic();
                    setSelectedCertainty(3);
                  }}
                  activeOpacity={0.85}
                  style={[
                    styles.certaintySegment,
                    selectedCertainty === 3
                      ? {
                          backgroundColor: tokens.success,
                          borderColor: tokens.success,
                        }
                      : {
                          backgroundColor: tokens.surface,
                          borderColor: tokens.cardBorder,
                          borderWidth: 1,
                        },
                  ]}
                >
                  <Text
                    style={[
                      styles.certaintyText,
                      {
                        color: selectedCertainty === 3 ? '#0B1020' : tokens.textMuted,
                        fontWeight: selectedCertainty === 3 ? weights.title : weights.meta,
                      },
                    ]}
                  >
                    🎯 Certeza
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Botão de Confirmação Separado */}
              <TouchableOpacity
                onPress={handleConfirmAnswer}
                disabled={pendingOptionIndex === null}
                activeOpacity={0.85}
                style={[
                  styles.confirmBtn,
                  {
                    backgroundColor:
                      pendingOptionIndex !== null ? tokens.primary : tokens.surface,
                    opacity: pendingOptionIndex !== null ? 1 : 0.6,
                    borderBottomColor: tokens.primaryDark,
                    borderBottomWidth: pendingOptionIndex !== null ? 3 : 0,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.confirmBtnText,
                    {
                      color: pendingOptionIndex !== null ? '#ffffff' : tokens.textMuted,
                    },
                  ]}
                >
                  Confirmar Resposta
                </Text>
                {pendingOptionIndex !== null && (
                  <Ionicons name="checkmark" size={18} color="#ffffff" />
                )}
              </TouchableOpacity>

              {/* Pular questão */}
              <TouchableOpacity
                onPress={onSkip}
                activeOpacity={0.85}
                style={styles.skipBtn}
              >
                <Text style={[styles.skipBtnText, { color: tokens.textMuted }]}>
                  Pular questão
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* FEEDBACK NO MESMO CARD APÓS CONFIRMAR */
            <View style={styles.feedbackSection}>
              {/* BADGE COMEMORATIVO DE COMBO (SEQUÊNCIA DE ACERTOS) */}
              {isAnswered && showComboBanner && comboCount >= 2 && (
                <View
                  style={[
                    styles.comboBannerBox,
                    comboCount >= 5
                      ? styles.comboBannerUnstoppable
                      : comboCount >= 3
                      ? styles.comboBannerFire
                      : styles.comboBannerGood,
                  ]}
                >
                  <View style={styles.comboEmojiCircle}>
                    <Text style={styles.comboEmoji}>
                      {comboCount >= 5 ? '⚡' : '🔥'}
                    </Text>
                  </View>
                  <View style={styles.comboContent}>
                    <View style={styles.comboTitleRow}>
                      <Text style={styles.comboTitleText}>
                        {comboCount >= 5
                          ? `COMBO ${comboCount}x · IMPARÁVEL!`
                          : comboCount >= 3
                          ? `COMBO ${comboCount}x · EM CHAMAS!`
                          : `COMBO ${comboCount}x · SEQUÊNCIA ATIVA!`}
                      </Text>
                      <View style={styles.comboXpBadge}>
                        <Text style={styles.comboXpBadgeText}>
                          {comboCount >= 5 ? '+25 XP' : comboCount >= 3 ? '+15 XP' : '+10 XP'}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.comboDescText}>
                      {comboCount >= 5
                        ? 'Nível cirúrgico das primeiras colocações VUNESP!'
                        : comboCount >= 3
                        ? 'Excelente ritmo de estudo! Mantendo o foco.'
                        : 'Duas seguidas! Continue firme rumo à aprovação.'}
                    </Text>
                  </View>
                </View>
              )}
              {/* Faixa única de feedback */}
              {feedbackTip ? (
                <View
                  style={[
                    styles.feedbackBannerRow,
                    {
                      backgroundColor:
                        selectedOptionIndex === currentQuestion!.correctIndex
                          ? tokens.warningSoft
                          : tokens.dangerSoft,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.feedbackBannerText,
                      {
                        color:
                          selectedOptionIndex === currentQuestion!.correctIndex
                            ? tokens.warning
                            : tokens.danger,
                      },
                    ]}
                  >
                    {feedbackTip}
                  </Text>
                </View>
              ) : selectedOptionIndex === currentQuestion!.correctIndex ? (
                lastClassification === 'lucky_guess' ? (
                  <View style={[styles.feedbackBannerRow, { backgroundColor: tokens.warningSoft }]}>
                    <Text style={[styles.feedbackBannerText, { color: tokens.warning }]}>
                      Acertou sem certeza · agendado para consolidação
                    </Text>
                  </View>
                ) : (
                  <View style={[styles.feedbackBannerRow, { backgroundColor: tokens.successSoft }]}>
                    <Text style={[styles.feedbackBannerText, { color: tokens.success }]}>
                      ✓ Resposta Correta! +10 XP
                    </Text>
                  </View>
                )
              ) : (
                <View style={[styles.feedbackBannerRow, { backgroundColor: tokens.dangerSoft }]}>
                  <Text style={[styles.feedbackBannerText, { color: tokens.danger }]}>
                    ✗ Resposta Incorreta
                  </Text>
                  {lastClassification === 'blind_spot' && (
                    <Text style={[styles.feedbackSubText, { color: tokens.danger }]}>
                      Ponto cego detectado (certeza + erro) · volta amanhã
                    </Text>
                  )}
                </View>
              )}

              {/* RAIO-X / MACETE DA QUESTÃO (DESTAQUE MÁXIMO) */}
              <View
                style={[
                  styles.maceteBox,
                  {
                    backgroundColor: isDark ? 'rgba(245, 158, 11, 0.12)' : '#fffbeb',
                    borderColor: tokens.warning,
                    borderWidth: 1.5,
                  },
                ]}
              >
                <View style={styles.maceteHeader}>
                  <Ionicons name="bulb" size={18} color={tokens.warning} />
                  <Text style={[styles.maceteLabel, { color: tokens.warning }]}>
                    MACETE & RAIO-X DA QUESTÃO
                  </Text>
                </View>
                <Text style={[styles.maceteText, { color: tokens.textPrimary }]}>
                  "{currentQuestion!.raioX}"
                </Text>
                {currentQuestion!.trapAlert && (
                  <View
                    style={[
                      styles.trapAlertInner,
                      {
                        backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#fee2e2',
                        borderColor: tokens.danger,
                      },
                    ]}
                  >
                    <Ionicons name="alert-circle" size={15} color={tokens.danger} />
                    <Text style={[styles.trapAlertInnerText, { color: tokens.danger }]}>
                      Pegadinha da banca: {currentQuestion!.trapAlert}
                    </Text>
                  </View>
                )}
                {currentQuestion!.legalBasis && (
                  <View style={styles.legalBasisRow}>
                    <Ionicons name="book-outline" size={13} color={tokens.textMuted} />
                    <Text style={[styles.legalBasisText, { color: tokens.textMuted }]}>
                      {currentQuestion!.legalBasis}
                    </Text>
                  </View>
                )}
              </View>

              {/* Botão Próxima / Concluir Sessão */}
              <TouchableOpacity
                onPress={onNext}
                activeOpacity={0.85}
                style={[
                  styles.nextBtn,
                  {
                    backgroundColor: isLastQuestion ? tokens.success : tokens.primary,
                  },
                ]}
              >
                <Text style={styles.nextBtnText}>
                  {isLastQuestion ? 'Concluir Sessão' : 'Próxima Questão'}
                </Text>
                <Ionicons
                  name={isLastQuestion ? 'checkmark-circle' : 'arrow-forward'}
                  size={18}
                  color="#ffffff"
                />
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Sessão footer */}
      {!isSessionMode && (
        <View style={styles.sessionFooter}>
          <Text style={[styles.sessionFooterText, { color: tokens.textMuted }]}>
            Sessão: {sessionStats.attempts} respostas · {sessionStats.correct} acertos
          </Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.block,
    paddingBottom: 32,
    gap: spacing.block,
  },
  sessionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  exitBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionHeaderInfo: {
    flex: 1,
    gap: 6,
  },
  sessionHeaderTitle: {
    fontSize: 13,
    fontWeight: weights.meta,
  },
  sessionProgressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  sessionProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  sessionCounterBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  sessionCounterText: {
    fontSize: 13,
    fontWeight: weights.title,
  },
  onboardingCard: {
    padding: 16,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: 12,
  },
  onboardingLines: {
    gap: 6,
  },
  onboardingLine: {
    fontSize: typography.body,
    fontWeight: weights.meta,
    lineHeight: 20,
  },
  onboardingBtn: {
    height: 44,
    borderRadius: radius.control,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  onboardingBtnText: {
    color: '#ffffff',
    fontSize: typography.body,
    fontWeight: weights.title,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  controlsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  controlsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  controlChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  controlChipText: {
    fontSize: typography.caption,
    fontWeight: weights.meta,
  },
  controlIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  maceteQuickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  maceteQuickText: {
    fontSize: 12,
    fontWeight: weights.title,
  },
  categoryScroll: {
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: weights.meta,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressFraction: {
    fontSize: 12,
    fontWeight: weights.meta,
  },
  emptyCard: {
    padding: 32,
    borderRadius: radius.card,
    borderWidth: 1,
    alignItems: 'center',
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: weights.title,
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: typography.body,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyActionBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: radius.control,
    marginTop: 8,
  },
  emptyActionBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: weights.title,
  },
  questionCard: {
    padding: 18,
    borderRadius: radius.card,
    borderWidth: 1.5,
    gap: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  cardMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardMetaLeft: {
    flex: 1,
  },
  cardMetaRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  lapisHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  lapisHeaderBtnText: {
    fontSize: 11,
  },
  studyToolbarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 2,
    gap: 8,
  },
  studyToolbarTools: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  toolbarActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  toolbarActionBtnText: {
    fontSize: 11,
  },
  fontSizePill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  fontSizeBtn: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fontSizeBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
  fontSizeDivider: {
    width: 1,
    height: 12,
  },
  highlighterActiveBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.control,
    borderWidth: 1,
    gap: 8,
  },
  highlighterBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  highlighterActiveBannerText: {
    fontSize: 11,
    fontWeight: weights.title,
  },
  autoPegadinhasBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#b45309',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  autoPegadinhasBtnText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  highlightedWordText: {
    borderRadius: 3,
    paddingHorizontal: 2,
    fontWeight: '700',
  },
  highlighterInteractiveWord: {
    textDecorationLine: 'underline',
    textDecorationStyle: 'dotted',
  },
  comboBannerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: radius.card,
    borderWidth: 1.5,
    gap: 10,
    marginBottom: 6,
  },
  comboBannerGood: {
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    borderColor: '#3b82f6',
  },
  comboBannerFire: {
    backgroundColor: 'rgba(249, 115, 22, 0.14)',
    borderColor: '#f97316',
  },
  comboBannerUnstoppable: {
    backgroundColor: 'rgba(234, 179, 8, 0.16)',
    borderColor: '#eab308',
  },
  comboEmojiCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  comboEmoji: {
    fontSize: 18,
  },
  comboContent: {
    flex: 1,
  },
  comboTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  comboTitleText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#f8fafc',
    letterSpacing: 0.5,
  },
  comboXpBadge: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.pill,
  },
  comboXpBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  comboDescText: {
    fontSize: 11,
    color: '#94a3b8',
    lineHeight: 15,
  },
  lapisActiveBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.control,
    borderWidth: 1,
  },
  lapisActiveBannerText: {
    fontSize: 12,
    fontWeight: weights.title,
  },
  metaBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  difficultyBadgeText: {
    fontSize: 11,
    fontWeight: weights.title,
  },
  metaSubtopicText: {
    fontSize: 12,
    fontWeight: weights.meta,
    flexShrink: 1,
  },
  supportTextBox: {
    padding: 12,
    borderRadius: radius.control,
    borderWidth: 1,
    borderLeftWidth: 4,
    gap: 6,
  },
  supportTextHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  supportTextHeaderTitle: {
    fontSize: 11,
    fontWeight: weights.title,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  supportTextContent: {
    fontSize: 13,
    lineHeight: 20,
  },
  statementBox: {},
  statementText: {
    fontSize: typography.statement,
    fontWeight: weights.statement,
    lineHeight: 26,
    letterSpacing: -0.2,
  },
  optionsList: {
    gap: 10,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    minHeight: 52,
    borderRadius: radius.card,
    gap: 12,
  },
  optionRowSelectedPending: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  optionRowDiscarded: {
    opacity: 0.6,
    borderStyle: 'dashed',
  },
  letterCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letterText: {
    fontSize: 14,
    fontWeight: weights.title,
  },
  optionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: weights.body,
    lineHeight: 22,
  },
  optionRightIcon: {
    marginLeft: 4,
  },
  inlineLapisBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  certaintySection: {
    gap: 12,
    marginTop: 6,
  },
  certaintySectionTitle: {
    fontSize: 12,
    fontWeight: weights.meta,
  },
  certaintySegments: {
    flexDirection: 'row',
    gap: 8,
  },
  certaintySegment: {
    flex: 1,
    minHeight: 44,
    paddingVertical: 10,
    borderRadius: radius.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  certaintyText: {
    fontSize: 13,
    fontWeight: weights.meta,
  },
  confirmBtn: {
    height: 50,
    borderRadius: radius.control,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  confirmBtnText: {
    fontSize: 16,
    fontWeight: weights.title,
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  skipBtnText: {
    fontSize: 13,
    fontWeight: weights.body,
  },
  feedbackSection: {
    gap: 14,
  },
  feedbackBannerRow: {
    padding: 12,
    borderRadius: radius.control,
    gap: 4,
  },
  feedbackBannerText: {
    fontSize: 14,
    fontWeight: weights.title,
  },
  feedbackSubText: {
    fontSize: 12,
  },
  maceteBox: {
    padding: 16,
    borderRadius: radius.control,
    gap: 10,
  },
  maceteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  maceteLabel: {
    fontSize: 12,
    fontWeight: weights.title,
    letterSpacing: 0.5,
  },
  maceteText: {
    fontSize: 14,
    fontWeight: weights.body,
    lineHeight: 21,
    fontStyle: 'italic',
  },
  trapAlertInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  trapAlertInnerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: weights.meta,
    lineHeight: 16,
  },
  legalBasisRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legalBasisText: {
    fontSize: 11,
    lineHeight: 15,
  },
  nextBtn: {
    height: 50,
    borderRadius: radius.control,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  nextBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: weights.title,
  },
  sessionFooter: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  sessionFooterText: {
    fontSize: 12,
  },
});
