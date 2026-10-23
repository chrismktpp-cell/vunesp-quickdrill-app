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
import { aprovaFoxColors, radius, typography, weights, spacing } from '../theme/aprovafox';
import { MascotCelebration } from './MascotCelebration';

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
  tokens?: any;
  isDark?: boolean;
}

export const SessionSummary: React.FC<SessionSummaryProps> = ({
  data,
  streak,
  dailyGoal,
  questionsToday,
  onContinue,
  onReviewErrors,
  onGoHome,
}) => {
  const isPerfect = data.attempts > 0 && data.correct === data.attempts;
  const isGood = data.accuracy >= 70;

  const goalPercent = Math.min(100, Math.round((questionsToday / Math.max(1, dailyGoal)) * 100));

  const celebrationTitle = isPerfect
    ? 'Desempenho Impecável!'
    : isGood
    ? 'Excelente Sessão!'
    : 'Sessão Concluída!';

  const celebrationSub = isPerfect
    ? 'Você gabaritou todas as questões desta rodada estratégica da AprovaFox.'
    : isGood
    ? 'Consistência e precisão rumo à posse no concurso público.'
    : 'Cada questão resolvida consolida seu aprendizado e avança seu SRS.';

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. MASCOTE CELEBRATION */}
      <MascotCelebration
        titulo={celebrationTitle}
        subtitulo={celebrationSub}
        isPerfect={isPerfect}
      />

      {/* BADGE DE XP GANHO */}
      <View style={styles.xpCard}>
        <View style={styles.xpBadge}>
          <Ionicons name="sparkles" size={22} color={aprovaFoxColors.amber} />
          <Text style={styles.xpText}>+{data.xpGained} XP Conquistados</Text>
        </View>
        {isPerfect && (
          <Text style={styles.bonusTag}>Inclui bônus de +25 XP por gabaritar a sessão!</Text>
        )}
      </View>

      {/* 2. GRADE DE MÉTRICAS */}
      <View style={styles.metricsGrid}>
        {/* Taxa de Acerto */}
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Taxa de Acerto</Text>
          <Text
            style={[
              styles.metricValue,
              { color: isGood ? aprovaFoxColors.success : aprovaFoxColors.amber },
            ]}
          >
            {Math.round(data.accuracy)}%
          </Text>
          <Text style={styles.metricSub}>
            {data.correct} de {data.attempts} corretas
          </Text>
        </View>

        {/* Sequência Atual */}
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Sequência Ativa</Text>
          <View style={styles.streakRow}>
            <Ionicons name="flame" size={22} color={aprovaFoxColors.amber} />
            <Text style={[styles.metricValue, { color: aprovaFoxColors.amber }]}>{streak}</Text>
          </View>
          <Text style={styles.metricSub}>
            {streak > 1 ? `${streak} dias consecutivos` : '1º dia de foco'}
          </Text>
        </View>
      </View>

      {/* 3. META DIÁRIA */}
      <View style={styles.goalCard}>
        <View style={styles.goalHeader}>
          <View style={styles.goalTitleRow}>
            <Ionicons name="flag" size={17} color={aprovaFoxColors.violet} />
            <Text style={styles.goalTitle}>Meta Diária de Questões</Text>
          </View>
          <Text style={styles.goalFraction}>
            {questionsToday} / {dailyGoal}
          </Text>
        </View>

        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${goalPercent}%`,
                backgroundColor: goalPercent >= 100 ? aprovaFoxColors.success : aprovaFoxColors.violet,
              },
            ]}
          />
        </View>

        <Text style={styles.goalComment}>
          {goalPercent >= 100
            ? '🎉 Parabéns! Meta de hoje cumprida com louvor pela AprovaFox!'
            : `Faltam ${Math.max(0, dailyGoal - questionsToday)} questões para cumprir sua meta hoje.`}
        </Text>
      </View>

      {/* 4. TÓPICOS PARA REVISÃO (SE HOUVE ERROS) */}
      {data.errorTopics.length > 0 && (
        <View style={styles.topicsCard}>
          <View style={styles.topicsHeader}>
            <Ionicons name="alert-circle" size={18} color={aprovaFoxColors.danger} />
            <Text style={styles.topicsTitle}>Tópicos para Revisão (SRS)</Text>
          </View>
          <Text style={styles.topicsSubtitle}>
            As questões erradas foram enviadas para o SRS e retornarão no intervalo de repetição ideal.
          </Text>

          <View style={styles.topicsList}>
            {data.errorTopics.map((item, index) => (
              <View key={`${item.topic}-${index}`} style={styles.topicRow}>
                <Text style={styles.topicName} numberOfLines={1}>
                  {item.topic}
                </Text>
                <View style={styles.topicBadge}>
                  <Text style={styles.topicBadgeText}>
                    {item.count} {item.count === 1 ? 'erro' : 'erros'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* 5. BOTÕES DE AÇÃO */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          onPress={() => {
            triggerLightHaptic();
            onContinue();
          }}
          activeOpacity={0.88}
          style={styles.primaryBtn}
        >
          <Text style={styles.primaryBtnText}>Próxima Sessão</Text>
          <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
        </TouchableOpacity>

        {data.errors > 0 && onReviewErrors && (
          <TouchableOpacity
            onPress={() => {
              triggerLightHaptic();
              onReviewErrors();
            }}
            activeOpacity={0.88}
            style={styles.secondaryBtn}
          >
            <Ionicons name="refresh-circle" size={18} color={aprovaFoxColors.danger} />
            <Text style={styles.secondaryBtnText}>
              Revisar Erros da Rodada ({data.errors})
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={() => {
            triggerLightHaptic();
            onGoHome();
          }}
          activeOpacity={0.88}
          style={styles.outlineBtn}
        >
          <Ionicons name="home-outline" size={17} color={aprovaFoxColors.text} />
          <Text style={styles.outlineBtnText}>Voltar ao Início</Text>
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
    backgroundColor: aprovaFoxColors.night,
  },
  xpCard: {
    backgroundColor: aprovaFoxColors.surface,
    borderColor: aprovaFoxColors.amber,
    borderWidth: 1.5,
    borderRadius: radius.card,
    padding: spacing.md,
    alignItems: 'center',
    gap: 6,
  },
  xpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  xpText: {
    fontSize: 18,
    fontWeight: weights.display,
    color: aprovaFoxColors.amber,
  },
  bonusTag: {
    fontSize: 11,
    fontWeight: weights.meta,
    color: aprovaFoxColors.amberLight,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: aprovaFoxColors.surface,
    borderColor: aprovaFoxColors.border,
    borderWidth: 1.5,
    borderRadius: radius.card,
    padding: 16,
    alignItems: 'center',
    gap: 4,
  },
  metricLabel: {
    fontSize: typography.caption,
    fontWeight: weights.meta,
    color: aprovaFoxColors.textMuted,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metricValue: {
    fontSize: 26,
    fontWeight: weights.display,
  },
  metricSub: {
    fontSize: typography.caption,
    fontWeight: weights.meta,
    color: aprovaFoxColors.textSecondary,
    marginTop: 2,
  },
  goalCard: {
    backgroundColor: aprovaFoxColors.surface,
    borderColor: aprovaFoxColors.border,
    borderWidth: 1.5,
    borderRadius: radius.card,
    padding: spacing.md,
    gap: 10,
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
    fontSize: typography.label,
    fontWeight: weights.title,
    color: aprovaFoxColors.text,
  },
  goalFraction: {
    fontSize: typography.caption,
    fontWeight: weights.meta,
    color: aprovaFoxColors.textSecondary,
  },
  progressTrack: {
    height: 7,
    backgroundColor: aprovaFoxColors.nightElevated,
    borderRadius: 3.5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3.5,
  },
  goalComment: {
    fontSize: 12,
    fontWeight: weights.meta,
    color: aprovaFoxColors.textMuted,
    lineHeight: 16,
  },
  topicsCard: {
    backgroundColor: aprovaFoxColors.surface,
    borderColor: aprovaFoxColors.border,
    borderWidth: 1.5,
    borderRadius: radius.card,
    padding: spacing.md,
    gap: 10,
  },
  topicsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  topicsTitle: {
    fontSize: typography.label,
    fontWeight: weights.title,
    color: aprovaFoxColors.text,
  },
  topicsSubtitle: {
    fontSize: 11,
    color: aprovaFoxColors.textSecondary,
    lineHeight: 15,
  },
  topicsList: {
    gap: 8,
    marginTop: 4,
  },
  topicRow: {
    backgroundColor: aprovaFoxColors.nightElevated,
    borderColor: aprovaFoxColors.border,
    borderWidth: 1,
    borderRadius: radius.control,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topicName: {
    flex: 1,
    fontSize: 12,
    fontWeight: weights.meta,
    color: aprovaFoxColors.text,
    marginRight: 8,
  },
  topicBadge: {
    backgroundColor: aprovaFoxColors.dangerSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  topicBadgeText: {
    fontSize: 11,
    fontWeight: weights.meta,
    color: aprovaFoxColors.danger,
  },
  actionButtons: {
    gap: 10,
    marginTop: 6,
  },
  primaryBtn: {
    height: 50,
    backgroundColor: aprovaFoxColors.violet,
    borderRadius: radius.control,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: aprovaFoxColors.violet,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 3,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: weights.title,
  },
  secondaryBtn: {
    height: 46,
    backgroundColor: aprovaFoxColors.dangerSoft,
    borderColor: aprovaFoxColors.danger,
    borderWidth: 1,
    borderRadius: radius.control,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryBtnText: {
    color: aprovaFoxColors.danger,
    fontSize: 13,
    fontWeight: weights.title,
  },
  outlineBtn: {
    height: 46,
    backgroundColor: aprovaFoxColors.surface,
    borderColor: aprovaFoxColors.border,
    borderWidth: 1,
    borderRadius: radius.control,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  outlineBtnText: {
    color: aprovaFoxColors.text,
    fontSize: 13,
    fontWeight: weights.meta,
  },
});
