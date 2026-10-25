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
import { aprovaFoxColors, radius, typography, weights, spacing } from '../theme/aprovafox';
import { AprovaFoxLogo } from './AprovaFoxLogo';

export interface ProfileScreenProps {
  stats: UserStats;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onOpenMural: () => void;
  onUpdateDailyGoal: (newGoal: number) => void;
  onResetStats: () => void;
  onRestaurarBackup?: (backupData: any) => Promise<void>;
  tokens?: any;
  isDark?: boolean;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  stats,
  theme,
  onToggleTheme,
  onOpenMural,
  onUpdateDailyGoal,
  onResetStats,
  onRestaurarBackup,
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
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. PERFIL DO ESTUDANTE COM IDENTIDADE APROVAFOX */}
      <View style={styles.profileHero}>
        <View style={styles.avatarCircle}>
          <AprovaFoxLogo size={52} />
        </View>

        <View style={styles.heroInfo}>
          <View style={styles.nivelBadge}>
            <Ionicons name="sparkles" size={13} color={aprovaFoxColors.amber} />
            <Text style={styles.nivelBadgeText}>Nível {nivelInfo.nivel} · {nivelInfo.titulo}</Text>
          </View>
          <Text style={styles.sloganText}>"Estude esperto. Passe preparado."</Text>
          <Text style={styles.cargoText}>
            Prefeitura de Itanhaém · Agente de Vigilância Patrimonial
          </Text>
        </View>

        {/* Barra de XP para o próximo nível */}
        <View style={styles.xpProgressContainer}>
          <View style={styles.xpLabelRow}>
            <Text style={styles.xpLabel}>
              {xp} XP Acumulados
            </Text>
            <Text style={styles.xpNextLabel}>
              Próximo nível: {nivelInfo.xpProximoNivel} XP
            </Text>
          </View>
          <View style={styles.xpTrack}>
            <View
              style={[
                styles.xpFill,
                { width: `${nivelInfo.progressoPercentual}%` },
              ]}
            />
          </View>
        </View>
      </View>

      {/* 2. ESTATÍSTICAS ACUMULADAS */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Ionicons name="flame" size={20} color={aprovaFoxColors.amber} />
          <Text style={styles.statValue}>
            {stats.streak || 0}d
          </Text>
          <Text style={styles.statLabel}>Sequência</Text>
        </View>

        <View style={styles.statCard}>
          <Ionicons name="checkmark-done" size={20} color={aprovaFoxColors.success} />
          <Text style={styles.statValue}>
            {taxaAcerto}%
          </Text>
          <Text style={styles.statLabel}>Taxa Geral</Text>
        </View>

        <View style={styles.statCard}>
          <Ionicons name="help-circle" size={20} color={aprovaFoxColors.violet} />
          <Text style={styles.statValue}>
            {totalQuestoes}
          </Text>
          <Text style={styles.statLabel}>Resolvidas</Text>
        </View>

        <View style={styles.statCard}>
          <Ionicons name="clipboard" size={20} color={aprovaFoxColors.info} />
          <Text style={styles.statValue}>
            {simuladosFeitos}
          </Text>
          <Text style={styles.statLabel}>Simulados</Text>
        </View>
      </View>

      {/* 3. MURAL DE CONQUISTAS E MEDALHAS DE MÉRITO */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.trophyIconWrap}>
              <Ionicons name="trophy" size={20} color={aprovaFoxColors.amber} />
            </View>
            <View>
              <Text style={styles.sectionTitle}>
                Mural de Conquistas e Medalhas
              </Text>
              <Text style={styles.sectionSubTitle}>
                Reconhecimento de mérito e constância concurseira
              </Text>
            </View>
          </View>
          <View style={styles.badgeProgressPill}>
            <Text style={styles.badgeProgressText}>
              {conquistas.filter((c) => c.desbloqueada).length} / {conquistas.length}
            </Text>
          </View>
        </View>

        {/* Barra de Progresso Geral das Conquistas */}
        <View style={styles.conquistasTrack}>
          <View
            style={[
              styles.conquistasFill,
              {
                width: `${Math.round((conquistas.filter((c) => c.desbloqueada).length / Math.max(1, conquistas.length)) * 100)}%`,
              },
            ]}
          />
        </View>

        <View style={styles.conquistasGrid}>
          {conquistas.map((item) => {
            const metaVal = item.progressoMeta || 1;
            const pct = Math.min(100, Math.round(((item.progressoAtual || 0) / metaVal) * 100));
            return (
              <View
                key={item.id}
                style={[
                  styles.conquistaItem,
                  item.desbloqueada ? styles.conquistaDesbloqueada : styles.conquistaBloqueada,
                ]}
              >
                {/* Ícone da Medalha */}
                <View
                  style={[
                    styles.medalhaCircle,
                    item.desbloqueada ? styles.medalhaCircleUnlocked : styles.medalhaCircleLocked,
                  ]}
                >
                  <Ionicons
                    name={item.desbloqueada ? (item.icone as any) : 'lock-closed'}
                    size={22}
                    color={item.desbloqueada ? '#FFB547' : '#64748b'}
                  />
                </View>

                {/* Conteúdo textual */}
                <View style={styles.conquistaTextCol}>
                  <View style={styles.conquistaTitleRow}>
                    <Text
                      style={[
                        styles.conquistaTitulo,
                        { color: item.desbloqueada ? '#f8fafc' : '#94a3b8' },
                      ]}
                    >
                      {item.titulo}
                    </Text>
                    {item.desbloqueada ? (
                      <View style={styles.unlockedBadgePill}>
                        <Ionicons name="checkmark-circle" size={12} color="#10b981" />
                        <Text style={styles.unlockedBadgeText}>Conquistada</Text>
                      </View>
                    ) : (
                      <Text style={styles.progressPercentText}>{pct}%</Text>
                    )}
                  </View>
                  <Text style={styles.conquistaDesc}>
                    {item.descricao}
                  </Text>

                  {/* Barra de Progresso individual se bloqueada */}
                  {!item.desbloqueada && (
                    <View style={styles.individualProgressRow}>
                      <View style={styles.individualProgressTrack}>
                        <View style={[styles.individualProgressFill, { width: `${pct}%` }]} />
                      </View>
                      <Text style={styles.individualProgressFraction}>
                        {item.progressoAtual || 0}/{metaVal}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </View>

      {/* 4. AJUSTE DE META DIÁRIA */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="flag" size={19} color={aprovaFoxColors.violet} />
          <Text style={styles.sectionTitle}>
            Meta Diária de Questões
          </Text>
        </View>
        <Text style={styles.sectionDesc}>
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
                  isSelected && styles.metaBtnActive,
                ]}
              >
                <Text
                  style={[
                    styles.metaBtnText,
                    { color: isSelected ? '#FFFFFF' : aprovaFoxColors.text },
                  ]}
                >
                  {meta}
                </Text>
                <Text
                  style={[
                    styles.metaBtnSub,
                    { color: isSelected ? '#FFFFFF' : aprovaFoxColors.textSecondary },
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
      <View style={styles.sectionCard}>
        <Text style={[styles.sectionTitle, { marginBottom: 8 }]}>
          Recursos e Ferramentas
        </Text>

        {/* Mural de Macetes Shortcut */}
        <TouchableOpacity
          onPress={() => {
            triggerLightHaptic();
            onOpenMural();
          }}
          activeOpacity={0.85}
          style={styles.actionRow}
        >
          <View style={styles.actionRowLeft}>
            <Ionicons name="bulb" size={20} color={aprovaFoxColors.amber} />
            <View>
              <Text style={[styles.actionRowTitle, { color: aprovaFoxColors.amber }]}>
                Mural de Macetes & Raio-X
              </Text>
              <Text style={styles.actionRowSub}>
                Dicas rápidas e pegadinhas da VUNESP
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={aprovaFoxColors.amber} />
        </TouchableOpacity>

        {/* Alternância de Tema */}
        <TouchableOpacity
          onPress={onToggleTheme}
          activeOpacity={0.85}
          style={styles.themeToggleRow}
        >
          <View style={styles.actionRowLeft}>
            <Ionicons
              name={theme === 'dark' ? 'moon' : 'sunny'}
              size={20}
              color={theme === 'dark' ? aprovaFoxColors.violet : aprovaFoxColors.amber}
            />
            <View>
              <Text style={styles.actionRowTitle}>
                Tema do Aplicativo
              </Text>
              <Text style={styles.actionRowSub}>
                Atualmente: {theme === 'dark' ? 'Modo Noturno AprovaFox' : 'Modo Claro'}
              </Text>
            </View>
          </View>
          <Text style={styles.toggleText}>Alternar</Text>
        </TouchableOpacity>
      </View>

      {/* 6. BACKUP & SEGURANÇA */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="shield-checkmark" size={19} color={aprovaFoxColors.success} />
          <Text style={styles.sectionTitle}>
            Backup & Segurança de Dados
          </Text>
        </View>
        <Text style={styles.sectionDesc}>
          Seus dados de estudo estão seguros localmente (envelope v2). Exporte ou restaure seu progresso sempre que desejar.
        </Text>

        <View style={styles.backupButtonsRow}>
          <TouchableOpacity
            onPress={handleExportar}
            activeOpacity={0.85}
            style={styles.backupBtn}
          >
            <Ionicons name="cloud-download-outline" size={18} color={aprovaFoxColors.violet} />
            <Text style={styles.backupBtnText}>
              Exportar JSON
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleImportarArquivo}
            activeOpacity={0.85}
            style={styles.backupBtn}
          >
            <Ionicons name="cloud-upload-outline" size={18} color={aprovaFoxColors.violet} />
            <Text style={styles.backupBtnText}>
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
          <Ionicons name="trash-outline" size={16} color={aprovaFoxColors.danger} />
          <Text style={styles.dangerActionText}>
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
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Restaurar Backup JSON
            </Text>
            <Text style={styles.modalSub}>
              Cole o conteúdo JSON do seu backup abaixo para restaurar o histórico:
            </Text>
            <TextInput
              style={styles.modalInput}
              multiline
              numberOfLines={8}
              placeholder='{"v": 2, ...}'
              placeholderTextColor={aprovaFoxColors.textMuted}
              value={textoJsonImport}
              onChangeText={setTextoJsonImport}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setModalImportAberto(false)}
                style={styles.modalCancelBtn}
              >
                <Text style={{ color: aprovaFoxColors.text }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleConfirmarImportTexto}
                style={styles.modalConfirmBtn}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>Restaurar</Text>
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
    backgroundColor: aprovaFoxColors.night,
  },
  profileHero: {
    backgroundColor: aprovaFoxColors.surface,
    borderColor: aprovaFoxColors.border,
    borderWidth: 1.5,
    padding: 20,
    borderRadius: radius.card,
    alignItems: 'center',
    gap: 12,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: aprovaFoxColors.nightElevated,
    borderColor: aprovaFoxColors.violet,
    borderWidth: 2,
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
    gap: 6,
    backgroundColor: aprovaFoxColors.amberSoft,
    borderColor: aprovaFoxColors.amber,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  nivelBadgeText: {
    color: aprovaFoxColors.amber,
    fontSize: 12,
    fontWeight: weights.title,
  },
  sloganText: {
    fontSize: 12,
    fontStyle: 'italic',
    color: aprovaFoxColors.textSecondary,
    marginTop: 2,
  },
  cargoText: {
    fontSize: typography.caption,
    textAlign: 'center',
    color: aprovaFoxColors.textMuted,
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
    color: aprovaFoxColors.amber,
  },
  xpNextLabel: {
    fontSize: typography.caption,
    color: aprovaFoxColors.textMuted,
  },
  xpTrack: {
    height: 7,
    backgroundColor: aprovaFoxColors.nightElevated,
    borderRadius: 3.5,
    overflow: 'hidden',
  },
  xpFill: {
    height: '100%',
    backgroundColor: aprovaFoxColors.amber,
    borderRadius: 3.5,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: aprovaFoxColors.surface,
    borderColor: aprovaFoxColors.border,
    borderWidth: 1.5,
    padding: 12,
    borderRadius: radius.card,
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontSize: 18,
    fontWeight: weights.title,
    color: aprovaFoxColors.text,
    marginTop: 2,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: weights.meta,
    color: aprovaFoxColors.textMuted,
  },
  sectionCard: {
    backgroundColor: aprovaFoxColors.surface,
    borderColor: aprovaFoxColors.border,
    borderWidth: 1.5,
    padding: 16,
    borderRadius: radius.card,
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
    fontSize: typography.label,
    fontWeight: weights.title,
    color: aprovaFoxColors.text,
  },
  sectionCounter: {
    fontSize: typography.caption,
    fontWeight: weights.meta,
    color: aprovaFoxColors.amber,
  },
  sectionDesc: {
    fontSize: typography.caption,
    color: aprovaFoxColors.textSecondary,
    lineHeight: 18,
  },
  trophyIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 181, 71, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionSubTitle: {
    fontSize: 11,
    color: aprovaFoxColors.textMuted,
    marginTop: 2,
  },
  badgeProgressPill: {
    backgroundColor: 'rgba(255, 181, 71, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255, 181, 71, 0.3)',
  },
  badgeProgressText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFB547',
  },
  conquistasTrack: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 3,
    overflow: 'hidden',
    marginVertical: 4,
  },
  conquistasFill: {
    height: '100%',
    backgroundColor: '#FFB547',
    borderRadius: 3,
  },
  conquistasGrid: {
    gap: 10,
    marginTop: 6,
  },
  conquistaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: radius.card,
    borderWidth: 1.5,
    gap: 12,
  },
  conquistaDesbloqueada: {
    backgroundColor: aprovaFoxColors.nightElevated,
    borderColor: '#FFB547',
    shadowColor: '#FFB547',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
  },
  conquistaBloqueada: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    opacity: 0.65,
  },
  medalhaCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medalhaCircleUnlocked: {
    backgroundColor: 'rgba(255, 181, 71, 0.2)',
    borderWidth: 1.5,
    borderColor: '#FFB547',
  },
  medalhaCircleLocked: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  conquistaTextCol: {
    flex: 1,
  },
  conquistaTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  conquistaTitulo: {
    fontSize: 13,
    fontWeight: weights.title,
  },
  unlockedBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  unlockedBadgeText: {
    color: '#10b981',
    fontSize: 10,
    fontWeight: '700',
  },
  progressPercentText: {
    fontSize: 10,
    fontWeight: '700',
    color: aprovaFoxColors.textMuted,
  },
  conquistaDesc: {
    fontSize: 11,
    color: aprovaFoxColors.textMuted,
    lineHeight: 15,
  },
  individualProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  individualProgressTrack: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  individualProgressFill: {
    height: '100%',
    backgroundColor: '#7657F6',
    borderRadius: 2,
  },
  individualProgressFraction: {
    fontSize: 10,
    fontWeight: '600',
    color: aprovaFoxColors.textMuted,
  },
  metasRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  metaBtn: {
    flex: 1,
    backgroundColor: aprovaFoxColors.nightElevated,
    borderColor: aprovaFoxColors.border,
    borderWidth: 1,
    paddingVertical: 12,
    borderRadius: radius.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaBtnActive: {
    backgroundColor: aprovaFoxColors.violet,
    borderColor: aprovaFoxColors.violet,
  },
  metaBtnText: {
    fontSize: 17,
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
    backgroundColor: aprovaFoxColors.amberSoft,
    borderColor: aprovaFoxColors.amber,
    borderWidth: 1,
    padding: 14,
    borderRadius: radius.control,
  },
  themeToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: aprovaFoxColors.nightElevated,
    borderColor: aprovaFoxColors.border,
    borderWidth: 1,
    padding: 14,
    borderRadius: radius.control,
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
    color: aprovaFoxColors.text,
  },
  actionRowSub: {
    fontSize: 11,
    color: aprovaFoxColors.textMuted,
    marginTop: 2,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: weights.title,
    color: aprovaFoxColors.violetLight,
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
    backgroundColor: aprovaFoxColors.nightElevated,
    borderColor: aprovaFoxColors.border,
    borderWidth: 1,
    paddingVertical: 12,
    borderRadius: radius.control,
  },
  backupBtnText: {
    fontSize: 13,
    fontWeight: weights.meta,
    color: aprovaFoxColors.text,
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
    color: aprovaFoxColors.danger,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: aprovaFoxColors.surface,
    borderColor: aprovaFoxColors.border,
    borderWidth: 1.5,
    padding: 20,
    borderRadius: radius.card,
    gap: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: weights.title,
    color: aprovaFoxColors.text,
  },
  modalSub: {
    fontSize: typography.caption,
    color: aprovaFoxColors.textSecondary,
  },
  modalInput: {
    height: 120,
    backgroundColor: aprovaFoxColors.night,
    borderColor: aprovaFoxColors.border,
    color: aprovaFoxColors.text,
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
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.control,
    backgroundColor: aprovaFoxColors.nightElevated,
  },
  modalConfirmBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.control,
    backgroundColor: aprovaFoxColors.violet,
  },
});
