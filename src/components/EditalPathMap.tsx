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

const DUO_PALETTE = {
  // Dominado (Verde Duolingo)
  success: '#58cc02',
  successDark: '#46a302',
  // Aberto / Atual (Azul Duolingo)
  info: '#1cb0f6',
  infoDark: '#1596d0',
  // Lendário (Roxo Conquista)
  legendary: '#ce82ff',
  legendaryDark: '#9945ff',
  // Travado (Cinza)
  lockedLight: '#e5e5e5',
  lockedDarkShadowLight: '#cfcfcf',
  lockedDark: '#334155',
  lockedDarkShadowDark: '#1e293b',
  // Chefão Final (Ouro)
  boss: '#ffc800',
  bossDark: '#d99b00',
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
          top: isDark ? DUO_PALETTE.lockedDark : DUO_PALETTE.lockedLight,
          bottom: isDark ? DUO_PALETTE.lockedDarkShadowDark : DUO_PALETTE.lockedDarkShadowLight,
          icon: isDark ? '#94a3b8' : '#71717a',
        };
      }
      return {
        top: DUO_PALETTE.boss,
        bottom: DUO_PALETTE.bossDark,
        icon: '#ffffff',
      };
    }

    switch (status) {
      case 'lendario':
        return {
          top: DUO_PALETTE.legendary,
          bottom: DUO_PALETTE.legendaryDark,
          icon: '#ffffff',
        };
      case 'dominado':
        return {
          top: DUO_PALETTE.success,
          bottom: DUO_PALETTE.successDark,
          icon: '#ffffff',
        };
      case 'aberto':
        return {
          top: DUO_PALETTE.info,
          bottom: DUO_PALETTE.infoDark,
          icon: '#ffffff',
        };
      case 'travado':
      default:
        return {
          top: isDark ? DUO_PALETTE.lockedDark : DUO_PALETTE.lockedLight,
          bottom: isDark ? DUO_PALETTE.lockedDarkShadowDark : DUO_PALETTE.lockedDarkShadowLight,
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
            ? DUO_PALETTE.success
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
                backgroundColor: isDark ? '#1e293b' : '#ffffff',
                borderColor: isDark ? '#334155' : '#e5e5e5',
              },
            ]}
          >
            {selectedNode && (
              <>
                <View style={styles.modalHeaderRow}>
                  <View
                    style={[
                      styles.modalStatusCircle,
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
                      size={26}
                      color="#ffffff"
                    />
                  </View>
                  <View style={styles.modalHeaderTexts}>
                    <Text
                      style={[
                        styles.modalMateriaTag,
                        { color: isDark ? '#94a3b8' : '#64748b' },
                      ]}
                    >
                      {selectedNode.tipo === 'boss'
                        ? 'PROVA OFICIAL VUNESP'
                        : selectedNode.topico?.materia.toUpperCase()}
                    </Text>
                    <Text
                      style={[
                        styles.modalNodeTitle,
                        { color: isDark ? '#ffffff' : '#0f172a' },
                      ]}
                    >
                      {selectedNode.tipo === 'boss'
                        ? selectedNode.tituloCurto
                        : selectedNode.topico?.nome}
                    </Text>
                  </View>
                </View>

                {selectedNode.topico && (
                  <Text
                    style={[
                      styles.modalDescricao,
                      { color: isDark ? '#cbd5e1' : '#334155' },
                    ]}
                  >
                    {selectedNode.topico.descricao}
                  </Text>
                )}

                {/* Métricas do Tópico se já respondido */}
                {selectedNode.progresso && selectedNode.status !== 'travado' && (
                  <View
                    style={[
                      styles.modalStatsRow,
                      {
                        backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                        borderColor: isDark ? '#334155' : '#e2e8f0',
                      },
                    ]}
                  >
                    <View style={styles.modalStatItem}>
                      <Text style={styles.modalStatValue}>
                        {selectedNode.progresso.taxaAcerto}%
                      </Text>
                      <Text
                        style={[
                          styles.modalStatLabel,
                          { color: isDark ? '#94a3b8' : '#64748b' },
                        ]}
                      >
                        Aproveitamento
                      </Text>
                    </View>
                    <View style={styles.modalStatDivider} />
                    <View style={styles.modalStatItem}>
                      <Text style={styles.modalStatValue}>
                        {selectedNode.progresso.questoesRespondidas}/
                        {selectedNode.progresso.totalQuestoes}
                      </Text>
                      <Text
                        style={[
                          styles.modalStatLabel,
                          { color: isDark ? '#94a3b8' : '#64748b' },
                        ]}
                      >
                        Respondidas
                      </Text>
                    </View>
                  </View>
                )}

                {/* Status travado aviso */}
                {selectedNode.status === 'travado' && (
                  <View
                    style={[
                      styles.lockedNoticeBox,
                      {
                        backgroundColor: isDark ? '#334155' : '#f1f5f9',
                        borderColor: isDark ? '#475569' : '#e2e8f0',
                      },
                    ]}
                  >
                    <Ionicons name="lock-closed" size={18} color="#eab308" />
                    <Text
                      style={[
                        styles.lockedNoticeText,
                        { color: isDark ? '#e2e8f0' : '#475569' },
                      ]}
                    >
                      {selectedNode.tipo === 'boss'
                        ? 'Complete os tópicos anteriores da trilha para desbloquear o Chefão!'
                        : 'Acerte 70% ou responda 4 questões do tópico anterior para desbloquear.'}
                    </Text>
                  </View>
                )}

                {/* Ações principais 3D */}
                <View style={styles.modalActionButtons}>
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
                              ? DUO_PALETTE.bossDark
                              : DUO_PALETTE.successDark,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.chunkyActionBtnInner,
                          {
                            backgroundColor:
                              selectedNode.tipo === 'boss'
                                ? DUO_PALETTE.boss
                                : DUO_PALETTE.success,
                          },
                        ]}
                      >
                        <Ionicons
                          name={selectedNode.tipo === 'boss' ? 'flame' : 'play'}
                          size={18}
                          color="#ffffff"
                        />
                        <Text style={styles.chunkyActionBtnText}>
                          {selectedNode.tipo === 'boss'
                            ? 'ENFRENTAR CHEFÃO'
                            : 'TREINAR TÓPICO'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      onPress={() => setSelectedNode(null)}
                      activeOpacity={0.85}
                      style={[
                        styles.chunkyActionBtnOuter,
                        { backgroundColor: '#94a3b8' },
                      ]}
                    >
                      <View
                        style={[
                          styles.chunkyActionBtnInner,
                          { backgroundColor: '#cbd5e1' },
                        ]}
                      >
                        <Text style={[styles.chunkyActionBtnText, { color: '#475569' }]}>
                          VOLTAR À TRILHA
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    onPress={() => setSelectedNode(null)}
                    style={styles.modalCloseBtn}
                  >
                    <Text
                      style={[
                        styles.modalCloseBtnText,
                        { color: isDark ? '#94a3b8' : '#64748b' },
                      ]}
                    >
                      Fechar
                    </Text>
                  </TouchableOpacity>
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
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  modalStatusCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalHeaderTexts: {
    flex: 1,
  },
  modalMateriaTag: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  modalNodeTitle: {
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 20,
  },
  modalDescricao: {
    fontSize: 13,
    lineHeight: 18,
  },
  modalStatsRow: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  modalStatValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#10b981',
  },
  modalStatLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  modalStatDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#cbd5e1',
  },
  lockedNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  lockedNoticeText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  modalActionButtons: {
    gap: 10,
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
