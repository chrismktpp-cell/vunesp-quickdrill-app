import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AprovaFoxMascot } from './AprovaFoxMascot';
import { aprovaFoxColors, radius, weights, spacing, typography } from '../theme/aprovafox';

export interface MascotCelebrationProps {
  titulo: string;
  subtitulo: string;
  isPerfect?: boolean;
}

export const MascotCelebration: React.FC<MascotCelebrationProps> = ({
  titulo,
  subtitulo,
  isPerfect = false,
}) => {
  return (
    <View style={[styles.container, isPerfect && styles.perfectBorder]}>
      <AprovaFoxMascot mood="celebration" size={124} showMoodBadge />
      <Text style={styles.titulo}>{titulo}</Text>
      <Text style={styles.subtitulo}>{subtitulo}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: aprovaFoxColors.surface,
    borderColor: aprovaFoxColors.border,
    borderWidth: 1.5,
    borderRadius: radius.card,
    padding: spacing.lg,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
    elevation: 4,
  },
  perfectBorder: {
    borderColor: aprovaFoxColors.amber,
  },
  titulo: {
    fontSize: typography.title,
    fontWeight: weights.display,
    color: aprovaFoxColors.text,
    textAlign: 'center',
    marginTop: 4,
  },
  subtitulo: {
    fontSize: typography.body,
    fontWeight: weights.meta,
    color: aprovaFoxColors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 12,
  },
});
