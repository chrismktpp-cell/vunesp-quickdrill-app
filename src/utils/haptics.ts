import * as Haptics from 'expo-haptics';
import type { PerformanceClassification, CertaintyLevel } from '../types/schema';

/**
 * Dispara feedback tátil após resposta do usuário:
 * - acerto certeza 3 = success
 * - ponto cego (erro certeza 3) = error
 * - resto: certeza 1 = light, certeza 2 = medium
 */
export function triggerResponseHaptic(
  isCorrect: boolean,
  certainty: CertaintyLevel,
  classification: PerformanceClassification
): void {
  if (isCorrect) {
    if (certainty === 3) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } else if (certainty === 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
  } else {
    if (classification === 'blind_spot') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    } else if (certainty === 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
  }
}

export function triggerLightHaptic(): void {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export function triggerSuccessHaptic(): void {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}
