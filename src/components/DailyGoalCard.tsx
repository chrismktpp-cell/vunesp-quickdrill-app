import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { aprovaFoxColors, radius, weights, spacing, typography } from '../theme/aprovafox';

export interface DailyGoalCardProps {
  questoesHoje: number;
  metaDiaria: number;
  isDark?: boolean;
  tokens?: any;
  compact?: boolean;
}

export const DailyGoalCard: React.FC<DailyGoalCardProps> = ({
  questoesHoje,
  metaDiaria,
  isDark = true,
  tokens,
  compact = false,
}) => {
  const meta = Math.max(1, metaDiaria);
  const atual = Math.max(0, questoesHoje);
  const percentual = Math.min(100, Math.round((atual / meta) * 100));
  const concluida = atual >= meta;

  const cardBg = tokens?.cardBg || (isDark ? aprovaFoxColors.surface : '#ffffff');
  const cardBorder = tokens?.cardBorder || (isDark ? aprovaFoxColors.border : '#e2e8f0');
  const textColor = tokens?.textPrimary || (isDark ? aprovaFoxColors.text : '#0f172a');
  const textMuted = tokens?.textMuted || (isDark ? aprovaFoxColors.textMuted : '#64748b');
  const trackBg = isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0';

  if (compact) {
    return (
      <View style={[styles.cardCompact, { backgroundColor: cardBg, borderColor: cardBorder }]}>
        <View style={styles.compactTopRow}>
          <View style={[styles.iconCircleCompact, concluida && styles.iconCircleSuccessCompact]}>
            <Ionicons
              name={concluida ? 'checkmark-circle' : 'flag'}
              size={18}
              color={concluida ? aprovaFoxColors.success : aprovaFoxColors.violet}
            />
          </View>
          <View style={styles.fractionRowCompact}>
            <Text
              style={[
                styles.fractionActiveCompact,
                { color: concluida ? aprovaFoxColors.success : textColor },
              ]}
            >
              {atual}
            </Text>
            <Text style={[styles.fractionMetaCompact, { color: textMuted }]}>/{meta}</Text>
          </View>
        </View>

        <Text style={[styles.titleCompact, { color: textColor }]}>Meta Diária</Text>

        <View style={[styles.trackCompact, { backgroundColor: trackBg }]}>
          <View
            style={[
              styles.fillCompact,
              {
                width: `${percentual}%`,
                backgroundColor: concluida ? aprovaFoxColors.success : aprovaFoxColors.violet,
              },
            ]}
          />
        </View>

        <Text
          style={[styles.commentCompact, { color: concluida ? aprovaFoxColors.success : textMuted }]}
          numberOfLines={1}
        >
          {concluida ? 'Concluída! 🎉' : `Faltam ${meta - atual} Qs`}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <View style={[styles.iconCircle, concluida && styles.iconCircleSuccess]}>
            <Ionicons
              name={concluida ? 'checkmark-circle' : 'flag'}
              size={16}
              color={concluida ? aprovaFoxColors.success : aprovaFoxColors.violet}
            />
          </View>
          <Text style={[styles.title, { color: textColor }]}>Meta Diária</Text>
        </View>

        <Text style={[styles.fraction, { color: textMuted }]}>
          <Text style={[styles.fractionActive, { color: textColor }]}>{atual}</Text> / {meta} questões
        </Text>
      </View>

      <View style={[styles.track, { backgroundColor: trackBg }]}>
        <View
          style={[
            styles.fill,
            {
              width: `${percentual}%`,
              backgroundColor: concluida ? aprovaFoxColors.success : aprovaFoxColors.violet,
            },
          ]}
        />
      </View>

      <Text style={[styles.comment, { color: concluida ? aprovaFoxColors.success : textMuted }]}>
        {concluida
          ? '🎉 Meta de hoje concluída! Você está no caminho da aprovação.'
          : `Faltam ${Math.max(0, meta - atual)} questões para bater sua meta diária de hoje.`}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: aprovaFoxColors.surface,
    borderColor: aprovaFoxColors.border,
    borderWidth: 1.5,
    borderRadius: radius.card,
    padding: spacing.md,
    gap: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 3,
  },
  cardCompact: {
    borderWidth: 1.5,
    borderRadius: radius.card,
    padding: 12,
    gap: 8,
    minHeight: 114,
    justifyContent: 'space-between',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  compactTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconCircleCompact: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: aprovaFoxColors.violetSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleSuccessCompact: {
    backgroundColor: aprovaFoxColors.successSoft,
  },
  fractionRowCompact: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  fractionActiveCompact: {
    fontSize: 20,
    fontWeight: weights.display,
  },
  fractionMetaCompact: {
    fontSize: 12,
    fontWeight: weights.title,
  },
  titleCompact: {
    fontSize: 12,
    fontWeight: weights.title,
  },
  trackCompact: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  fillCompact: {
    height: '100%',
    borderRadius: 3,
  },
  commentCompact: {
    fontSize: 11,
    fontWeight: weights.meta,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: aprovaFoxColors.violetSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleSuccess: {
    backgroundColor: aprovaFoxColors.successSoft,
  },
  title: {
    fontSize: typography.label,
    fontWeight: weights.title,
    color: aprovaFoxColors.text,
  },
  fraction: {
    fontSize: typography.caption,
    fontWeight: weights.meta,
    color: aprovaFoxColors.textSecondary,
  },
  fractionActive: {
    color: aprovaFoxColors.text,
    fontWeight: weights.title,
  },
  track: {
    height: 7,
    backgroundColor: aprovaFoxColors.nightElevated,
    borderRadius: 3.5,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3.5,
  },
  comment: {
    fontSize: 12,
    fontWeight: weights.meta,
    color: aprovaFoxColors.textMuted,
    lineHeight: 16,
  },
});

