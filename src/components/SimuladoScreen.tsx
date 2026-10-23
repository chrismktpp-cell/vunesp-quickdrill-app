import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
  AppState,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type {
  Question,
  SimuladoConfig,
  SimuladoResposta,
  SimuladoResultado,
  CategoryType,
} from '../types/schema';
import {
  CONFIGURACOES_PADRAO_SIMULADO,
  gerarQuestoesSimulado,
  calcularResultadoSimulado,
  obterDiagnosticoSimulado,
} from '../services/simuladoService';
import {
  salvarSimuladoAtivo,
  carregarSimuladoAtivo,
  limparSimuladoAtivo,
  ActiveSimuladoData,
} from '../services/activeSimuladoStorage';
import { triggerLightHaptic } from '../utils/haptics';

interface SimuladoScreenProps {
  questions: Question[];
  simuladosHistorico?: SimuladoResultado[];
  onSalvarResultado: (resultado: SimuladoResultado) => void;
  onEnviarErrosParaSRS?: (resultado: SimuladoResultado) => void;
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

export const SimuladoScreen: React.FC<SimuladoScreenProps> = ({
  questions,
  simuladosHistorico = [],
  onSalvarResultado,
  onEnviarErrosParaSRS,
  colors,
  isDark,
  getCategoryColor,
}) => {
  // Map id -> Question para resolução rápida sem buscar no array
  const questionsMap = useMemo(() => {
    const map = new Map<string, Question>();
    for (const q of questions) {
      map.set(q.id, q);
    }
    return map;
  }, [questions]);

  // State: 'menu' | 'running' | 'result'
  const [stage, setStage] = useState<'menu' | 'running' | 'result'>('menu');
  const [selectedConfig, setSelectedConfig] = useState<SimuladoConfig>(
    CONFIGURACOES_PADRAO_SIMULADO[0]
  );

  // Running exam state
  const [examQuestions, setExamQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [respostas, setRespostas] = useState<Record<string, SimuladoResposta>>({});
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [ultimoResultado, setUltimoResultado] = useState<SimuladoResultado | null>(null);
  const [errosEnviadosParaSRS, setErrosEnviadosParaSRS] = useState<boolean>(false);
  const [activeSimuladoRecuperado, setActiveSimuladoRecuperado] = useState<ActiveSimuladoData | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const totalDurationSecondsRef = useRef<number>(0);

  // 1. Verificação defensiva de simulado salvo em andamento ao montar
  useEffect(() => {
    carregarSimuladoAtivo().then((saved) => {
      if (saved) {
        const elapsed = Math.floor((Date.now() - saved.startedAt) / 1000);
        const remaining = Math.max(0, saved.totalDurationSeconds - elapsed);
        if (remaining <= 0) {
          Alert.alert(
            'Simulado Interrompido',
            `O tempo do simulado "${saved.config.titulo}" expirou enquanto o aplicativo estava fechado. Deseja computar o resultado?`,
            [
              {
                text: 'Descartar',
                style: 'destructive',
                onPress: () => limparSimuladoAtivo(),
              },
              {
                text: 'Ver Resultado',
                onPress: () => {
                  const resultado = calcularResultadoSimulado(
                    saved.questions,
                    saved.respostas,
                    saved.totalDurationSeconds,
                    saved.config
                  );
                  setUltimoResultado(resultado);
                  onSalvarResultado(resultado);
                  limparSimuladoAtivo();
                  setStage('result');
                },
              },
            ]
          );
        } else {
          setActiveSimuladoRecuperado(saved);
        }
      }
    });
  }, []);

  const handleRetomarSimulado = (saved: ActiveSimuladoData) => {
    triggerLightHaptic();
    const elapsed = Math.floor((Date.now() - saved.startedAt) / 1000);
    const remaining = Math.max(0, saved.totalDurationSeconds - elapsed);
    setExamQuestions(saved.questions);
    setSelectedConfig(saved.config);
    setCurrentIndex(saved.currentIndex || 0);
    setRespostas(saved.respostas || {});
    setSecondsRemaining(remaining);
    startTimeRef.current = saved.startedAt;
    totalDurationSecondsRef.current = saved.totalDurationSeconds;
    setActiveSimuladoRecuperado(null);
    setStage('running');
  };

  const handleDescartarSimuladoSalvo = async () => {
    triggerLightHaptic();
    await limparSimuladoAtivo();
    setActiveSimuladoRecuperado(null);
  };

  const finalizarProva = useCallback(
    (porTempoEsgotado = false) => {
      if (timerRef.current) clearInterval(timerRef.current);
      limparSimuladoAtivo();

      const tempoTotalGasto = Math.min(
        totalDurationSecondsRef.current || selectedConfig.duracaoMinutos * 60,
        Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000))
      );

      const resultado = calcularResultadoSimulado(
        examQuestions,
        respostas,
        tempoTotalGasto,
        selectedConfig
      );

      setUltimoResultado(resultado);
      onSalvarResultado(resultado);
      setStage('result');

      if (porTempoEsgotado) {
        Alert.alert('Tempo Esgotado!', 'O tempo do simulado acabou. Veja seu desempenho.');
      }
    },
    [examQuestions, respostas, selectedConfig, onSalvarResultado]
  );

  // Timer countdown baseado em wall-clock (Date.now() - startTime) sem drift
  useEffect(() => {
    if (stage !== 'running') {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const recalcularTempo = () => {
      if (startTimeRef.current === 0) return;
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const remaining = Math.max(0, totalDurationSecondsRef.current - elapsed);
      setSecondsRemaining(remaining);
      if (remaining <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        finalizarProva(true);
      }
    };

    recalcularTempo();
    timerRef.current = setInterval(recalcularTempo, 1000);

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        recalcularTempo();
      }
    });

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      subscription.remove();
    };
  }, [stage, finalizarProva]);

  // Persistência com debounce (400ms) durante o simulado em andamento
  useEffect(() => {
    if (stage !== 'running' || examQuestions.length === 0 || startTimeRef.current === 0) return;

    const timer = setTimeout(() => {
      salvarSimuladoAtivo({
        config: selectedConfig,
        questions: examQuestions,
        currentIndex,
        respostas,
        startedAt: startTimeRef.current,
        totalDurationSeconds: totalDurationSecondsRef.current,
      });
    }, 400);

    return () => clearTimeout(timer);
  }, [stage, examQuestions, currentIndex, respostas, selectedConfig]);

  const handleIniciarSimulado = () => {
    triggerLightHaptic();
    const selecionadas = gerarQuestoesSimulado(questions, selectedConfig.quantidadeQuestoes);
    if (selecionadas.length === 0) {
      Alert.alert('Aviso', 'Não há questões disponíveis para o simulado.');
      return;
    }

    const duracaoTotal = selectedConfig.duracaoMinutos * 60;
    const now = Date.now();
    startTimeRef.current = now;
    totalDurationSecondsRef.current = duracaoTotal;

    setExamQuestions(selecionadas);
    setCurrentIndex(0);
    setRespostas({});
    setErrosEnviadosParaSRS(false);
    setSecondsRemaining(duracaoTotal);
    setActiveSimuladoRecuperado(null);
    setStage('running');

    salvarSimuladoAtivo({
      config: selectedConfig,
      questions: selecionadas,
      currentIndex: 0,
      respostas: {},
      startedAt: now,
      totalDurationSeconds: duracaoTotal,
    });
  };

  const handleSelectOption = (questionId: string, optionIndex: number) => {
    triggerLightHaptic();
    setRespostas((prev) => {
      const existing = prev[questionId] || { perguntaId: questionId, selectedOptionIndex: null };
      return {
        ...prev,
        [questionId]: {
          ...existing,
          selectedOptionIndex: optionIndex,
        },
      };
    });
  };

  const handleToggleMarcarRevisao = (questionId: string) => {
    triggerLightHaptic();
    setRespostas((prev) => {
      const existing = prev[questionId] || { perguntaId: questionId, selectedOptionIndex: null };
      return {
        ...prev,
        [questionId]: {
          ...existing,
          marcadaParaRevisao: !existing.marcadaParaRevisao,
        },
      };
    });
  };

  const confirmarSaidaOuPausa = () => {
    triggerLightHaptic();
    Alert.alert(
      'Pausar ou Sair do Simulado',
      'Seu progresso atual está salvo com segurança. Você pode pausar para continuar mais tarde ou descartar esta prova.',
      [
        { text: 'Continuar Prova', style: 'cancel' },
        {
          text: 'Pausar e Voltar',
          onPress: () => {
            if (timerRef.current) clearInterval(timerRef.current);
            setStage('menu');
            carregarSimuladoAtivo().then((saved) => setActiveSimuladoRecuperado(saved));
          },
        },
        {
          text: 'Descartar Prova',
          style: 'destructive',
          onPress: () => {
            if (timerRef.current) clearInterval(timerRef.current);
            limparSimuladoAtivo();
            setActiveSimuladoRecuperado(null);
            setStage('menu');
          },
        },
      ]
    );
  };

  const confirmarFinalizacao = () => {
    triggerLightHaptic();
    const totalRespondidas = Object.values(respostas).filter(
      (r) => r.selectedOptionIndex !== null && r.selectedOptionIndex !== undefined
    ).length;
    const emBranco = examQuestions.length - totalRespondidas;

    const msg =
      emBranco > 0
        ? `Você ainda tem ${emBranco} questão(ões) em branco. Deseja realmente entregar o simulado agora?`
        : 'Você respondeu todas as questões. Confirmar entrega da prova?';

    Alert.alert('Entregar Simulado?', msg, [
      { text: 'Continuar Prova', style: 'cancel' },
      { text: 'Entregar Prova', style: 'destructive', onPress: () => finalizarProva(false) },
    ]);
  };

  // Format seconds to MM:SS
  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // ===================== ETAPA 1: MENU DO SIMULADO =====================
  if (stage === 'menu') {
    return (
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* BANNER DE RETOMADA DE SIMULADO ATIVO */}
        {activeSimuladoRecuperado && (
          <View
            style={[
              styles.resumeCard,
              { backgroundColor: colors.amberSoft, borderColor: colors.amber },
            ]}
          >
            <View style={styles.resumeHeader}>
              <Ionicons name="time" size={20} color={colors.amber} />
              <Text style={[styles.resumeTitle, { color: colors.text }]}>
                Simulado em Andamento Salvo
              </Text>
            </View>
            <Text style={[styles.resumeDesc, { color: colors.text }]}>
              Você possui o simulado "{activeSimuladoRecuperado.config.titulo}" em andamento com{' '}
              {Math.max(
                1,
                Math.round(
                  Math.max(
                    0,
                    activeSimuladoRecuperado.totalDurationSeconds -
                      Math.floor((Date.now() - activeSimuladoRecuperado.startedAt) / 1000)
                  ) / 60
                )
              )}{' '}
              minuto(s) restante(s).
            </Text>
            <View style={styles.resumeActions}>
              <TouchableOpacity
                onPress={() => handleRetomarSimulado(activeSimuladoRecuperado)}
                style={[styles.resumeBtn, { backgroundColor: colors.primary }]}
              >
                <Text style={styles.resumeBtnText}>Retomar Prova</Text>
                <Ionicons name="play" size={14} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleDescartarSimuladoSalvo}
                style={[styles.discardBtn, { borderColor: colors.cardBorder }]}
              >
                <Text style={[styles.discardBtnText, { color: colors.rose }]}>Descartar</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View
          style={[
            styles.bannerHero,
            { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
          ]}
        >
          <View style={[styles.heroIconCircle, { backgroundColor: colors.primarySoft }]}>
            <Ionicons name="timer" size={28} color={colors.primary} />
          </View>
          <Text style={[styles.heroTitle, { color: colors.text }]}>Simulado Real VUNESP</Text>
          <Text style={[styles.heroSub, { color: colors.textMuted }]}>
            Treine sob as mesmas regras do dia da prova da Câmara de Itanhaém.
          </Text>

          <View style={styles.rulesList}>
            <View style={styles.ruleItem}>
              <Ionicons name="stopwatch" size={16} color={colors.amber} />
              <Text style={[styles.ruleText, { color: colors.text }]}>
                Cronômetro regressivo contínuo
              </Text>
            </View>
            <View style={styles.ruleItem}>
              <Ionicons name="eye-off" size={16} color={colors.primary} />
              <Text style={[styles.ruleText, { color: colors.text }]}>
                Sem gabarito durante a prova (sem spoiler)
              </Text>
            </View>
            <View style={styles.ruleItem}>
              <Ionicons name="analytics" size={16} color={colors.emerald} />
              <Text style={[styles.ruleText, { color: colors.text }]}>
                Diagnóstico de desempenho e raio-x ao final
              </Text>
            </View>
          </View>
        </View>

        {/* Escolha da Configuração */}
        <Text style={[styles.sectionHeading, { color: colors.text }]}>
          Selecione a Duração & Tamanho
        </Text>

        {CONFIGURACOES_PADRAO_SIMULADO.map((cfg) => {
          const isSelected = selectedConfig.id === cfg.id;
          return (
            <TouchableOpacity
              key={cfg.id}
              onPress={() => {
                triggerLightHaptic();
                setSelectedConfig(cfg);
              }}
              style={[
                styles.configCard,
                {
                  backgroundColor: isSelected ? (isDark ? '#172554' : '#eff6ff') : colors.cardBg,
                  borderColor: isSelected ? colors.primary : colors.cardBorder,
                },
              ]}
            >
              <View style={styles.configHeader}>
                <View style={styles.configInfo}>
                  <Text style={[styles.configTitle, { color: colors.text }]}>{cfg.titulo}</Text>
                  <Text style={[styles.configMeta, { color: colors.textMuted }]}>
                    ⏱️ {cfg.duracaoMinutos} min • 📋 {cfg.quantidadeQuestoes} questões balanceadas
                  </Text>
                </View>
                <View
                  style={[
                    styles.radioCircle,
                    {
                      borderColor: isSelected ? colors.primary : colors.cardBorder,
                      backgroundColor: isSelected ? colors.primary : 'transparent',
                    },
                  ]}
                >
                  {isSelected && <Ionicons name="checkmark" size={12} color="#ffffff" />}
                </View>
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Botão Começar */}
        <TouchableOpacity
          onPress={handleIniciarSimulado}
          style={[styles.startButton, { backgroundColor: colors.primary }]}
        >
          <Ionicons name="play" size={20} color="#ffffff" />
          <Text style={styles.startButtonText}>Iniciar Simulado Agora</Text>
        </TouchableOpacity>

        {/* Histórico Recente */}
        {simuladosHistorico.length > 0 && (
          <View style={styles.historyContainer}>
            <Text style={[styles.sectionHeading, { color: colors.text, marginTop: 24 }]}>
              Histórico de Simulados
            </Text>
            {simuladosHistorico.slice(0, 3).map((item) => {
              const diag = obterDiagnosticoSimulado(item.pontuacaoPercentual);
              return (
                <View
                  key={item.id}
                  style={[
                    styles.historyCard,
                    { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
                  ]}
                >
                  <View style={styles.historyLeft}>
                    <Text style={[styles.historyTitle, { color: colors.text }]}>{item.titulo}</Text>
                    <Text style={[styles.historyDate, { color: colors.textMuted }]}>
                      {new Date(item.dataHora).toLocaleDateString('pt-BR')} • {Math.round(item.tempoTotalGastoSegundos / 60)} min gastos
                    </Text>
                  </View>
                  <View style={[styles.historyScoreBadge, { backgroundColor: diag.cor + '22' }]}>
                    <Text style={[styles.historyScoreText, { color: diag.cor }]}>
                      {item.pontuacaoPercentual}% ({item.acertos}/{item.totalQuestoes})
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    );
  }

  // ===================== ETAPA 2: PROVA EM ANDAMENTO =====================
  if (stage === 'running') {
    const currentQ = examQuestions[currentIndex];
    const respAtual = respostas[currentQ.id];
    const isFlagged = respAtual?.marcadaParaRevisao;
    const catColors = getCategoryColor(currentQ.category);
    const isUrgent = secondsRemaining < 120; // menos de 2 minutos

    return (
      <View style={[styles.runningContainer, { backgroundColor: colors.bg }]}>
        {/* BARRA SUPERIOR DO EXAME */}
        <View
          style={[
            styles.examBar,
            { backgroundColor: colors.cardBg, borderBottomColor: colors.cardBorder },
          ]}
        >
          <View style={styles.examBarLeft}>
            <Text style={[styles.examCounter, { color: colors.text }]}>
              Questão {currentIndex + 1} de {examQuestions.length}
            </Text>
            <TouchableOpacity
              onPress={() => handleToggleMarcarRevisao(currentQ.id)}
              style={[
                styles.flagBtn,
                { backgroundColor: isFlagged ? colors.amberSoft : colors.subtle },
              ]}
            >
              <Ionicons
                name={isFlagged ? 'flag' : 'flag-outline'}
                size={14}
                color={isFlagged ? colors.amber : colors.textMuted}
              />
              <Text
                style={[
                  styles.flagText,
                  { color: isFlagged ? colors.amber : colors.textMuted },
                ]}
              >
                {isFlagged ? 'Revisar' : 'Marcar'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* TIMER */}
          <View
            style={[
              styles.timerBadge,
              {
                backgroundColor: isUrgent ? colors.roseSoft : colors.primarySoft,
                borderColor: isUrgent ? colors.rose : colors.primary,
              },
            ]}
          >
            <Ionicons
              name="stopwatch"
              size={16}
              color={isUrgent ? colors.rose : colors.primary}
            />
            <Text
              style={[
                styles.timerText,
                { color: isUrgent ? colors.rose : colors.primary },
              ]}
            >
              {formatTimer(secondsRemaining)}
            </Text>
          </View>

          {/* AÇÕES DE EXAME (PAUSAR E ENTREGAR) */}
          <View style={styles.examBarRight}>
            <TouchableOpacity
              onPress={confirmarSaidaOuPausa}
              style={[styles.pauseBtn, { backgroundColor: colors.subtle, borderColor: colors.cardBorder }]}
            >
              <Ionicons name="pause" size={12} color={colors.text} />
              <Text style={[styles.pauseBtnText, { color: colors.text }]}>Pausar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={confirmarFinalizacao}
              style={[styles.finishBtn, { backgroundColor: colors.roseSoft, borderColor: colors.rose }]}
            >
              <Text style={[styles.finishBtnText, { color: colors.rose }]}>Entregar</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* PALETA DE QUESTÕES (NAVEGAÇÃO RÁPIDA) */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.paletteScroll}
        >
          {examQuestions.map((q, idx) => {
            const resp = respostas[q.id];
            const isAnswered = resp && resp.selectedOptionIndex !== null && resp.selectedOptionIndex !== undefined;
            const isCurrent = idx === currentIndex;
            const flagged = resp?.marcadaParaRevisao;

            let bgColor = colors.cardBg;
            let textColor = colors.textMuted;
            let borderColor = colors.cardBorder;

            if (isCurrent) {
              borderColor = colors.primary;
              textColor = colors.primary;
            } else if (flagged) {
              bgColor = colors.amberSoft;
              borderColor = colors.amber;
              textColor = colors.amber;
            } else if (isAnswered) {
              bgColor = colors.primarySoft;
              borderColor = colors.primary;
              textColor = colors.primary;
            }

            return (
              <TouchableOpacity
                key={q.id}
                onPress={() => {
                  triggerLightHaptic();
                  setCurrentIndex(idx);
                }}
                style={[
                  styles.paletteItem,
                  { backgroundColor: bgColor, borderColor },
                  isCurrent && styles.paletteItemCurrent,
                ]}
              >
                <Text style={[styles.paletteText, { color: textColor }]}>{idx + 1}</Text>
                {flagged && (
                  <View style={[styles.paletteFlagDot, { backgroundColor: colors.amber }]} />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* CARD CENTRAL DA QUESTÃO */}
        <ScrollView contentContainerStyle={styles.questionContent} showsVerticalScrollIndicator={false}>
          <View
            style={[
              styles.questionCard,
              { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
            ]}
          >
            {/* Categoria */}
            <View style={styles.catBadgeRow}>
              <View style={[styles.catBadge, { backgroundColor: catColors.soft }]}>
                <Text style={[styles.catBadgeText, { color: catColors.badgeText }]}>
                  {currentQ.category}
                </Text>
              </View>
              <Text style={[styles.subtopicText, { color: colors.textMuted }]}>
                {currentQ.subtopic}
              </Text>
            </View>

            {/* Enunciado */}
            <Text style={[styles.statementText, { color: colors.text }]}>
              {currentQ.statement}
            </Text>

            {/* Alternativas */}
            <View style={styles.optionsList}>
              {currentQ.options.map((option, optIdx) => {
                const isSelected = respAtual?.selectedOptionIndex === optIdx;
                const letter = String.fromCharCode(65 + optIdx); // A, B, C...

                return (
                  <TouchableOpacity
                    key={optIdx}
                    onPress={() => handleSelectOption(currentQ.id, optIdx)}
                    style={[
                      styles.optionButton,
                      {
                        backgroundColor: isSelected ? (isDark ? '#1e3a8a' : '#dbeafe') : colors.subtle,
                        borderColor: isSelected ? colors.primary : colors.cardBorder,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.letterCircle,
                        {
                          backgroundColor: isSelected ? colors.primary : colors.cardBg,
                          borderColor: isSelected ? colors.primary : colors.cardBorder,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.letterText,
                          { color: isSelected ? '#ffffff' : colors.text },
                        ]}
                      >
                        {letter}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.optionLabel,
                        { color: colors.text, fontWeight: isSelected ? '700' : '500' },
                      ]}
                    >
                      {option}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </ScrollView>

        {/* NAVEGAÇÃO INFERIOR (ANTERIOR / PRÓXIMA) */}
        <View
          style={[
            styles.bottomNav,
            { backgroundColor: colors.cardBg, borderTopColor: colors.cardBorder },
          ]}
        >
          <TouchableOpacity
            onPress={() => {
              triggerLightHaptic();
              if (currentIndex > 0) setCurrentIndex((p) => p - 1);
            }}
            disabled={currentIndex === 0}
            style={[
              styles.navButton,
              { backgroundColor: colors.subtle, opacity: currentIndex === 0 ? 0.4 : 1 },
            ]}
          >
            <Ionicons name="arrow-back" size={16} color={colors.text} />
            <Text style={[styles.navButtonText, { color: colors.text }]}>Anterior</Text>
          </TouchableOpacity>

          {currentIndex < examQuestions.length - 1 ? (
            <TouchableOpacity
              onPress={() => {
                triggerLightHaptic();
                setCurrentIndex((p) => p + 1);
              }}
              style={[styles.navButton, { backgroundColor: colors.primary }]}
            >
              <Text style={[styles.navButtonText, { color: '#ffffff' }]}>Próxima</Text>
              <Ionicons name="arrow-forward" size={16} color="#ffffff" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={confirmarFinalizacao}
              style={[styles.navButton, { backgroundColor: colors.emerald }]}
            >
              <Text style={[styles.navButtonText, { color: '#ffffff' }]}>Finalizar</Text>
              <Ionicons name="checkmark-done" size={16} color="#ffffff" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  // ===================== ETAPA 3: RELATÓRIO DO RESULTADO =====================
  if (stage === 'result' && ultimoResultado) {
    const diag = obterDiagnosticoSimulado(ultimoResultado.pontuacaoPercentual);
    const categorias = Object.keys(ultimoResultado.detalhesPorCategoria) as CategoryType[];

    return (
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Banner de Diagnóstico */}
        <View
          style={[
            styles.resultBanner,
            { backgroundColor: diag.cor + '18', borderColor: diag.cor },
          ]}
        >
          <View style={[styles.resultBadge, { backgroundColor: diag.cor }]}>
            <Text style={styles.resultBadgeText}>{diag.classificacao.toUpperCase()}</Text>
          </View>
          <Text style={[styles.resultScoreBig, { color: diag.cor }]}>
            {ultimoResultado.pontuacaoPercentual}%
          </Text>
          <Text style={[styles.resultSubScore, { color: colors.text }]}>
            {ultimoResultado.acertos} acertos de {ultimoResultado.totalQuestoes} questões
          </Text>
          <Text style={[styles.resultMessage, { color: colors.text }]}>
            {diag.mensagem}
          </Text>
        </View>

        {/* Resumo de Tempo e Estatísticas */}
        <View style={styles.statsGrid}>
          <View style={[styles.statBox, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <Ionicons name="time" size={18} color={colors.primary} />
            <Text style={[styles.statBoxNum, { color: colors.text }]}>
              {Math.round(ultimoResultado.tempoTotalGastoSegundos / 60)} min
            </Text>
            <Text style={[styles.statBoxLabel, { color: colors.textMuted }]}>Tempo Gasto</Text>
          </View>

          <View style={[styles.statBox, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <Ionicons name="checkmark-circle" size={18} color={colors.emerald} />
            <Text style={[styles.statBoxNum, { color: colors.emerald }]}>
              {ultimoResultado.acertos}
            </Text>
            <Text style={[styles.statBoxLabel, { color: colors.textMuted }]}>Acertos</Text>
          </View>

          <View style={[styles.statBox, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <Ionicons name="close-circle" size={18} color={colors.rose} />
            <Text style={[styles.statBoxNum, { color: colors.rose }]}>
              {ultimoResultado.erros}
            </Text>
            <Text style={[styles.statBoxLabel, { color: colors.textMuted }]}>Erros</Text>
          </View>

          <View style={[styles.statBox, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            <Ionicons name="help-circle" size={18} color={colors.amber} />
            <Text style={[styles.statBoxNum, { color: colors.amber }]}>
              {ultimoResultado.emBranco}
            </Text>
            <Text style={[styles.statBoxLabel, { color: colors.textMuted }]}>Em Branco</Text>
          </View>
        </View>

        {/* Desempenho por Matéria/Categoria */}
        <Text style={[styles.sectionHeading, { color: colors.text, marginTop: 20 }]}>
          Desempenho por Disciplina
        </Text>
        {categorias.map((cat) => {
          const item = ultimoResultado.detalhesPorCategoria[cat];
          const catColors = getCategoryColor(cat);
          return (
            <View
              key={cat}
              style={[
                styles.catProgressCard,
                { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
              ]}
            >
              <View style={styles.catProgressTop}>
                <Text style={[styles.catProgressName, { color: colors.text }]}>{cat}</Text>
                <Text style={[styles.catProgressRate, { color: catColors.accent }]}>
                  {item.taxa}% ({item.acertos}/{item.total})
                </Text>
              </View>
              <View style={[styles.progressBarTrack, { backgroundColor: colors.subtle }]}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${item.taxa}%`, backgroundColor: catColors.accent },
                  ]}
                />
              </View>
            </View>
          );
        })}

        {/* Correção Detalhada / Raio-X */}
        <Text style={[styles.sectionHeading, { color: colors.text, marginTop: 24 }]}>
          Gabarito Comentado & Raio-X
        </Text>
        {ultimoResultado.respostas.map((item, idx) => {
          const perguntaId = item.perguntaId || (item as any).pergunta?.id;
          const pergunta = questionsMap.get(perguntaId) || (item as any).pergunta;
          if (!pergunta) return null;

          const { selectedOptionIndex, isCorrect } = item;
          const letterUser =
            selectedOptionIndex !== null ? String.fromCharCode(65 + selectedOptionIndex) : 'Em Branco';
          const letterGabarito = String.fromCharCode(65 + pergunta.correctIndex);

          return (
            <View
              key={pergunta.id || idx}
              style={[
                styles.reviewCard,
                {
                  backgroundColor: colors.cardBg,
                  borderColor: isCorrect ? colors.emerald : colors.rose,
                },
              ]}
            >
              <View style={styles.reviewHeader}>
                <Text style={[styles.reviewNum, { color: colors.text }]}>
                  Questão {idx + 1} • {pergunta.category}
                </Text>
                <View
                  style={[
                    styles.reviewStatusTag,
                    { backgroundColor: isCorrect ? colors.emeraldSoft : colors.roseSoft },
                  ]}
                >
                  <Text
                    style={[
                      styles.reviewStatusText,
                      { color: isCorrect ? colors.emerald : colors.rose },
                    ]}
                  >
                    {isCorrect ? '✓ ACERTOU' : '✗ ERROU'}
                  </Text>
                </View>
              </View>

              <Text style={[styles.reviewStatement, { color: colors.text }]}>
                {pergunta.statement}
              </Text>

              <View style={styles.reviewAnswerRow}>
                <Text style={[styles.answerText, { color: colors.textMuted }]}>
                  Sua resposta: <Text style={{ fontWeight: '800', color: isCorrect ? colors.emerald : colors.rose }}>[{letterUser}] {selectedOptionIndex !== null ? pergunta.options[selectedOptionIndex] : ''}</Text>
                </Text>
                {!isCorrect && (
                  <Text style={[styles.answerText, { color: colors.emerald, marginTop: 4 }]}>
                    Gabarito: <Text style={{ fontWeight: '800' }}>[{letterGabarito}] {pergunta.options[pergunta.correctIndex]}</Text>
                  </Text>
                )}
              </View>

              <View style={[styles.reviewRaioXBox, { backgroundColor: colors.subtle }]}>
                <View style={styles.raioXIconRow}>
                  <Ionicons name="flash" size={14} color={colors.amber} />
                  <Text style={[styles.raioXTitle, { color: colors.amber }]}>Raio-X da Pegadinha</Text>
                </View>
                <Text style={[styles.raioXContent, { color: colors.text }]}>{pergunta.raioX}</Text>
                {pergunta.legalBasis && (
                  <Text style={[styles.legalBasisText, { color: colors.textMuted }]}>
                    📜 {pergunta.legalBasis}
                  </Text>
                )}
              </View>
            </View>
          );
        })}

        {/* Ação: Enviar erros para Revisão SRS */}
        {ultimoResultado.erros + ultimoResultado.emBranco > 0 && onEnviarErrosParaSRS && (
          <TouchableOpacity
            onPress={() => {
              if (errosEnviadosParaSRS) return;
              triggerLightHaptic();
              onEnviarErrosParaSRS(ultimoResultado);
              setErrosEnviadosParaSRS(true);
            }}
            disabled={errosEnviadosParaSRS}
            style={[
              styles.startButton,
              {
                backgroundColor: errosEnviadosParaSRS ? colors.emeraldSoft : colors.amber,
                borderColor: errosEnviadosParaSRS ? colors.emerald : colors.amber,
                borderWidth: 1,
                marginTop: 20,
              },
            ]}
          >
            <Ionicons
              name={errosEnviadosParaSRS ? 'checkmark-circle' : 'repeat'}
              size={18}
              color={errosEnviadosParaSRS ? colors.emerald : '#ffffff'}
            />
            <Text
              style={[
                styles.startButtonText,
                { color: errosEnviadosParaSRS ? colors.emerald : '#ffffff' },
              ]}
            >
              {errosEnviadosParaSRS
                ? '✓ Erros enviados para a Fila do Dia (SRS)!'
                : `Enviar ${ultimoResultado.erros + ultimoResultado.emBranco} erro(s) para Revisão SRS`}
            </Text>
          </TouchableOpacity>
        )}

        {/* Botão Novo Simulado */}
        <TouchableOpacity
          onPress={() => {
            triggerLightHaptic();
            setStage('menu');
          }}
          style={[styles.startButton, { backgroundColor: colors.primary, marginTop: 14, marginBottom: 40 }]}
        >
          <Ionicons name="refresh" size={18} color="#ffffff" />
          <Text style={styles.startButtonText}>Fazer Novo Simulado</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  container: {
    padding: 14,
    paddingBottom: 40,
  },
  bannerHero: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 20,
  },
  heroIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 4,
  },
  heroSub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  rulesList: {
    width: '100%',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f020',
    paddingTop: 12,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ruleText: {
    fontSize: 13,
    fontWeight: '600',
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 10,
  },
  configCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 10,
  },
  configHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  configInfo: {
    flex: 1,
  },
  configTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  configMeta: {
    fontSize: 12,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 12,
  },
  startButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  historyContainer: {
    marginTop: 10,
  },
  historyCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  historyLeft: {
    flex: 1,
  },
  historyTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  historyDate: {
    fontSize: 11,
    marginTop: 2,
  },
  historyScoreBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  historyScoreText: {
    fontSize: 12,
    fontWeight: '800',
  },

  // Running Styles
  runningContainer: {
    flex: 1,
  },
  examBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  examBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  examCounter: {
    fontSize: 13,
    fontWeight: '800',
  },
  flagBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  flagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  timerText: {
    fontSize: 14,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  examBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pauseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  pauseBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  finishBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  finishBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  resumeCard: {
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 16,
    gap: 8,
    marginBottom: 12,
  },
  resumeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resumeTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  resumeDesc: {
    fontSize: 13,
    lineHeight: 18,
    opacity: 0.9,
  },
  resumeActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  resumeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  resumeBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  discardBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discardBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  paletteScroll: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  paletteItem: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  paletteItemCurrent: {
    transform: [{ scale: 1.08 }],
  },
  paletteText: {
    fontSize: 12,
    fontWeight: '800',
  },
  paletteFlagDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  questionContent: {
    padding: 14,
    paddingBottom: 20,
  },
  questionCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
  },
  catBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  catBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  catBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  subtopicText: {
    fontSize: 12,
  },
  statementText: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
    marginBottom: 20,
  },
  optionsList: {
    gap: 10,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 12,
  },
  letterCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letterText: {
    fontSize: 13,
    fontWeight: '800',
  },
  optionLabel: {
    fontSize: 15,
    flex: 1,
  },
  bottomNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  navButtonText: {
    fontSize: 13,
    fontWeight: '800',
  },

  // Results Styles
  resultBanner: {
    borderRadius: 18,
    borderWidth: 2,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  resultBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
  },
  resultBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  resultScoreBig: {
    fontSize: 48,
    fontWeight: '900',
  },
  resultSubScore: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  resultMessage: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  statBox: {
    flex: 1,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  statBoxNum: {
    fontSize: 16,
    fontWeight: '900',
    marginTop: 4,
  },
  statBoxLabel: {
    fontSize: 10,
    marginTop: 2,
  },
  catProgressCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  catProgressTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  catProgressName: {
    fontSize: 13,
    fontWeight: '700',
  },
  catProgressRate: {
    fontSize: 12,
    fontWeight: '800',
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  reviewCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewNum: {
    fontSize: 12,
    fontWeight: '800',
  },
  reviewStatusTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  reviewStatusText: {
    fontSize: 11,
    fontWeight: '900',
  },
  reviewStatement: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    marginBottom: 10,
  },
  reviewAnswerRow: {
    marginBottom: 10,
  },
  answerText: {
    fontSize: 13,
  },
  reviewRaioXBox: {
    padding: 10,
    borderRadius: 10,
  },
  raioXIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  raioXTitle: {
    fontSize: 11,
    fontWeight: '800',
  },
  raioXContent: {
    fontSize: 12,
    lineHeight: 17,
  },
  legalBasisText: {
    fontSize: 11,
    marginTop: 4,
    fontStyle: 'italic',
  },
});
