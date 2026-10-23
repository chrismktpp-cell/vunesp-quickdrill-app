import React from 'react';
import { Image, ImageStyle, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

export interface AprovaFoxLogoProps {
  size?: number;
  showCheckmark?: boolean;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
}

const LOGO_SOURCE = require('../../assets/aprovafox-logo.png');

/**
 * Logo Oficial AprovaFox
 * Cabeça geométrica da raposa em roxo, âmbar e branco, com detalhe de aprovação na silhueta.
 */
export const AprovaFoxLogo: React.FC<AprovaFoxLogoProps> = ({
  size = 36,
  style,
  imageStyle,
}) => {
  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      <Image
        source={LOGO_SOURCE}
        style={[{ width: size, height: size }, imageStyle]}
        resizeMode="contain"
        accessibilityLabel="AprovaFox Logo"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
