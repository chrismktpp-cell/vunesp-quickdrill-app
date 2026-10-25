import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Question, UserStats, EditalTopico } from '../types/schema';
import editalPadrao from '../data/edital.json';
import { triggerLightHaptic, triggerSuccessHaptic } from '../utils/haptics';
import { aprovaFoxColors } from '../theme/aprovafox';

interface MateriasScreenProps {
  questions: Question[];
  stats: UserStats;
  onTreinarTopico: (categoryOrMateria: string) => void;
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
  };
  isDark: boolean;
}

export const MateriasScreen: React.FC<MateriasScreenProps> = ({
  questions,
  stats,
  onTreinarTopico,
  colors,
  isDark,
}) => {
  const [materiaFiltro, setMateriaFiltro] = useState<string>('all');
  const topicosEdital = editalPadrao as EditalTopico[];

  const MATERIAS_CONFIG = [
    {
      id: 'lp',
      nome: 'Língua Portuguesa',
      icone: 'book' as const,
      cor: '#3b82f6',
      tag: '90 Questões · VUNESP',
      meta: 'Interpretação, Gramática e Sintaxe',
    },
    {
      id: 'da',
      nome: 'Direito Administrativo',
      icone: 'document-text' as const,
      cor: '#8b5cf6',
      tag: '65 Questões · VUNESP',
      meta: 'Lei 14.133/2021 e Princípios',
    },
    {
      id: 'mat',
      nome: 'Matemática e Raciocínio Lógico',
      icone: 'calculator' as const,
      cor: '#f59e0b',
      tag: '10 Questões · VUNESP',
      meta: 'Porcentagem, Regra de 3 e Lógica',
    },
    {
      id: 'esp',
      nome: 'Conhecimentos Específicos',
      icone: 'shield-checkmark' as const,
      cor: '#10b981',
      tag: '10 Questões · VUNESP',
      meta: 'Vigilância Patrimonial & Postura',
    },
  ];

  // Cálculo de progresso e aproveitamento por disciplina
  const progressoMaterias = useMemo(() => {
    const attempts = stats.attempts || [];
    const norm = (s: string = '') =>
      s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();

    return MATERIAS_CONFIG.map((mat) => {
      const nTarget = norm(mat.nome);
      const qsMat = questions.filter((q) => {
        const nCat = norm(q.category);
        const nMat = norm(q.materia || '');
        return (
          nCat === nTarget ||
          nMat === nTarget ||
          nCat.includes(nTarget) ||
          nMat.includes(nTarget)
        );
      });

      const idsMat = new Set(qsMat.map((q) => q.id));
      const attsMat = attempts.filter((a) => idsMat.has(a.questionId));
      const acertos = attsMat.filter((a) => a.isCorrect).length;
      const respondidas = new Set(attsMat.map((a) => a.questionId)).size;
      const taxa = attsMat.length > 0 ? Math.round((acertos / attsMat.length) * 100) : 0;

      return {
        ...mat,
        totalQuestoes: qsMat.length,
        respondidas,
        acertos,
        taxa,
      };
    });
  }, [questions, stats.attempts]);

  // Filtragem dos tópicos do edital
  const topicosFiltrados = useMemo(() => {
    if (materiaFiltro === 'all') return topicosEdital;
    const norm = (s: string = '') =>
      s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
    const nTarget = norm(materiaFiltro);
    return topicosEdital.filter((t) => {
      const nMat = norm(t.materia);
      const nCat = norm(t.category);
      return (
        nMat === nTarget ||
        nCat === nTarget ||
        nMat.includes(nTarget) ||
        nCat.includes(nTarget)
      );
    });
  }, [materiaFiltro, topicosEdital]);

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { backgroundColor: colors.bg }]}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. CABEÇALHO HERO DA PÁGINA DE MATÉRIAS */}
      <View
        style={[
          styles.heroBanner,
          {
            backgroundColor: isDark ? '#141d34' : '#ffffff',
            borderColor: isDark ? '#243254' : '#e2e8f0',
          },
        ]}
      >
        <View style={styles.heroTagRow}>
          <Ionicons name="school" size={14} color={aprovaFoxColors.amber} />
          <Text style={[styles.heroTagText, { color: aprovaFoxColors.amber }]}>
            EDITAL COMPLETO · ITANHAÉM
          </Text>
        </View>
        <Text style={[styles.heroTitle, { color: colors.text }]}>
          Escolher por Matéria
        </Text>
        <Text style={[styles.heroSubtitle, { color: colors.textMuted }]}>
          Treine livremente as 4 disciplinas oficiais e os tópicos táticos da banca VUNESP.
        </Text>
      </View>

      {/* 2. PÍLULAS DE FILTRAGEM HORIZONTAL */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.materiaPillScroll}
      >
        <TouchableOpacity
          onPress={() => {
            triggerLightHaptic();
            setMateriaFiltro('all');
          }}
          activeOpacity={0.85}
          style={[
            styles.materiaPill,
            materiaFiltro === 'all'
              ? { backgroundColor: aprovaFoxColors.violet, borderColor: aprovaFoxColors.violet }
              : {
                  backgroundColor: isDark ? '#18223a' : '#ffffff',
                  borderColor: isDark ? '#243254' : '#cbd5e1',
                },
          ]}
        >
          <Text
            style={[
              styles.materiaPillText,
              { color: materiaFiltro === 'all' ? '#ffffff' : colors.textMuted },
            ]}
          >
            Todas ({questions.length})
          </Text>
        </TouchableOpacity>

        {progressoMaterias.map((mat) => {
          const isSelected = materiaFiltro === mat.nome;
          return (
            <TouchableOpacity
              key={mat.id}
              onPress={() => {
                triggerLightHaptic();
                setMateriaFiltro(isSelected ? 'all' : mat.nome);
              }}
              activeOpacity={0.85}
              style={[
                styles.materiaPill,
                isSelected
                  ? { backgroundColor: mat.cor, borderColor: mat.cor }
                  : {
                      backgroundColor: isDark ? '#18223a' : '#ffffff',
                      borderColor: isDark ? '#243254' : '#cbd5e1',
                    },
              ]}
            >
              <Text
                style={[
                  styles.materiaPillText,
                  { color: isSelected ? '#ffffff' : colors.textMuted },
                ]}
              >
                {mat.nome} ({mat.totalQuestoes})
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* 3. CARDS DE DISCIPLINAS OFICIAIS */}
      <Text style={[styles.sectionSubtitle, { color: colors.text, marginTop: 4 }]}>
        Disciplinas da Prova (VUNESP)
      </Text>

      {progressoMaterias
        .filter((mat) => materiaFiltro === 'all' || materiaFiltro === mat.nome)
        .map((mat) => (
          <View
            key={mat.id}
            style={[
              styles.materiaCardBox,
              {
                backgroundColor: isDark ? '#141d34' : '#ffffff',
                borderColor: isDark ? '#243254' : '#e2e8f0',
              },
            ]}
          >
            <View style={styles.materiaCardHeader}>
              <View
                style={[
                  styles.materiaIconBubble,
                  { backgroundColor: `${mat.cor}22` },
                ]}
              >
                <Ionicons name={mat.icone} size={22} color={mat.cor} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.materiaCardTitle, { color: colors.text }]}>
                  {mat.nome}
                </Text>
                <Text style={[styles.materiaCardTag, { color: mat.cor }]}>
                  {mat.tag}
                </Text>
              </View>
              <View
                style={[
                  styles.taxaBadgeSmall,
                  {
                    backgroundColor:
                      mat.respondidas === 0
                        ? isDark
                          ? '#1e293b'
                          : '#f1f5f9'
                        : mat.taxa >= 70
                        ? isDark
                          ? 'rgba(66, 211, 146, 0.15)'
                          : '#dcfce7'
                        : isDark
                        ? 'rgba(255, 181, 71, 0.15)'
                        : '#fef3c7',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.taxaBadgeSmallText,
                    {
                      color:
                        mat.respondidas === 0
                          ? colors.textMuted
                          : mat.taxa >= 70
                          ? '#42D392'
                          : '#FFB547',
                    },
                  ]}
                >
                  {mat.respondidas === 0 ? 'Não iniciada' : `${mat.taxa}% de acerto`}
                </Text>
              </View>
            </View>

            {/* Barra de Progresso da Disciplina */}
            <View
              style={[
                styles.materiaProgressTrack,
                { backgroundColor: isDark ? '#1e293b' : '#f1f5f9' },
              ]}
            >
              <View
                style={[
                  styles.materiaProgressFill,
                  {
                    width: `${
                      mat.totalQuestoes > 0
                        ? Math.round((mat.respondidas / mat.totalQuestoes) * 100)
                        : 0
                    }%`,
                    backgroundColor: mat.cor,
                  },
                ]}
              />
            </View>

            <View style={styles.materiaCardFooterRow}>
              <Text style={[styles.materiaStatsText, { color: colors.textMuted }]}>
                {mat.respondidas} de {mat.totalQuestoes} resolvidas (
                {mat.totalQuestoes > 0
                  ? Math.round((mat.respondidas / mat.totalQuestoes) * 100)
                  : 0}
                %)
              </Text>

              {/* Botão de Ação Direta: Treinar Matéria Completa */}
              <TouchableOpacity
                onPress={() => {
                  triggerSuccessHaptic();
                  onTreinarTopico(mat.nome);
                }}
                activeOpacity={0.88}
                style={[styles.materiaTrainButton, { backgroundColor: mat.cor }]}
              >
                <Ionicons name="flash" size={14} color="#ffffff" />
                <Text style={styles.materiaTrainButtonText}>Treinar Matéria</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

      {/* 4. TÓPICOS DETALHADOS DO EDITAL */}
      <Text style={[styles.sectionSubtitle, { color: colors.text, marginTop: 18 }]}>
        Tópicos Táticos do Edital ({topicosFiltrados.length})
      </Text>

      {topicosFiltrados.map((topico) => (
        <View
          key={topico.id}
          style={[
            styles.topicoCardBox,
            {
              backgroundColor: isDark ? '#141d34' : '#ffffff',
              borderColor: isDark ? '#243254' : '#e2e8f0',
            },
          ]}
        >
          <View style={styles.topicoCardTopRow}>
            <View
              style={[
                styles.topicoMateriaTag,
                { backgroundColor: isDark ? '#1e293b' : '#f1f5f9' },
              ]}
            >
              <Text style={[styles.topicoMateriaTagText, { color: aprovaFoxColors.violet }]}>
                {topico.materia}
              </Text>
            </View>
            <View style={styles.pesoTag}>
              <Text style={[styles.pesoTagText, { color: colors.textMuted }]}>
                Relevância: {topico.pesoOuRelevancia}
              </Text>
            </View>
          </View>

          <Text style={[styles.topicoCardTitle, { color: colors.text }]}>
            {topico.nome}
          </Text>
          <Text style={[styles.topicoCardDesc, { color: colors.textMuted }]}>
            {topico.descricao}
          </Text>

          {topico.artigosLei && (
            <View style={styles.topicoLeiRow}>
              <Ionicons name="document-text-outline" size={13} color={aprovaFoxColors.amber} />
              <Text
                style={[styles.topicoLeiText, { color: aprovaFoxColors.amber }]}
                numberOfLines={1}
              >
                {topico.artigosLei}
              </Text>
            </View>
          )}

          <TouchableOpacity
            onPress={() => {
              triggerSuccessHaptic();
              onTreinarTopico(topico.category);
            }}
            activeOpacity={0.88}
            style={[
              styles.treinarTopicoBtn,
              {
                backgroundColor: isDark ? '#1e293b' : '#f8fafc',
                borderColor: isDark ? '#243254' : '#cbd5e1',
              },
            ]}
          >
            <Text style={[styles.treinarTopicoBtnText, { color: aprovaFoxColors.violet }]}>
              Praticar este Tópico
            </Text>
            <Ionicons name="arrow-forward" size={14} color={aprovaFoxColors.violet} />
          </TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 12,
  },
  heroBanner: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    gap: 6,
    marginBottom: 4,
  },
  heroTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroTagText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  heroSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  materiaPillScroll: {
    gap: 8,
    paddingBottom: 6,
  },
  materiaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  materiaPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  sectionSubtitle: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  materiaCardBox: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 14,
    gap: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  materiaCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  materiaIconBubble: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  materiaCardTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  materiaCardTag: {
    fontSize: 11,
    fontWeight: '700',
  },
  taxaBadgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  taxaBadgeSmallText: {
    fontSize: 11,
    fontWeight: '800',
  },
  materiaProgressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  materiaProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  materiaCardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  materiaStatsText: {
    fontSize: 12,
  },
  materiaTrainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  materiaTrainButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  topicoCardBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  topicoCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topicoMateriaTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  topicoMateriaTagText: {
    fontSize: 11,
    fontWeight: '800',
  },
  pesoTag: {},
  pesoTagText: {
    fontSize: 11,
  },
  topicoCardTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  topicoCardDesc: {
    fontSize: 12,
    lineHeight: 17,
  },
  topicoLeiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  topicoLeiText: {
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  treinarTopicoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 4,
  },
  treinarTopicoBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
});
