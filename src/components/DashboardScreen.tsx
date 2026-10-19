import React, { useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type {
  Question,
  UserStats,
  CategoryType,
  SimuladoResultado,
  EditalTopico,
} from '../types/schema';
import { resumirSRS, gerarFilaDoDia } from '../services/srsEngine';
import { calcularProgressoPorTopico, calcularCoberturaGeral } from '../services/editalService';
import { obterDiagnosticoSimulado } from '../services/simuladoService';
import editalPadrao from '../data/edital.json';
import { triggerLightHaptic } from '../utils/storage';

interface DashboardScreenProps {
  questions: Question[];
  stats: UserStats;
  categories: CategoryType[];
  onIniciarFilaDoDia: () => void;
  onTreinarErros: () => void;
  onTreinarPontosCegos: () => void;
  onTreinarCategoria: (cat: CategoryType) => void;
  onResetStats: () => void;
  colors: {
    bg: string;
    cardBg: string;
    cardBorder: string;
    text: string;
    textMuted: string;
    primary: string;
    primarySoft: string;
    emerald: string;
    emeraldSoft: string;
    amber: string;
    amberSoft: string;
    rose: string;
    roseSoft: string;
    subtle: string;
  };
  isDark: boolean;
  getCategoryColor: (cat: CategoryType) => { accent: string; soft: string; badgeText: string };
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  questions,
  stats,
  categories,
  onIniciarFilaDoDia,
  onTreinarErros,
  onTreinarPontosCegos,
  onTreinarCategoria,
  onResetStats,
  colors,
  isDark,
  getCategoryColor,
}) => {
  const attempts = stats.attempts || [];
  const totalAttempts = attempts.length;
  const correctCount = attempts.filter((a) => a.isCorrect).length;
  const accuracyRate = totalAttempts > 0 ? Math.round((correctCount / totalAttempts) * 100) : 0;

  // SRS Summary
  const srsSummary = useMemo(() => {
    return resumirSRS(questions, stats.revisoesSRS || {});
  }, [questions, stats.revisoesSRS]);

  const filaDoDia = useMemo(() => {
    return gerarFilaDoDia(questions, stats.revisoesSRS || {}, 10);
  }, [questions, stats.revisoesSRS]);

  // Edital Coverage
  const topicos = editalPadrao as EditalTopico[];
  const progressoTopicos = useMemo(() => {
    return calcularProgressoPorTopico(topicos, questions, attempts);
  }, [topicos, questions, attempts]);

  const coberturaGeral = useMemo(() => {
    return calcularCoberturaGeral(topicos, progressoTopicos);
  }, [topicos, progressoTopicos]);

  // Performance by Category
  const categoryStats = useMemo(() => {
    const map: Record<
      CategoryType,
      { total: number; correct: number; rate: number; blindSpots: number }
    > = {} as any;

    for (const cat of categories) {
      const catAttempts = attempts.filter((a) => a.category === cat);
      const catCorrect = catAttempts.filter((a) => a.isCorrect).length;
      const rate = catAttempts.length > 0 ? Math.round((catCorrect / catAttempts.length) * 100) : 0;

      // Blind spots in this category
      const catBlindSpots = questions.filter(
        (q) => q.category === cat && stats.blindSpotQueue.includes(q.id)
      ).length;

      map[cat] = {
        total: catAttempts.length,
        correct: catCorrect,
        rate,
        blindSpots: catBlindSpots,
      };
    }
    return map;
  }, [categories, attempts, questions, stats.blindSpotQueue]);

  // Metacognitive Matrix counts
  const realMasteryCount = attempts.filter((a) => a.classification === 'real_mastery').length;
  const luckyGuessCount = attempts.filter((a) => a.classification === 'lucky_guess').length;
  const consciousErrorCount = attempts.filter((a) => a.classification === 'conscious_error').length;
  const doubtSuccessCount = attempts.filter((a) => a.classification === 'doubt_success').length;
  const doubtFailureCount = attempts.filter((a) => a.classification === 'doubt_failure').length;

  // Weak Topics (topics with lowest accuracy rate or most errors)
  const weakTopics = useMemo(() => {
    return progressoTopicos
      .filter((p) => p.questoesRespondidas > 0 && p.taxaAcerto < 75)
      .sort((a, b) => a.taxaAcerto - b.taxaAcerto)
      .slice(0, 3);
  }, [progressoTopicos]);

  // Simulado Evolution Comparison
  const simulados = stats.simuladosHistorico || [];
  const ultimoSimulado = simulados[0] || null;
  const penultimoSimulado = simulados[1] || null;

  let evolucaoSimulado: { diff: number; text: string; color: string } | null = null;
  if (ultimoSimulado && penultimoSimulado) {
    const diff = ultimoSimulado.pontuacaoPercentual - penultimoSimulado.pontuacaoPercentual;
    if (diff > 0) {
      evolucaoSimulado = { diff, text: `+${diff}% vs anterior`, color: colors.emerald };
    } else if (diff < 0) {
      evolucaoSimulado = { diff, text: `${diff}% vs anterior`, color: colors.rose };
    } else {
      evolucaoSimulado = { diff: 0, text: 'Estável vs anterior', color: colors.textMuted };
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      {/* ================= 1. BANNER FILA DO DIA (AÇÃO IMEDIATA) ================= */}
      <View
        style={[
          styles.actionHeroCard,
          {
            backgroundColor: isDark ? '#0f2240' : '#e0f2fe',
            borderColor: isDark ? '#1e3a8a' : '#bae6fd',
          },
        ]}
      >
        <View style={styles.actionHeroTop}>
          <View style={[styles.actionHeroBadge, { backgroundColor: colors.primary }]}>
            <Ionicons name="sparkles" size={13} color="#ffffff" />
            <Text style={styles.actionHeroBadgeText}>SUA META DE HOJE</Text>
          </View>
          <Text style={[styles.actionHeroSub, { color: colors.textMuted }]}>
            Algoritmo SM-2 Leitner
          </Text>
        </View>

        <Text style={[styles.actionHeroTitle, { color: colors.text }]}>
          {filaDoDia.totalHoje > 0
            ? `${filaDoDia.totalHoje} questões aguardando revisão`
            : 'Fila de hoje zerada com sucesso!'}
        </Text>

        <Text style={[styles.actionHeroDesc, { color: colors.textMuted }]}>
          {filaDoDia.revisoesPendentes.length} revisões de espaçamento programado +{' '}
          {filaDoDia.novasQuestoes.length} questões novas sugeridas para o seu edital.
        </Text>

        <TouchableOpacity
          onPress={() => {
            triggerLightHaptic();
            onIniciarFilaDoDia();
          }}
          activeOpacity={0.85}
          style={[styles.actionHeroBtn, { backgroundColor: colors.primary }]}
        >
          <Ionicons name="play" size={16} color="#ffffff" />
          <Text style={styles.actionHeroBtnText}>
            {filaDoDia.totalHoje > 0 ? 'Iniciar Fila do Dia Agora' : 'Praticar Fila Livre'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ================= 2. VISÃO GERAL DE DESEMPENHO ================= */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Visão Geral de Desempenho</Text>

      <View style={styles.overviewGrid}>
        {/* Taxa de Acerto */}
        <View
          style={[
            styles.overviewCard,
            { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
          ]}
        >
          <View style={styles.cardHeaderRow}>
            <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Taxa Global</Text>
            <View style={[styles.metricIconBox, { backgroundColor: colors.primarySoft }]}>
              <Ionicons name="pie-chart" size={14} color={colors.primary} />
            </View>
          </View>
          <Text style={[styles.metricBig, { color: colors.text }]}>{accuracyRate}%</Text>
          <Text style={[styles.metricSub, { color: colors.textMuted }]}>
            {correctCount} de {totalAttempts} certas
          </Text>
        </View>

        {/* Sequência / Streak */}
        <View
          style={[
            styles.overviewCard,
            { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
          ]}
        >
          <View style={styles.cardHeaderRow}>
            <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Sequência</Text>
            <View style={[styles.metricIconBox, { backgroundColor: colors.amberSoft }]}>
              <Ionicons name="flame" size={14} color={colors.amber} />
            </View>
          </View>
          <Text style={[styles.metricBig, { color: colors.amber }]}>{stats.streak}🔥</Text>
          <Text style={[styles.metricSub, { color: colors.textMuted }]}>
            Melhor: {stats.bestStreak} seguidas
          </Text>
        </View>

        {/* Cobertura do Edital */}
        <View
          style={[
            styles.overviewCard,
            { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
          ]}
        >
          <View style={styles.cardHeaderRow}>
            <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Edital Itanhaém</Text>
            <View style={[styles.metricIconBox, { backgroundColor: colors.emeraldSoft }]}>
              <Ionicons name="map" size={14} color={colors.emerald} />
            </View>
          </View>
          <Text style={[styles.metricBig, { color: colors.emerald }]}>
            {coberturaGeral.percentualGeralCobertura}%
          </Text>
          <Text style={[styles.metricSub, { color: colors.textMuted }]}>
            {coberturaGeral.topicosDominados} de {coberturaGeral.totalTopicos} dominados
          </Text>
        </View>

        {/* Pontos Cegos Ativos */}
        <View
          style={[
            styles.overviewCard,
            { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
          ]}
        >
          <View style={styles.cardHeaderRow}>
            <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Pontos Cegos</Text>
            <View style={[styles.metricIconBox, { backgroundColor: colors.roseSoft }]}>
              <Ionicons name="warning" size={14} color={colors.rose} />
            </View>
          </View>
          <Text style={[styles.metricBig, { color: colors.rose }]}>
            {stats.blindSpotQueue.length}
          </Text>
          <Text style={[styles.metricSub, { color: colors.textMuted }]}>
            {stats.errorQueue.length} no banco de erros
          </Text>
        </View>
      </View>

      {/* ================= 3. PIRÂMIDE DE DOMÍNIO SRS (LEITNER) ================= */}
      <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 16 }]}>
        Maturidade no Algoritmo SRS (Caixas 1 a 5)
      </Text>

      <View
        style={[
          styles.srsBoxCard,
          { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
        ]}
      >
        <View style={styles.srsLevelsRow}>
          <View style={styles.srsLevelCol}>
            <Text style={[styles.srsLevelNum, { color: colors.textMuted }]}>
              {srsSummary.novas}
            </Text>
            <View style={[styles.srsLevelBar, { backgroundColor: colors.subtle, height: 40 }]} />
            <Text style={[styles.srsLevelLabel, { color: colors.textMuted }]}>Novas</Text>
          </View>

          <View style={styles.srsLevelCol}>
            <Text style={[styles.srsLevelNum, { color: colors.amber }]}>
              {srsSummary.pendentesHoje}
            </Text>
            <View
              style={[
                styles.srsLevelBar,
                { backgroundColor: colors.amber, height: 60 },
              ]}
            />
            <Text style={[styles.srsLevelLabel, { color: colors.amber }]}>Hoje</Text>
          </View>

          <View style={styles.srsLevelCol}>
            <Text style={[styles.srsLevelNum, { color: colors.primary }]}>
              {srsSummary.emRevisao}
            </Text>
            <View
              style={[
                styles.srsLevelBar,
                { backgroundColor: colors.primary, height: 80 },
              ]}
            />
            <Text style={[styles.srsLevelLabel, { color: colors.primary }]}>Revisão</Text>
          </View>

          <View style={styles.srsLevelCol}>
            <Text style={[styles.srsLevelNum, { color: colors.emerald }]}>
              {srsSummary.dominadas}
            </Text>
            <View
              style={[
                styles.srsLevelBar,
                { backgroundColor: colors.emerald, height: 100 },
              ]}
            />
            <Text style={[styles.srsLevelLabel, { color: colors.emerald }]}>Dominadas</Text>
          </View>
        </View>

        <Text style={[styles.srsCardNote, { color: colors.textMuted }]}>
          💡 Cada acerto com Certeza [3] avança a questão para a próxima caixa de repetição (1d → 3d
          → 7d → 14d → 30d). Erros com certeza voltam à Caixa 1 como Ponto Cego prioritário.
        </Text>
      </View>

      {/* ================= 4. DESEMPENHO POR DISCIPLINA ================= */}
      <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 16 }]}>
        Aproveitamento por Disciplina
      </Text>

      {categories.map((cat) => {
        const item = categoryStats[cat];
        const catColors = getCategoryColor(cat);

        return (
          <TouchableOpacity
            key={cat}
            activeOpacity={0.7}
            onPress={() => {
              triggerLightHaptic();
              onTreinarCategoria(cat);
            }}
            style={[
              styles.catCard,
              { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
            ]}
          >
            <View style={styles.catCardTop}>
              <View style={styles.catTitleLeft}>
                <View
                  style={[
                    styles.catColorDot,
                    { backgroundColor: catColors.accent },
                  ]}
                />
                <Text style={[styles.catName, { color: colors.text }]}>{cat}</Text>
              </View>
              <Text style={[styles.catPercent, { color: catColors.accent }]}>
                {item.rate}%
              </Text>
            </View>

            {/* Barra de Progresso */}
            <View style={[styles.progressBarTrack, { backgroundColor: colors.subtle }]}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${item.rate}%`, backgroundColor: catColors.accent },
                ]}
              />
            </View>

            <View style={styles.catCardBottom}>
              <Text style={[styles.catMeta, { color: colors.textMuted }]}>
                {item.correct} acertos em {item.total} tentativas
              </Text>
              {item.blindSpots > 0 && (
                <View style={[styles.catBlindSpotTag, { backgroundColor: colors.roseSoft }]}>
                  <Ionicons name="warning" size={11} color={colors.rose} />
                  <Text style={[styles.catBlindSpotText, { color: colors.rose }]}>
                    {item.blindSpots} ponto(s) cego(s)
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        );
      })}

      {/* ================= 5. MATRIZ DE METACOGNIÇÃO ================= */}
      <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 16 }]}>
        Matriz Metacognitiva (Certeza vs Gabarito)
      </Text>

      <View style={styles.matrixContainer}>
        {/* Domínio Real */}
        <View
          style={[
            styles.matrixItem,
            {
              backgroundColor: colors.emeraldSoft,
              borderColor: colors.emerald,
            },
          ]}
        >
          <View style={styles.matrixLeft}>
            <View style={[styles.matrixBadgeIcon, { backgroundColor: colors.emerald }]}>
              <Ionicons name="shield-checkmark" size={14} color="#ffffff" />
            </View>
            <View>
              <Text style={[styles.matrixItemTitle, { color: colors.emerald }]}>
                Domínio Real
              </Text>
              <Text style={[styles.matrixItemSub, { color: colors.textMuted }]}>
                Certeza [3] + Acerto
              </Text>
            </View>
          </View>
          <Text style={[styles.matrixItemCount, { color: colors.emerald }]}>
            {realMasteryCount}
          </Text>
        </View>

        {/* Ponto Cego (Ilusão de Competência) */}
        <View
          style={[
            styles.matrixItem,
            {
              backgroundColor: colors.roseSoft,
              borderColor: colors.rose,
            },
          ]}
        >
          <View style={styles.matrixLeft}>
            <View style={[styles.matrixBadgeIcon, { backgroundColor: colors.rose }]}>
              <Ionicons name="warning" size={14} color="#ffffff" />
            </View>
            <View>
              <Text style={[styles.matrixItemTitle, { color: colors.rose }]}>
                Ilusão de Competência
              </Text>
              <Text style={[styles.matrixItemSub, { color: colors.textMuted }]}>
                Certeza [3] + Erro (Ponto Cego)
              </Text>
            </View>
          </View>
          <Text style={[styles.matrixItemCount, { color: colors.rose }]}>
            {stats.blindSpotQueue.length}
          </Text>
        </View>

        {/* Acerto por Sorte / Chute */}
        <View
          style={[
            styles.matrixItem,
            {
              backgroundColor: colors.amberSoft,
              borderColor: colors.amber,
            },
          ]}
        >
          <View style={styles.matrixLeft}>
            <View style={[styles.matrixBadgeIcon, { backgroundColor: colors.amber }]}>
              <Ionicons name="dice" size={14} color="#ffffff" />
            </View>
            <View>
              <Text style={[styles.matrixItemTitle, { color: colors.amber }]}>
                Acerto Frágil / Sorte
              </Text>
              <Text style={[styles.matrixItemSub, { color: colors.textMuted }]}>
                Chute [1] + Acerto
              </Text>
            </View>
          </View>
          <Text style={[styles.matrixItemCount, { color: colors.amber }]}>
            {luckyGuessCount}
          </Text>
        </View>
      </View>

      {/* ================= 6. AÇÕES RÁPIDAS DE ESTUDO ================= */}
      <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 16 }]}>
        Filtros Táticos Recomendados
      </Text>

      <View style={styles.actionButtonsCol}>
        <TouchableOpacity
          disabled={stats.blindSpotQueue.length === 0}
          onPress={() => {
            triggerLightHaptic();
            onTreinarPontosCegos();
          }}
          activeOpacity={0.8}
          style={[
            styles.tacticalActionBtn,
            {
              backgroundColor: stats.blindSpotQueue.length > 0 ? colors.rose : colors.subtle,
              opacity: stats.blindSpotQueue.length > 0 ? 1 : 0.6,
            },
          ]}
        >
          <Ionicons name="warning" size={16} color="#ffffff" />
          <Text style={styles.tacticalActionBtnText}>
            Treinar Meus Pontos Cegos ({stats.blindSpotQueue.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          disabled={stats.errorQueue.length === 0}
          onPress={() => {
            triggerLightHaptic();
            onTreinarErros();
          }}
          activeOpacity={0.8}
          style={[
            styles.tacticalActionBtn,
            {
              backgroundColor: stats.errorQueue.length > 0 ? colors.amber : colors.subtle,
              opacity: stats.errorQueue.length > 0 ? 1 : 0.6,
            },
          ]}
        >
          <Ionicons name="refresh" size={16} color="#ffffff" />
          <Text style={styles.tacticalActionBtnText}>
            Zerar Banco de Erros ({stats.errorQueue.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* ================= 7. HISTÓRICO DE SIMULADOS ================= */}
      <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 18 }]}>
        Histórico e Evolução em Simulados
      </Text>

      {simulados.length === 0 ? (
        <View
          style={[
            styles.emptySimuladoBox,
            { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
          ]}
        >
          <Ionicons name="stopwatch" size={28} color={colors.textMuted} />
          <Text style={[styles.emptySimuladoTitle, { color: colors.text }]}>
            Nenhum simulado finalizado ainda
          </Text>
          <Text style={[styles.emptySimuladoDesc, { color: colors.textMuted }]}>
            Faça um simulado de 10, 20 ou 40 questões na aba Simulado para registrar seu histórico de
            prova com cronômetro real.
          </Text>
        </View>
      ) : (
        <View style={styles.simuladosList}>
          {evolucaoSimulado && (
            <View
              style={[
                styles.evolutionPill,
                { backgroundColor: evolucaoSimulado.color + '18', borderColor: evolucaoSimulado.color },
              ]}
            >
              <Ionicons
                name={evolucaoSimulado.diff >= 0 ? 'trending-up' : 'trending-down'}
                size={14}
                color={evolucaoSimulado.color}
              />
              <Text style={[styles.evolutionPillText, { color: evolucaoSimulado.color }]}>
                {evolucaoSimulado.text}
              </Text>
            </View>
          )}

          {simulados.slice(0, 4).map((sim, idx) => {
            const diag = obterDiagnosticoSimulado(sim.pontuacaoPercentual);
            return (
              <View
                key={sim.id || idx}
                style={[
                  styles.simuladoItemCard,
                  { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
                ]}
              >
                <View style={styles.simuladoItemLeft}>
                  <Text style={[styles.simuladoItemTitle, { color: colors.text }]}>
                    {sim.titulo}
                  </Text>
                  <Text style={[styles.simuladoItemMeta, { color: colors.textMuted }]}>
                    {new Date(sim.dataHora).toLocaleDateString('pt-BR')} •{' '}
                    {Math.round(sim.tempoTotalGastoSegundos / 60)} min • {sim.acertos}/
                    {sim.totalQuestoes} acertos
                  </Text>
                </View>
                <View style={[styles.simuladoItemScoreBadge, { backgroundColor: diag.cor + '20' }]}>
                  <Text style={[styles.simuladoItemScoreText, { color: diag.cor }]}>
                    {sim.pontuacaoPercentual}%
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* ================= 8. RESET DE DADOS ================= */}
      <TouchableOpacity
        onPress={() => {
          Alert.alert(
            'Zerar Histórico e Estatísticas?',
            'Tem certeza de que deseja apagar todo o histórico de tentativas, pontuações e simulados? Esta ação é irreversível.',
            [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Sim, Zerar Tudo', style: 'destructive', onPress: onResetStats },
            ]
          );
        }}
        style={styles.resetBtn}
      >
        <Ionicons name="trash-outline" size={15} color={colors.rose} />
        <Text style={[styles.resetBtnText, { color: colors.rose }]}>
          Redefinir Histórico de Estudos
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 14,
    paddingBottom: 40,
  },
  actionHeroCard: {
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 16,
  },
  actionHeroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionHeroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  actionHeroBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  actionHeroSub: {
    fontSize: 11,
    fontWeight: '600',
  },
  actionHeroTitle: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  actionHeroDesc: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 14,
  },
  actionHeroBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  actionHeroBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: -0.2,
    marginBottom: 10,
  },
  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  overviewCard: {
    width: '48.5%',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  metricIconBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricBig: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  metricSub: {
    fontSize: 10,
    fontWeight: '500',
  },
  srsBoxCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
  },
  srsLevelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 120,
    marginBottom: 12,
    paddingTop: 10,
  },
  srsLevelCol: {
    alignItems: 'center',
    width: '22%',
  },
  srsLevelNum: {
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 6,
  },
  srsLevelBar: {
    width: 22,
    borderRadius: 6,
  },
  srsLevelLabel: {
    fontSize: 11,
    fontWeight: '800',
    marginTop: 6,
  },
  srsCardNote: {
    fontSize: 11,
    lineHeight: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f015',
    paddingTop: 10,
  },
  catCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 10,
  },
  catCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  catTitleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  catColorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  catName: {
    fontSize: 13,
    fontWeight: '800',
    flex: 1,
  },
  catPercent: {
    fontSize: 14,
    fontWeight: '900',
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  catCardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  catMeta: {
    fontSize: 11,
  },
  catBlindSpotTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  catBlindSpotText: {
    fontSize: 10,
    fontWeight: '800',
  },
  matrixContainer: {
    gap: 8,
  },
  matrixItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  matrixLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  matrixBadgeIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  matrixItemTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  matrixItemSub: {
    fontSize: 10,
  },
  matrixItemCount: {
    fontSize: 18,
    fontWeight: '900',
  },
  actionButtonsCol: {
    gap: 8,
  },
  tacticalActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  tacticalActionBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  emptySimuladoBox: {
    padding: 20,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  emptySimuladoTitle: {
    fontSize: 13,
    fontWeight: '800',
    marginTop: 8,
  },
  emptySimuladoDesc: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 4,
  },
  simuladosList: {
    gap: 8,
  },
  evolutionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  evolutionPillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  simuladoItemCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  simuladoItemLeft: {
    flex: 1,
  },
  simuladoItemTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  simuladoItemMeta: {
    fontSize: 11,
  },
  simuladoItemScoreBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  simuladoItemScoreText: {
    fontSize: 13,
    fontWeight: '900',
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 26,
    paddingVertical: 10,
  },
  resetBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
