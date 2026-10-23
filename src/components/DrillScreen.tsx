import React, { useRef, useEffect } from 'react';
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
}) => {
  // Cronômetro de tempo gasto na questão
  const questionStartTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    questionStartTimeRef.current = Date.now();
  }, [currentQuestion?.id, currentIndex]);

  const handleSelectOption = (idx: number) => {
    const tempoGastoMs = Math.max(0, Date.now() - questionStartTimeRef.current);
    onAnswer(idx, tempoGastoMs);
  };

  const progressRatio =
    filteredQuestions.length > 0 ? (currentIndex + 1) / filteredQuestions.length : 0;

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

      {/* 4. Barra de progresso de 3px com fração meta 12 à direita */}
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
          {/* Header do Card: Subtópico + Dificuldade à esquerda, Estrela de favorito à direita (22px) */}
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

          {/* Alternativas: linhas com letra em círculo de 28. Sem chevron */}
          <View style={styles.optionsList}>
            {currentQuestion!.options.map((option, idx) => {
              const letter = String.fromCharCode(65 + idx);
              const isSelected = selectedOptionIndex === idx;
              const isCorrectOption = idx === currentQuestion!.correctIndex;

              let optBg = tokens.cardBg;
              let optBorder = tokens.cardBorder;

              if (!isAnswered) {
                if (isSelected) {
                  optBg = tokens.primarySoft;
                  optBorder = tokens.primary;
                }
              } else {
                if (isCorrectOption) {
                  optBg = tokens.successSoft;
                  optBorder = tokens.success;
                } else if (isSelected && !isCorrectOption) {
                  optBg = tokens.dangerSoft;
                  optBorder = tokens.danger;
                }
              }

              return (
                <TouchableOpacity
                  key={option}
                  onPress={() => {
                    if (!isAnswered) handleSelectOption(idx);
                  }}
                  disabled={isAnswered}
                  activeOpacity={0.85}
                  style={[
                    styles.optionRow,
                    {
                      backgroundColor: optBg,
                      borderColor: optBorder,
                    },
                  ]}
                >
                  <View style={[styles.letterCircle, { backgroundColor: tokens.surface }]}>
                    <Text style={[styles.letterText, { color: tokens.textPrimary }]}>
                      {letter}
                    </Text>
                  </View>
                  <Text style={[styles.optionText, { color: tokens.textPrimary }]}>
                    {option}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Bloco de Certeza (fica abaixo das alternativas e some após responder) */}
          {!isAnswered ? (
            <View style={styles.certaintySection}>
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
                    Chute
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
                    Dúvida
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
                    Certeza
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Pular é texto 14 textMuted, sem botão preenchido */}
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
            /* FEEDBACK NO MESMO CARD */
            <View style={styles.feedbackSection}>
              {/* Faixa única de 1 linha */}
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
                      Acertou sem certeza
                    </Text>
                  </View>
                ) : (
                  <View style={[styles.feedbackBannerRow, { backgroundColor: tokens.successSoft }]}>
                    <Text style={[styles.feedbackBannerText, { color: tokens.success }]}>
                      Certa
                    </Text>
                  </View>
                )
              ) : (
                <View style={[styles.feedbackBannerRow, { backgroundColor: tokens.dangerSoft }]}>
                  <Text style={[styles.feedbackBannerText, { color: tokens.danger }]}>
                    Errada
                  </Text>
                  {lastClassification === 'blind_spot' && (
                    <Text style={[styles.feedbackSubText, { color: tokens.danger }]}>
                      Ponto cego · volta amanhã
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
                  <Ionicons name="bulb" size={17} color={tokens.warning} />
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

              {/* Botão Próxima: full-width, 48 de altura, primary, radius 12, texto "Próxima" */}
              <TouchableOpacity
                onPress={onNext}
                activeOpacity={0.85}
                style={[styles.nextBtn, { backgroundColor: tokens.primary }]}
              >
                <Text style={styles.nextBtnText}>Próxima</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Sessão footer */}
      <View style={styles.sessionFooter}>
        <Text style={[styles.sessionFooterText, { color: tokens.textMuted }]}>
          Sessão: {sessionStats.attempts} respostas · {sessionStats.correct} acertos
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.block,
    paddingBottom: 24,
    gap: spacing.block,
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
    height: 32,
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
    height: 32,
    paddingHorizontal: 10,
    borderRadius: radius.chip,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlChipText: {
    fontSize: typography.meta,
    fontWeight: weights.meta,
  },
  controlIconBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.chip,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryScroll: {
    height: 32,
    alignItems: 'center',
    gap: 6,
  },
  categoryPill: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: radius.chip,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryPillText: {
    fontSize: typography.meta,
    fontWeight: weights.meta,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  progressTrack: {
    flex: 1,
    height: 3,
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  progressFill: {
    height: 3,
    borderRadius: 1.5,
  },
  progressFraction: {
    fontSize: typography.meta,
    fontWeight: weights.meta,
  },
  questionCard: {
    borderRadius: radius.card,
    borderWidth: 1,
    padding: 16,
    gap: spacing.block,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardMetaLeft: {
    flex: 1,
  },
  metaText: {
    fontSize: typography.meta,
    fontWeight: weights.meta,
  },
  supportTextBox: {
    padding: 10,
    borderRadius: radius.chip,
    borderWidth: 1,
  },
  supportTextContent: {
    fontSize: typography.meta,
    fontWeight: weights.meta,
    lineHeight: 18,
  },
  statementBox: {
    //
  },
  statementText: {
    fontSize: typography.statement,
    fontWeight: weights.title,
    lineHeight: 28,
  },
  optionsList: {
    gap: 8,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radius.control,
    borderWidth: 1.5,
  },
  letterCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letterText: {
    fontSize: typography.body,
    fontWeight: weights.number,
  },
  optionText: {
    fontSize: typography.option,
    fontWeight: weights.meta,
    flex: 1,
    marginLeft: 10,
  },
  certaintySection: {
    marginTop: 4,
    gap: 10,
  },
  certaintySegments: {
    flexDirection: 'row',
    height: 40,
    gap: 8,
  },
  certaintySegment: {
    flex: 1,
    height: 40,
    borderRadius: radius.chip,
    alignItems: 'center',
    justifyContent: 'center',
  },
  certaintyText: {
    fontSize: typography.body,
    fontWeight: weights.title,
  },
  skipBtn: {
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipBtnText: {
    fontSize: typography.body,
    fontWeight: weights.meta,
  },
  feedbackSection: {
    gap: 10,
    marginTop: 4,
  },
  feedbackBannerRow: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: radius.chip,
  },
  feedbackBannerText: {
    fontSize: typography.body,
    fontWeight: weights.title,
  },
  feedbackSubText: {
    fontSize: typography.meta,
    fontWeight: weights.meta,
    marginTop: 2,
  },
  maceteQuickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    height: 32,
    borderRadius: radius.chip,
    borderWidth: 1,
  },
  maceteQuickText: {
    fontSize: typography.meta,
    fontWeight: weights.title,
  },
  maceteBox: {
    padding: 12,
    borderRadius: radius.card,
    gap: 4,
  },
  maceteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  maceteLabel: {
    fontSize: 12,
    fontWeight: weights.title,
    letterSpacing: 0.5,
  },
  maceteText: {
    fontSize: typography.body,
    fontWeight: weights.title,
    lineHeight: 21,
  },
  trapAlertInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 6,
  },
  trapAlertInnerText: {
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  legalBasisRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
  },
  legalBasisText: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  nextBtn: {
    height: 48,
    borderRadius: radius.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextBtnText: {
    color: '#ffffff',
    fontSize: typography.body,
    fontWeight: weights.title,
  },
  sessionFooter: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  sessionFooterText: {
    fontSize: typography.meta,
    fontWeight: weights.meta,
  },
  emptyCard: {
    borderRadius: radius.card,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyTitle: {
    fontSize: typography.option,
    fontWeight: weights.title,
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: typography.body,
    fontWeight: weights.meta,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyActionBtn: {
    height: 40,
    paddingHorizontal: 16,
    borderRadius: radius.control,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  emptyActionBtnText: {
    color: '#ffffff',
    fontSize: typography.body,
    fontWeight: weights.title,
  },
});
