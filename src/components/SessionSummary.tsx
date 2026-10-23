import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { triggerLightHaptic } from '../utils/haptics';
import { radius, typography, weights, spacing } from '../theme/tokens';

export interface SessionSummaryData {
  attempts: number;
  correct: number;
  errors: number;
  xpGained: number;
  accuracy: number;
  errorTopics: Array<{ topic: string; count: number }>;
}

export interface SessionSummaryProps {
  data: SessionSummaryData;
  streak: number;
  dailyGoal: number;
  questionsToday: number;
  onContinue: () => void;
  onReviewErrors?: () => void;
  onGoHome: () => void;
  tokens: any;
  isDark: boolean;
}

export const SessionSummary: React.FC<SessionSummaryProps> = ({
  data,
  streak,
  dailyGoal,
  questionsToday,
  onContinue,
  onReviewErrors,
  onGoHome,
  tokens,
  isDark,
}) => {
  const isPerfect = data.attempts > 0 && data.correct === data.attempts;
  const isGood = data.accuracy >= 70;

  const goalPercent = Math.min(100, Math.round((questionsToday / Math.max(1, dailyGoal)) * 100));

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { backgroundColor: tokens.bg }]}
      showsVerticalScrollIndicator={false}
    >
      {/* CARD PRINCIPAL COMEMORATIVO */}
      <View
        style={[
          styles.heroCard,
          {
            backgroundColor: tokens.cardBg,
            borderColor: isPerfect ? tokens.warning : tokens.cardBorder,
          },
        ]}
      >
        <View
          style={[
            styles.iconCircle,
            {
              backgroundColor: isPerfect
                ? 'rgba(245, 158, 11, 0.15)'
                : isGood
                ? 'rgba(22, 163, 74, 0.15)'
                : 'rgba(37, 99, 235, 0.15)',
            },
          ]}
        >
          <Ionicons
            name={isPerfect ? 'trophy' : isGood ? 'ribbon' : 'checkmark-done'}
            size={48}
            color={isPerfect ? tokens.warning : isGood ? tokens.success : tokens.primary}
          />
        </View>

        <Text style={[styles.heroTitle, { color: tokens.textPrimary }]}>
          {isPerfect
            ? 'Desempenho Impecável!'
            : isGood
            ? 'Excelente Sessão!'
            : 'Sessão Concluída!'}
        </Text>

        <Text style={[styles.heroSubtitle, { color: tokens.textMuted }]}>
          {isPerfect
            ? 'Você gabaritou todas as questões desta rodada de treino.'
            : isGood
            ? 'Consistência e precisão rumo à posse na VUNESP.'
            : 'Cada questão resolvida consolida seu aprendizado.'}
        </Text>

        {/* BADGE DE XP */}
        <View
          style={[
            styles.xpBadge,
            {
              backgroundColor: isDark ? 'rgba(245, 158, 11, 0.2)' : '#fef3c7',
              borderColor: tokens.warning,
            },
          ]}
        >
          <Ionicons name="sparkles" size={20} color={tokens.warning} />
          <Text style={[styles.xpText, { color: tokens.warning }]}>
            +{data.xpGained} XP Conquistados
          </Text>
        </View>
      </View>

      {/* GRADE DE MÉTRICAS */}
      <View style={styles.metricsGrid}>
        {/* Taxa de Acerto */}
        <View
          style={[
            styles.metricCard,
            { backgroundColor: tokens.cardBg, borderColor: tokens.cardBorder },
          ]}
        >
          <Text style={[styles.metricLabel, { color: tokens.textMuted }]}>Taxa de Acerto</Text>
          <Text
            style={[
              styles.metricValue,
              { color: isGood ? tokens.success : tokens.warning },
            ]}
          >
            {Math.round(data.accuracy)}%
          </Text>
          <Text style={[styles.metricSub, { color: tokens.textMuted }]}>
            {data.correct} de {data.attempts} corretas
          </Text>
        </View>

        {/* Sequência Atual */}
        <View
          style={[
            styles.metricCard,
            { backgroundColor: tokens.cardBg, borderColor: tokens.cardBorder },
          ]}
        >
          <Text style={[styles.metricLabel, { color: tokens.textMuted }]}>Sequência Ativa</Text>
          <View style={styles.streakRow}>
            <Text style={styles.fireEmoji}>🔥</Text>
            <Text style={[styles.metricValue, { color: tokens.warning }]}>{streak}</Text>
          </View>
          <Text style={[styles.metricSub, { color: tokens.textMuted }]}>
            {streak > 1 ? `${streak} dias consecutivos` : '1º dia de foco'}
          </Text>
        </View>
      </View>

      {/* META DIÁRIA */}
      <View
        style={[
          styles.goalCard,
          { backgroundColor: tokens.cardBg, borderColor: tokens.cardBorder },
        ]}
      >
        <View style={styles.goalHeader}>
          <View style={styles.goalTitleRow}>
            <Ionicons name="flag" size={18} color={tokens.primary} />
            <Text style={[styles.goalTitle, { color: tokens.textPrimary }]}>
              Meta Diária de Questões
            </Text>
          </View>
          <Text style={[styles.goalFraction, { color: tokens.textMuted }]}>
            {questionsToday} / {dailyGoal}
          </Text>
        </View>

        <View style={[styles.progressTrack, { backgroundColor: tokens.surface }]}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${goalPercent}%`,
                backgroundColor: goalPercent >= 100 ? tokens.success : tokens.primary,
              },
            ]}
          />
        </View>

        <Text style={[styles.goalComment, { color: tokens.textMuted }]}>
          {goalPercent >= 100
            ? '🎉 Parabéns! Meta do dia atingida com sucesso!'
            : `Faltam apenas ${Math.max(0, dailyGoal - questionsToday)} questões para cumprir sua meta hoje.`}
        </Text>
      </View>

      {/* TÓPICOS PARA ATENÇÃO (SE HOUVE ERROS) */}
      {data.errorTopics.length > 0 && (
        <View
          style={[
            styles.topicsCard,
            { backgroundColor: tokens.cardBg, borderColor: tokens.cardBorder },
          ]}
        >
          <View style={styles.topicsHeader}>
            <Ionicons name="alert-circle" size={18} color={tokens.danger} />
            <Text style={[styles.topicsTitle, { color: tokens.textPrimary }]}>
              Tópicos para Revisão
            </Text>
          </View>
          <Text style={[styles.topicsSubtitle, { color: tokens.textMuted }]}>
            Questões erradas foram enviadas para o SRS e retornarão no momento ideal.
          </Text>

          <View style={styles.topicsList}>
            {data.errorTopics.map((item, index) => (
              <View
                key={`${item.topic}-${index}`}
                style={[
                  styles.topicRow,
                  { backgroundColor: tokens.surface, borderColor: tokens.cardBorder },
                ]}
              >
                <Text
                  style={[styles.topicName, { color: tokens.textPrimary }]}
                  numberOfLines={1}
                >
                  {item.topic}
                </Text>
                <View style={[styles.topicBadge, { backgroundColor: tokens.dangerSoft }]}>
                  <Text style={[styles.topicBadgeText, { color: tokens.danger }]}>
                    {item.count} {item.count === 1 ? 'erro' : 'erros'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* BOTÕES DE AÇÃO */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          onPress={() => {
            triggerLightHaptic();
            onContinue();
          }}
          activeOpacity={0.85}
          style={[styles.primaryBtn, { backgroundColor: tokens.primary }]}
        >
          <Text style={styles.primaryBtnText}>Próxima Sessão</Text>
          <Ionicons name="arrow-forward" size={18} color="#ffffff" />
        </TouchableOpacity>

        {data.errors > 0 && onReviewErrors && (
          <TouchableOpacity
            onPress={() => {
              triggerLightHaptic();
              onReviewErrors();
            }}
            activeOpacity={0.85}
            style={[
              styles.secondaryBtn,
              {
                backgroundColor: tokens.dangerSoft,
                borderColor: tokens.danger,
              },
            ]}
          >
            <Ionicons name="refresh-circle" size={18} color={tokens.danger} />
            <Text style={[styles.secondaryBtnText, { color: tokens.danger }]}>
              Revisar Erros Agora ({data.errors})
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={() => {
            triggerLightHaptic();
            onGoHome();
          }}
          activeOpacity={0.85}
          style={[
            styles.outlineBtn,
            { backgroundColor: tokens.cardBg, borderColor: tokens.cardBorder },
          ]}
        >
          <Ionicons name="home-outline" size={18} color={tokens.textPrimary} />
          <Text style={[styles.outlineBtnText, { color: tokens.textPrimary }]}>
            Voltar ao Início
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.block,
    paddingBottom: 40,
    gap: 16,
  },
  heroCard: {
    padding: 24,
    borderRadius: radius.card,
    borderWidth: 1.5,
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: weights.title,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: typography.body,
    fontWeight: weights.body,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  xpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    marginTop: 4,
  },
  xpText: {
    fontSize: 15,
    fontWeight: weights.title,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    padding: 16,
    borderRadius: radius.card,
    borderWidth: 1,
    alignItems: 'center',
    gap: 4,
  },
  metricLabel: {
    fontSize: typography.caption,
    fontWeight: weights.meta,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  fireEmoji: {
    fontSize: 22,
  },
  metricValue: {
    fontSize: 26,
    fontWeight: weights.title,
  },
  metricSub: {
    fontSize: typography.caption,
    fontWeight: weights.body,
    marginTop: 2,
  },
  goalCard: {
    padding: 18,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: 12,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  goalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  goalTitle: {
    fontSize: typography.body,
    fontWeight: weights.title,
  },
  goalFraction: {
    fontSize: typography.caption,
    fontWeight: weights.meta,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  goalComment: {
    fontSize: typography.caption,
    fontWeight: weights.body,
    lineHeight: 18,
  },
  topicsCard: {
    padding: 18,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: 10,
  },
  topicsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  topicsTitle: {
    fontSize: typography.body,
    fontWeight: weights.title,
  },
  topicsSubtitle: {
    fontSize: typography.caption,
    lineHeight: 16,
  },
  topicsList: {
    gap: 8,
    marginTop: 4,
  },
  topicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radius.control,
    borderWidth: 1,
  },
  topicName: {
    flex: 1,
    fontSize: 13,
    fontWeight: weights.body,
    marginRight: 8,
  },
  topicBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  topicBadgeText: {
    fontSize: 11,
    fontWeight: weights.meta,
  },
  actionButtons: {
    gap: 10,
    marginTop: 8,
  },
  primaryBtn: {
    height: 52,
    borderRadius: radius.control,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: weights.title,
  },
  secondaryBtn: {
    height: 48,
    borderRadius: radius.control,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: weights.title,
  },
  outlineBtn: {
    height: 48,
    borderRadius: radius.control,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
  },
  outlineBtnText: {
    fontSize: 14,
    fontWeight: weights.body,
  },
});
