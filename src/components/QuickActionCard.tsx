import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { aprovaFoxColors, radius, weights, spacing, typography } from '../theme/aprovafox';
import { triggerLightHaptic } from '../utils/haptics';

export interface QuickActionCardProps {
  onIniciarSimulado: () => void;
  onAbrirMural: () => void;
  onTreinarPontosCegos?: () => void;
}

export const QuickActionCard: React.FC<QuickActionCardProps> = ({
  onIniciarSimulado,
  onAbrirMural,
  onTreinarPontosCegos,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Acessos Rápidos da Raposa</Text>

      <View style={styles.grid}>
        <TouchableOpacity
          onPress={() => {
            triggerLightHaptic();
            onIniciarSimulado();
          }}
          activeOpacity={0.85}
          style={styles.card}
        >
          <View style={[styles.iconWrap, { backgroundColor: aprovaFoxColors.violetSoft }]}>
            <Ionicons name="stopwatch" size={20} color={aprovaFoxColors.violet} />
          </View>
          <Text style={styles.cardTitle}>Simulados</Text>
          <Text style={styles.cardSub}>Treinar com tempo</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            triggerLightHaptic();
            onAbrirMural();
          }}
          activeOpacity={0.85}
          style={styles.card}
        >
          <View style={[styles.iconWrap, { backgroundColor: aprovaFoxColors.amberSoft }]}>
            <Ionicons name="bulb" size={20} color={aprovaFoxColors.amber} />
          </View>
          <Text style={[styles.cardTitle, { color: aprovaFoxColors.amber }]}>Macetes & Raio-X</Text>
          <Text style={styles.cardSub}>Pegadinhas da banca</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  title: {
    fontSize: typography.label,
    fontWeight: weights.title,
    color: aprovaFoxColors.text,
  },
  grid: {
    flexDirection: 'row',
    gap: 10,
  },
  card: {
    flex: 1,
    backgroundColor: aprovaFoxColors.surface,
    borderColor: aprovaFoxColors.border,
    borderWidth: 1.5,
    borderRadius: radius.card,
    padding: 14,
    gap: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 3,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: weights.title,
    color: aprovaFoxColors.text,
  },
  cardSub: {
    fontSize: 11,
    fontWeight: weights.meta,
    color: aprovaFoxColors.textMuted,
  },
});

