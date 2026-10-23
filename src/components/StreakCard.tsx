import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { aprovaFoxColors, radius, weights, spacing, typography } from '../theme/aprovafox';

export interface StreakCardProps {
  streak: number;
  bestStreak: number;
}

export const StreakCard: React.FC<StreakCardProps> = ({ streak, bestStreak }) => {
  return (
    <View style={styles.card}>
      <View style={styles.leftRow}>
        <View style={styles.flameCircle}>
          <Ionicons name="flame" size={24} color={aprovaFoxColors.amber} />
        </View>
        <View style={styles.textCol}>
          <View style={styles.streakCountRow}>
            <Text style={styles.streakNumber}>{streak}</Text>
            <Text style={styles.streakLabel}>
              {streak === 1 ? 'dia de sequência' : 'dias consecutivos'}
            </Text>
          </View>
          <Text style={styles.bestStreakText}>
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

