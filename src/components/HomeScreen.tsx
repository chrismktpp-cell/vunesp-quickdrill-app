import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { UserStats, Question, CategoryType } from '../types/schema';
import { calcularNivel, calcularProgressoMeta } from '../services/xpEngine';
import { radius, typography, weights, spacing, shadows } from '../theme/tokens';
import { triggerLightHaptic, triggerSuccessHaptic } from '../utils/haptics';

interface HomeScreenProps {
  stats: UserStats;
  totalQuestoesDisponiveis: number;
  revisoesPendentesCount: number;
  novasQuestoesCount: number;
  onContinuarEstudando: () => void;
  onIniciarSimulado: () => void;
  onIrParaEstudo: (category?: CategoryType) => void;
  onIrParaMural: () => void;
  onToggleTheme: () => void;
  isDark: boolean;
  tokens: any;
  categories: CategoryType[];
  getCategoryColor: (cat: CategoryType) => {
    accent: string;
    soft: string;
    border: string;
    badgeText: string;
  };
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  stats,
  totalQuestoesDisponiveis,
  revisoesPendentesCount,
  novasQuestoesCount,
  onContinuarEstudando,
  onIniciarSimulado,
  onIrParaEstudo,
  onIrParaMural,
  onToggleTheme,
  isDark,
  tokens,
  categories,
  getCategoryColor,
}) => {
  const xpTotal = stats.xp ?? 0;
  const nivelInfo = calcularNivel(xpTotal);
  const metaDiaria = stats.metaDiaria ?? 15;
  const questoesHoje = stats.questoesHoje ?? 0;
  const metaProgresso = calcularProgressoMeta(questoesHoje, metaDiaria);

  // Saudação com base na hora local
  const hora = new Date().getHours();
  const saudacao =
    hora < 12 ? 'Bom dia, Concurseiro!' : hora < 18 ? 'Boa tarde, Concurseiro!' : 'Boa noite, Concurseiro!';

  // Concurso e Cargo Ativos
  const concursoAtivo = 'Câmara Municipal de Itanhaém';
  const cargoAtivo = 'Agente Legislativo / Segurança';
  const bancaAtiva = 'VUNESP';

  // Matérias que mais precisam de estudo (mais erros ou menor taxa)
  const materiasRecomendadas = React.useMemo(() => {
    return categories
      .map((cat) => {
        const catStats = stats.porCategoria?.[cat] || { acertos: 0, erros: 0 };
        const total = catStats.acertos + catStats.erros;
        const taxa = total > 0 ? Math.round((catStats.acertos / total) * 100) : null;
        return {
          categoria: cat,
          acertos: catStats.acertos,
          erros: catStats.erros,
          total,
          taxa,
        };
      })
      .sort((a, b) => {
        // Prioriza as que têm erros ou menor taxa
        if (a.taxa !== null && b.taxa !== null) return a.taxa - b.taxa;
        if (a.erros !== b.erros) return b.erros - a.erros;
        return 0;
      })
      .slice(0, 3);
  }, [categories, stats.porCategoria]);

  const totalRespondidas = (stats.totalAcertos ?? 0) + (stats.totalErros ?? 0);
  const taxaGeral =
    totalRespondidas > 0 ? Math.round(((stats.totalAcertos ?? 0) / totalRespondidas) * 100) : 0;

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { backgroundColor: tokens.bg }]}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. TOPO: SAUDAÇÃO & BADGES DE ENERGIA/STREAK */}
      <View style={styles.header}>
        <View style={styles.headerUser}>
          <Text style={[styles.greetingSub, { color: tokens.textMuted }]}>{saudacao}</Text>
          <View style={styles.userTitleRow}>
            <Text style={[styles.userName, { color: tokens.textPrimary }]}>{nivelInfo.titulo}</Text>
            <View style={[styles.levelPill, { backgroundColor: tokens.purpleSoft }]}>
              <Text style={[styles.levelPillText, { color: tokens.purple }]}>Nv. {nivelInfo.nivel}</Text>
            </View>
          </View>
        </View>

        <View style={styles.headerBadges}>
          {/* Streak Flame */}
          <View
            style={[
              styles.statPill,
              {
                backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : '#fef3c7',
                borderColor: tokens.warning,
              },
            ]}
          >
            <Ionicons name="flame" size={16} color={tokens.warning} />
            <Text style={[styles.statPillText, { color: tokens.warning }]}>{stats.streak || 0}</Text>
          </View>

          {/* XP Pill */}
          <View
            style={[
              styles.statPill,
              {
                backgroundColor: isDark ? 'rgba(56, 189, 248, 0.15)' : '#e0f2fe',
                borderColor: tokens.primary,
              },
            ]}
          >
            <Ionicons name="sparkles" size={15} color={tokens.primary} />
            <Text style={[styles.statPillText, { color: tokens.primary }]}>{xpTotal} XP</Text>
          </View>
        </View>
      </View>

      {/* 2. CONCURSO & CARGO ATIVO */}
      <View
        style={[
          styles.concursoCard,
          {
            backgroundColor: tokens.cardBg,
            borderColor: tokens.cardBorder,
          },
          shadows.card,
        ]}
      >
        <View style={styles.concursoBadgeRow}>
          <View style={[styles.bancaTag, { backgroundColor: tokens.primarySoft }]}>
            <Text style={[styles.bancaTagText, { color: tokens.primary }]}>{bancaAtiva}</Text>
          </View>
          <Text style={[styles.concursoNome, { color: tokens.textPrimary }]} numberOfLines={1}>
            {concursoAtivo}
          </Text>
        </View>
        <Text style={[styles.cargoNome, { color: tokens.textMuted }]}>
          Cargo Alvo: <Text style={{ color: tokens.textPrimary, fontWeight: '700' }}>{cargoAtivo}</Text>
        </Text>
      </View>

      {/* 3. HERO ACTION CARD: CONTINUAR ESTUDANDO */}
      <View
        style={[
          styles.heroCard,
          {
            backgroundColor: tokens.cardBg,
            borderColor: tokens.cardBorder,
          },
          shadows.cardHover,
        ]}
      >
        <View style={styles.heroHeader}>
          <View style={styles.heroLeft}>
            <Text style={[styles.heroPreTitle, { color: tokens.primary }]}>PROXIMA AÇÃO RECOMENDADA</Text>
            <Text style={[styles.heroTitle, { color: tokens.textPrimary }]}>
              {revisoesPendentesCount > 0
                ? `${revisoesPendentesCount} revisões prioritárias hoje`
                : 'Fila de Questões Pronta'}
            </Text>
          </View>
          <View
            style={[
              styles.heroIconCircle,
              { backgroundColor: revisoesPendentesCount > 0 ? tokens.warningSoft : tokens.primarySoft },
            ]}
          >
            <Ionicons
              name={revisoesPendentesCount > 0 ? 'time' : 'flash'}
              size={24}
              color={revisoesPendentesCount > 0 ? tokens.warning : tokens.primary}
            />
          </View>
        </View>

        <Text style={[styles.heroDescription, { color: tokens.textMuted }]}>
          {revisoesPendentesCount > 0
            ? 'Seu algoritmo SRS organizou as questões mais atrasadas para fixar antes de você esquecer.'
            : `${novasQuestoesCount || 10} questões recomendadas pelo edital para avançar seu domínio.`}
        </Text>

        {/* Big 3D Tactile Action Button */}
        <TouchableOpacity
          onPress={() => {
            triggerSuccessHaptic();
            onContinuarEstudando();
          }}
          activeOpacity={0.88}
          style={[
            styles.heroActionBtn,
            {
              backgroundColor: tokens.primary,
              borderBottomColor: tokens.primaryDark,
              borderBottomWidth: 3,
            },
          ]}
        >
          <Ionicons name="play" size={18} color="#ffffff" style={{ marginRight: 6 }} />
          <Text style={styles.heroActionBtnText}>Continuar Estudando</Text>
        </TouchableOpacity>
      </View>

      {/* 4. META DIÁRIA & SEQUÊNCIA CARD */}
      <View
        style={[
          styles.goalCard,
          {
            backgroundColor: tokens.cardBg,
            borderColor: tokens.cardBorder,
          },
          shadows.card,
        ]}
      >
        <View style={styles.goalHeader}>
          <View style={styles.goalTitleRow}>
            <Ionicons
              name={metaProgresso.concluida ? 'checkmark-circle' : 'flag'}
              size={18}
              color={metaProgresso.concluida ? tokens.success : tokens.warning}
            />
            <Text style={[styles.goalTitle, { color: tokens.textPrimary }]}>Meta Diária de Estudos</Text>
          </View>
          <Text
            style={[
              styles.goalCountText,
              { color: metaProgresso.concluida ? tokens.success : tokens.textPrimary },
            ]}
          >
            {metaProgresso.atual} / {metaProgresso.meta} questões
          </Text>
        </View>

        {/* Progress Bar */}
        <View style={[styles.progressBarTrack, { backgroundColor: tokens.surface }]}>
          <View
            style={[
              styles.progressBarFill,
              {
                width: `${metaProgresso.percentual}%`,
                backgroundColor: metaProgresso.concluida ? tokens.success : tokens.primary,
              },
            ]}
          />
        </View>

        <Text style={[styles.goalFooterText, { color: tokens.textMuted }]}>
          {metaProgresso.concluida
            ? '🎉 Meta de hoje concluída! Cada questão a mais é avanço bônus para a sua aprovação.'
            : `Faltam ${metaProgresso.restantes} questões para bater sua meta diária.`}
        </Text>
      </View>

      {/* 5. RESUMO TÁTICO: 4 INDICADORES REAIS */}
      <View style={styles.statsRow}>
        <View
          style={[
            styles.statCard,
            { backgroundColor: tokens.cardBg, borderColor: tokens.cardBorder },
            shadows.card,
          ]}
        >
          <Text style={[styles.statCardValue, { color: tokens.primary }]}>{totalRespondidas}</Text>
          <Text style={[styles.statCardLabel, { color: tokens.textMuted }]}>Resolvidas</Text>
        </View>

        <View
          style={[
            styles.statCard,
            { backgroundColor: tokens.cardBg, borderColor: tokens.cardBorder },
            shadows.card,
          ]}
        >
          <Text
            style={[
              styles.statCardValue,
              { color: taxaGeral >= 70 ? tokens.success : tokens.warning },
            ]}
          >
            {taxaGeral}%
          </Text>
          <Text style={[styles.statCardLabel, { color: tokens.textMuted }]}>Taxa Acerto</Text>
        </View>

        <View
          style={[
            styles.statCard,
            { backgroundColor: tokens.cardBg, borderColor: tokens.cardBorder },
            shadows.card,
          ]}
        >
          <Text style={[styles.statCardValue, { color: tokens.danger }]}>
            {stats.blindSpotQueue.length}
          </Text>
          <Text style={[styles.statCardLabel, { color: tokens.textMuted }]}>Pontos Cegos</Text>
        </View>

        <View
          style={[
            styles.statCard,
            { backgroundColor: tokens.cardBg, borderColor: tokens.cardBorder },
            shadows.card,
          ]}
        >
          <Text style={[styles.statCardValue, { color: tokens.warning }]}>
            {stats.errorQueue.length}
          </Text>
          <Text style={[styles.statCardLabel, { color: tokens.textMuted }]}>Banco Erros</Text>
        </View>
      </View>

      {/* 6. MATÉRIAS RECOMENDADAS PARA PRATICAR */}
      <View style={styles.sectionHeadingRow}>
        <Text style={[styles.sectionHeading, { color: tokens.textPrimary }]}>
          Foco de Estudo Recomendado
        </Text>
        <TouchableOpacity
          onPress={() => {
            triggerLightHaptic();
            onIrParaEstudo();
          }}
        >
          <Text style={[styles.sectionActionText, { color: tokens.primary }]}>Ver todas</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.subjectsList}>
        {materiasRecomendadas.map((item) => {
          const color = getCategoryColor(item.categoria);
          return (
            <TouchableOpacity
              key={item.categoria}
              onPress={() => {
                triggerLightHaptic();
                onIrParaEstudo(item.categoria);
              }}
              activeOpacity={0.8}
              style={[
                styles.subjectCard,
                {
                  backgroundColor: tokens.cardBg,
                  borderColor: tokens.cardBorder,
                },
                shadows.card,
              ]}
            >
              <View style={[styles.subjectIconBox, { backgroundColor: color.soft }]}>
                <Ionicons name="book" size={18} color={color.accent} />
              </View>

              <View style={styles.subjectInfo}>
                <Text style={[styles.subjectName, { color: tokens.textPrimary }]} numberOfLines={1}>
                  {item.categoria}
                </Text>
                <Text style={[styles.subjectMeta, { color: tokens.textMuted }]}>
                  {item.total > 0
                    ? `${item.acertos} acertos · ${item.taxa}% de precisão`
                    : 'Ainda não iniciada'}
                </Text>
              </View>

              <View
                style={[
                  styles.subjectPraticarBtn,
                  { backgroundColor: tokens.surface, borderColor: tokens.cardBorder },
                ]}
              >
                <Text style={[styles.subjectPraticarText, { color: tokens.primary }]}>Treinar</Text>
                <Ionicons name="chevron-forward" size={14} color={tokens.primary} />
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 7. BANNERS DE ACESSO RÁPIDO: SIMULADO & MACETES */}
      <View style={styles.quickBannerRow}>
        {/* Simulado Banner */}
        <TouchableOpacity
          onPress={() => {
            triggerLightHaptic();
            onIniciarSimulado();
          }}
          activeOpacity={0.85}
          style={[
            styles.quickBanner,
            {
              backgroundColor: tokens.cardBg,
              borderColor: tokens.cardBorder,
              borderLeftColor: tokens.purple,
              borderLeftWidth: 4,
            },
            shadows.card,
          ]}
        >
          <View style={styles.quickBannerHeader}>
            <Ionicons name="stopwatch" size={20} color={tokens.purple} />
            <Text style={[styles.quickBannerTitle, { color: tokens.textPrimary }]}>Simulado Real</Text>
          </View>
          <Text style={[styles.quickBannerDesc, { color: tokens.textMuted }]}>
            40 questões no tempo oficial de prova com raios-X.
          </Text>
        </TouchableOpacity>

        {/* Macetes Banner */}
        <TouchableOpacity
          onPress={() => {
            triggerLightHaptic();
            onIrParaMural();
          }}
          activeOpacity={0.85}
          style={[
            styles.quickBanner,
            {
              backgroundColor: tokens.cardBg,
              borderColor: tokens.cardBorder,
              borderLeftColor: tokens.warning,
              borderLeftWidth: 4,
            },
            shadows.card,
          ]}
        >
          <View style={styles.quickBannerHeader}>
            <Ionicons name="bulb" size={20} color={tokens.warning} />
            <Text style={[styles.quickBannerTitle, { color: tokens.textPrimary }]}>Mural de Macetes</Text>
          </View>
          <Text style={[styles.quickBannerDesc, { color: tokens.textMuted }]}>
            Regras de ouro e alertas de pegadinhas da banca.
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.screenPadding,
    paddingBottom: 40,
    gap: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  headerUser: {
    flex: 1,
  },
  greetingSub: {
    fontSize: typography.meta,
    fontWeight: weights.meta,
  },
  userTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  userName: {
    fontSize: typography.title,
    fontWeight: weights.black,
  },
  levelPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  levelPillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  headerBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1.5,
  },
  statPillText: {
    fontSize: 13,
    fontWeight: '800',
  },
  concursoCard: {
    padding: 12,
    borderRadius: radius.control,
    borderWidth: 1,
    gap: 4,
  },
  concursoBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bancaTag: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.xs,
  },
  bancaTagText: {
    fontSize: 11,
    fontWeight: '800',
  },
  concursoNome: {
    fontSize: typography.body,
    fontWeight: weights.title,
    flex: 1,
  },
  cargoNome: {
    fontSize: typography.meta,
  },
  heroCard: {
    padding: 16,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: 12,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroLeft: {
    flex: 1,
    paddingRight: 8,
  },
  heroPreTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 3,
  },
  heroIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  heroActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: radius.control,
    marginTop: 2,
  },
  heroActionBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  goalCard: {
    padding: 14,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: 10,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  goalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  goalTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  goalCountText: {
    fontSize: 13,
    fontWeight: '800',
  },
  progressBarTrack: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  goalFooterText: {
    fontSize: 12,
    lineHeight: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statCard: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: radius.control,
    borderWidth: 1,
    alignItems: 'center',
    gap: 2,
  },
  statCardValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  statCardLabel: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  sectionHeadingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '800',
  },
  sectionActionText: {
    fontSize: 13,
    fontWeight: '700',
  },
  subjectsList: {
    gap: 8,
  },
  subjectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: radius.control,
    borderWidth: 1,
    gap: 12,
  },
  subjectIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subjectInfo: {
    flex: 1,
  },
  subjectName: {
    fontSize: 14,
    fontWeight: '700',
  },
  subjectMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  subjectPraticarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.chip,
    borderWidth: 1,
  },
  subjectPraticarText: {
    fontSize: 12,
    fontWeight: '700',
  },
  quickBannerRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  quickBanner: {
    flex: 1,
    padding: 12,
    borderRadius: radius.control,
    borderWidth: 1,
    gap: 6,
  },
  quickBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  quickBannerTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  quickBannerDesc: {
    fontSize: 11,
    lineHeight: 15,
  },
});
