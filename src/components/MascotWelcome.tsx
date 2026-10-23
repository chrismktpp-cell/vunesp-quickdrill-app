import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AprovaFoxMascot } from './AprovaFoxMascot';
import { aprovaFoxColors, radius, weights, spacing, typography } from '../theme/aprovafox';

export interface MascotWelcomeProps {
  saudacao: string;
  concurso: string;
  cargo: string;
}

export const MascotWelcome: React.FC<MascotWelcomeProps> = ({
  saudacao,
  concurso,
  cargo,
}) => {
  return (
    <View style={styles.card}>
      <View style={styles.contentCol}>
        <Text style={styles.slogan}>AprovaFox · Concursos</Text>
        <Text style={styles.saudacao}>{saudacao}</Text>
        <Text style={styles.tagline}>"Estude esperto. Passe preparado."</Text>

        <View style={styles.concursoBadge}>
          <Text style={styles.concursoText} numberOfLines={1}>
            {concurso} · {cargo}
          </Text>
        </View>
      </View>

      <View style={styles.mascotCol}>
        <AprovaFoxMascot mood="welcome" size={88} />
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 3,
  },
  contentCol: {
    flex: 1,
    paddingRight: 10,
    gap: 4,
  },
  slogan: {
    fontSize: typography.caption,
    fontWeight: weights.meta,
    color: aprovaFoxColors.amber,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  saudacao: {
    fontSize: 18,
    fontWeight: weights.display,
    color: aprovaFoxColors.text,
  },
  tagline: {
    fontSize: 12,
    fontWeight: weights.meta,
    color: aprovaFoxColors.textSecondary,
    fontStyle: 'italic',
  },
  concursoBadge: {
    backgroundColor: aprovaFoxColors.nightElevated,
    borderColor: aprovaFoxColors.border,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  concursoText: {
    fontSize: 11,
    fontWeight: weights.meta,
    color: aprovaFoxColors.violetLight,
  },
  mascotCol: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
