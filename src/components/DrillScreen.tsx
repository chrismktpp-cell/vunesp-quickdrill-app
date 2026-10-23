import React, { useRef, useEffect, useState } from 'react';
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
import { triggerLightHaptic } from '../utils/haptics';
import { radius, typography, weights, spacing } from '../theme/tokens';

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

  useEffect(() => {
    questionStartTimeRef.current = Date.now();
    setPendingOptionIndex(null);
  }, [currentQuestion?.id, currentIndex]);

  const handleSelectPendingOption = (idx: number) => {
    if (isAnswered) return;
    triggerLightHaptic();
    setPendingOptionIndex(idx);
  };

  const handleConfirmAnswer = () => {
    if (pendingOptionIndex === null || isAnswered) return;
    const tempoGastoMs = Math.max(0, Date.now() - questionStartTimeRef.current);
    onAnswer(pendingOptionIndex, tempoGastoMs);
  };

  const progressRatio =
    filteredQuestions.length > 0 ? (currentIndex + 1) / filteredQuestions.length : 0;

  const isLastQuestion =
    filteredQuestions.length > 0 && currentIndex === filteredQuestions.length - 1;

  // Render text statement com destaque para lacuna [ ? ]
  const renderStatement = (text: string) => {
    const parts = text.split('_____');
    if (parts.length === 1) {
      return (
        <Text style={[styles.statementText, { color: tokens.textPrimary }]}>
          {text}
        </Text>
      );
    }
    return (
      <Text style={[styles.statementText, { color: tokens.textPrimary }]}>
        {parts[0]}
        <Text style={{ color: tokens.primary, fontWeight: weights.title }}>[ ? ]</Text>
        {parts.slice(1).join('_____')}
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
          {/* Header do Card: Subtópico + Dificuldade à esquerda, Estrela de favorito à direita */}
          <View style={styles.cardMetaRow}>
            <View style={styles.cardMetaLeft}>
              <Text style={[styles.metaText, { color: tokens.textMuted }]}>
                {currentQuestion!.subtopic} · {currentQuestion!.difficulty}
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => onToggleFavorite(currentQuestion!.id)}
              activeOpacity={0.85}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={isCurrentFavorite ? 'star' : 'star-outline'}
                size={22}
                color={isCurrentFavorite ? tokens.warning : tokens.textMuted}
              />
            </TouchableOpacity>
          </View>

          {/* Texto de Apoio (se houver) */}
          {currentQuestion!.supportText && (
            <View
              style={[
                styles.supportTextBox,
                { backgroundColor: tokens.surface, borderColor: tokens.cardBorder },
              ]}
            >
              <Text style={[styles.supportTextContent, { color: tokens.textMuted }]}>
                {currentQuestion!.supportText}
              </Text>
            </View>
          )}

          {/* Enunciado 20/600, lineHeight 28. A lacuna [ ? ] usa primary */}
          <View style={styles.statementBox}>
            {renderStatement(currentQuestion!.statement)}
          </View>

          {/* Alternativas em botões grandes e táteis com 4 estados distintos */}
          <View style={styles.optionsList}>
            {currentQuestion!.options.map((option, idx) => {
              const letter = String.fromCharCode(65 + idx);
              const isConfirmed = isAnswered;
              const isSelectedPending = pendingOptionIndex === idx;
              const isConfirmedSelected = selectedOptionIndex === idx;
              const isCorrectOption = idx === currentQuestion!.correctIndex;

              let optBg = tokens.cardBg;
              let optBorder = tokens.cardBorder;
              let optBorderWidth = 1;
              let letterBg = tokens.surface;
              let letterColor = tokens.textPrimary;
              let rightIcon: any = null;

              if (!isConfirmed) {
                // Estado 1: Não selecionado (default)
                // Estado 2: Selecionado pré-confirmação
                if (isSelectedPending) {
                  optBg = isDark ? 'rgba(37, 99, 235, 0.15)' : '#eff6ff';
                  optBorder = tokens.primary;
                  optBorderWidth = 2;
                  letterBg = tokens.primary;
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
                  letterColor = '#ffffff';
                  rightIcon = <Ionicons name="checkmark-circle" size={20} color={tokens.success} />;
                } else if (isConfirmedSelected && !isCorrectOption) {
                  optBg = tokens.dangerSoft;
                  optBorder = tokens.danger;
                  optBorderWidth = 2;
                  letterBg = tokens.danger;
                  letterColor = '#ffffff';
                  rightIcon = <Ionicons name="close-circle" size={20} color={tokens.danger} />;
                }
              }

              return (
                <TouchableOpacity
                  key={option}
                  onPress={() => handleSelectPendingOption(idx)}
                  disabled={isAnswered}
                  activeOpacity={0.85}
                  style={[
                    styles.optionRow,
                    {
                      backgroundColor: optBg,
                      borderColor: optBorder,
                      borderWidth: optBorderWidth,
                    },
                  ]}
                >
                  <View style={[styles.letterCircle, { backgroundColor: letterBg }]}>
                    <Text style={[styles.letterText, { color: letterColor }]}>
                      {letter}
                    </Text>
                  </View>
                  <Text style={[styles.optionText, { color: tokens.textPrimary }]}>
                    {option}
                  </Text>
                  {rightIcon && <View style={styles.optionRightIcon}>{rightIcon}</View>}
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
                      ? { backgroundColor: tokens.warning }
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
                      { color: selectedCertainty === 1 ? '#ffffff' : tokens.textMuted },
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
                      ? { backgroundColor: tokens.primary }
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
                      { color: selectedCertainty === 2 ? '#ffffff' : tokens.textMuted },
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
                      ? { backgroundColor: tokens.success }
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
                      { color: selectedCertainty === 3 ? '#ffffff' : tokens.textMuted },
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
    borderWidth: 1,
    gap: 16,
  },
  cardMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardMetaLeft: {
    flex: 1,
  },
  metaText: {
    fontSize: typography.caption,
    fontWeight: weights.meta,
  },
  supportTextBox: {
    padding: 12,
    borderRadius: radius.control,
    borderWidth: 1,
  },
  supportTextContent: {
    fontSize: typography.caption,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  statementBox: {},
  statementText: {
    fontSize: typography.statement,
    fontWeight: weights.statement,
    lineHeight: typography.statementLineHeight,
  },
  optionsList: {
    gap: 10,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: radius.card,
    gap: 12,
  },
  letterCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
