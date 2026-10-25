import React, { useMemo, useState } from 'react';
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
import Svg, { Polygon, Line, Circle as SvgCircle, Text as SvgText } from 'react-native-svg';
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
import { triggerLightHaptic } from '../utils/haptics';
import { exportarBackupArquivo, selecionarArquivoWeb } from '../utils/backupService';
import { validarBackup } from '../utils/storage';

interface DashboardScreenProps {
  questions: Question[];
  stats: UserStats;
  categories: CategoryType[];
  onIniciarFilaDoDia: () => void;
  onTreinarErros: () => void;
  onTreinarPontosCegos: () => void;
  onTreinarCategoria: (cat: CategoryType) => void;
  onResetStats: () => void;
  onRestaurarBackup?: (backupData: any) => Promise<void>;
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
  onRestaurarBackup,
  colors,
  isDark,
  getCategoryColor,
}) => {
  const attempts = stats.attempts || [];
  const revisoesSRS = stats.revisoesSRS || {};
  const simuladosHistorico = stats.simuladosHistorico || [];
  const blindSpotQueue = stats.blindSpotQueue || [];
  const simulados = simuladosHistorico;

  const [modalImportAberto, setModalImportAberto] = useState(false);
  const [textoJsonImport, setTextoJsonImport] = useState('');

  const executarRestauracao = (data: any) => {
    Alert.alert(
      'Restaurar Backup',
      'Isto substitui o progresso deste aparelho',
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

  const handleImportPress = async () => {
    triggerLightHaptic();
    if (Platform.OS === 'web') {
      try {
        const raw = await selecionarArquivoWeb();
        const validado = validarBackup(raw);
        if (!validado.valido || !validado.data) {
          Alert.alert('Backup Inválido', validado.erro || 'JSON de backup incompatível.');
          return;
        }
        executarRestauracao(validado.data);
      } catch (err: any) {
        if (err?.message !== 'Nenhum arquivo selecionado') {
          Alert.alert('Erro ao Importar', err?.message || 'Falha ao processar arquivo.');
        }
      }
    } else {
      setTextoJsonImport('');
      setModalImportAberto(true);
    }
  };

  const confirmarImportTexto = () => {
    const validado = validarBackup(textoJsonImport);
    if (!validado.valido || !validado.data) {
      Alert.alert('Backup Inválido', validado.erro || 'JSON de backup incompatível.');
      return;
    }
    setModalImportAberto(false);
    executarRestauracao(validado.data);
  };
  const {
    totalAttempts,
    correctCount,
    accuracyRate,
    realMasteryCount,
    luckyGuessCount,
    consciousErrorCount,
    doubtSuccessCount,
    doubtFailureCount,
    categoryStats,
  } = useMemo(() => {
    let correct = 0;
    let realMastery = 0;
    let luckyGuess = 0;
    let consciousError = 0;
    let doubtSuccess = 0;
    let doubtFailure = 0;

    const catAgg: Record<
      CategoryType,
      { total: number; correct: number; rate: number; blindSpots: number }
    > = {} as any;

    for (const cat of categories) {
      catAgg[cat] = { total: 0, correct: 0, rate: 0, blindSpots: 0 };
    }

    const blindSpotSet = new Set(blindSpotQueue);
    for (const q of questions) {
      if (blindSpotSet.has(q.id) && catAgg[q.category]) {
        catAgg[q.category].blindSpots += 1;
      }
    }

    // Passo único sobre attempts em vez de múltiplos filters repetitivos no render
    for (const a of attempts) {
      if (a.isCorrect) correct += 1;

      switch (a.classification) {
        case 'real_mastery':
          realMastery += 1;
          break;
        case 'lucky_guess':
          luckyGuess += 1;
          break;
        case 'conscious_error':
          consciousError += 1;
          break;
        case 'doubt_success':
          doubtSuccess += 1;
          break;
        case 'doubt_failure':
          doubtFailure += 1;
          break;
      }

      if (catAgg[a.category]) {
        catAgg[a.category].total += 1;
        if (a.isCorrect) {
          catAgg[a.category].correct += 1;
        }
      }
    }

    for (const cat of categories) {
      const catAcum = stats.porCategoria?.[cat];
      const catTotal = catAcum ? catAcum.acertos + catAcum.erros : catAgg[cat].total;
      const catCorrect = catAcum ? catAcum.acertos : catAgg[cat].correct;
      const item = catAgg[cat];
      if (item) {
        item.total = catTotal;
        item.correct = catCorrect;
        item.rate = catTotal > 0 ? Math.round((catCorrect / catTotal) * 100) : 0;
      }
    }

    // Acumuladores históricos que sobrevivem ao corte de 400
    const totalHistorico = (stats.totalAcertos ?? 0) + (stats.totalErros ?? 0);
    const total = totalHistorico > 0 ? totalHistorico : attempts.length;
    const finalCorrect = totalHistorico > 0 ? (stats.totalAcertos ?? 0) : correct;
    const rate = total > 0 ? Math.round((finalCorrect / total) * 100) : 0;

    return {
      totalAttempts: total,
      correctCount: finalCorrect,
      accuracyRate: rate,
      realMasteryCount: realMastery,
      luckyGuessCount: luckyGuess,
      consciousErrorCount: consciousError,
      doubtSuccessCount: doubtSuccess,
      doubtFailureCount: doubtFailure,
      categoryStats: catAgg,
    };
  }, [
    attempts,
    questions,
    categories,
    blindSpotQueue,
    stats.totalAcertos,
    stats.totalErros,
    stats.porCategoria,
  ]);

  // SRS Summary
  const srsSummary = useMemo(() => {
    return resumirSRS(questions, revisoesSRS);
  }, [questions, revisoesSRS]);

  const filaDoDia = useMemo(() => {
    return gerarFilaDoDia(questions, revisoesSRS, 10);
  }, [questions, revisoesSRS]);

  // Edital Coverage
  const topicos = editalPadrao as EditalTopico[];
  const progressoTopicos = useMemo(() => {
    return calcularProgressoPorTopico(topicos, questions, attempts);
  }, [topicos, questions, attempts]);

  const coberturaGeral = useMemo(() => {
    return calcularCoberturaGeral(topicos, progressoTopicos);
  }, [topicos, progressoTopicos]);

  // Tópicos Fracos
  const weakTopics = useMemo(() => {
    return progressoTopicos
      .filter((p) => p.questoesRespondidas > 0 && p.taxaAcerto < 75)
      .sort((a, b) => a.taxaAcerto - b.taxaAcerto)
      .slice(0, 3);
  }, [progressoTopicos]);

  // Comparativo de evolução de simulados
  const evolucaoSimulado = useMemo(() => {
    const ultimo = simuladosHistorico[0] || null;
    const penultimo = simuladosHistorico[1] || null;
    if (!ultimo || !penultimo) return null;

    const diff = ultimo.pontuacaoPercentual - penultimo.pontuacaoPercentual;
    if (diff > 0) {
      return { diff, text: `+${diff}% vs anterior`, color: colors.emerald };
    } else if (diff < 0) {
      return { diff, text: `${diff}% vs anterior`, color: colors.rose };
    }
    return { diff: 0, text: 'Estável vs anterior', color: colors.textMuted };
  }, [simuladosHistorico, colors.emerald, colors.rose, colors.textMuted]);

  // Dados do Gráfico de Radar das 4 Matérias do Edital
  const radarMaterias = useMemo(() => {
    // 1. Língua Portuguesa
    const lpCats = categories.filter((c) =>
      c.toLowerCase().includes('crase') ||
      c.toLowerCase().includes('sujeito') ||
      c.toLowerCase().includes('portug') ||
      c.toLowerCase().includes('concordância')
    );
    let lpTotal = 0, lpCorrect = 0;
    lpCats.forEach((c) => {
      const st = categoryStats[c];
      if (st) {
        lpTotal += st.total;
        lpCorrect += st.correct;
      }
    });
    const lpScore = lpTotal > 0 ? Math.round((lpCorrect / lpTotal) * 100) : (coberturaGeral.porMateria['Língua Portuguesa']?.percentualCobertura || 0);

    // 2. Matemática
    const matCats = categories.filter((c) =>
      c.toLowerCase().includes('matemática') ||
      c.toLowerCase().includes('medida') ||
      c.toLowerCase().includes('geometria') ||
      c.toLowerCase().includes('regra de três')
    );
    let matTotal = 0, matCorrect = 0;
    matCats.forEach((c) => {
      const st = categoryStats[c];
      if (st) {
        matTotal += st.total;
        matCorrect += st.correct;
      }
    });
    const matScore = matTotal > 0 ? Math.round((matCorrect / matTotal) * 100) : (coberturaGeral.porMateria['Matemática']?.percentualCobertura || 0);

    // 3. Conhecimentos Específicos & Patrimônio
    const espCats = categories.filter((c) =>
      c.toLowerCase().includes('patrimônio') ||
      c.toLowerCase().includes('vigilância') ||
      c.toLowerCase().includes('guarda') ||
      c.toLowerCase().includes('incêndio') ||
      c.toLowerCase().includes('ética')
    );
    let espTotal = 0, espCorrect = 0;
    espCats.forEach((c) => {
      const st = categoryStats[c];
      if (st) {
        espTotal += st.total;
        espCorrect += st.correct;
      }
    });
    const espScore = espTotal > 0 ? Math.round((espCorrect / espTotal) * 100) : (coberturaGeral.porMateria['Conhecimentos Específicos']?.percentualCobertura || 0);

    // 4. Direito Administrativo & Legislação
    const dirCats = categories.filter((c) =>
      c.toLowerCase().includes('direito') ||
      c.toLowerCase().includes('administrativo') ||
      c.toLowerCase().includes('regime jurídico') ||
      c.toLowerCase().includes('legislação')
    );
    let dirTotal = 0, dirCorrect = 0;
    dirCats.forEach((c) => {
      const st = categoryStats[c];
      if (st) {
        dirTotal += st.total;
        dirCorrect += st.correct;
      }
    });
    const dirScore = dirTotal > 0 ? Math.round((dirCorrect / dirTotal) * 100) : (coberturaGeral.porMateria['Direito Administrativo']?.percentualCobertura || 0);

    return [
      { nome: 'Português', score: lpScore, catSample: lpCats[0] || categories[0], icon: 'book' },
      { nome: 'Matemática', score: matScore, catSample: matCats[0] || categories[1], icon: 'calculator' },
      { nome: 'Específicos', score: espScore, catSample: espCats[0] || categories[2], icon: 'shield' },
      { nome: 'Legislação', score: dirScore, catSample: dirCats[0] || categories[3], icon: 'ribbon' },
    ];
  }, [categories, categoryStats, coberturaGeral]);

  const strongestMateria = useMemo(() => {
    return [...radarMaterias].sort((a, b) => b.score - a.score)[0];
  }, [radarMaterias]);

  const weakestMateria = useMemo(() => {
    return [...radarMaterias].sort((a, b) => a.score - b.score)[0];
  }, [radarMaterias]);

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

      {/* ================= 2.5. GRÁFICO DE RADAR DO EDITAL (TEIA DE DOMÍNIO) ================= */}
      <View style={styles.radarSectionHeader}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="scan" size={18} color="#7657F6" />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Radar Estratégico do Edital
          </Text>
        </View>
        <Text style={[styles.sectionSubTitle, { color: colors.textMuted }]}>
          Teia de domínio nas 4 áreas oficiais da prova VUNESP
        </Text>
      </View>

      <View
        style={[
          styles.radarCard,
          { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
        ]}
      >
        {/* SVG DO GRÁFICO DE RADAR */}
        <View style={styles.radarSvgContainer}>
          {(() => {
            const cx = 140;
            const cy = 135;
            const R = 85;

            // Anéis de referência poligonal (25%, 50%, 75%, 100%)
            const rings = [0.25, 0.5, 0.75, 1.0];

            // Coordenadas dos 4 vértices do polígono de dados
            const pTop = {
              x: cx,
              y: cy - Math.max(12, ((radarMaterias[0]?.score || 0) / 100) * R),
            };
            const pRight = {
              x: cx + Math.max(12, ((radarMaterias[1]?.score || 0) / 100) * R),
              y: cy,
            };
            const pBottom = {
              x: cx,
              y: cy + Math.max(12, ((radarMaterias[2]?.score || 0) / 100) * R),
            };
            const pLeft = {
              x: cx - Math.max(12, ((radarMaterias[3]?.score || 0) / 100) * R),
              y: cy,
            };

            const dataPoints = `${pTop.x},${pTop.y} ${pRight.x},${pRight.y} ${pBottom.x},${pBottom.y} ${pLeft.x},${pLeft.y}`;

            return (
              <Svg width={280} height={270}>
                {/* Anéis poligonais concêntricos */}
                {rings.map((factor, idx) => {
                  const r = R * factor;
                  const pts = `${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}`;
                  return (
                    <Polygon
                      key={`ring-${idx}`}
                      points={pts}
                      fill="transparent"
                      stroke={isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'}
                      strokeWidth={factor === 0.75 ? 1.5 : 1}
                      strokeDasharray={factor === 0.75 ? '3,3' : undefined}
                    />
                  );
                })}

                {/* Eixos radiais em cruz */}
                <Line
                  x1={cx}
                  y1={cy - R}
                  x2={cx}
                  y2={cy + R}
                  stroke={isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.1)'}
                  strokeWidth={1}
                />
                <Line
                  x1={cx - R}
                  y1={cy}
                  x2={cx + R}
                  y2={cy}
                  stroke={isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.1)'}
                  strokeWidth={1}
                />

                {/* Polígono de Dados do Candidato */}
                <Polygon
                  points={dataPoints}
                  fill="rgba(118, 87, 246, 0.28)"
                  stroke="#7657F6"
                  strokeWidth={2.5}
                />

                {/* Pontos nos vértices com anel */}
                <SvgCircle cx={pTop.x} cy={pTop.y} r={4.5} fill="#7657F6" stroke="#ffffff" strokeWidth={1.5} />
                <SvgCircle cx={pRight.x} cy={pRight.y} r={4.5} fill="#7657F6" stroke="#ffffff" strokeWidth={1.5} />
                <SvgCircle cx={pBottom.x} cy={pBottom.y} r={4.5} fill="#7657F6" stroke="#ffffff" strokeWidth={1.5} />
                <SvgCircle cx={pLeft.x} cy={pLeft.y} r={4.5} fill="#7657F6" stroke="#ffffff" strokeWidth={1.5} />

                {/* Rótulos dos vértices */}
                {/* Top: Português */}
                <SvgText
                  x={cx}
                  y={18}
                  fill={isDark ? '#f1f5f9' : '#1e293b'}
                  fontSize={11}
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {`Português (${radarMaterias[0]?.score || 0}%)`}
                </SvgText>

                {/* Right: Matemática */}
                <SvgText
                  x={cx + R + 6}
                  y={cy + 4}
                  fill={isDark ? '#f1f5f9' : '#1e293b'}
                  fontSize={11}
                  fontWeight="bold"
                  textAnchor="start"
                >
                  {`Matemática (${radarMaterias[1]?.score || 0}%)`}
                </SvgText>

                {/* Bottom: Conhecimentos Específicos */}
                <SvgText
                  x={cx}
                  y={cy + R + 26}
                  fill={isDark ? '#f1f5f9' : '#1e293b'}
                  fontSize={11}
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {`Específicos (${radarMaterias[2]?.score || 0}%)`}
                </SvgText>

                {/* Left: Legislação */}
                <SvgText
                  x={cx - R - 6}
                  y={cy + 4}
                  fill={isDark ? '#f1f5f9' : '#1e293b'}
                  fontSize={11}
                  fontWeight="bold"
                  textAnchor="end"
                >
                  {`Legislação (${radarMaterias[3]?.score || 0}%)`}
                </SvgText>
              </Svg>
            );
          })()}
        </View>

        {/* Diagnóstico Tático e Ação Rápida */}
        <View style={styles.radarDiagnosticRow}>
          {strongestMateria && (
            <View
              style={[
                styles.radarPill,
                { backgroundColor: 'rgba(16, 185, 129, 0.12)', borderColor: '#10b981' },
              ]}
            >
              <Ionicons name="checkmark-circle" size={13} color="#10b981" />
              <Text style={[styles.radarPillText, { color: '#10b981' }]}>
                Ponto Mais Forte: {strongestMateria.nome} ({strongestMateria.score}%)
              </Text>
            </View>
          )}

          {weakestMateria && (
            <View
              style={[
                styles.radarPill,
                { backgroundColor: 'rgba(239, 68, 68, 0.12)', borderColor: '#ef4444' },
              ]}
            >
              <Ionicons name="alert-circle" size={13} color="#ef4444" />
              <Text style={[styles.radarPillText, { color: '#ef4444' }]}>
                Foco de Atenção: {weakestMateria.nome} ({weakestMateria.score}%)
              </Text>
            </View>
          )}
        </View>

        {/* Botão de Treino Direto no Ponto Fraco */}
        {weakestMateria && (
          <TouchableOpacity
            onPress={() => {
              triggerLightHaptic();
              onTreinarCategoria(weakestMateria.catSample);
            }}
            activeOpacity={0.85}
            style={[styles.radarActionBtn, { backgroundColor: '#7657F6' }]}
          >
            <Ionicons name="flash" size={15} color="#ffffff" />
            <Text style={styles.radarActionBtnText}>
              Treinar {weakestMateria.nome} Agora (Blindar Pontos Fracos)
            </Text>
          </TouchableOpacity>
        )}
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

      {/* ================= 8. BACKUP E RESTAURAÇÃO ================= */}
      <View style={styles.backupRow}>
        <TouchableOpacity
          onPress={async () => {
            triggerLightHaptic();
            try {
              await exportarBackupArquivo(stats);
            } catch (err: any) {
              Alert.alert('Erro ao Exportar', err?.message || 'Falha ao gerar arquivo de backup.');
            }
          }}
          activeOpacity={0.85}
          style={[styles.backupBtn, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
        >
          <Ionicons name="share-outline" size={16} color={colors.primary} />
          <Text style={[styles.backupBtnText, { color: colors.text }]}>Exportar Backup</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleImportPress}
          activeOpacity={0.85}
          style={[styles.backupBtn, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
        >
          <Ionicons name="download-outline" size={16} color={colors.primary} />
          <Text style={[styles.backupBtnText, { color: colors.text }]}>Importar Backup</Text>
        </TouchableOpacity>
      </View>

      {/* Modal de Importação para Mobile */}
      <Modal
        visible={modalImportAberto}
        transparent
        animationType="fade"
        onRequestClose={() => setModalImportAberto(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Importar Backup (JSON)</Text>
            <Text style={[styles.modalDesc, { color: colors.textMuted }]}>
              Cole o conteúdo do arquivo de backup gerado anteriormente:
            </Text>
            <TextInput
              style={[
                styles.importTextInput,
                {
                  color: colors.text,
                  backgroundColor: colors.subtle,
                  borderColor: colors.cardBorder,
                },
              ]}
              multiline
              numberOfLines={6}
              value={textoJsonImport}
              onChangeText={setTextoJsonImport}
              placeholder='{"v": 2, ...}'
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setModalImportAberto(false)}
                style={[styles.modalBtn, { borderColor: colors.cardBorder }]}
              >
                <Text style={[styles.modalBtnText, { color: colors.textMuted }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={confirmarImportTexto}
                style={[styles.modalBtn, { backgroundColor: colors.primary, borderColor: colors.primary }]}
              >
                <Text style={[styles.modalBtnText, { color: '#ffffff' }]}>Validar e Restaurar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ================= 9. RESET DE DADOS ================= */}
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
  radarSectionHeader: {
    marginTop: 18,
    marginBottom: 8,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionSubTitle: {
    fontSize: 12,
    marginTop: 2,
  },
  radarCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  radarSvgContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  radarDiagnosticRow: {
    width: '100%',
    gap: 8,
    marginTop: 8,
  },
  radarPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  radarPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  radarActionBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 10,
    shadowColor: '#7657F6',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  radarActionBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
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
  backupRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  backupBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  backupBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    width: '100%',
    maxWidth: 420,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  modalDesc: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 12,
  },
  importTextInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    height: 120,
    textAlignVertical: 'top',
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 14,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  modalBtn: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
  },
  modalBtnText: {
    fontSize: 12,
    fontWeight: '700',
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

