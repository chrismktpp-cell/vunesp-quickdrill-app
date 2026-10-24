import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Modal,
  Dimensions,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path as SvgPath } from 'react-native-svg';
import type { Question, UserStats } from '../types/schema';
import { PLANO_7_DIAS, DiaRoteiro } from '../data/planoEstudosRoteiro';
import {
  calcularStatusTrilha,
  obterDiaRoteiro,
  StatusDiaTrilha,
} from '../services/trilhaService';
import { triggerLightHaptic, triggerSuccessHaptic } from '../utils/haptics';
import { aprovaFoxColors } from '../theme/aprovafox';

interface TrilhaConhecimentoScreenProps {
  questions: Question[];
  stats: UserStats;
  onIniciarTreinoDia: (diaRoteiro: DiaRoteiro) => void;
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
}

// Deslocamentos em X para o efeito sinuoso da trilha (S-curve Duolingo style)
const X_OFFSETS = [0, 48, 20, -42, -50, 25, 0];

export const TrilhaConhecimentoScreen: React.FC<TrilhaConhecimentoScreenProps> = ({
  questions,
  stats,
  onIniciarTreinoDia,
  colors,
  isDark,
}) => {
  const [selectedDia, setSelectedDia] = useState<DiaRoteiro | null>(null);

  const statusGeral = calcularStatusTrilha(stats);
  const diaAtivoRoteiro = obterDiaRoteiro(statusGeral.diaAtual) || PLANO_7_DIAS[0];

  const screenWidth = Dimensions.get('window').width;
  const centerX = screenWidth / 2;
  const NODE_SIZE = 76;
  const VERTICAL_STEP = 120;
  const TOTAL_HEIGHT = PLANO_7_DIAS.length * VERTICAL_STEP + 80;

  const handleOpenDia = (dia: DiaRoteiro, status: StatusDiaTrilha) => {
    triggerLightHaptic();
    setSelectedDia(dia);
  };

  const handleIniciarDoModal = () => {
    if (!selectedDia) return;
    triggerSuccessHaptic();
    const diaParaTreinar = selectedDia;
    setSelectedDia(null);
    onIniciarTreinoDia(diaParaTreinar);
  };

  const handleAbrirVideoaula = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Link de Vídeo', `Abra no navegador ou YouTube: ${url}`);
      }
    } catch {
      Alert.alert('Vídeo', `Abra no seu navegador: ${url}`);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      {/* 1. CABEÇALHO HERO DO ROTEIRO */}
      <View
        style={[
          styles.headerCard,
          { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
        ]}
      >
        <View style={styles.headerTop}>
          <View style={{ flex: 1 }}>
            <View style={styles.headerTagRow}>
              <View style={[styles.headerTag, { backgroundColor: aprovaFoxColors.violetSoft }]}>
                <Ionicons name="sparkles" size={12} color={aprovaFoxColors.violetLight} />
                <Text style={[styles.headerTagText, { color: aprovaFoxColors.violetLight }]}>
                  Ciclo de Alto Rendimento
                </Text>
              </View>
              <Text style={[styles.targetScoreText, { color: colors.emerald }]}>
                Meta: 88% - 92%
              </Text>
            </View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              Trilha do Conhecimento
            </Text>
            <Text style={[styles.headerSub, { color: colors.textMuted }]}>
              7 dias cirúrgicos para blindar os 15 pontos de erro da VUNESP.
            </Text>
          </View>
        </View>

        {/* Barra de Progresso do Ciclo */}
        <View style={styles.cycleProgressRow}>
          <View style={[styles.cycleTrack, { backgroundColor: colors.subtle }]}>
            <View
              style={[
                styles.cycleFill,
                {
                  width: `${statusGeral.percentualCiclo}%`,
                  backgroundColor: aprovaFoxColors.violet,
                },
              ]}
            />
          </View>
          <Text style={[styles.cycleFraction, { color: colors.textMuted }]}>
            {statusGeral.diasConcluidos} de 7 Dias
          </Text>
        </View>
      </View>

      {/* 2. CARD DE MISSÃO DO DIA ATUAL (HERO ACTION) */}
      <View
        style={[
          styles.todayMissionCard,
          {
            backgroundColor: isDark ? '#141d34' : '#eff6ff',
            borderColor: aprovaFoxColors.violet,
          },
        ]}
      >
        <View style={styles.missionHeader}>
          <View style={[styles.missionBadge, { backgroundColor: aprovaFoxColors.violet }]}>
            <Text style={styles.missionBadgeText}>MISSÃO DE HOJE</Text>
          </View>
          <Text style={[styles.missionDayLabel, { color: colors.textMuted }]}>
            Dia {diaAtivoRoteiro.dia} · {diaAtivoRoteiro.diaSemana}
          </Text>
        </View>

        <Text style={[styles.missionTitle, { color: colors.text }]}>
          {diaAtivoRoteiro.titulo}
        </Text>
        <Text style={[styles.missionFoco, { color: colors.textMuted }]}>
          🎯 {diaAtivoRoteiro.focoPrincipal}
        </Text>

        <View style={styles.missionButtonsRow}>
          <TouchableOpacity
            onPress={() => onIniciarTreinoDia(diaAtivoRoteiro)}
            activeOpacity={0.85}
            style={[styles.startMissionBtn, { backgroundColor: aprovaFoxColors.violet }]}
          >
            <Ionicons name="play" size={18} color="#ffffff" />
            <Text style={styles.startMissionBtnText}>
              Iniciar Treino ({diaAtivoRoteiro.metaQuestoes} Questões)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              const st = statusGeral.dias.find((d) => d.dia === diaAtivoRoteiro.dia)!;
              handleOpenDia(diaAtivoRoteiro, st);
            }}
            activeOpacity={0.85}
            style={[
              styles.detailsBtn,
              { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
            ]}
          >
            <Ionicons name="book-outline" size={18} color={colors.text} />
            <Text style={[styles.detailsBtnText, { color: colors.text }]}>Aulas</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 3. MAPA VISUAL COM OS 7 NÓS EM S-CURVE */}
      <View style={[styles.mapContainer, { height: TOTAL_HEIGHT }]}>
        {/* Curvas SVG interligando os nós */}
        <Svg
          style={StyleSheet.absoluteFill}
          width={screenWidth}
          height={TOTAL_HEIGHT}
          pointerEvents="none"
        >
          {PLANO_7_DIAS.map((item, idx) => {
            if (idx === PLANO_7_DIAS.length - 1) return null;
            const x1 = centerX + X_OFFSETS[idx];
            const y1 = idx * VERTICAL_STEP + NODE_SIZE / 2 + 30;
            const x2 = centerX + X_OFFSETS[idx + 1];
            const y2 = (idx + 1) * VERTICAL_STEP + NODE_SIZE / 2 + 30;

            const stProx = statusGeral.dias[idx + 1];
            const strokeColor =
              stProx.status === 'concluido'
                ? aprovaFoxColors.success
                : stProx.status === 'aberto'
                ? aprovaFoxColors.violet
                : isDark
                ? '#24304e'
                : '#cbd5e1';

            const cX1 = x1;
            const cY1 = (y1 + y2) / 2;
            const cX2 = x2;
            const cY2 = (y1 + y2) / 2;

            const pathD = `M ${x1} ${y1} C ${cX1} ${cY1}, ${cX2} ${cY2}, ${x2} ${y2}`;

            return (
              <SvgPath
                key={`line-${item.dia}`}
                d={pathD}
                stroke={strokeColor}
                strokeWidth={5}
                strokeLinecap="round"
                fill="none"
              />
            );
          })}
        </Svg>

        {/* Renderização de cada Nó */}
        {PLANO_7_DIAS.map((diaRoteiro, idx) => {
          const statusInfo = statusGeral.dias.find((d) => d.dia === diaRoteiro.dia)!;
          const isBoss = diaRoteiro.tipo === 'boss_semanal';
          const isCurrent = diaRoteiro.dia === statusGeral.diaAtual && statusInfo.status === 'aberto';

          const posX = centerX + X_OFFSETS[idx] - NODE_SIZE / 2;
          const posY = idx * VERTICAL_STEP + 30;

          // Cores 3D do botão de acordo com o status
          let topColor = '#293653';
          let bottomShadowColor = '#18223A';
          let iconColor = '#ffffff';

          if (isBoss) {
            if (statusInfo.status === 'concluido') {
              topColor = aprovaFoxColors.amber;
              bottomShadowColor = '#B47818';
            } else if (statusInfo.status === 'aberto') {
              topColor = aprovaFoxColors.amber;
              bottomShadowColor = '#B47818';
            } else {
              topColor = isDark ? '#293653' : '#94a3b8';
              bottomShadowColor = isDark ? '#18223A' : '#64748b';
              iconColor = isDark ? '#64748b' : '#cbd5e1';
            }
          } else if (statusInfo.status === 'concluido') {
            topColor = aprovaFoxColors.success;
            bottomShadowColor = aprovaFoxColors.successBorder;
          } else if (statusInfo.status === 'aberto') {
            topColor = aprovaFoxColors.violet;
            bottomShadowColor = '#4e33c7';
          } else {
            topColor = isDark ? '#202b44' : '#cbd5e1';
            bottomShadowColor = isDark ? '#141d30' : '#94a3b8';
            iconColor = isDark ? '#4b5563' : '#64748b';
          }

          return (
            <View
              key={`node-wrap-${diaRoteiro.dia}`}
              style={[
                styles.nodePositioner,
                {
                  left: posX,
                  top: posY,
                  width: NODE_SIZE,
                },
              ]}
            >
              {/* Badge indicativa do Dia */}
              <View
                style={[
                  styles.nodeDayBadge,
                  {
                    backgroundColor: isCurrent
                      ? aprovaFoxColors.violet
                      : statusInfo.status === 'concluido'
                      ? aprovaFoxColors.success
                      : colors.subtle,
                  },
                ]}
              >
                <Text style={styles.nodeDayBadgeText}>
                  {isBoss ? 'BOSS' : `DIA ${diaRoteiro.dia}`}
                </Text>
              </View>

              {/* Botão 3D Tátil */}
              <TouchableOpacity
                onPress={() => handleOpenDia(diaRoteiro, statusInfo)}
                activeOpacity={0.88}
                style={[
                  styles.nodeButton3D,
                  {
                    backgroundColor: bottomShadowColor,
                    width: NODE_SIZE,
                    height: NODE_SIZE,
                    borderRadius: NODE_SIZE / 2,
                  },
                ]}
              >
                <View
                  style={[
                    styles.nodeButtonFace,
                    {
                      backgroundColor: topColor,
                      borderRadius: (NODE_SIZE - 6) / 2,
                    },
                  ]}
                >
                  <Ionicons
                    name={
                      statusInfo.status === 'concluido'
                        ? 'checkmark'
                        : (diaRoteiro.icone as any) || 'book'
                    }
                    size={32}
                    color={iconColor}
                  />
                </View>
              </TouchableOpacity>

              {/* Estrelas de aproveitamento (quando concluído) */}
              {statusInfo.status === 'concluido' && (
                <View style={styles.starsRow}>
                  <Ionicons
                    name="star"
                    size={14}
                    color={statusInfo.estrelas >= 1 ? aprovaFoxColors.amber : colors.textMuted}
                  />
                  <Ionicons
                    name="star"
                    size={14}
                    color={statusInfo.estrelas >= 2 ? aprovaFoxColors.amber : colors.textMuted}
                  />
                  <Ionicons
                    name="star"
                    size={14}
                    color={statusInfo.estrelas >= 3 ? aprovaFoxColors.amber : colors.textMuted}
                  />
                </View>
              )}

              {/* Título Resumido abaixo do nó */}
              <Text
                style={[
                  styles.nodeTitleText,
                  {
                    color: isCurrent
                      ? aprovaFoxColors.violetLight
                      : statusInfo.status === 'concluido'
                      ? colors.text
                      : colors.textMuted,
                    fontWeight: isCurrent ? '800' : '600',
                  },
                ]}
                numberOfLines={2}
              >
                {diaRoteiro.titulo.split('(')[0].trim()}
              </Text>
            </View>
          );
        })}
      </View>

      {/* 4. MODAL DETALHADO DO DIA DA TRILHA */}
      <Modal
        visible={!!selectedDia}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedDia(null)}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalSheet,
              { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
            ]}
          >
            {selectedDia && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Header Modal */}
                <View style={styles.modalHeaderRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.modalDayBadge, { color: aprovaFoxColors.violetLight }]}>
                      DIA {selectedDia.dia} · {selectedDia.diaSemana.toUpperCase()}
                    </Text>
                    <Text style={[styles.modalTitle, { color: colors.text }]}>
                      {selectedDia.titulo}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setSelectedDia(null)}
                    style={[styles.closeBtn, { backgroundColor: colors.subtle }]}
                  >
                    <Ionicons name="close" size={20} color={colors.text} />
                  </TouchableOpacity>
                </View>

                {/* Resumo do Foco */}
                <View
                  style={[
                    styles.focoBox,
                    { backgroundColor: colors.subtle, borderColor: colors.cardBorder },
                  ]}
                >
                  <Text style={[styles.focoHeading, { color: aprovaFoxColors.amber }]}>
                    🎯 FOCO CIRÚRGICO DA VUNESP
                  </Text>
                  <Text style={[styles.focoContent, { color: colors.text }]}>
                    {selectedDia.focoPrincipal}
                  </Text>
                  <Text style={[styles.focoDetail, { color: colors.textMuted }]}>
                    {selectedDia.resumoAtaque}
                  </Text>
                </View>

                {/* Bloco 1: Aulas Cirúrgicas (Caderno + Vídeo no YouTube) */}
                <Text style={[styles.sectionHeading, { color: colors.text }]}>
                  1. Aulas & Material de Apoio
                </Text>
                {selectedDia.aulas.map((aula, aIdx) => (
                  <View
                    key={`aula-${aIdx}`}
                    style={[
                      styles.aulaCard,
                      { backgroundColor: colors.subtle, borderColor: colors.cardBorder },
                    ]}
                  >
                    <View style={styles.aulaHeader}>
                      <Ionicons name="book" size={16} color={aprovaFoxColors.info} />
                      <Text style={[styles.aulaCadernoText, { color: colors.text }]} numberOfLines={2}>
                        {aula.caderno}
                      </Text>
                    </View>

                    <TouchableOpacity
                      onPress={() => handleAbrirVideoaula(aula.videoUrl)}
                      activeOpacity={0.85}
                      style={styles.videoLinkRow}
                    >
                      <View style={styles.videoPlayCircle}>
                        <Ionicons name="play" size={14} color="#ffffff" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.videoTitle, { color: aprovaFoxColors.violetLight }]}>
                          {aula.videoaulaTitulo}
                        </Text>
                        <Text style={[styles.videoMeta, { color: colors.textMuted }]}>
                          {aula.videoaulaCanal} • ⏱️ {aula.videoaulaDuracao}
                        </Text>
                      </View>
                      <Ionicons name="open-outline" size={16} color={colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                ))}

                {/* Bloco 2: Cartão de Blindagem (Pegadinha vs Regra de Ouro) */}
                {selectedDia.regrasBlindagem.length > 0 && (
                  <>
                    <Text style={[styles.sectionHeading, { color: colors.text }]}>
                      2. Cartão de Blindagem VUNESP
                    </Text>
                    {selectedDia.regrasBlindagem.map((regra, rIdx) => (
                      <View
                        key={`regra-${rIdx}`}
                        style={[
                          styles.blindagemCard,
                          { backgroundColor: colors.subtle, borderColor: colors.cardBorder },
                        ]}
                      >
                        <Text style={[styles.regraTopico, { color: aprovaFoxColors.amber }]}>
                          🔑 {regra.topico}
                        </Text>

                        <View style={styles.armadilhaRow}>
                          <Text style={[styles.badgeArmadilha, { color: colors.rose }]}>
                            ✗ Armadilha:
                          </Text>
                          <Text style={[styles.armadilhaDesc, { color: colors.textMuted }]}>
                            {regra.armadilha}
                          </Text>
                        </View>

                        <View style={styles.regraOuroRow}>
                          <Text style={[styles.badgeRegraOuro, { color: colors.emerald }]}>
                            ✓ Regra de Ouro:
                          </Text>
                          <Text style={[styles.regraOuroDesc, { color: colors.text }]}>
                            {regra.regraOuro}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </>
                )}

                {/* Bloco 3: Meta Prática & Botão Iniciar */}
                <View
                  style={[
                    styles.actionFooterBox,
                    { backgroundColor: isDark ? '#141d34' : '#eff6ff' },
                  ]}
                >
                  <Text style={[styles.metaPraticaTitle, { color: colors.text }]}>
                    3. Meta Prática do Dia
                  </Text>
                  <Text style={[styles.metaPraticaSub, { color: colors.textMuted }]}>
                    Resolver {selectedDia.metaQuestoes} questões focadas deste conteúdo com gabarito comentado e repetição espaçada.
                  </Text>

                  <TouchableOpacity
                    onPress={handleIniciarDoModal}
                    activeOpacity={0.88}
                    style={[
                      styles.modalHeroBtn,
                      { backgroundColor: aprovaFoxColors.violet },
                    ]}
                  >
                    <Ionicons name="flash" size={20} color="#ffffff" />
                    <Text style={styles.modalHeroBtnText}>
                      Iniciar Treino ({selectedDia.metaQuestoes} Questões)
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 60,
  },
  headerCard: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  headerTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  headerTagText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  targetScoreText: {
    fontSize: 12,
    fontWeight: '900',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  headerSub: {
    fontSize: 13,
    lineHeight: 18,
  },
  cycleProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  cycleTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  cycleFill: {
    height: '100%',
    borderRadius: 4,
  },
  cycleFraction: {
    fontSize: 12,
    fontWeight: '700',
  },
  todayMissionCard: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 2,
    marginBottom: 20,
  },
  missionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  missionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  missionBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  missionDayLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  missionTitle: {
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 4,
  },
  missionFoco: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  missionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  startMissionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  startMissionBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  detailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  detailsBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  mapContainer: {
    width: '100%',
    position: 'relative',
    marginTop: 10,
  },
  nodePositioner: {
    position: 'absolute',
    alignItems: 'center',
  },
  nodeDayBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginBottom: 6,
  },
  nodeDayBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  nodeButton3D: {
    paddingBottom: 6,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  nodeButtonFace: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 6,
  },
  nodeTitleText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
    width: 100,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    maxHeight: '88%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 20,
    paddingBottom: 36,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  modalDayBadge: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  focoBox: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 18,
  },
  focoHeading: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  focoContent: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  focoDetail: {
    fontSize: 12,
    lineHeight: 17,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 10,
    marginTop: 8,
  },
  aulaCard: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  aulaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  aulaCadernoText: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  videoLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(118, 87, 246, 0.08)',
    padding: 10,
    borderRadius: 10,
  },
  videoPlayCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#dc2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  videoMeta: {
    fontSize: 11,
    marginTop: 2,
  },
  blindagemCard: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  regraTopico: {
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 6,
  },
  armadilhaRow: {
    marginBottom: 6,
  },
  badgeArmadilha: {
    fontSize: 11,
    fontWeight: '900',
    marginBottom: 1,
  },
  armadilhaDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  regraOuroRow: {},
  badgeRegraOuro: {
    fontSize: 11,
    fontWeight: '900',
    marginBottom: 1,
  },
  regraOuroDesc: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  actionFooterBox: {
    padding: 16,
    borderRadius: 16,
    marginTop: 14,
    marginBottom: 20,
    alignItems: 'center',
  },
  metaPraticaTitle: {
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 4,
  },
  metaPraticaSub: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: 14,
  },
  modalHeroBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
  },
  modalHeroBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
  },
});
