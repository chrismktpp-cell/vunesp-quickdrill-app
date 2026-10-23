import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { aprovaFoxColors, radius, weights, spacing, typography } from '../theme/aprovafox';

export interface DailyGoalCardProps {
  questoesHoje: number;
  metaDiaria: number;
}

export const DailyGoalCard: React.FC<DailyGoalCardProps> = ({
  questoesHoje,
  metaDiaria,
}) => {
  const meta = Math.max(1, metaDiaria);
  const atual = Math.max(0, questoesHoje);
  const percentual = Math.min(100, Math.round((atual / meta) * 100));
  const concluida = atual >= meta;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <View style={[styles.iconCircle, concluida && styles.iconCircleSuccess]}>
            <Ionicons
              name={concluida ? 'checkmark-circle' : 'flag'}
              size={16}
              color={concluida ? aprovaFoxColors.success : aprovaFoxColors.violet}
            />
          </View>
          <Text style={styles.title}>Meta Diária</Text>
        </View>

        <Text style={styles.fraction}>
          <Text style={styles.fractionActive}>{atual}</Text> / {meta} questões
        </Text>
      </View>

      <View style={styles.track}>
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

      <Text style={styles.comment}>
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

