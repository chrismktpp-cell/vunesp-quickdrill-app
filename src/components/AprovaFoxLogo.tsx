import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Polygon, Circle, G } from 'react-native-svg';
import { aprovaFoxColors } from '../theme/aprovafox';

export interface AprovaFoxLogoProps {
  size?: number;
  showCheckmark?: boolean;
}

/**
 * Logo Oficial AprovaFox
 * Cabeça de raposa geométrica vetorial com detalhe integrado de aprovação (check discreto)
 */
export const AprovaFoxLogo: React.FC<AprovaFoxLogoProps> = ({
  size = 36,
  showCheckmark = true,
}) => {
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg viewBox="0 0 100 100" width={size} height={size}>
        <G>
          {/* Orelha Esquerda */}
          <Polygon
            points="18,14 42,42 16,54"
            fill={aprovaFoxColors.amber}
          />
          <Polygon
            points="24,24 38,42 22,50"
            fill={aprovaFoxColors.violet}
          />

          {/* Orelha Direita */}
          <Polygon
            points="82,14 84,54 58,42"
            fill={aprovaFoxColors.amber}
          />
          <Polygon
            points="76,24 78,50 62,42"
            fill={aprovaFoxColors.violet}
          />

          {/* Cabeça Principal / Testa Geométrica */}
          <Polygon
            points="50,30 84,54 50,92 16,54"
            fill={aprovaFoxColors.amber}
          />

          {/* Bochecha Esquerda */}
          <Polygon
            points="50,56 16,54 34,74"
            fill="#FFFFFF"
          />

          {/* Bochecha Direita */}
          <Polygon
            points="50,56 66,74 84,54"
            fill="#FFFFFF"
          />

          {/* Focinho Central Superior */}
          <Polygon
            points="50,50 36,66 50,86 64,66"
            fill={aprovaFoxColors.amberLight}
          />

          {/* Nariz */}
          <Polygon
            points="50,85 45,79 55,79"
            fill={aprovaFoxColors.night}
          />

          {/* Olhos Determinados e Focados */}
          <Polygon
            points="34,56 42,60 36,62"
            fill={aprovaFoxColors.night}
          />
          <Polygon
            points="66,56 64,62 58,60"
            fill={aprovaFoxColors.night}
          />

          {/* Símbolo de Aprovação (Checkmark integrado na testa) */}
          {showCheckmark && (
            <G>
              <Circle cx="50" cy="40" r="8" fill={aprovaFoxColors.night} opacity={0.6} />
              <Path
                d="M46 40 L49 43 L54 37"
                stroke={aprovaFoxColors.success}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </G>
          )}
        </G>
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
