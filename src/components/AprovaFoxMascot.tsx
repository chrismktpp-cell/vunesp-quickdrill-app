import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Polygon, Circle, Rect, G } from 'react-native-svg';
import { aprovaFoxColors } from '../theme/aprovafox';

export type MascotMood = 'welcome' | 'celebration' | 'focus' | 'review';

export interface AprovaFoxMascotProps {
  mood?: MascotMood;
  size?: number;
}

/**
 * Mascote Oficial AprovaFox
 * Raposa inteligente, atlética e confiante usando jaqueta moderna de estudos
 * com símbolo discreto de aprovação.
 */
export const AprovaFoxMascot: React.FC<AprovaFoxMascotProps> = ({
  mood = 'welcome',
  size = 110,
}) => {
  return (
    <View style={[styles.container, { width: size, height: size * 1.1 }]}>
      <Svg viewBox="0 0 120 130" width={size} height={size * 1.1}>
        {/* Glow de fundo sutil */}
        <Circle
          cx="60"
          cy="65"
          r="48"
          fill={
            mood === 'celebration'
              ? aprovaFoxColors.amberSoft
              : mood === 'review'
              ? aprovaFoxColors.dangerSoft
              : aprovaFoxColors.violetSoft
          }
        />

        {/* 1. CORPO & JAQUETA MODERNA DE ESTUDOS */}
        <G>
          {/* Jaqueta Violeta */}
          <Path
            d="M32 80 L20 120 L100 120 L88 80 Z"
            fill={aprovaFoxColors.surfaceHover}
          />
          <Path
            d="M36 82 L24 120 L96 120 L84 82 Z"
            fill={aprovaFoxColors.violet}
          />

          {/* Lapela & Detalhe de Zíper / Camiseta */}
          <Polygon
            points="60,82 52,120 68,120"
            fill={aprovaFoxColors.surfacePressed}
          />
          <Path
            d="M60 82 L60 120"
            stroke={aprovaFoxColors.amber}
            strokeWidth="2"
          />

          {/* Gola Moderna */}
          <Polygon points="40,82 52,94 60,82" fill={aprovaFoxColors.violetLight} />
          <Polygon points="80,82 68,94 60,82" fill={aprovaFoxColors.violetLight} />

          {/* Pin de Aprovação na Jaqueta */}
          <Circle cx="44" cy="98" r="5" fill={aprovaFoxColors.night} />
          <Path
            d="M42 98 L44 100 L47 96"
            stroke={aprovaFoxColors.success}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </G>

        {/* 2. CABEÇA GEOMÉTRICA DA RAPOSA */}
        <G>
          {/* Orelha Esquerda */}
          <Polygon points="28,16 52,48 24,60" fill={aprovaFoxColors.amber} />
          <Polygon points="33,26 48,48 30,56" fill={aprovaFoxColors.violet} />

          {/* Orelha Direita */}
          <Polygon points="92,16 96,60 68,48" fill={aprovaFoxColors.amber} />
          <Polygon points="87,26 90,56 72,48" fill={aprovaFoxColors.violet} />

          {/* Rosto / Silhueta Principal */}
          <Polygon points="60,32 94,58 60,94 26,58" fill={aprovaFoxColors.amber} />

          {/* Bochechas Brancas / Padrão Raposa */}
          <Polygon points="60,60 26,58 44,78" fill="#FFFFFF" />
          <Polygon points="60,60 76,78 94,58" fill="#FFFFFF" />

          {/* Centro do Focinho */}
          <Polygon points="60,54 48,70 60,88 72,70" fill={aprovaFoxColors.amberLight} />

          {/* Nariz */}
          <Polygon points="60,87 56,82 64,82" fill={aprovaFoxColors.night} />

          {/* Olhos de Acordo com o Mood */}
          {mood === 'focus' ? (
            // Olhos hiper focados com óculos ou determinação
            <G>
              <Rect x="40" y="58" width="14" height="4" rx="2" fill={aprovaFoxColors.night} />
              <Rect x="66" y="58" width="14" height="4" rx="2" fill={aprovaFoxColors.night} />
            </G>
          ) : mood === 'celebration' ? (
            // Olhos sorrindo confiantes (^ ^)
            <G>
              <Path
                d="M42 62 Q47 56 52 62"
                stroke={aprovaFoxColors.night}
                strokeWidth="2.5"
                strokeLinecap="round"
                fill="none"
              />
              <Path
                d="M68 62 Q73 56 78 62"
                stroke={aprovaFoxColors.night}
                strokeWidth="2.5"
                strokeLinecap="round"
                fill="none"
              />
            </G>
          ) : (
            // Olhos espertos, alertas e confiantes
            <G>
              <Polygon points="44,58 52,62 46,64" fill={aprovaFoxColors.night} />
              <Polygon points="76,58 74,64 68,62" fill={aprovaFoxColors.night} />
              <Circle cx="47" cy="60" r="1" fill="#FFFFFF" />
              <Circle cx="73" cy="60" r="1" fill="#FFFFFF" />
            </G>
          )}

          {/* Checkmark Discreto na Testa */}
          <Circle cx="60" cy="42" r="7" fill={aprovaFoxColors.night} opacity={0.65} />
          <Path
            d="M57 42 L59 44 L64 39"
            stroke={aprovaFoxColors.success}
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </G>

        {/* 3. ELEMENTOS ADICIONAIS CONFORME O MOOD */}
        {mood === 'celebration' && (
          <G>
            {/* Estrelas / Brilhos de Conquista */}
            <Polygon points="20,30 22,34 26,36 22,38 20,42 18,38 14,36 18,34" fill={aprovaFoxColors.amber} />
            <Polygon points="102,30 104,34 108,36 104,38 102,42 100,38 96,36 100,34" fill={aprovaFoxColors.amber} />
            {/* Troféu na mão */}
            <Path
              d="M98 75 L106 75 L104 88 L100 88 Z"
              fill={aprovaFoxColors.amber}
            />
            <Circle cx="102" cy="74" r="5" fill={aprovaFoxColors.amberLight} />
          </G>
        )}

        {mood === 'review' && (
          <G>
            {/* Ícone de Lupa / Raio-X */}
            <Circle
              cx="98"
              cy="76"
              r="7"
              stroke={aprovaFoxColors.amber}
              strokeWidth="2.5"
              fill={aprovaFoxColors.surface}
            />
            <Path
              d="M103 81 L108 86"
              stroke={aprovaFoxColors.amber}
              strokeWidth="3"
              strokeLinecap="round"
            />
          </G>
        )}
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
