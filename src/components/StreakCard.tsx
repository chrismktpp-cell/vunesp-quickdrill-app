import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { aprovaFoxColors, radius, weights, spacing, typography } from '../theme/aprovafox';

export interface StreakCardProps {
  streak: number;
  bestStreak: number;
  isDark?: boolean;
  tokens?: any;
  compact?: boolean;
}

export const StreakCard: React.FC<StreakCardProps> = ({
  streak,
  bestStreak,
  isDark = true,
  tokens,
  compact = false,
}) => {
  const cardBg = tokens?.cardBg || (isDark ? aprovaFoxColors.surface : '#ffffff');
  const cardBorder = tokens?.cardBorder || (isDark ? aprovaFoxColors.border : '#e2e8f0');
  const textColor = tokens?.textPrimary || (isDark ? aprovaFoxColors.text : '#0f172a');
  const textMuted = tokens?.textMuted || (isDark ? aprovaFoxColors.textMuted : '#64748b');

  if (compact) {
    return (
      <View style={[styles.cardCompact, { backgroundColor: cardBg, borderColor: cardBorder }]}>
        <View style={styles.compactTopRow}>
          <View style={styles.flameCircleCompact}>
            <Ionicons name="flame" size={20} color={aprovaFoxColors.amber} />
          </View>
          <View style={styles.streakCountRowCompact}>
            <Text style={styles.streakNumberCompact}>{streak}</Text>
            <Text style={[styles.diasLabelCompact, { color: textMuted }]}>dias</Text>
          </View>
        </View>

        <Text style={[styles.streakTitleCompact, { color: textColor }]}>
          {streak === 1 ? 'Sequência Ativa' : 'Dias Seguidos'}
        </Text>

        <View
          style={[
            styles.bestStreakPill,
            { backgroundColor: isDark ? 'rgba(255, 181, 71, 0.12)' : '#fef3c7' },
          ]}
        >
          <Ionicons name="trophy-outline" size={11} color={aprovaFoxColors.amber} />
          <Text
            style={[
              styles.bestStreakTextCompact,
              { color: isDark ? aprovaFoxColors.amber : '#b45309' },
            ]}
          >
            Recorde: {bestStreak}d
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
      <View style={styles.leftRow}>
        <View style={styles.flameCircle}>
          <Ionicons name="flame" size={24} color={aprovaFoxColors.amber} />
        </View>
        <View style={styles.textCol}>
          <View style={styles.streakCountRow}>
            <Text style={styles.streakNumber}>{streak}</Text>
            <Text style={[styles.streakLabel, { color: textColor }]}>
              {streak === 1 ? 'dia de sequência' : 'dias consecutivos'}
            </Text>
          </View>
          <Text style={[styles.bestStreakText, { color: textMuted }]}>
            Recorde pessoal: {bestStreak} {bestStreak === 1 ? 'dia' : 'dias'}
          </Text>
        </View>
      </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  flameCircleCompact: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: aprovaFoxColors.amberSoft,
    borderColor: aprovaFoxColors.amber,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakCountRowCompact: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },
  streakNumberCompact: {
    fontSize: 20,
    fontWeight: weights.display,
    color: aprovaFoxColors.amber,
  },
  diasLabelCompact: {
    fontSize: 11,
    fontWeight: weights.meta,
  },
  streakTitleCompact: {
    fontSize: 12,
    fontWeight: weights.title,
  },
  bestStreakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  bestStreakTextCompact: {
    fontSize: 10,
    fontWeight: weights.title,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  flameCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: aprovaFoxColors.amberSoft,
    borderColor: aprovaFoxColors.amber,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    gap: 2,
    flex: 1,
  },
  streakCountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  streakNumber: {
    fontSize: 22,
    fontWeight: weights.display,
    color: aprovaFoxColors.amber,
  },
  streakLabel: {
    fontSize: typography.caption,
    fontWeight: weights.title,
    color: aprovaFoxColors.text,
  },
  bestStreakText: {
    fontSize: 11,
    fontWeight: weights.meta,
    color: aprovaFoxColors.textMuted,
  },
});

