import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { aprovaFoxColors, radius, weights, spacing, typography } from '../theme/aprovafox';
import { triggerLightHaptic } from '../utils/haptics';
import type { RecomendacaoEstudo } from '../services/recommendationService';

export interface NextActivityCardProps {
  recomendacao: RecomendacaoEstudo;
  onIniciar: () => void;
}

export const NextActivityCard: React.FC<NextActivityCardProps> = ({
  recomendacao,
  onIniciar,
}) => {
  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{recomendacao.badgeLabel}</Text>
        </View>
        <Text style={styles.countText}>{recomendacao.questoes.length} questões</Text>
      </View>

      <Text style={styles.titulo}>{recomendacao.titulo}</Text>
      <Text style={styles.subtitulo}>{recomendacao.subtitulo}</Text>

      <TouchableOpacity
        onPress={() => {
          triggerLightHaptic();
          onIniciar();
        }}
        activeOpacity={0.88}
        style={styles.heroButton}
        accessibilityLabel="Continuar estudando próxima sessão recomendada"
      >
        <Text style={styles.heroButtonText}>Continuar Estudando</Text>
        <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: aprovaFoxColors.surface,
    borderColor: aprovaFoxColors.violet,
    borderWidth: 1.5,
    borderRadius: radius.card,
    padding: spacing.md,
    gap: 10,
    shadowColor: aprovaFoxColors.violet,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 5,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badge: {
    backgroundColor: aprovaFoxColors.violetSoft,
    borderColor: aprovaFoxColors.violet,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: weights.title,
    color: aprovaFoxColors.violetLight,
  },
  countText: {
    fontSize: typography.caption,
    fontWeight: weights.meta,
    color: aprovaFoxColors.textSecondary,
  },
  titulo: {
    fontSize: 18,
    fontWeight: weights.display,
    color: aprovaFoxColors.text,
  },
  subtitulo: {
    fontSize: typography.body,
    fontWeight: weights.meta,
    color: aprovaFoxColors.textSecondary,
    lineHeight: 20,
  },
  heroButton: {
    height: 48,
    backgroundColor: aprovaFoxColors.violet,
    borderRadius: radius.control,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  heroButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: weights.title,
  },
});

