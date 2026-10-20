import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import type { UserStats } from '../types/schema';
import { gerarObjetoBackup, validarBackup, restaurarBackup } from './storage';

/**
 * Exporta o progresso do usuário em arquivo JSON via expo-sharing.
 * Não inclui questions.json.
 */
export async function exportarBackupArquivo(stats: UserStats): Promise<void> {
  const backup = gerarObjetoBackup(stats);
  const jsonStr = JSON.stringify(backup, null, 2);

  const fileName = `vunesp_quickdrill_backup_${Date.now()}.json`;
  const fileUri = `${FileSystem.documentDirectory || FileSystem.cacheDirectory || ''}${fileName}`;

  await FileSystem.writeAsStringAsync(fileUri, jsonStr, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/json',
      dialogTitle: 'Exportar Progresso QuickDrill',
      UTI: 'public.json',
    });
  }
}

/**
 * Lê arquivo selecionado na Web via input de arquivo nativo do navegador.
 */
export function selecionarArquivoWeb(): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof document === 'undefined') {
      reject(new Error('Ambiente não possui suporte a DOM'));
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = (e: any) => {
      const file = e.target?.files?.[0];
      if (!file) {
        reject(new Error('Nenhum arquivo selecionado'));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
      reader.readAsText(file);
    };
    input.click();
  });
}
