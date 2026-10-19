import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { FilaDoDia } from '../types/schema';
import { triggerLightHaptic } from '../utils/storage';

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
    amber: string;
    amberSoft: string;
    emerald: string;
    emeraldSoft: string;
    rose: string;
    roseSoft: string;
    subtle: string;
  };
  isDark: boolean;
}

export const FilaDoDiaBanner: React.FC<FilaDoDiaBannerProps> = ({
  fila,
  isFilaActive,
  onToggleFila,
  colors,
  isDark,
}) => {
  const { revisoesPendentes, novasQuestoes, totalHoje } = fila;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isFilaActive
            ? (isDark ? '#0f2445' : '#e0f2fe')
            : (isDark ? '#111a2e' : '#ffffff'),
          borderColor: isFilaActive
            ? colors.primary
            : (isDark ? '#1f2e4d' : '#e2e8f0'),
        },
      ]}
    >
      <View style={styles.contentRow}>
        {/* Left Icon with glow */}
        <View
          style={[
            styles.iconWrapper,
            {
              backgroundColor: isFilaActive
                ? colors.primary
                : (isDark ? '#172554' : '#eff6ff'),
            },
          ]}
        >
          <Ionicons
            name={isFilaActive ? 'flash' : 'calendar'}
            size={18}
            color={isFilaActive ? '#ffffff' : colors.primary}
          />
        </View>

        {/* Info Column */}
        <View style={styles.infoCol}>
          <View style={styles.headerLine}>
            <Text style={[styles.title, { color: colors.text }]}>Fila do Dia (SRS)</Text>
            <View
              style={[
                styles.badgePill,
                {
                  backgroundColor: totalHoje > 0
                    ? (isDark ? '#422006' : '#fef3c7')
                    : (isDark ? '#064e3b' : '#d1fae5'),
                },
              ]}
            >
              <Text
                style={[
                  styles.badgePillText,
                  { color: totalHoje > 0 ? colors.amber : colors.emerald },
                ]}
              >
                {totalHoje > 0 ? `${totalHoje} para hoje` : 'Meta batida! 🎉'}
              </Text>
            </View>
          </View>

          <View style={styles.metricsPillsRow}>
            <View
              style={[
                styles.miniChip,
                { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#fffbeb' },
              ]}
            >
              <Ionicons name="time" size={11} color={colors.amber} />
              <Text style={[styles.miniChipText, { color: colors.amber }]}>
                {revisoesPendentes.length} pendentes
              </Text>
            </View>

            <View
              style={[
                styles.miniChip,
                { backgroundColor: isDark ? 'rgba(56, 189, 248, 0.15)' : '#f0f9ff' },
              ]}
            >
              <Ionicons name="sparkles" size={11} color={colors.primary} />
              <Text style={[styles.miniChipText, { color: colors.primary }]}>
                {novasQuestoes.length} novas
              </Text>
            </View>
          </View>
        </View>

        {/* Action Button */}
        <TouchableOpacity
          onPress={() => {
            triggerLightHaptic();
            onToggleFila();
          }}
          activeOpacity={0.8}
          style={[
            styles.ctaBtn,
            {
              backgroundColor: isFilaActive ? colors.primary : colors.subtle,
              borderColor: isFilaActive ? colors.primary : colors.cardBorder,
            },
          ]}
        >
          <Ionicons
            name={isFilaActive ? 'checkmark-circle' : 'play'}
            size={14}
            color={isFilaActive ? '#ffffff' : colors.text}
          />
          <Text
            style={[
              styles.ctaBtnText,
              { color: isFilaActive ? '#ffffff' : colors.text },
            ]}
          >
            {isFilaActive ? 'Ativa' : 'Treinar'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCol: {
    flex: 1,
  },
  headerLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  title: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  badgePill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 12,
  },
  badgePillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  metricsPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  miniChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  miniChipText: {
    fontSize: 10,
    fontWeight: '700',
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  ctaBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
});
