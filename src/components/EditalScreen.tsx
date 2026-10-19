import React, { useMemo } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Question, QuestionAttempt, CategoryType, EditalTopico } from '../types/schema';
import editalPadrao from '../data/edital.json';
import { calcularProgressoPorTopico, calcularCoberturaGeral } from '../services/editalService';
import { triggerLightHaptic } from '../utils/storage';

interface EditalScreenProps {
  questions: Question[];
  attempts: QuestionAttempt[];
  onTreinarTopico: (category: CategoryType) => void;
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

export const EditalScreen: React.FC<EditalScreenProps> = ({
  questions,
  attempts,
  onTreinarTopico,
  colors,
  isDark,
  getCategoryColor,
}) => {
  const topicos = editalPadrao as EditalTopico[];

  const progressoTopicos = useMemo(() => {
    return calcularProgressoPorTopico(topicos, questions, attempts);
  }, [topicos, questions, attempts]);

  const coberturaGeral = useMemo(() => {
    return calcularCoberturaGeral(topicos, progressoTopicos);
  }, [topicos, progressoTopicos]);

  const mapaProgresso = useMemo(() => {
    return new Map(progressoTopicos.map((p) => [p.topicoId, p]));
  }, [progressoTopicos]);

  const materias = Object.keys(coberturaGeral.porMateria);

  const getStatusBadge = (status: 'pendente' | 'em_revisao' | 'dominado') => {
    switch (status) {
      case 'dominado':
        return {
          label: 'Dominado',
          icon: 'checkmark-circle' as const,
          bg: colors.emeraldSoft,
          text: colors.emerald,
        };
      case 'em_revisao':
        return {
          label: 'Em Revisão',
          icon: 'sync' as const,
          bg: colors.primarySoft,
          text: colors.primary,
        };
      case 'pendente':
        return {
          label: 'Pendente',
          icon: 'time' as const,
          bg: colors.subtle,
          text: colors.textMuted,
        };
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      {/* CARD PRINCIPAL DE COBERTURA */}
      <View
        style={[
          styles.mainCoverageCard,
          { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
        ]}
      >
        <View style={styles.coverageTopRow}>
          <View>
            <Text style={[styles.mainCoverageTitle, { color: colors.text }]}>
              Cobertura do Edital
            </Text>
            <Text style={[styles.mainCoverageSub, { color: colors.textMuted }]}>
              Câmara Municipal de Itanhaém (VUNESP)
            </Text>
          </View>
          <View style={[styles.percentCircle, { borderColor: colors.primary }]}>
            <Text style={[styles.percentNumber, { color: colors.primary }]}>
              {coberturaGeral.percentualGeralCobertura}%
            </Text>
          </View>
        </View>

        {/* Barra de Progresso Geral */}
        <View style={[styles.progressBarTrack, { backgroundColor: colors.subtle }]}>
          <View
            style={[
              styles.progressBarFill,
              {
                width: `${coberturaGeral.percentualGeralCobertura}%`,
                backgroundColor: colors.primary,
              },
            ]}
          />
        </View>

        {/* Contadores de Tópicos */}
        <View style={styles.topicCountersRow}>
          <View style={styles.topicCounter}>
            <Text style={[styles.counterNum, { color: colors.emerald }]}>
              {coberturaGeral.topicosDominados}
            </Text>
            <Text style={[styles.counterLabel, { color: colors.textMuted }]}>Dominados</Text>
          </View>
          <View style={styles.topicCounter}>
            <Text style={[styles.counterNum, { color: colors.primary }]}>
              {coberturaGeral.topicosEmRevisao}
            </Text>
            <Text style={[styles.counterLabel, { color: colors.textMuted }]}>Em Revisão</Text>
          </View>
          <View style={styles.topicCounter}>
            <Text style={[styles.counterNum, { color: colors.textMuted }]}>
              {coberturaGeral.topicosPendentes}
            </Text>
            <Text style={[styles.counterLabel, { color: colors.textMuted }]}>Pendentes</Text>
          </View>
        </View>
      </View>

      {/* COBERTURA POR DISCIPLINA */}
      <Text style={[styles.sectionHeading, { color: colors.text }]}>
        Cobertura por Disciplina
      </Text>
      {materias.map((materia) => {
        const item = coberturaGeral.porMateria[materia];
        return (
          <View
            key={materia}
            style={[
              styles.materiaCard,
              { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
            ]}
          >
            <View style={styles.materiaHeader}>
              <Text style={[styles.materiaTitle, { color: colors.text }]}>{materia}</Text>
              <Text style={[styles.materiaPercent, { color: colors.primary }]}>
                {item.percentualCobertura}%
              </Text>
            </View>
            <View style={[styles.progressBarTrack, { backgroundColor: colors.subtle }]}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${item.percentualCobertura}%`, backgroundColor: colors.primary },
                ]}
              />
            </View>
            <Text style={[styles.materiaMeta, { color: colors.textMuted }]}>
              {item.dominados} dominados • {item.emRevisao} em revisão • {item.pendentes} pendentes
            </Text>
          </View>
        );
      })}

      {/* LISTA DETALHADA DE TÓPICOS DO EDITAL */}
      <Text style={[styles.sectionHeading, { color: colors.text, marginTop: 16 }]}>
        Tópicos Táticos do Edital
      </Text>
      {topicos.map((topico) => {
        const prog = mapaProgresso.get(topico.id);
        const catColors = getCategoryColor(topico.category);
        const statusBadge = getStatusBadge(prog?.status || 'pendente');

        return (
          <View
            key={topico.id}
            style={[
              styles.topicCard,
              { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
            ]}
          >
            <View style={styles.topicCardTop}>
              <View style={[styles.catBadge, { backgroundColor: catColors.soft }]}>
                <Text style={[styles.catBadgeText, { color: catColors.badgeText }]}>
                  {topico.materia}
                </Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: statusBadge.bg }]}>
                <Ionicons name={statusBadge.icon} size={12} color={statusBadge.text} />
                <Text style={[styles.statusBadgeText, { color: statusBadge.text }]}>
                  {statusBadge.label}
                </Text>
              </View>
            </View>

            <Text style={[styles.topicTitle, { color: colors.text }]}>{topico.nome}</Text>
            <Text style={[styles.topicDesc, { color: colors.textMuted }]}>
              {topico.descricao}
            </Text>

            {topico.artigosLei && (
              <Text style={[styles.legalBasis, { color: colors.primary }]}>
                📜 {topico.artigosLei}
              </Text>
            )}

            {/* Barra de Cobertura do Tópico */}
            <View style={styles.topicProgRow}>
              <Text style={[styles.topicProgText, { color: colors.textMuted }]}>
                Respondidas: {prog?.questoesRespondidas || 0} de {prog?.totalQuestoes || 0}
              </Text>
              <Text style={[styles.topicProgTaxa, { color: colors.emerald }]}>
                {prog?.taxaAcerto || 0}% acerto
              </Text>
            </View>

            <View style={[styles.progressBarTrack, { backgroundColor: colors.subtle, marginVertical: 6 }]}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${prog?.percentualCobertura || 0}%`,
                    backgroundColor: catColors.accent,
                  },
                ]}
              />
            </View>

            {/* Botão Treinar Tópico */}
            <TouchableOpacity
              onPress={() => {
                triggerLightHaptic();
                onTreinarTopico(topico.category);
              }}
              style={[styles.trainTopicBtn, { backgroundColor: catColors.soft }]}
            >
              <Ionicons name="flash" size={14} color={catColors.accent} />
              <Text style={[styles.trainTopicText, { color: catColors.accent }]}>
                Treinar Questões Deste Tópico
              </Text>
            </TouchableOpacity>
          </View>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 14,
    paddingBottom: 40,
  },
  mainCoverageCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: 20,
  },
  coverageTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  mainCoverageTitle: {
    fontSize: 18,
    fontWeight: '900',
  },
  mainCoverageSub: {
    fontSize: 12,
    marginTop: 2,
  },
  percentCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  percentNumber: {
    fontSize: 16,
    fontWeight: '900',
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  topicCountersRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f020',
  },
  topicCounter: {
    alignItems: 'center',
  },
  counterNum: {
    fontSize: 18,
    fontWeight: '900',
  },
  counterLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 10,
  },
  materiaCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  materiaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  materiaTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  materiaPercent: {
    fontSize: 13,
    fontWeight: '800',
  },
  materiaMeta: {
    fontSize: 11,
    marginTop: 6,
  },
  topicCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 12,
  },
  topicCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  catBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  catBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  topicTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  topicDesc: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 6,
  },
  legalBasis: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 8,
  },
  topicProgRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topicProgText: {
    fontSize: 11,
  },
  topicProgTaxa: {
    fontSize: 11,
    fontWeight: '800',
  },
  trainTopicBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
    marginTop: 8,
  },
  trainTopicText: {
    fontSize: 12,
    fontWeight: '800',
  },
});
