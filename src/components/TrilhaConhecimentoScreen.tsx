import React, { useState, useMemo } from 'react';
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
import type {
  Question,
  UserStats,
  CategoryType,
} from '../types/schema';
import { PLANO_7_DIAS, DiaRoteiro } from '../data/planoEstudosRoteiro';
import {
  calcularStatusTrilha,
} from '../services/trilhaService';
import { triggerLightHaptic, triggerSuccessHaptic } from '../utils/haptics';
import { aprovaFoxColors } from '../theme/aprovafox';

interface TrilhaConhecimentoScreenProps {
  questions: Question[];
  stats: UserStats;
  onIniciarTreinoDia: (diaRoteiro: DiaRoteiro) => void;
  onTreinarTopico?: (category: CategoryType | string) => void;
  onIniciarSimulado?: () => void;
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
const X_OFFSETS = [0, 48, 22, -38, -50, 24, 0, 40, -30];

export const TrilhaConhecimentoScreen: React.FC<TrilhaConhecimentoScreenProps> = ({
  questions,
  stats,
  onIniciarTreinoDia,
  onTreinarTopico,
  onIniciarSimulado,
  colors,
  isDark,
}) => {
  // Estado do modal de detalhes do dia do plano
  const [selectedDia, setSelectedDia] = useState<DiaRoteiro | null>(null);

  // Status do Ciclo de 7 Dias
  const statusGeral = useMemo(() => calcularStatusTrilha(stats), [stats]);

  const screenWidth = Dimensions.get('window').width;
  const centerX = screenWidth / 2;
  const NODE_SIZE = 76;
  const VERTICAL_STEP = 115;

  const totalHeightCiclo = PLANO_7_DIAS.length * VERTICAL_STEP + 80;

  // Handlers para o Ciclo de 7 Dias
  const handleOpenDia = (dia: DiaRoteiro) => {
    triggerLightHaptic();
    setSelectedDia(dia);
  };

  const handleIniciarTreinoDoModal = () => {
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
    <ScrollView
      contentContainerStyle={[
        styles.container,
        { backgroundColor: isDark ? aprovaFoxColors.night : '#f8fafc' },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. BANNER DE UNIDADE ESTILO DUOLINGO */}
      <View
        style={[
          styles.unitBanner,
          {
            backgroundColor: aprovaFoxColors.violet,
            borderBottomColor: '#4f33c7',
          },
        ]}
      >
        <View style={styles.unitBannerContent}>
          <View style={styles.unitTagRow}>
            <Text style={styles.unitTagText}>
              SEÇÃO 1 · PLANO DE ESTUDOS VUNESP
            </Text>
          </View>
          <Text style={styles.unitTitleText}>
            Blindagem Cirúrgica dos 15 Pontos
          </Text>
          <Text style={styles.unitSubText}>
            {`${statusGeral.diasConcluidos} de 7 Dias Concluídos (${statusGeral.percentualCiclo}%)`}
          </Text>
        </View>

        {/* Mini Barra de Progresso dentro da Unidade */}
        <View style={styles.unitProgressTrack}>
          <View
            style={[
              styles.unitProgressFill,
              {
                width: `${Math.max(5, statusGeral.percentualCiclo)}%`,
              },
            ]}
          />
        </View>
      </View>

      {/* 2. A TRILHA SINUOSA S-CURVE ESTILO DUOLINGO (CICLO DE 7 DIAS) */}
      <View style={[styles.pathContainer, { height: totalHeightCiclo }]}>
          {/* Conectores SVG Curvos Bezier */}
          <Svg
            width={screenWidth}
            height={totalHeightCiclo}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          >
            {PLANO_7_DIAS.map((item, idx) => {
              if (idx === PLANO_7_DIAS.length - 1) return null;
              const x1 = centerX + X_OFFSETS[idx];
              const y1 = idx * VERTICAL_STEP + 45;
              const x2 = centerX + X_OFFSETS[idx + 1];
              const y2 = (idx + 1) * VERTICAL_STEP + 45;

              const stProx = statusGeral.dias[idx + 1];
              const isPathDominado =
                stProx?.status === 'concluido' ||
                statusGeral.dias[idx]?.status === 'concluido';

              const strokeColor = isPathDominado
                ? '#58cc02'
                : isDark
                ? '#243254'
                : '#cbd5e1';

              const midY = (y1 + y2) / 2;
              const pathD = `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;

              return (
                <SvgPath
                  key={`line-ciclo-${item.dia}`}
                  d={pathD}
                  stroke={strokeColor}
                  strokeWidth={8}
                  strokeLinecap="round"
                  fill="none"
                />
              );
            })}
          </Svg>

          {/* Renderização dos 7 Nós do Ciclo */}
          {PLANO_7_DIAS.map((diaRoteiro, idx) => {
            const statusInfo =
              statusGeral.dias.find((d) => d.dia === diaRoteiro.dia) || {
                dia: diaRoteiro.dia,
                status: 'travado' as const,
                estrelas: 0,
                tentativas: 0,
                acertos: 0,
                taxa: 0,
              };

            const isBoss = diaRoteiro.tipo === 'boss_semanal';
            const isCurrent =
              diaRoteiro.dia === statusGeral.diaAtual &&
              statusInfo.status === 'aberto';

            const posX = centerX + X_OFFSETS[idx] - NODE_SIZE / 2;
            const posY = idx * VERTICAL_STEP + 10;

            // Paleta 3D Duolingo
            let topColor = '#58cc02';
            let shadowColor = '#46a302';
            let iconColor = '#ffffff';

            if (isBoss) {
              topColor = '#ffb547';
              shadowColor = '#d98b1e';
              iconColor = '#ffffff';
            } else if (statusInfo.status === 'concluido') {
              topColor = '#58cc02';
              shadowColor = '#46a302';
              iconColor = '#ffffff';
            } else if (statusInfo.status === 'aberto') {
              topColor = aprovaFoxColors.violet;
              shadowColor = '#5334cc';
              iconColor = '#ffffff';
            } else {
              topColor = isDark ? '#293653' : '#cbd5e1';
              shadowColor = isDark ? '#18223a' : '#94a3b8';
              iconColor = isDark ? '#64748b' : '#64748b';
            }

            return (
              <View
                key={`node-ciclo-${diaRoteiro.dia}`}
                style={[
                  styles.nodePositioner,
                  {
                    left: posX,
                    top: posY,
                    width: NODE_SIZE,
                  },
                ]}
              >
                {/* BALÃO FLUTUANTE ESTILO DUOLINGO NO NÓ ATUAL */}
                {isCurrent && (
                  <View style={styles.floatingCallout} pointerEvents="none">
                    <Text style={styles.floatingCalloutText} numberOfLines={1}>
                      COMEÇAR
                    </Text>
                    <View style={styles.floatingCalloutTriangle} />
                  </View>
                )}

                {/* BOTÃO CIRCULAR CHUNKY 3D TÁTIL */}
                <TouchableOpacity
                  onPress={() => handleOpenDia(diaRoteiro)}
                  activeOpacity={0.85}
                  style={[
                    styles.nodeButtonOuter,
                    {
                      backgroundColor: shadowColor,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.nodeButtonInner,
                      {
                        backgroundColor: topColor,
                      },
                    ]}
                  >
                    <Ionicons
                      name={
                        statusInfo.status === 'concluido'
                          ? 'checkmark-sharp'
                          : isBoss
                          ? 'trophy'
                          : (diaRoteiro.icone as any) || 'book'
                      }
                      size={isBoss ? 34 : 30}
                      color={iconColor}
                    />
                  </View>
                </TouchableOpacity>

                {/* BADGE DE CROWN / ESTRELAS */}
                {statusInfo.status === 'concluido' && (
                  <View style={styles.starsRow}>
                    <Ionicons
                      name="star"
                      size={14}
                      color={statusInfo.estrelas >= 1 ? '#ffc800' : '#64748b'}
                    />
                    <Ionicons
                      name="star"
                      size={14}
                      color={statusInfo.estrelas >= 2 ? '#ffc800' : '#64748b'}
                    />
                    <Ionicons
                      name="star"
                      size={14}
                      color={statusInfo.estrelas >= 3 ? '#ffc800' : '#64748b'}
                    />
                  </View>
                )}

                {statusInfo.status === 'travado' && (
                  <View
                    style={[
                      styles.lockBadge,
                      { backgroundColor: isDark ? '#1e293b' : '#ffffff' },
                    ]}
                  >
                    <Ionicons
                      name="lock-closed"
                      size={12}
                      color={isDark ? '#94a3b8' : '#71717a'}
                    />
                  </View>
                )}

                {/* RÓTULO DO NÓ */}
                <View style={styles.nodeLabelBox}>
                  <Text
                    style={[
                      styles.nodeLabelText,
                      {
                        color: isDark ? '#f1f5f9' : '#1e293b',
                        fontWeight: isCurrent ? '800' : '600',
                      },
                    ]}
                    numberOfLines={2}
                  >
                    {isBoss ? 'Chefão da Semana' : `Dia ${diaRoteiro.dia}: ${diaRoteiro.titulo.split('&')[0].trim()}`}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      {/* 3. MODAL BOTTOM SHEET DUOLINGO (DETALHES DO DIA DO PLANO) */}
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
              { backgroundColor: isDark ? '#141d34' : '#ffffff' },
            ]}
          >
            {selectedDia && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Header do Modal */}
                <View style={styles.sheetHeader}>
                  <View
                    style={[
                      styles.sheetBadge,
                      {
                        backgroundColor:
                          selectedDia.tipo === 'boss_semanal'
                            ? '#ffb547'
                            : aprovaFoxColors.violet,
                      },
                    ]}
                  >
                    <Text style={styles.sheetBadgeText}>
                      {selectedDia.tipo === 'boss_semanal'
                        ? 'DESAFIO CHEFÃO'
                        : `DIA ${selectedDia.dia} · ${selectedDia.diaSemana.toUpperCase()}`}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setSelectedDia(null)}
                    style={styles.sheetCloseBtn}
                  >
                    <Ionicons name="close" size={24} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>

                {/* Título e Foco Cirúrgico */}
                <Text style={[styles.sheetTitle, { color: colors.text }]}>
                  {selectedDia.titulo}
                </Text>
                <Text style={[styles.sheetFoco, { color: colors.textMuted }]}>
                  🎯 {selectedDia.focoPrincipal}
                </Text>

                {/* Tópicos Alvo de Blindagem */}
                {selectedDia.subtopicosFoco && selectedDia.subtopicosFoco.length > 0 && (
                  <View style={styles.targetWeaknessesRow}>
                    {selectedDia.subtopicosFoco.map((tp, idx) => (
                      <View
                        key={`topico-tag-${idx}`}
                        style={[
                          styles.weaknessPill,
                          {
                            backgroundColor: isDark ? '#1c2847' : '#f1f5f9',
                            borderColor: isDark ? '#2e3f6e' : '#e2e8f0',
                          },
                        ]}
                      >
                        <Ionicons
                          name="shield-checkmark"
                          size={12}
                          color={aprovaFoxColors.violetLight}
                        />
                        <Text
                          style={[
                            styles.weaknessPillText,
                            { color: isDark ? '#e2e8f0' : '#334155' },
                          ]}
                        >
                          {tp}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Videoaulas Cirúrgicas */}
                {selectedDia.aulas && selectedDia.aulas.length > 0 && (
                  <>
                    <Text style={[styles.sheetSectionTitle, { color: colors.text }]}>
                      📺 Videoaulas Cirúrgicas Recomendadas
                    </Text>
                    {selectedDia.aulas.map((video, idx) => (
                      <View
                        key={`video-${idx}`}
                        style={[
                          styles.videoCard,
                          {
                            backgroundColor: isDark ? '#182442' : '#f8fafc',
                            borderColor: isDark ? '#293a66' : '#e2e8f0',
                          },
                        ]}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.videoTitle, { color: colors.text }]}>
                            {video.videoaulaTitulo}
                          </Text>
                          <Text style={[styles.videoChannel, { color: colors.textMuted }]}>
                            {video.videoaulaCanal} · {video.videoaulaDuracao}
                          </Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => handleAbrirVideoaula(video.videoUrl)}
                          style={[
                            styles.watchBtn,
                            { backgroundColor: '#ff0000' },
                          ]}
                        >
                          <Ionicons name="logo-youtube" size={16} color="#ffffff" />
                          <Text style={styles.watchBtnText}>Assistir</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </>
                )}

                {/* Cartão de Blindagem VUNESP */}
                {selectedDia.regrasBlindagem && selectedDia.regrasBlindagem.length > 0 && (
                  <View
                    style={[
                      styles.shieldCard,
                      {
                        backgroundColor: isDark ? '#1c2438' : '#eff6ff',
                        borderColor: aprovaFoxColors.violet,
                      },
                    ]}
                  >
                    <Text style={[styles.shieldTitle, { color: aprovaFoxColors.violetLight }]}>
                      🛡️ Cartão de Blindagem VUNESP ({selectedDia.regrasBlindagem[0].topico})
                    </Text>
                    <Text style={[styles.trapText, { color: '#ef4444' }]}>
                      <Text style={{ fontWeight: '800' }}>Armadilha Clássica: </Text>
                      {selectedDia.regrasBlindagem[0].armadilha}
                    </Text>
                    <Text style={[styles.ruleText, { color: colors.emerald }]}>
                      <Text style={{ fontWeight: '800' }}>Regra de Ouro: </Text>
                      {selectedDia.regrasBlindagem[0].regraOuro}
                    </Text>
                  </View>
                )}

                {/* Botão Duolingo 3D "COMEÇAR TREINO" */}
                <TouchableOpacity
                  onPress={handleIniciarTreinoDoModal}
                  activeOpacity={0.85}
                  style={[
                    styles.duoStartButtonOuter,
                    {
                      backgroundColor:
                        selectedDia.tipo === 'boss_semanal'
                          ? '#d98b1e'
                          : '#46a302',
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.duoStartButtonInner,
                      {
                        backgroundColor:
                          selectedDia.tipo === 'boss_semanal'
                            ? '#ffb547'
                            : '#58cc02',
                      },
                    ]}
                  >
                    <Ionicons
                      name={
                        selectedDia.tipo === 'boss_semanal'
                          ? 'trophy'
                          : 'play-sharp'
                      }
                      size={20}
                      color="#ffffff"
                    />
                    <Text style={styles.duoStartButtonText}>
                      COMEÇAR TREINO ({selectedDia.metaQuestoes} QUESTÕES)
                    </Text>
                  </View>
                </TouchableOpacity>
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
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 60,
  },
  sectionToggleBar: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    padding: 4,
    marginBottom: 14,
    gap: 4,
  },
  sectionToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  sectionToggleBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
  unitBanner: {
    padding: 16,
    borderRadius: 18,
    borderBottomWidth: 5,
    marginBottom: 20,
  },
  unitBannerContent: {
    marginBottom: 10,
  },
  unitTagRow: {
    marginBottom: 4,
  },
  unitTagText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
    opacity: 0.9,
  },
  unitTitleText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  unitSubText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    opacity: 0.95,
    marginTop: 2,
  },
  unitProgressTrack: {
    height: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  unitProgressFill: {
    height: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 4,
  },
  pathContainer: {
    width: '100%',
    position: 'relative',
    marginTop: 10,
  },
  nodePositioner: {
    position: 'absolute',
    alignItems: 'center',
  },
  floatingCallout: {
    position: 'absolute',
    top: -46,
    alignSelf: 'center',
    backgroundColor: '#58cc02',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    zIndex: 30,
    minWidth: 108,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  floatingCalloutText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  floatingCalloutTriangle: {
    position: 'absolute',
    bottom: -7,
    alignSelf: 'center',
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 7,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#58cc02',
  },
  nodeButtonOuter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    paddingBottom: 6, // 3D solid depth
    alignItems: 'center',
  },
  nodeButtonInner: {
    flex: 1,
    width: '100%',
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
  },
  starsRow: {
    flexDirection: 'row',
    gap: 3,
    marginTop: 6,
  },
  nodeLabelBox: {
    marginTop: 6,
    width: 105,
    alignItems: 'center',
  },
  nodeLabelText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
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
    padding: 20,
    paddingBottom: 36,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sheetBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  sheetBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  sheetCloseBtn: {
    padding: 4,
  },
  sheetTitle: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  sheetFoco: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
  },
  targetWeaknessesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 18,
  },
  weaknessPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  weaknessPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  sheetSectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 10,
  },
  videoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    gap: 10,
  },
  videoTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  videoChannel: {
    fontSize: 11,
  },
  watchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  watchBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  shieldCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    marginVertical: 14,
    gap: 8,
  },
  shieldTitle: {
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 2,
  },
  trapText: {
    fontSize: 12,
    lineHeight: 18,
  },
  ruleText: {
    fontSize: 12,
    lineHeight: 18,
  },
  duoStartButtonOuter: {
    marginTop: 10,
    marginBottom: 16,
    borderRadius: 16,
    paddingBottom: 5, // 3D tactile push
  },
  duoStartButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
  },
  duoStartButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  materiasContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40,
    gap: 12,
  },
  materiaPillScroll: {
    gap: 8,
    paddingBottom: 12,
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
