import React from 'react';
import {
  Image,
  ImageStyle,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { aprovaFoxColors } from '../theme/aprovafox';

export type MascotMood = 'welcome' | 'celebration' | 'focus' | 'review';

export interface AprovaFoxMascotProps {
  mood?: MascotMood;
  size?: number;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
  showMoodBadge?: boolean;
}

const MASCOT_SOURCE = require('../../assets/aprovafox-mascot.png');

/**
 * Mascote Oficial AprovaFox
 * Raposa atleta e estrategista vestindo moletom moderno com detalhes teal,
 * pin de aprovação e flashcard luminoso de estudos.
 */
export const AprovaFoxMascot: React.FC<AprovaFoxMascotProps> = ({
  mood = 'welcome',
  size = 110,
  style,
  imageStyle,
  showMoodBadge = false,
}) => {
  const haloColor =
    mood === 'celebration'
      ? aprovaFoxColors.amberSoft
      : mood === 'review'
      ? aprovaFoxColors.dangerSoft
      : mood === 'focus'
      ? aprovaFoxColors.violetSoft
      : 'rgba(118, 87, 246, 0.12)';

  const haloBorder =
    mood === 'celebration'
      ? 'rgba(255, 181, 71, 0.35)'
      : mood === 'review'
      ? 'rgba(244, 63, 94, 0.30)'
      : mood === 'focus'
      ? 'rgba(118, 87, 246, 0.35)'
      : 'rgba(255, 255, 255, 0.05)';

  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      {/* Halo de fundo temático */}
      <View
        style={[
          styles.halo,
          {
            width: size * 0.92,
            height: size * 0.92,
            borderRadius: (size * 0.92) / 2,
            backgroundColor: haloColor,
            borderColor: haloBorder,
          },
        ]}
      />

      {/* Ilustração Oficial do Mascote */}
      <Image
        source={MASCOT_SOURCE}
        style={[
          {
            width: size,
            height: size,
          },
          imageStyle,
        ]}
        resizeMode="contain"
        accessibilityLabel="AprovaFox Mascote"
      />

      {/* Badge opcional de mood */}
      {showMoodBadge && mood === 'celebration' && (
        <View style={[styles.badge, { backgroundColor: aprovaFoxColors.amber }]}>
          <Ionicons name="sparkles" size={12} color="#FFFFFF" />
        </View>
      )}

      {showMoodBadge && mood === 'review' && (
        <View style={[styles.badge, { backgroundColor: aprovaFoxColors.danger }]}>
          <Ionicons name="refresh" size={12} color="#FFFFFF" />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  halo: {
    position: 'absolute',
    borderWidth: 1,
  },
  badge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#0B1020',
  },
});
