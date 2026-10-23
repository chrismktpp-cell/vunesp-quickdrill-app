import React, { useMemo } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import type { UserStats, Question, CategoryType } from '../types/schema';
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
import { calcularProgressoGeral } from '../services/progressService';
import { obterProximaAtividadeRecomendada } from '../services/recommendationService';

export interface HomeScreenProps {
  stats: UserStats;
  totalQuestoesDisponiveis: number;
  revisoesPendentesCount: number;
  novasQuestoesCount: number;
  onContinuarEstudando: () => void;
  onIniciarSimulado: () => void;
  onIrParaEstudo: (category?: CategoryType) => void;
  onIrParaMural: () => void;
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
  onIniciarSimulado,
  onIrParaEstudo,
  onIrParaMural,
}) => {
  // Dados oficiais
  const questionsData = require('../data/questions.json') as Question[];

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

  // Recomendação inteligente determinística da próxima atividade
  const recomendacao = useMemo(() => {
    return obterProximaAtividadeRecomendada(questionsData, stats);
  }, [questionsData, stats]);

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. MASCÓTE & SAUDAÇÃO INICIAL */}
      <MascotWelcome
        saudacao={saudacao}
        concurso={concurso}
        cargo={cargo}
      />

      {/* 2. META DIÁRIA & SEQUÊNCIA */}
      <DailyGoalCard
        questoesHoje={stats.questoesHoje || 0}
        metaDiaria={stats.metaDiaria || 15}
      />

      <StreakCard
        streak={stats.streak || 0}
        bestStreak={stats.bestStreak || 0}
      />

      {/* 3. BARRA DE EVOLUÇÃO EM XP E NÍVEL */}
      <XpProgressBar xp={stats.xp || 0} />

      {/* 4. PRÓXIMA ATIVIDADE RECOMENDADA (HERO ACTION) */}
      <NextActivityCard
        recomendacao={recomendacao}
        onIniciar={onContinuarEstudando}
      />

      {/* 5. REVISÕES PENDENTES SRS */}
      <PendingReviewsCard
        revisoesPendentes={progresso.revisoesPendentes}
        onIniciarRevisao={onContinuarEstudando}
      />

      {/* 6. PONTOS CRÍTICOS & PONTOS CEGOS */}
      <WeakPointsCard
        blindSpotsCount={progresso.pontosCegosCount}
        errorsCount={stats.errorQueue?.length || 0}
        onTreinarPontosCegos={() => onIrParaEstudo()}
        onTreinarErros={() => onIrParaEstudo()}
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
    gap: 16,
    backgroundColor: aprovaFoxColors.night,
  },
});
