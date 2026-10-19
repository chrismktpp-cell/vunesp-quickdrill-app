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
          backgroundColor: isFilaActive ? (isDark ? '#172554' : '#eff6ff') : colors.cardBg,
          borderColor: isFilaActive ? colors.primary : colors.cardBorder,
        },
      ]}
    >
      <View style={styles.topRow}>
        <View style={styles.titleGroup}>
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: isFilaActive ? colors.primary : colors.primarySoft },
            ]}
          >
            <Ionicons
              name="calendar"
              size={16}
              color={isFilaActive ? '#ffffff' : colors.primary}
            />
          </View>
          <View>
            <View style={styles.labelRow}>
              <Text style={[styles.title, { color: colors.text }]}>Fila do Dia (SRS)</Text>
              <View
                style={[
                  styles.badgeHoje,
                  { backgroundColor: totalHoje > 0 ? colors.amberSoft : colors.emeraldSoft },
                ]}
              >
                <Text
                  style={[
                    styles.badgeHojeText,
                    { color: totalHoje > 0 ? colors.amber : colors.emerald },
                  ]}
                >
                  {totalHoje > 0 ? `${totalHoje} p/ hoje` : 'Zerada! 🎉'}
                </Text>
              </View>
            </View>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              {revisoesPendentes.length} revisões pendentes • {novasQuestoes.length} questões novas
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => {
            triggerLightHaptic();
            onToggleFila();
          }}
          style={[
            styles.actionButton,
            {
              backgroundColor: isFilaActive ? colors.primary : colors.subtle,
            },
          ]}
        >
          <Ionicons
            name={isFilaActive ? 'checkmark-circle' : 'play-circle'}
            size={16}
            color={isFilaActive ? '#ffffff' : colors.primary}
          />
          <Text
            style={[
              styles.actionButtonText,
              { color: isFilaActive ? '#ffffff' : colors.primary },
            ]}
          >
            {isFilaActive ? 'Fila Ativa' : 'Treinar Fila'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 12,
    marginBottom: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
  },
  badgeHoje: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeHojeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
