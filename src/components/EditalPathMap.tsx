import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path as SvgPath, Circle } from 'react-native-svg';
import type {
  Question,
  QuestionAttempt,
  CategoryType,
  EditalTopico,
  ProgressoEdital,
  RevisaoSRS,
} from '../types/schema';
import { triggerLightHaptic, triggerSuccessHaptic } from '../utils/haptics';

interface EditalPathMapProps {
  topicos: EditalTopico[];
  progressoMap: Map<string, ProgressoEdital>;
  revisoesSRS: Record<string, RevisaoSRS>;
  onTreinarTopico: (category: CategoryType) => void;
  onIniciarSimulado: () => void;
  isDark: boolean;
  colors: any;
}

export type NodeStatus = 'travado' | 'aberto' | 'dominado' | 'lendario';

interface TrilhaNode {
  id: string;
  index: number;
  tipo: 'topico' | 'boss';
  topico?: EditalTopico;
  progresso?: ProgressoEdital;
  status: NodeStatus;
  xOffset: number; // Deslocamento em px em relação ao centro
  icone: keyof typeof Ionicons.glyphMap;
  tituloCurto: string;
  subtitulo: string;
}

const APROVAFOX_TRILHA_PALETTE = {
  // Dominado (Verde AprovaFox)
  success: '#42D392',
  successDark: '#2AAE75',
  // Aberto / Atual (Violeta AprovaFox)
  info: '#7657F6',
  infoDark: '#5E3CE3',
  // Lendário (Âmbar Raposa)
  legendary: '#FFB547',
  legendaryDark: '#E09832',
  // Travado (Superfícies Noturnas)
  lockedLight: '#293653',
  lockedDarkShadowLight: '#18223A',
  lockedDark: '#293653',
  lockedDarkShadowDark: '#121A2E',
  // Chefão Final (Ouro Raposa)
  boss: '#FFB547',
  bossDark: '#E09832',
};

const X_OFFSETS = [0, 50, 25, -35, -55, -20, 40, 50, 0];

const ICONES_TOPICOS: Array<keyof typeof Ionicons.glyphMap> = [
  'book',
  'swap-horizontal',
  'spell-check' as any,
  'business',
  'cube',
  'shield-checkmark',
  'document-text',
  'cash',
];

export const EditalPathMap: React.FC<EditalPathMapProps> = ({
  topicos,
  progressoMap,
  revisoesSRS,
  onTreinarTopico,
  onIniciarSimulado,
  isDark,
  colors,
}) => {
  const [selectedNode, setSelectedNode] = useState<TrilhaNode | null>(null);

  // Calcula estado de cada nó da trilha
  const nodes: TrilhaNode[] = [];

  let previousCompleted = true; // Primeiro nó sempre liberado

  topicos.forEach((topico, idx) => {
    const prog = progressoMap.get(topico.id);
    const taxa = prog?.taxaAcerto ?? 0;
    const respondidas = prog?.questoesRespondidas ?? 0;
    const isDominado = prog?.status === 'dominado' || (respondidas >= 4 && taxa >= 75);

    // Verifica se possui questões na caixa 5 (Lendário)
    let hasCaixa5 = false;
    for (const srs of Object.values(revisoesSRS)) {
      if (srs.caixa >= 5) {
        hasCaixa5 = true;
        break;
      }
    }

    let status: NodeStatus = 'travado';
    if (idx === 0 || previousCompleted) {
      if (isDominado && hasCaixa5) {
        status = 'lendario';
      } else if (isDominado) {
        status = 'dominado';
      } else {
        status = 'aberto';
      }
    } else {
      status = 'travado';
    }

    // Regra de destravamento do próximo nó:
    // O próximo nó libera se este tiver taxa >= 70% OU pelo menos 4 respondidas OU for dominado
    previousCompleted = respondidas >= 4 || taxa >= 70 || isDominado;

    nodes.push({
      id: topico.id,
      index: idx,
      tipo: 'topico',
      topico,
      progresso: prog,
      status,
      xOffset: X_OFFSETS[idx % X_OFFSETS.length],
      icone: ICONES_TOPICOS[idx % ICONES_TOPICOS.length] || 'book',
      tituloCurto: topico.nome.split('&')[0].split(',')[0].trim(),
      subtitulo: topico.category,
    });
  });

  // Nó Chefão Final (Simulado Real)
  const allCompleted = nodes.every((n) => n.status !== 'travado');
  const bossNode: TrilhaNode = {
    id: 'boss-simulado',
    index: nodes.length,
    tipo: 'boss',
    status: allCompleted ? 'aberto' : 'travado',
    xOffset: 0,
    icone: 'trophy',
    tituloCurto: 'Simulado Real VUNESP',
    subtitulo: 'Chefe da Trilha (40 Questões)',
  };
  nodes.push(bossNode);

  const screenWidth = Dimensions.get('window').width;
  const centerX = screenWidth / 2;
  const NODE_SIZE = 76;
  const VERTICAL_STEP = 110;
  const TOTAL_HEIGHT = nodes.length * VERTICAL_STEP + 80;

  // Helper para obter cores 3D de cada status
  const getNodeColors = (status: NodeStatus, isBoss: boolean) => {
    if (isBoss) {
      if (status === 'travado') {
        return {
          top: isDark ? APROVAFOX_TRILHA_PALETTE.lockedDark : APROVAFOX_TRILHA_PALETTE.lockedLight,
          bottom: isDark ? APROVAFOX_TRILHA_PALETTE.lockedDarkShadowDark : APROVAFOX_TRILHA_PALETTE.lockedDarkShadowLight,
          icon: isDark ? '#94a3b8' : '#71717a',
        };
      }
      return {
        top: APROVAFOX_TRILHA_PALETTE.boss,
        bottom: APROVAFOX_TRILHA_PALETTE.bossDark,
        icon: '#ffffff',
      };
    }

    switch (status) {
      case 'lendario':
        return {
          top: APROVAFOX_TRILHA_PALETTE.legendary,
          bottom: APROVAFOX_TRILHA_PALETTE.legendaryDark,
          icon: '#ffffff',
        };
      case 'dominado':
        return {
          top: APROVAFOX_TRILHA_PALETTE.success,
          bottom: APROVAFOX_TRILHA_PALETTE.successDark,
          icon: '#ffffff',
        };
      case 'aberto':
        return {
          top: APROVAFOX_TRILHA_PALETTE.info,
          bottom: APROVAFOX_TRILHA_PALETTE.infoDark,
          icon: '#ffffff',
        };
      case 'travado':
      default:
        return {
          top: isDark ? APROVAFOX_TRILHA_PALETTE.lockedDark : APROVAFOX_TRILHA_PALETTE.lockedLight,
          bottom: isDark ? APROVAFOX_TRILHA_PALETTE.lockedDarkShadowDark : APROVAFOX_TRILHA_PALETTE.lockedDarkShadowLight,
          icon: isDark ? '#94a3b8' : '#71717a',
        };
    }
  };

  const handleNodePress = (node: TrilhaNode) => {
    triggerLightHaptic();
    setSelectedNode(node);
  };

  return (
    <View style={styles.container}>
      {/* SVGs conectores entre os nós */}
      <Svg
        width={screenWidth}
        height={TOTAL_HEIGHT}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      >
        {nodes.map((node, i) => {
          if (i === nodes.length - 1) return null;
          const nextNode = nodes[i + 1];

          const startX = centerX + node.xOffset;
          const startY = i * VERTICAL_STEP + 45;
          const endX = centerX + nextNode.xOffset;
          const endY = (i + 1) * VERTICAL_STEP + 45;

          const isPathActive = node.status === 'dominado' || node.status === 'lendario';
          const strokeColor = isPathActive
            ? APROVAFOX_TRILHA_PALETTE.success
            : isDark
            ? '#334155'
            : '#e5e5e5';

          // Curva cúbica bezier suave estilo Duolingo
          const midY = (startY + endY) / 2;
          const d = `M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY}`;

          return (
            <SvgPath
              key={`path-${node.id}`}
              d={d}
              stroke={strokeColor}
              strokeWidth={8}
              strokeLinecap="round"
              fill="none"
            />
          );
        })}
      </Svg>

      {/* Renderização física dos nós 3D */}
      <View style={[styles.nodesWrapper, { height: TOTAL_HEIGHT }]}>
        {nodes.map((node, i) => {
          const isBoss = node.tipo === 'boss';
          const nodeColors = getNodeColors(node.status, isBoss);
          const topPosition = i * VERTICAL_STEP;
          const leftPosition = centerX + node.xOffset - NODE_SIZE / 2;

          return (
            <View
              key={node.id}
              style={[
                styles.nodePositioner,
                {
                  top: topPosition,
                  left: leftPosition,
                },
              ]}
            >
              {/* Botão circular Chunky 3D */}
              <TouchableOpacity
                onPress={() => handleNodePress(node)}
                activeOpacity={0.85}
                style={[
                  styles.nodeButtonOuter,
                  {
                    backgroundColor: nodeColors.bottom,
                  },
                ]}
              >
                <View
                  style={[
                    styles.nodeButtonInner,
                    {
                      backgroundColor: nodeColors.top,
                    },
                  ]}
                >
                  <Ionicons name={node.icone} size={isBoss ? 32 : 28} color={nodeColors.icon} />
                </View>
              </TouchableOpacity>

              {/* Badges superiores flutuantes */}
              {node.status === 'lendario' && (
                <View style={styles.legendaryCrownBadge}>
                  <Ionicons name="sparkles" size={14} color="#ffffff" />
                </View>
              )}

              {node.status === 'travado' && (
                <View
                  style={[
                    styles.lockBadge,
                    { backgroundColor: isDark ? '#1e293b' : '#ffffff' },
                  ]}
                >
                  <Ionicons name="lock-closed" size={12} color={isDark ? '#94a3b8' : '#71717a'} />
                </View>
              )}

              {node.status === 'aberto' && (
                <View style={styles.activePillBadge}>
                  <Text style={styles.activePillText}>AQUI</Text>
                </View>
              )}

              {/* Rótulo descritivo abaixo do nó */}
              <View style={styles.nodeLabelBox}>
                <Text
                  style={[
                    styles.nodeLabelText,
                    { color: isDark ? '#f1f5f9' : '#1e293b' },
                  ]}
                  numberOfLines={2}
                >
                  {node.tituloCurto}
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* MODAL / BOTTOM SHEET DE DETALHES DO NÓ SELECIONADO */}
      <Modal
        visible={!!selectedNode}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedNode(null)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: isDark ? '#111827' : '#ffffff',
                borderColor: isDark ? '#1f2937' : '#e5e7eb',
              },
            ]}
          >
            {selectedNode && (
              <>
                {/* TOPO DO CARD DE MISSÃO */}
                <View style={styles.missionHeaderRow}>
                  <View
                    style={[
                      styles.missionIconCircle,
                      {
                        backgroundColor: getNodeColors(
                          selectedNode.status,
                          selectedNode.tipo === 'boss'
                        ).top,
                      },
                    ]}
                  >
                    <Ionicons
                      name={selectedNode.icone}
                      size={28}
                      color="#ffffff"
                    />
                  </View>
                  <View style={styles.missionHeaderMeta}>
                    <View style={styles.missionBadgeRow}>
                      <View
                        style={[
                          styles.missionCategoryBadge,
                          { backgroundColor: isDark ? '#1e293b' : '#f1f5f9' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.missionCategoryBadgeText,
                            { color: isDark ? '#94a3b8' : '#475569' },
                          ]}
                        >
                          {selectedNode.tipo === 'boss'
                            ? 'PROVA OFICIAL'
                            : (selectedNode.topico?.materia || 'EDITAL').toUpperCase()}
                        </Text>
                      </View>
                      {selectedNode.topico?.pesoOuRelevancia && (
                        <View
                          style={[
                            styles.missionRelevanceBadge,
                            {
                              backgroundColor:
                                selectedNode.topico.pesoOuRelevancia === 'Alta'
                                  ? 'rgba(239, 68, 68, 0.15)'
                                  : 'rgba(234, 179, 8, 0.15)',
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.missionRelevanceBadgeText,
                              {
                                color:
                                  selectedNode.topico.pesoOuRelevancia === 'Alta'
                                    ? '#ef4444'
                                    : '#eab308',
                              },
                            ]}
                          >
                            {selectedNode.topico.pesoOuRelevancia === 'Alta'
                              ? '🔥 Relevância Alta'
                              : '⚡ Relevância Média'}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text
                      style={[
                        styles.missionNodeTitle,
                        { color: isDark ? '#ffffff' : '#0f172a' },
                      ]}
                      numberOfLines={2}
                    >
                      {selectedNode.tipo === 'boss'
                        ? selectedNode.tituloCurto
                        : selectedNode.topico?.nome || selectedNode.tituloCurto}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setSelectedNode(null)}
                    style={styles.missionCloseIconButton}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    accessibilityLabel="Fechar detalhes da missão"
                  >
                    <Ionicons
                      name="close"
                      size={20}
                      color={isDark ? '#94a3b8' : '#64748b'}
                    />
                  </TouchableOpacity>
                </View>

                {/* RAIO-X CIRÚRGICO DA BANCA VUNESP */}
                {selectedNode.topico && (
                  <View
                    style={[
                      styles.missionRaioXBox,
                      {
                        backgroundColor: isDark ? 'rgba(30, 41, 59, 0.7)' : '#f8fafc',
                        borderColor: isDark ? '#334155' : '#e2e8f0',
                      },
                    ]}
                  >
                    <View style={styles.missionRaioXHeader}>
                      <Ionicons name="sparkles" size={14} color="#f59e0b" />
                      <Text style={styles.missionRaioXTitle}>
                        RAIO-X CIRÚRGICO DA VUNESP
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.missionRaioXText,
                        { color: isDark ? '#cbd5e1' : '#334155' },
                      ]}
                    >
                      {selectedNode.topico.descricao}
                    </Text>
                    {selectedNode.topico.artigosLei && (
                      <View style={styles.missionLegalRow}>
                        <Ionicons name="bookmark" size={12} color="#7657F6" />
                        <Text
                          style={[
                            styles.missionLegalText,
                            { color: isDark ? '#a5b4fc' : '#4f46e5' },
                          ]}
                          numberOfLines={1}
                        >
                          {selectedNode.topico.artigosLei}
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                {/* PLACAR DE DESEMPENHO E METAS */}
                {selectedNode.progresso && selectedNode.status !== 'travado' && (
                  <View
                    style={[
                      styles.missionStatsContainer,
                      {
                        backgroundColor: isDark ? '#0f172a' : '#f1f5f9',
                        borderColor: isDark ? '#1e293b' : '#e2e8f0',
                      },
                    ]}
                  >
                    <View style={styles.missionStatCard}>
                      <Text style={styles.missionStatValue}>
                        {selectedNode.progresso.taxaAcerto}%
                      </Text>
                      <Text
                        style={[
                          styles.missionStatLabel,
                          { color: isDark ? '#94a3b8' : '#64748b' },
                        ]}
                      >
                        Aproveitamento
                      </Text>
                    </View>
                    <View style={styles.missionStatDivider} />
                    <View style={styles.missionStatCard}>
                      <Text style={styles.missionStatValue}>
                        {selectedNode.progresso.questoesRespondidas}/
                        {selectedNode.progresso.totalQuestoes}
                      </Text>
                      <Text
                        style={[
                          styles.missionStatLabel,
                          { color: isDark ? '#94a3b8' : '#64748b' },
                        ]}
                      >
                        Respondidas
                      </Text>
                    </View>
                    <View style={styles.missionStatDivider} />
                    <View style={styles.missionStatCard}>
                      <Text
                        style={[
                          styles.missionStatValue,
                          {
                            color:
                              selectedNode.status === 'dominado' || selectedNode.status === 'lendario'
                                ? '#10b981'
                                : '#7657F6',
                          },
                        ]}
                      >
                        {selectedNode.status === 'dominado' || selectedNode.status === 'lendario'
                          ? '100%'
                          : `${Math.min(100, Math.round((selectedNode.progresso.questoesRespondidas / 4) * 100))}%`}
                      </Text>
                      <Text
                        style={[
                          styles.missionStatLabel,
                          { color: isDark ? '#94a3b8' : '#64748b' },
                        ]}
                      >
                        Meta do Nó
                      </Text>
                    </View>
                  </View>
                )}

                {/* AVISO QUANDO O NÓ ESTÁ TRAVADO */}
                {selectedNode.status === 'travado' && (
                  <View
                    style={[
                      styles.lockedMissionBox,
                      {
                        backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
                        borderColor: isDark ? '#334155' : '#cbd5e1',
                      },
                    ]}
                  >
                    <Ionicons name="lock-closed" size={20} color="#eab308" />
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.lockedMissionTitle,
                          { color: isDark ? '#f8fafc' : '#1e293b' },
                        ]}
                      >
                        Missão Bloqueada
                      </Text>
                      <Text
                        style={[
                          styles.lockedMissionText,
                          { color: isDark ? '#94a3b8' : '#64748b' },
                        ]}
                      >
                        {selectedNode.tipo === 'boss'
                          ? 'Complete os tópicos anteriores da trilha para liberar o Simulado Real VUNESP!'
                          : 'Acerte 70% ou responda 4 questões do tópico anterior para liberar.'}
                      </Text>
                    </View>
                  </View>
                )}

                {/* BOTÃO CHUNKY 3D DUOLINGO "INICIAR MISSÃO" */}
                <View style={styles.missionActionContainer}>
                  {selectedNode.status !== 'travado' ? (
                    <TouchableOpacity
                      onPress={() => {
                        triggerSuccessHaptic();
                        const node = selectedNode;
                        setSelectedNode(null);
                        if (node.tipo === 'boss') {
                          onIniciarSimulado();
                        } else if (node.topico?.category) {
                          onTreinarTopico(node.topico.category);
                        }
                      }}
                      activeOpacity={0.85}
                      style={[
                        styles.chunkyActionBtnOuter,
                        {
                          backgroundColor:
                            selectedNode.tipo === 'boss'
                              ? APROVAFOX_TRILHA_PALETTE.bossDark
                              : selectedNode.status === 'dominado' || selectedNode.status === 'lendario'
                              ? '#2563eb'
                              : APROVAFOX_TRILHA_PALETTE.successDark,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.chunkyActionBtnInner,
                          {
                            backgroundColor:
                              selectedNode.tipo === 'boss'
                                ? APROVAFOX_TRILHA_PALETTE.boss
                                : selectedNode.status === 'dominado' || selectedNode.status === 'lendario'
                                ? '#3b82f6'
                                : APROVAFOX_TRILHA_PALETTE.success,
                          },
                        ]}
                      >
                        <Ionicons
                          name={
                            selectedNode.tipo === 'boss'
                              ? 'trophy'
                              : selectedNode.status === 'dominado'
                              ? 'refresh'
                              : 'play'
                          }
                          size={18}
                          color="#ffffff"
                        />
                        <Text style={styles.chunkyActionBtnText}>
                          {selectedNode.tipo === 'boss'
                            ? 'ENFRENTAR PROVA REAL (40 Q)'
                            : selectedNode.status === 'dominado' || selectedNode.status === 'lendario'
                            ? 'REVISAR MISSÃO (+XP)'
                            : 'INICIAR MISSÃO (TREINAR)'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      onPress={() => setSelectedNode(null)}
                      activeOpacity={0.85}
                      style={[
                        styles.chunkyActionBtnOuter,
                        { backgroundColor: '#64748b' },
                      ]}
                    >
                      <View
                        style={[
                          styles.chunkyActionBtnInner,
                          { backgroundColor: '#94a3b8' },
                        ]}
                      >
                        <Ionicons name="arrow-back" size={16} color="#ffffff" />
                        <Text style={[styles.chunkyActionBtnText, { color: '#ffffff' }]}>
                          VOLTAR À TRILHA
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    width: '100%',
    alignItems: 'center',
    paddingVertical: 20,
  },
  nodesWrapper: {
    width: '100%',
    position: 'relative',
  },
  nodePositioner: {
    position: 'absolute',
    width: 76,
    alignItems: 'center',
  },
  nodeButtonOuter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    paddingBottom: 6, // Cria a "barriga" 3D sólida
  },
  nodeButtonInner: {
    flex: 1,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendaryCrownBadge: {
    position: 'absolute',
    top: -6,
    right: -4,
    backgroundColor: '#ffc800',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  lockBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
  },
  activePillBadge: {
    position: 'absolute',
    top: -12,
    backgroundColor: '#1cb0f6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  activePillText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  nodeLabelBox: {
    marginTop: 6,
    width: 110,
    alignItems: 'center',
  },
  nodeLabelText: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 2,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    padding: 24,
    gap: 16,
  },
  missionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  missionIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 4,
  },
  missionHeaderMeta: {
    flex: 1,
  },
  missionBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  missionCategoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  missionCategoryBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  missionRelevanceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  missionRelevanceBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  missionNodeTitle: {
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 21,
  },
  missionCloseIconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  missionRaioXBox: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  missionRaioXHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  missionRaioXTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#f59e0b',
    letterSpacing: 0.8,
  },
  missionRaioXText: {
    fontSize: 12,
    lineHeight: 18,
  },
  missionLegalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  missionLegalText: {
    fontSize: 11,
    fontWeight: '600',
  },
  missionStatsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
  },
  missionStatCard: {
    flex: 1,
    alignItems: 'center',
  },
  missionStatValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#10b981',
  },
  missionStatLabel: {
    fontSize: 10,
    marginTop: 2,
    fontWeight: '600',
  },
  missionStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(150, 150, 150, 0.2)',
  },
  lockedMissionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  lockedMissionTitle: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 2,
  },
  lockedMissionText: {
    fontSize: 11,
    lineHeight: 15,
  },
  missionActionContainer: {
    marginTop: 4,
  },
  chunkyActionBtnOuter: {
    height: 54,
    borderRadius: 16,
    paddingBottom: 5, // Barriga 3D
  },
  chunkyActionBtnInner: {
    flex: 1,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  chunkyActionBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  modalCloseBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  modalCloseBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
