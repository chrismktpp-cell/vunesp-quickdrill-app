import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import type { FilaDoDia } from '../types/schema';
import { triggerLightHaptic } from '../utils/haptics';
import { radius, typography, weights } from '../theme/tokens';

interface FilaDoDiaBannerProps {
  fila: FilaDoDia;
  isFilaActive: boolean;
  onToggleFila: () => void;
  colors: {
    cardBg: string;
    cardBorder: string;
    text: string;
    textMuted: string;
    primary: string;
    primarySoft: string;
    [key: string]: any;
  };
  isDark: boolean;
}

export const FilaDoDiaBanner: React.FC<FilaDoDiaBannerProps> = ({
  fila,
  isFilaActive,
  onToggleFila,
  colors,
}) => {
  const { revisoesPendentes, novasQuestoes, totalHoje } = fila;

  return (
    <TouchableOpacity
      onPress={() => {
        triggerLightHaptic();
        onToggleFila();
      }}
      activeOpacity={0.85}
      style={[
        styles.container,
        {
          backgroundColor: isFilaActive ? colors.primarySoft : colors.cardBg,
          borderColor: isFilaActive ? colors.primary : colors.cardBorder,
        },
      ]}
    >
      <Text
        style={[
          styles.leftText,
          { color: isFilaActive ? colors.primary : colors.text },
        ]}
      >
        Hoje · {totalHoje}
      </Text>
      <Text style={[styles.rightText, { color: colors.textMuted }]}>
        {revisoesPendentes.length} pendentes · {novasQuestoes.length} novas
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 64,
    borderRadius: radius.card,
    borderWidth: 1,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  leftText: {
    fontSize: typography.option,
    fontWeight: weights.title,
  },
  rightText: {
    fontSize: typography.meta,
    fontWeight: weights.meta,
  },
});
