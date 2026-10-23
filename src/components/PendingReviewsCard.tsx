import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { aprovaFoxColors, radius, weights, spacing, typography } from '../theme/aprovafox';
import { triggerLightHaptic } from '../utils/haptics';

export interface PendingReviewsCardProps {
  revisoesPendentes: number;
  onIniciarRevisao: () => void;
}

export const PendingReviewsCard: React.FC<PendingReviewsCardProps> = ({
  revisoesPendentes,
  onIniciarRevisao,
}) => {
  if (revisoesPendentes === 0) {
    return (
      <View style={styles.cardEmpty}>
        <View style={styles.emptyIconCircle}>
          <Ionicons name="checkmark-done" size={20} color={aprovaFoxColors.success} />
        </View>
        <View style={styles.textCol}>
          <Text style={styles.titleEmpty}>SRS em Dia</Text>
          <Text style={styles.subEmpty}>Nenhuma questão vencida para revisar hoje.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.leftCol}>
        <View style={styles.iconCircle}>
          <Ionicons name="time" size={20} color={aprovaFoxColors.amber} />
        </View>
        <View style={styles.textCol}>
          <Text style={styles.title}>Revisões Pendentes (SRS)</Text>
          <Text style={styles.subtitle}>
            {revisoesPendentes} {revisoesPendentes === 1 ? 'questão pronta' : 'questões prontas'} para consolidação da memória.
          </Text>
        </View>
      </View>

      <TouchableOpacity
        onPress={() => {
          triggerLightHaptic();
          onIniciarRevisao();
        }}
        activeOpacity={0.85}
        style={styles.actionBtn}
      >
        <Text style={styles.actionBtnText}>Revisar</Text>
        <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: aprovaFoxColors.surface,
    borderColor: aprovaFoxColors.amber,
    borderWidth: 1.5,
    borderRadius: radius.card,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    shadowColor: aprovaFoxColors.amber,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 3,
  },
  cardEmpty: {
    backgroundColor: aprovaFoxColors.surface,
    borderColor: aprovaFoxColors.border,
    borderWidth: 1,
    borderRadius: radius.card,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  leftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: aprovaFoxColors.amberSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: aprovaFoxColors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: weights.title,
    color: aprovaFoxColors.text,
  },
  titleEmpty: {
    fontSize: 14,
    fontWeight: weights.title,
    color: aprovaFoxColors.text,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: weights.meta,
    color: aprovaFoxColors.textSecondary,
    lineHeight: 15,
  },
  subEmpty: {
    fontSize: 11,
    fontWeight: weights.meta,
    color: aprovaFoxColors.textMuted,
  },
  actionBtn: {
    backgroundColor: aprovaFoxColors.amber,
    borderRadius: radius.control,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionBtnText: {
    color: '#0B1020',
    fontSize: 12,
    fontWeight: weights.display,
  },
});

