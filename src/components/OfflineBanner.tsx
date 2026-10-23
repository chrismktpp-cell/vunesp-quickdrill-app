import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { aprovaFoxColors, radius, weights, spacing, typography } from '../theme/aprovafox';

export const OfflineBanner: React.FC = () => {
  return (
    <View style={styles.banner}>
      <Ionicons name="shield-checkmark" size={14} color={aprovaFoxColors.success} />
      <Text style={styles.text}>100% Offline e Seguro · Seus dados e questões estão salvos no aparelho</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    backgroundColor: aprovaFoxColors.nightElevated,
    borderColor: aprovaFoxColors.border,
    borderWidth: 1,
    borderRadius: radius.control,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  text: {
    fontSize: 11,
    fontWeight: weights.meta,
    color: aprovaFoxColors.textSecondary,
  },
});

