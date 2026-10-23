import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { aprovaFoxColors, radius, weights, spacing, typography } from '../theme/aprovafox';
import { triggerLightHaptic } from '../utils/haptics';

export interface SimuladoCardProps {
  id: string;
  titulo: string;
  banca: string;
  orgao: string;
  cargo: string;
  cidade: string;
  ano: number;
  questoesCount: number;
  tempoEstimadoMinutos: number;
  disciplinas: string[];
  melhorResultado?: { percentual: number; acertos: number };
  ultimoResultado?: { percentual: number; acertos: number; data: string };
  onIniciar: () => void;
}

export const SimuladoCard: React.FC<SimuladoCardProps> = ({
  titulo,
  banca,
  orgao,
  cargo,
  cidade,
  ano,
  questoesCount,
  tempoEstimadoMinutos,
  disciplinas,
  melhorResultado,
  ultimoResultado,
  onIniciar,
}) => {
  return (
    <View style={styles.card}>
      {/* Topo: Banca e Ano */}
      <View style={styles.topRow}>
        <View style={styles.bancaBadge}>
          <Text style={styles.bancaText}>{banca}</Text>
        </View>
        <Text style={styles.anoText}>{ano}</Text>
      </View>

      {/* Título & Concurso */}
      <View style={styles.titleArea}>
        <Text style={styles.titulo}>{titulo}</Text>
        <Text style={styles.subtitulo}>
          {orgao} · {cidade}
        </Text>
        <Text style={styles.cargoText}>Cargo: {cargo}</Text>
      </View>

      {/* Badges de Meta: Questões, Tempo, Disciplinas */}
      <View style={styles.metaRow}>
        <View style={styles.metaChip}>
          <Ionicons name="help-circle-outline" size={13} color={aprovaFoxColors.textSecondary} />
          <Text style={styles.metaText}>{questoesCount} questões</Text>
        </View>

        <View style={styles.metaChip}>
          <Ionicons name="time-outline" size={13} color={aprovaFoxColors.textSecondary} />
          <Text style={styles.metaText}>{tempoEstimadoMinutos} min</Text>
        </View>
      </View>

      {/* Disciplinas cobertas */}
      <View style={styles.disciplinasRow}>
        <Text style={styles.disciplinasLabel}>Disciplinas:</Text>
        <Text style={styles.disciplinasList} numberOfLines={1}>
          {disciplinas.join(' · ')}
        </Text>
      </View>

      {/* Resultados Anteriores (se houver) */}
      {(melhorResultado || ultimoResultado) && (
        <View style={styles.historicoBox}>
          {melhorResultado && (
            <View style={styles.histItem}>
              <Text style={styles.histLabel}>Melhor Nota:</Text>
              <Text style={[styles.histValue, { color: aprovaFoxColors.success }]}>
                {melhorResultado.percentual}% ({melhorResultado.acertos}/{questoesCount})
              </Text>
            </View>
          )}

          {ultimoResultado && (
            <View style={styles.histItem}>
              <Text style={styles.histLabel}>Última Tentativa:</Text>
              <Text style={styles.histValue}>
                {ultimoResultado.percentual}%
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Botão de Iniciar */}
      <TouchableOpacity
        onPress={() => {
          triggerLightHaptic();
          onIniciar();
        }}
        activeOpacity={0.85}
        style={styles.startBtn}
      >
        <Ionicons name="play" size={16} color="#FFFFFF" />
        <Text style={styles.startBtnText}>Iniciar Simulado</Text>
      </TouchableOpacity>
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
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 3,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bancaBadge: {
    backgroundColor: aprovaFoxColors.violetSoft,
    borderColor: aprovaFoxColors.violet,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  bancaText: {
    fontSize: 11,
    fontWeight: weights.title,
    color: aprovaFoxColors.violetLight,
  },
  anoText: {
    fontSize: 12,
    fontWeight: weights.title,
    color: aprovaFoxColors.textMuted,
  },
  titleArea: {
    gap: 2,
  },
  titulo: {
    fontSize: 16,
    fontWeight: weights.title,
    color: aprovaFoxColors.text,
  },
  subtitulo: {
    fontSize: typography.caption,
    fontWeight: weights.meta,
    color: aprovaFoxColors.textSecondary,
  },
  cargoText: {
    fontSize: 11,
    fontWeight: weights.meta,
    color: aprovaFoxColors.textMuted,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: aprovaFoxColors.nightElevated,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.control,
  },
  metaText: {
    fontSize: 11,
    fontWeight: weights.meta,
    color: aprovaFoxColors.textSecondary,
  },
  disciplinasRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  disciplinasLabel: {
    fontSize: 11,
    fontWeight: weights.title,
    color: aprovaFoxColors.textMuted,
  },
  disciplinasList: {
    flex: 1,
    fontSize: 11,
    fontWeight: weights.meta,
    color: aprovaFoxColors.textSecondary,
  },
  historicoBox: {
    backgroundColor: aprovaFoxColors.nightElevated,
    borderColor: aprovaFoxColors.border,
    borderWidth: 1,
    borderRadius: radius.control,
    padding: 10,
    gap: 4,
  },
  histItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  histLabel: {
    fontSize: 11,
    fontWeight: weights.meta,
    color: aprovaFoxColors.textMuted,
  },
  histValue: {
    fontSize: 11,
    fontWeight: weights.title,
    color: aprovaFoxColors.text,
  },
  startBtn: {
    height: 44,
    backgroundColor: aprovaFoxColors.violet,
    borderRadius: radius.control,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 2,
  },
  startBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: weights.title,
  },
});

