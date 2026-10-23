import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { aprovaFoxColors, radius, weights, spacing, typography } from '../theme/aprovafox';
import { triggerLightHaptic } from '../utils/haptics';
import type { MateriaProgresso } from '../services/progressService';
import type { CategoryType } from '../types/schema';

export interface SubjectProgressCardProps {
  materias: Record<string, MateriaProgresso>;
  onSelecionarMateria: (category: CategoryType) => void;
}

export const SubjectProgressCard: React.FC<SubjectProgressCardProps> = ({
  materias,
  onSelecionarMateria,
}) => {
  const lista = Object.values(materias);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="book" size={17} color={aprovaFoxColors.violet} />
          <Text style={styles.title}>Matérias do Edital</Text>
        </View>
        <Text style={styles.counter}>{lista.length} disciplinas</Text>
      </View>

      <View style={styles.list}>
        {lista.map((item) => {
          const isGood = item.taxaAcerto >= 70;
          return (
            <TouchableOpacity
              key={item.materia}
              onPress={() => {
                triggerLightHaptic();
                onSelecionarMateria(item.materia as CategoryType);
              }}
              activeOpacity={0.85}
              style={styles.itemRow}
            >
              <View style={styles.itemLeft}>
                <Text style={styles.itemTitle} numberOfLines={1}>
                  {item.materia}
                </Text>
                <Text style={styles.itemMeta}>
                  {item.respondidas} de {item.totalQuestoes} resolvidas · {item.dominadas} dominadas
                </Text>
              </View>

              <View style={styles.itemRight}>
                <View
                  style={[
                    styles.taxaBadge,
                    {
                      backgroundColor:
                        item.respondidas === 0
                          ? aprovaFoxColors.nightElevated
                          : isGood
                          ? aprovaFoxColors.successSoft
                          : aprovaFoxColors.amberSoft,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.taxaText,
                      {
                        color:
                          item.respondidas === 0
                            ? aprovaFoxColors.textMuted
                            : isGood
                            ? aprovaFoxColors.success
                            : aprovaFoxColors.amber,
                      },
                    ]}
                  >
                    {item.respondidas === 0 ? 'Nova' : `${item.taxaAcerto}%`}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={aprovaFoxColors.textMuted} />
              </View>
            </TouchableOpacity>
          );
        })}
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
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 3,
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
  counter: {
    fontSize: typography.caption,
    fontWeight: weights.meta,
    color: aprovaFoxColors.textSecondary,
  },
  list: {
    gap: 8,
  },
  itemRow: {
    backgroundColor: aprovaFoxColors.nightElevated,
    borderColor: aprovaFoxColors.border,
    borderWidth: 1,
    borderRadius: radius.control,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  itemLeft: {
    flex: 1,
    gap: 2,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: weights.title,
    color: aprovaFoxColors.text,
  },
  itemMeta: {
    fontSize: 11,
    fontWeight: weights.meta,
    color: aprovaFoxColors.textMuted,
  },
  itemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  taxaBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  taxaText: {
    fontSize: 11,
    fontWeight: weights.title,
  },
});

