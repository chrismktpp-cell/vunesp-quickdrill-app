import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { aprovaFoxColors, radius, weights } from '../theme/aprovafox';
import { DiaRoteiro } from '../data/planoEstudosRoteiro';
import { triggerLightHaptic, triggerSuccessHaptic } from '../utils/haptics';

interface TrilhaHomeCardProps {
  diaRoteiro: DiaRoteiro;
  diasConcluidos: number;
  totalDias: number;
  percentualCiclo: number;
  onAbrirTrilha: () => void;
  onIniciarTreinoDia: () => void;
}

export const TrilhaHomeCard: React.FC<TrilhaHomeCardProps> = ({
  diaRoteiro,
  diasConcluidos,
  totalDias,
  percentualCiclo,
  onAbrirTrilha,
  onIniciarTreinoDia,
}) => {
  return (
    <View style={styles.card}>
      {/* Header com Tag da Trilha */}
      <View style={styles.headerRow}>
        <View style={styles.tag}>
          <Ionicons name="map" size={12} color={aprovaFoxColors.violetLight} />
          <Text style={styles.tagText}>ROTEIRO DE 7 DIAS</Text>
        </View>
        <Text style={styles.dayLabel}>
          Dia {diaRoteiro.dia} de {totalDias} · {diaRoteiro.diaSemana}
        </Text>
      </View>

      {/* Título do Dia */}
      <Text style={styles.title}>{diaRoteiro.titulo}</Text>
      <Text style={styles.foco} numberOfLines={2}>
        🎯 {diaRoteiro.focoPrincipal}
      </Text>

      {/* Barra de Progresso Semanal */}
      <View style={styles.progressContainer}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${percentualCiclo}%` }]} />
        </View>
        <Text style={styles.progressText}>
          {diasConcluidos} de {totalDias} concluídos
        </Text>
      </View>

      {/* Botões de Ação */}
      <View style={styles.buttonsRow}>
        <TouchableOpacity
          onPress={() => {
            triggerSuccessHaptic();
            onIniciarTreinoDia();
          }}
          activeOpacity={0.88}
          style={styles.heroButton}
        >
          <Ionicons name="flash" size={18} color="#ffffff" />
          <Text style={styles.heroButtonText}>
            Missão de Hoje ({diaRoteiro.metaQuestoes} Qs)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            triggerLightHaptic();
            onAbrirTrilha();
          }}
          activeOpacity={0.85}
          style={styles.secondaryButton}
        >
          <Ionicons name="map-outline" size={18} color={aprovaFoxColors.text} />
          <Text style={styles.secondaryButtonText}>Trilha</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: aprovaFoxColors.nightElevated,
    borderRadius: radius.card,
    borderWidth: 2,
    borderColor: aprovaFoxColors.violet,
    padding: 16,
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: aprovaFoxColors.violetSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  tagText: {
    color: aprovaFoxColors.violetLight,
    fontSize: 10,
    fontWeight: weights.display,
    letterSpacing: 0.5,
  },
  dayLabel: {
    color: aprovaFoxColors.textSecondary,
    fontSize: 12,
    fontWeight: weights.body,
  },
  title: {
    color: aprovaFoxColors.text,
    fontSize: 18,
    fontWeight: weights.title,
    letterSpacing: -0.2,
  },
  foco: {
    color: aprovaFoxColors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 2,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    backgroundColor: aprovaFoxColors.surface,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: aprovaFoxColors.violet,
    borderRadius: 3,
  },
  progressText: {
    color: aprovaFoxColors.textMuted,
    fontSize: 11,
    fontWeight: weights.body,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  heroButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: aprovaFoxColors.violet,
    paddingVertical: 12,
    borderRadius: radius.control,
  },
  heroButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: weights.title,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: aprovaFoxColors.surface,
    borderWidth: 1,
    borderColor: aprovaFoxColors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: radius.control,
  },
  secondaryButtonText: {
    color: aprovaFoxColors.text,
    fontSize: 13,
    fontWeight: weights.title,
  },
});
