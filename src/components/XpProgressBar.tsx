import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { aprovaFoxColors, radius, weights, spacing, typography } from '../theme/aprovafox';
import { calcularNivel } from '../services/gamificationService';

export interface XpProgressBarProps {
  xp: number;
}

export const XpProgressBar: React.FC<XpProgressBarProps> = ({ xp }) => {
  const nivelInfo = calcularNivel(xp);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.nivelBadge}>
          <Ionicons name="sparkles" size={14} color={aprovaFoxColors.amber} />
          <Text style={styles.nivelBadgeText}>Nível {nivelInfo.nivel}</Text>
        </View>

        <Text style={styles.tituloNivel}>{nivelInfo.titulo}</Text>

        <Text style={styles.xpText}>
          {xp} XP
        </Text>
      </View>

      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            { width: `${nivelInfo.progressoPercentual}%` },
          ]}
        />
      </View>

      <View style={styles.footerRow}>
        <Text style={styles.subtext}>
          {nivelInfo.xpNoNivel} / {nivelInfo.xpProximoNivel - nivelInfo.xpInicioNivel} XP no nível
        </Text>
        <Text style={styles.subtext}>
          Faltam {nivelInfo.xpParaUpar} XP para o próximo nível
        </Text>
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
    gap: 8,
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
  nivelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: aprovaFoxColors.amberSoft,
    borderColor: aprovaFoxColors.amber,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  nivelBadgeText: {
    fontSize: 11,
    fontWeight: weights.title,
    color: aprovaFoxColors.amber,
  },
  tituloNivel: {
    fontSize: typography.caption,
    fontWeight: weights.title,
    color: aprovaFoxColors.text,
    flex: 1,
    marginLeft: 8,
  },
  xpText: {
    fontSize: 13,
    fontWeight: weights.title,
    color: aprovaFoxColors.amber,
  },
  track: {
    height: 6,
    backgroundColor: aprovaFoxColors.nightElevated,
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: aprovaFoxColors.amber,
    borderRadius: 3,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  subtext: {
    fontSize: 10,
    fontWeight: weights.meta,
    color: aprovaFoxColors.textMuted,
  },
});

