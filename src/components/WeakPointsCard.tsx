import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { aprovaFoxColors, radius, weights, spacing, typography } from '../theme/aprovafox';
import { triggerLightHaptic } from '../utils/haptics';

export interface WeakPointsCardProps {
  blindSpotsCount: number;
  errorsCount: number;
  onTreinarPontosCegos: () => void;
  onTreinarErros: () => void;
}

export const WeakPointsCard: React.FC<WeakPointsCardProps> = ({
  blindSpotsCount,
  errorsCount,
  onTreinarPontosCegos,
  onTreinarErros,
}) => {
  if (blindSpotsCount === 0 && errorsCount === 0) {
    return (
      <View style={styles.cardClean}>
        <Ionicons name="shield-checkmark" size={20} color={aprovaFoxColors.success} />
        <View style={styles.cleanCol}>
          <Text style={styles.cleanTitle}>Sem Pontos Cegos</Text>
          <Text style={styles.cleanSubtitle}>
            Excelente! Você não possui pegadinhas ativas aguardando correção.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="alert-circle" size={18} color={aprovaFoxColors.danger} />
          <Text style={styles.title}>Atenção da Raposa · Pontos Críticos</Text>
        </View>
      </View>

      <View style={styles.actionsRow}>
        {blindSpotsCount > 0 && (
          <TouchableOpacity
            onPress={() => {
              triggerLightHaptic();
              onTreinarPontosCegos();
            }}
            activeOpacity={0.85}
            style={[styles.btn, styles.btnBlind]}
          >
            <View style={styles.btnContent}>
              <Text style={styles.btnCount}>{blindSpotsCount}</Text>
              <View>
                <Text style={styles.btnTitle}>Pontos Cegos</Text>
                <Text style={styles.btnSub}>Certeza + erro da banca</Text>
              </View>
            </View>
            <Ionicons name="arrow-forward" size={14} color={aprovaFoxColors.danger} />
          </TouchableOpacity>
        )}

        {errorsCount > 0 && (
          <TouchableOpacity
            onPress={() => {
              triggerLightHaptic();
              onTreinarErros();
            }}
            activeOpacity={0.85}
            style={[styles.btn, styles.btnErrors]}
          >
            <View style={styles.btnContent}>
              <Text style={styles.btnCountErrors}>{errorsCount}</Text>
              <View>
                <Text style={styles.btnTitleErrors}>Erros Recentes</Text>
                <Text style={styles.btnSub}>Treinar recuperação</Text>
              </View>
            </View>
            <Ionicons name="arrow-forward" size={14} color={aprovaFoxColors.amber} />
          </TouchableOpacity>
        )}
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
    gap: 12,
  },
  cardClean: {
    backgroundColor: aprovaFoxColors.surface,
    borderColor: aprovaFoxColors.border,
    borderWidth: 1,
    borderRadius: radius.card,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cleanCol: {
    flex: 1,
    gap: 2,
  },
  cleanTitle: {
    fontSize: 13,
    fontWeight: weights.title,
    color: aprovaFoxColors.text,
  },
  cleanSubtitle: {
    fontSize: 11,
    fontWeight: weights.meta,
    color: aprovaFoxColors.textMuted,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: typography.label,
    fontWeight: weights.title,
    color: aprovaFoxColors.text,
  },
  actionsRow: {
    gap: 8,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: radius.control,
    borderWidth: 1,
  },
  btnBlind: {
    backgroundColor: aprovaFoxColors.dangerSoft,
    borderColor: aprovaFoxColors.danger,
  },
  btnErrors: {
    backgroundColor: aprovaFoxColors.amberSoft,
    borderColor: aprovaFoxColors.amber,
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  btnCount: {
    fontSize: 20,
    fontWeight: weights.display,
    color: aprovaFoxColors.danger,
    minWidth: 24,
  },
  btnCountErrors: {
    fontSize: 20,
    fontWeight: weights.display,
    color: aprovaFoxColors.amber,
    minWidth: 24,
  },
  btnTitle: {
    fontSize: 13,
    fontWeight: weights.title,
    color: aprovaFoxColors.danger,
  },
  btnTitleErrors: {
    fontSize: 13,
    fontWeight: weights.title,
    color: aprovaFoxColors.amber,
  },
  btnSub: {
    fontSize: 11,
    fontWeight: weights.meta,
    color: aprovaFoxColors.textSecondary,
  },
});

