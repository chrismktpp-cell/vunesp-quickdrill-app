import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  TextInput,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { UserStats } from '../types/schema';
import { calcularNivel, avaliarConquistas } from '../services/xpEngine';
import { triggerLightHaptic } from '../utils/haptics';
import { exportarBackupArquivo, selecionarArquivoWeb } from '../utils/backupService';
import { validarBackup } from '../utils/storage';
import { radius, typography, weights, spacing } from '../theme/tokens';

export interface ProfileScreenProps {
  stats: UserStats;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onOpenMural: () => void;
  onUpdateDailyGoal: (newGoal: number) => void;
  onResetStats: () => void;
  onRestaurarBackup?: (backupData: any) => Promise<void>;
  tokens: any;
  isDark: boolean;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  stats,
  theme,
  onToggleTheme,
  onOpenMural,
  onUpdateDailyGoal,
  onResetStats,
  onRestaurarBackup,
  tokens,
  isDark,
}) => {
  const [modalImportAberto, setModalImportAberto] = useState(false);
  const [textoJsonImport, setTextoJsonImport] = useState('');

  const xp = stats.xp || 0;
  const nivelInfo = useMemo(() => calcularNivel(xp), [xp]);
  const conquistas = useMemo(() => avaliarConquistas(stats), [stats]);

  const attempts = stats.attempts || [];
  const totalQuestoes = attempts.length;
  const totalAcertos = attempts.filter((a) => a.isCorrect).length;
  const taxaAcerto = totalQuestoes > 0 ? Math.round((totalAcertos / totalQuestoes) * 100) : 0;
  const simuladosFeitos = stats.simuladosHistorico?.length || 0;
  const metaDiariaAtual = stats.metaDiaria || 15;

  const handleExportar = async () => {
    triggerLightHaptic();
    try {
      await exportarBackupArquivo(stats);
    } catch (e: any) {
      Alert.alert('Erro ao Exportar', e?.message || 'Falha na exportação.');
    }
  };

  const executarRestauracao = (data: any) => {
    Alert.alert(
      'Restaurar Backup',
      'Tem certeza? Esta ação substituirá o progresso deste aparelho pelo conteúdo do backup.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          style: 'destructive',
          onPress: () => {
            if (onRestaurarBackup) {
              onRestaurarBackup(data);
            }
          },
        },
      ]
    );
  };

  const handleImportarArquivo = async () => {
    triggerLightHaptic();
    if (Platform.OS === 'web') {
      try {
        const conteudo = await selecionarArquivoWeb();
        const validacao = validarBackup(conteudo);
        if (validacao.valido && validacao.data) {
          executarRestauracao(validacao.data);
        } else {
          Alert.alert('Backup Inválido', validacao.erro || 'Formato de arquivo incompatível.');
        }
      } catch (err: any) {
        Alert.alert('Erro', err?.message || 'Falha ao ler arquivo.');
      }
    } else {
      setModalImportAberto(true);
    }
  };

  const handleConfirmarImportTexto = () => {
    if (!textoJsonImport.trim()) {
      Alert.alert('Aviso', 'Cole o texto JSON do seu backup para restaurar.');
      return;
    }
    const validacao = validarBackup(textoJsonImport);
    if (validacao.valido && validacao.data) {
      setModalImportAberto(false);
      setTextoJsonImport('');
      executarRestauracao(validacao.data);
    } else {
      Alert.alert('JSON Inválido', validacao.erro || 'Formato incorreto.');
    }
  };

  const metasDisponiveis = [10, 15, 20, 30];

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { backgroundColor: tokens.bg }]}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. PERFIL DO ESTUDANTE */}
      <View
        style={[
          styles.profileHero,
          { backgroundColor: tokens.cardBg, borderColor: tokens.cardBorder },
        ]}
      >
        <View style={[styles.avatarCircle, { backgroundColor: 'rgba(37, 99, 235, 0.15)' }]}>
          <Ionicons name="school" size={44} color={tokens.primary} />
        </View>

        <View style={styles.heroInfo}>
          <View style={styles.nivelBadge}>
            <Ionicons name="ribbon" size={14} color="#ffffff" />
            <Text style={styles.nivelBadgeText}>Nível {nivelInfo.nivel}</Text>
          </View>
          <Text style={[styles.tituloNivel, { color: tokens.textPrimary }]}>
            {nivelInfo.titulo}
          </Text>
          <Text style={[styles.cargoText, { color: tokens.textMuted }]}>
            Agente de Vigilância Patrimonial · Itanhaém
          </Text>
        </View>

        {/* Barra de XP para o próximo nível */}
        <View style={styles.xpProgressContainer}>
          <View style={styles.xpLabelRow}>
            <Text style={[styles.xpLabel, { color: tokens.textMuted }]}>
              {xp} XP Acumulados
            </Text>
            <Text style={[styles.xpNextLabel, { color: tokens.textMuted }]}>
              Próximo nível: {nivelInfo.xpProximoNivel} XP
            </Text>
          </View>
          <View style={[styles.xpTrack, { backgroundColor: tokens.surface }]}>
            <View
              style={[
                styles.xpFill,
                { width: `${nivelInfo.progressoPercentual}%`, backgroundColor: tokens.warning },
              ]}
            />
          </View>
        </View>
      </View>

      {/* 2. ESTATÍSTICAS ACUMULADAS */}
      <View style={styles.statsGrid}>
        <View
          style={[
            styles.statCard,
            { backgroundColor: tokens.cardBg, borderColor: tokens.cardBorder },
          ]}
        >
          <Ionicons name="flame" size={20} color={tokens.warning} />
          <Text style={[styles.statValue, { color: tokens.textPrimary }]}>
            {stats.streak || 0}d
          </Text>
          <Text style={[styles.statLabel, { color: tokens.textMuted }]}>Sequência</Text>
        </View>

        <View
          style={[
            styles.statCard,
            { backgroundColor: tokens.cardBg, borderColor: tokens.cardBorder },
          ]}
        >
          <Ionicons name="checkmark-done" size={20} color={tokens.success} />
          <Text style={[styles.statValue, { color: tokens.textPrimary }]}>
            {taxaAcerto}%
          </Text>
          <Text style={[styles.statLabel, { color: tokens.textMuted }]}>Taxa Geral</Text>
        </View>

        <View
          style={[
            styles.statCard,
            { backgroundColor: tokens.cardBg, borderColor: tokens.cardBorder },
          ]}
        >
          <Ionicons name="help-circle" size={20} color={tokens.primary} />
          <Text style={[styles.statValue, { color: tokens.textPrimary }]}>
            {totalQuestoes}
          </Text>
          <Text style={[styles.statLabel, { color: tokens.textMuted }]}>Resolvidas</Text>
        </View>

        <View
          style={[
            styles.statCard,
            { backgroundColor: tokens.cardBg, borderColor: tokens.cardBorder },
          ]}
        >
          <Ionicons name="clipboard" size={20} color={tokens.primary} />
          <Text style={[styles.statValue, { color: tokens.textPrimary }]}>
            {simuladosFeitos}
          </Text>
          <Text style={[styles.statLabel, { color: tokens.textMuted }]}>Simulados</Text>
        </View>
      </View>

      {/* 3. GALERIA DE CONQUISTAS */}
      <View
        style={[
          styles.sectionCard,
          { backgroundColor: tokens.cardBg, borderColor: tokens.cardBorder },
        ]}
      >
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="trophy" size={20} color={tokens.warning} />
            <Text style={[styles.sectionTitle, { color: tokens.textPrimary }]}>
              Medalhas e Conquistas
            </Text>
          </View>
          <Text style={[styles.sectionCounter, { color: tokens.textMuted }]}>
            {conquistas.filter((c) => c.desbloqueada).length} de {conquistas.length}
          </Text>
        </View>

        <View style={styles.conquistasGrid}>
          {conquistas.map((item) => (
            <View
              key={item.id}
              style={[
                styles.conquistaItem,
                {
                  backgroundColor: item.desbloqueada ? tokens.surface : 'transparent',
                  borderColor: item.desbloqueada ? tokens.warning : tokens.cardBorder,
                  opacity: item.desbloqueada ? 1 : 0.45,
                },
              ]}
            >
              <Text style={styles.conquistaIcon}>{item.icone}</Text>
              <View style={styles.conquistaTextCol}>
                <Text
                  style={[
                    styles.conquistaTitulo,
                    { color: item.desbloqueada ? tokens.textPrimary : tokens.textMuted },
                  ]}
                >
                  {item.titulo}
                </Text>
                <Text style={[styles.conquistaDesc, { color: tokens.textMuted }]}>
                  {item.descricao}
                </Text>
              </View>
              {item.desbloqueada && (
                <Ionicons name="checkmark-circle" size={18} color={tokens.success} />
              )}
            </View>
          ))}
        </View>
      </View>

      {/* 4. AJUSTE DE META DIÁRIA */}
      <View
        style={[
          styles.sectionCard,
          { backgroundColor: tokens.cardBg, borderColor: tokens.cardBorder },
        ]}
      >
        <View style={styles.sectionTitleRow}>
          <Ionicons name="flag" size={19} color={tokens.primary} />
          <Text style={[styles.sectionTitle, { color: tokens.textPrimary }]}>
            Meta Diária de Questões
          </Text>
        </View>
        <Text style={[styles.sectionDesc, { color: tokens.textMuted }]}>
          Defina quantas questões deseja resolver por dia para manter o ritmo e a aprovação.
        </Text>

        <View style={styles.metasRow}>
          {metasDisponiveis.map((meta) => {
            const isSelected = metaDiariaAtual === meta;
            return (
              <TouchableOpacity
                key={meta}
                onPress={() => {
                  triggerLightHaptic();
                  onUpdateDailyGoal(meta);
                }}
                activeOpacity={0.85}
                style={[
                  styles.metaBtn,
                  {
                    backgroundColor: isSelected ? tokens.primary : tokens.surface,
                    borderColor: isSelected ? tokens.primary : tokens.cardBorder,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.metaBtnText,
                    { color: isSelected ? '#ffffff' : tokens.textPrimary },
                  ]}
                >
                  {meta}
                </Text>
                <Text
                  style={[
                    styles.metaBtnSub,
                    { color: isSelected ? '#ffffff' : tokens.textMuted },
                  ]}
                >
                  questões
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* 5. PREFERÊNCIAS E ATALHOS */}
      <View
        style={[
          styles.sectionCard,
          { backgroundColor: tokens.cardBg, borderColor: tokens.cardBorder },
        ]}
      >
        <Text style={[styles.sectionTitle, { color: tokens.textPrimary, marginBottom: 8 }]}>
          Preferências e Recursos
        </Text>

        {/* Mural de Macetes Shortcut */}
        <TouchableOpacity
          onPress={() => {
            triggerLightHaptic();
            onOpenMural();
          }}
          activeOpacity={0.85}
          style={[
            styles.actionRow,
            {
              backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#fffbeb',
              borderColor: tokens.warning,
            },
          ]}
        >
          <View style={styles.actionRowLeft}>
            <Ionicons name="bulb" size={20} color={tokens.warning} />
            <View>
              <Text style={[styles.actionRowTitle, { color: tokens.warning }]}>
                Mural de Macetes & Raio-X
              </Text>
              <Text style={[styles.actionRowSub, { color: tokens.textMuted }]}>
                Dicas rápidas e pegadinhas da VUNESP
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={tokens.warning} />
        </TouchableOpacity>

        {/* Alternância de Tema */}
        <TouchableOpacity
          onPress={onToggleTheme}
          activeOpacity={0.85}
          style={[
            styles.actionRow,
            { backgroundColor: tokens.surface, borderColor: tokens.cardBorder },
          ]}
        >
          <View style={styles.actionRowLeft}>
            <Ionicons
              name={theme === 'dark' ? 'moon' : 'sunny'}
              size={20}
              color={theme === 'dark' ? tokens.primary : tokens.warning}
            />
            <View>
              <Text style={[styles.actionRowTitle, { color: tokens.textPrimary }]}>
                Tema do Aplicativo
              </Text>
              <Text style={[styles.actionRowSub, { color: tokens.textMuted }]}>
                Atualmente: {theme === 'dark' ? 'Modo Escuro' : 'Modo Claro'}
              </Text>
            </View>
          </View>
          <Text style={[styles.toggleText, { color: tokens.primary }]}>Alternar</Text>
        </TouchableOpacity>
      </View>

      {/* 6. BACKUP & SEGURANÇA */}
      <View
        style={[
          styles.sectionCard,
          { backgroundColor: tokens.cardBg, borderColor: tokens.cardBorder },
        ]}
      >
        <View style={styles.sectionTitleRow}>
          <Ionicons name="shield-checkmark" size={19} color={tokens.primary} />
          <Text style={[styles.sectionTitle, { color: tokens.textPrimary }]}>
            Backup & Segurança de Dados
          </Text>
        </View>
        <Text style={[styles.sectionDesc, { color: tokens.textMuted }]}>
          Seus dados de estudo estão seguros localmente (envelope v2). Exporte ou restaure seu progresso sempre que desejar.
        </Text>

        <View style={styles.backupButtonsRow}>
          <TouchableOpacity
            onPress={handleExportar}
            activeOpacity={0.85}
            style={[
              styles.backupBtn,
              { backgroundColor: tokens.surface, borderColor: tokens.cardBorder },
            ]}
          >
            <Ionicons name="cloud-download-outline" size={18} color={tokens.primary} />
            <Text style={[styles.backupBtnText, { color: tokens.textPrimary }]}>
              Exportar JSON
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleImportarArquivo}
            activeOpacity={0.85}
            style={[
              styles.backupBtn,
              { backgroundColor: tokens.surface, borderColor: tokens.cardBorder },
            ]}
          >
            <Ionicons name="cloud-upload-outline" size={18} color={tokens.primary} />
            <Text style={[styles.backupBtnText, { color: tokens.textPrimary }]}>
              Restaurar
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={() => {
            Alert.alert(
              'Zerar Progresso',
              'Tem certeza de que deseja resetar todo o progresso de questões, SRS e histórico?',
              [
                { text: 'Cancelar', style: 'cancel' },
                {
                  text: 'Zerar Tudo',
                  style: 'destructive',
                  onPress: () => {
                    triggerLightHaptic();
                    onResetStats();
                  },
                },
              ]
            );
          }}
          activeOpacity={0.85}
          style={styles.dangerActionBtn}
        >
          <Ionicons name="trash-outline" size={16} color={tokens.danger} />
          <Text style={[styles.dangerActionText, { color: tokens.danger }]}>
            Limpar todos os dados locais
          </Text>
        </TouchableOpacity>
      </View>

      {/* MODAL DE IMPORTAÇÃO TEXTO */}
      <Modal
        visible={modalImportAberto}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalImportAberto(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: tokens.cardBg, borderColor: tokens.cardBorder },
            ]}
          >
            <Text style={[styles.modalTitle, { color: tokens.textPrimary }]}>
              Restaurar Backup JSON
            </Text>
            <Text style={[styles.modalSub, { color: tokens.textMuted }]}>
              Cole o conteúdo JSON do seu backup abaixo para restaurar o histórico:
            </Text>
            <TextInput
              style={[
                styles.modalInput,
                {
                  backgroundColor: tokens.surface,
                  borderColor: tokens.cardBorder,
                  color: tokens.textPrimary,
                },
              ]}
              multiline
              numberOfLines={8}
              placeholder='{"versao": 2, ...}'
              placeholderTextColor={tokens.textMuted}
              value={textoJsonImport}
              onChangeText={setTextoJsonImport}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setModalImportAberto(false)}
                style={[styles.modalBtn, { backgroundColor: tokens.surface }]}
              >
                <Text style={{ color: tokens.textPrimary }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleConfirmarImportTexto}
                style={[styles.modalBtn, { backgroundColor: tokens.primary }]}
              >
                <Text style={{ color: '#ffffff', fontWeight: 'bold' }}>Restaurar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.block,
    paddingBottom: 40,
    gap: 16,
  },
  profileHero: {
    padding: 20,
    borderRadius: radius.card,
    borderWidth: 1,
    alignItems: 'center',
    gap: 12,
  },
  avatarCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroInfo: {
    alignItems: 'center',
    gap: 4,
  },
  nivelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#2563eb',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  nivelBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: weights.title,
  },
  tituloNivel: {
    fontSize: 20,
    fontWeight: weights.title,
    marginTop: 4,
  },
  cargoText: {
    fontSize: typography.caption,
    textAlign: 'center',
  },
  xpProgressContainer: {
    width: '100%',
    gap: 6,
    marginTop: 8,
  },
  xpLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  xpLabel: {
    fontSize: typography.caption,
    fontWeight: weights.meta,
  },
  xpNextLabel: {
    fontSize: typography.caption,
  },
  xpTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  xpFill: {
    height: '100%',
    borderRadius: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    padding: 12,
    borderRadius: radius.card,
    borderWidth: 1,
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontSize: 18,
    fontWeight: weights.title,
    marginTop: 2,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: weights.body,
  },
  sectionCard: {
    padding: 16,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: typography.body,
    fontWeight: weights.title,
  },
  sectionCounter: {
    fontSize: typography.caption,
    fontWeight: weights.meta,
  },
  sectionDesc: {
    fontSize: typography.caption,
    lineHeight: 18,
  },
  conquistasGrid: {
    gap: 8,
  },
  conquistaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: radius.control,
    borderWidth: 1,
    gap: 12,
  },
  conquistaIcon: {
    fontSize: 24,
  },
  conquistaTextCol: {
    flex: 1,
  },
  conquistaTitulo: {
    fontSize: 13,
    fontWeight: weights.title,
  },
  conquistaDesc: {
    fontSize: 11,
    marginTop: 2,
  },
  metasRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  metaBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.control,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaBtnText: {
    fontSize: 18,
    fontWeight: weights.title,
  },
  metaBtnSub: {
    fontSize: 10,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: radius.control,
    borderWidth: 1,
  },
  actionRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  actionRowTitle: {
    fontSize: 14,
    fontWeight: weights.title,
  },
  actionRowSub: {
    fontSize: 11,
    marginTop: 2,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: weights.title,
  },
  backupButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  backupBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: radius.control,
    borderWidth: 1,
  },
  backupBtnText: {
    fontSize: 13,
    fontWeight: weights.meta,
  },
  dangerActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    marginTop: 4,
  },
  dangerActionText: {
    fontSize: 12,
    fontWeight: weights.meta,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    padding: 20,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: weights.title,
  },
  modalSub: {
    fontSize: typography.caption,
  },
  modalInput: {
    height: 120,
    borderRadius: radius.control,
    borderWidth: 1,
    padding: 10,
    textAlignVertical: 'top',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.control,
  },
});
