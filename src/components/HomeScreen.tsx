import React, { useMemo } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import type { UserStats, Question, CategoryType } from '../types/schema';
import questionsDataJson from '../data/questions.json';
import { aprovaFoxColors, spacing } from '../theme/aprovafox';
import { MascotWelcome } from './MascotWelcome';
import { StreakCard } from './StreakCard';
import { DailyGoalCard } from './DailyGoalCard';
import { XpProgressBar } from './XpProgressBar';
import { NextActivityCard } from './NextActivityCard';
import { SubjectProgressCard } from './SubjectProgressCard';
import { PendingReviewsCard } from './PendingReviewsCard';
import { WeakPointsCard } from './WeakPointsCard';
import { QuickActionCard } from './QuickActionCard';
import { OfflineBanner } from './OfflineBanner';
import { TrilhaHomeCard } from './TrilhaHomeCard';
import { calcularProgressoGeral } from '../services/progressService';
import { obterProximaAtividadeRecomendada, RecomendacaoEstudo } from '../services/recommendationService';
import { calcularStatusTrilha, obterDiaRoteiro } from '../services/trilhaService';
import { PLANO_7_DIAS, DiaRoteiro } from '../data/planoEstudosRoteiro';

const questionsData = questionsDataJson as Question[];

export interface HomeScreenProps {
  stats: UserStats;
  totalQuestoesDisponiveis: number;
  revisoesPendentesCount: number;
  novasQuestoesCount: number;
  onContinuarEstudando: (recomendacao?: RecomendacaoEstudo) => void;
  onIniciarTreinoTrilha?: (diaRoteiro: DiaRoteiro) => void;
  onIniciarSimulado: () => void;
  onIrParaEstudo: (category?: CategoryType) => void;
  onIrParaMural: () => void;
  onTreinarPontosCegos?: () => void;
  onTreinarErros?: () => void;
  onToggleTheme: () => void;
  isDark?: boolean;
  tokens?: any;
  categories?: CategoryType[];
  getCategoryColor?: (cat: CategoryType) => {
    accent: string;
    soft: string;
    border: string;
    badgeText: string;
  };
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  stats,
  onContinuarEstudando,
  onIniciarTreinoTrilha,
  onIniciarSimulado,
  onIrParaEstudo,
  onIrParaMural,
  onTreinarPontosCegos,
  onTreinarErros,
  isDark = true,
  tokens,
}) => {

  // Saudação por horário local
  const hora = new Date().getHours();
  const saudacao =
    hora < 12
      ? 'Bom dia, Estrategista!'
      : hora < 18
      ? 'Boa tarde, Estrategista!'
      : 'Boa noite, Estrategista!';

  const concurso = 'Prefeitura de Itanhaém';
  const cargo = 'Agente de Vigilância Patrimonial';

  // Cálculos de domínio e progresso real
  const progresso = useMemo(() => {
    return calcularProgressoGeral(questionsData, stats);
  }, [questionsData, stats]);

  // Status da Trilha de 7 Dias
  const statusTrilha = useMemo(() => {
    return calcularStatusTrilha(stats);
  }, [stats]);

  const diaAtivoRoteiro = useMemo(() => {
    return obterDiaRoteiro(statusTrilha.diaAtual) || PLANO_7_DIAS[0];
  }, [statusTrilha.diaAtual]);

  // Recomendação inteligente determinística da próxima atividade
  const recomendacao = useMemo(() => {
    return obterProximaAtividadeRecomendada(questionsData, stats);
  }, [questionsData, stats]);

  const bgColor = tokens?.bg || (isDark ? aprovaFoxColors.night : '#f8fafc');

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { backgroundColor: bgColor }]}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. MASCÓTE & SAUDAÇÃO INICIAL */}
      <MascotWelcome
        saudacao={saudacao}
        concurso={concurso}
        cargo={cargo}
        isDark={isDark}
        tokens={tokens}
      />

      {/* 2. HUD DE STATUS DIÁRIO: OFENSIVA & META EM GRID EQUILIBRADO */}
      <View style={styles.metricsRow}>
        <View style={styles.metricCol}>
          <StreakCard
            streak={stats.streak || 0}
            bestStreak={stats.bestStreak || 0}
            isDark={isDark}
            tokens={tokens}
            compact
          />
        </View>
        <View style={styles.metricCol}>
          <DailyGoalCard
            questoesHoje={stats.questoesHoje || 0}
            metaDiaria={stats.metaDiaria || 15}
            isDark={isDark}
            tokens={tokens}
            compact
          />
        </View>
      </View>

      {/* 3. BARRA DE EVOLUÇÃO EM XP E NÍVEL */}
      <XpProgressBar
        xp={stats.xp || 0}
        isDark={isDark}
        tokens={tokens}
      />

      {/* 4. CARD HERO DA TRILHA DO CONHECIMENTO (7 DIAS) */}
      <TrilhaHomeCard
        diaRoteiro={diaAtivoRoteiro}
        diasConcluidos={statusTrilha.diasConcluidos}
        totalDias={statusTrilha.totalDias}
        percentualCiclo={statusTrilha.percentualCiclo}
        onAbrirTrilha={() => onIrParaEstudo()}
        onIniciarTreinoDia={() => {
          if (onIniciarTreinoTrilha) {
            onIniciarTreinoTrilha(diaAtivoRoteiro);
          } else {
            onIrParaEstudo();
          }
        }}
      />

      {/* 5. PRÓXIMA ATIVIDADE RECOMENDADA (HERO ACTION) */}
      <NextActivityCard
        recomendacao={recomendacao}
        onIniciar={() => onContinuarEstudando(recomendacao)}
      />

      {/* 5. REVISÕES PENDENTES SRS */}
      <PendingReviewsCard
        revisoesPendentes={progresso.revisoesPendentes}
        onIniciarRevisao={() => onContinuarEstudando(recomendacao)}
      />

      {/* 6. PONTOS CRÍTICOS & PONTOS CEGOS */}
      <WeakPointsCard
        blindSpotsCount={progresso.pontosCegosCount}
        errorsCount={stats.errorQueue?.length || 0}
        onTreinarPontosCegos={onTreinarPontosCegos || (() => onIrParaEstudo())}
        onTreinarErros={onTreinarErros || (() => onIrParaEstudo())}
      />

      {/* 7. RESUMO DAS MATÉRIAS DO EDITAL */}
      <SubjectProgressCard
        materias={progresso.progressoPorMateria}
        onSelecionarMateria={(cat) => onIrParaEstudo(cat)}
      />

      {/* 8. ACESSOS RÁPIDOS */}
      <QuickActionCard
        onIniciarSimulado={onIniciarSimulado}
        onAbrirMural={onIrParaMural}
      />

      {/* 9. BANNER OFFLINE SEGURO */}
      <OfflineBanner />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.block,
    paddingBottom: 40,
    gap: 14,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  metricCol: {
    flex: 1,
  },
});
