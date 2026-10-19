import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { CategoryType, Dificuldade } from '../types/schema';
import type { QuestionFilters } from '../services/filterEngine';
import { triggerLightHaptic } from '../utils/storage';

interface FiltrosModalProps {
  visible: boolean;
  onClose: () => void;
  filtros: QuestionFilters;
  onChangeFiltros: (novosFiltros: QuestionFilters) => void;
  onLimparFiltros: () => void;
  totalEncontradas: number;
  categories: CategoryType[];
  colors: {
    bg: string;
    cardBg: string;
    cardBorder: string;
    text: string;
    textMuted: string;
    primary: string;
    primarySoft: string;
    emerald: string;
    amber: string;
    rose: string;
    subtle: string;
  };
  isDark: boolean;
}

const DIFICULDADES: Dificuldade[] = ['Fácil', 'Média', 'Difícil'];

export const FiltrosModal: React.FC<FiltrosModalProps> = ({
  visible,
  onClose,
  filtros,
  onChangeFiltros,
  onLimparFiltros,
  totalEncontradas,
  categories,
  colors,
  isDark,
}) => {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={[styles.modalCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.cardBorder }]}>
            <View style={styles.headerLeft}>
              <Ionicons name="filter" size={18} color={colors.primary} />
              <Text style={[styles.title, { color: colors.text }]}>Filtros Avançados</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Termo de Busca */}
            <Text style={[styles.label, { color: colors.text }]}>Busca Textual</Text>
            <View
              style={[
                styles.searchBar,
                { backgroundColor: colors.subtle, borderColor: colors.cardBorder },
              ]}
            >
              <Ionicons name="search" size={16} color={colors.textMuted} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Ex: Vossa Excelência, dispensa, afetação..."
                placeholderTextColor={colors.textMuted}
                value={filtros.termoBusca || ''}
                onChangeText={(text) => onChangeFiltros({ ...filtros, termoBusca: text })}
              />
              {filtros.termoBusca ? (
                <TouchableOpacity onPress={() => onChangeFiltros({ ...filtros, termoBusca: '' })}>
                  <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              ) : null}
            </View>

            <Text style={[styles.label, { color: colors.text, marginTop: 14 }]}>Concurso selecionado</Text>
            <View style={styles.chipCol}>
              {[
                { key: 'banca', label: 'Banca: VUNESP', value: 'VUNESP' },
                { key: 'cargo', label: 'Cargo: Agente Patrimonial', value: 'Agente Patrimonial' },
                { key: 'prova', label: 'Prova: Prefeitura de Itanhaém', value: 'Prefeitura de Itanhaém' },
              ].map((item) => {
                const key = item.key as 'banca' | 'cargo' | 'prova';
                const isSel = filtros[key] === item.value;
                return (
                  <TouchableOpacity
                    key={item.key}
                    onPress={() => {
                      triggerLightHaptic();
                      onChangeFiltros({ ...filtros, [key]: isSel ? 'all' : item.value });
                    }}
                    style={[styles.fullChip, { backgroundColor: isSel ? colors.primary : colors.subtle, borderColor: isSel ? colors.primary : colors.cardBorder }]}
                  >
                    <Text style={[styles.chipText, { color: isSel ? '#ffffff' : colors.text }]}>{item.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Status de Estudo */}
            <Text style={[styles.label, { color: colors.text, marginTop: 14 }]}>
              Status de Desempenho
            </Text>
            <View style={styles.chipGrid}>
              {[
                { id: 'todas', label: 'Todas', icon: 'apps' },
                { id: 'erros', label: 'Banco de Erros', icon: 'refresh' },
                { id: 'pontos_cegos', label: 'Pontos Cegos', icon: 'warning' },
                { id: 'pendentes_srs', label: 'Pendentes SRS', icon: 'time' },
                { id: 'dominadas', label: 'Dominadas', icon: 'checkmark-circle' },
              ].map((item) => {
                const isSel = (filtros.statusEstudo || 'todas') === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => {
                      triggerLightHaptic();
                      onChangeFiltros({ ...filtros, statusEstudo: item.id as any });
                    }}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: isSel ? colors.primary : colors.subtle,
                        borderColor: isSel ? colors.primary : colors.cardBorder,
                      },
                    ]}
                  >
                    <Ionicons
                      name={item.icon as any}
                      size={13}
                      color={isSel ? '#ffffff' : colors.textMuted}
                    />
                    <Text
                      style={[
                        styles.chipText,
                        { color: isSel ? '#ffffff' : colors.text },
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Dificuldade */}
            <Text style={[styles.label, { color: colors.text, marginTop: 14 }]}>Dificuldade</Text>
            <View style={styles.chipRow}>
              <TouchableOpacity
                onPress={() => {
                  triggerLightHaptic();
                  onChangeFiltros({ ...filtros, dificuldade: 'all' });
                }}
                style={[
                  styles.chip,
                  {
                    backgroundColor: (!filtros.dificuldade || filtros.dificuldade === 'all')
                      ? colors.primary
                      : colors.subtle,
                    borderColor: colors.cardBorder,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    {
                      color: (!filtros.dificuldade || filtros.dificuldade === 'all')
                        ? '#ffffff'
                        : colors.text,
                    },
                  ]}
                >
                  Todas
                </Text>
              </TouchableOpacity>
              {DIFICULDADES.map((dif) => {
                const isSel = filtros.dificuldade === dif;
                return (
                  <TouchableOpacity
                    key={dif}
                    onPress={() => {
                      triggerLightHaptic();
                      onChangeFiltros({ ...filtros, dificuldade: dif });
                    }}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: isSel ? colors.primary : colors.subtle,
                        borderColor: colors.cardBorder,
                      },
                    ]}
                  >
                    <Text style={[styles.chipText, { color: isSel ? '#ffffff' : colors.text }]}>
                      {dif}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Categorias */}
            <Text style={[styles.label, { color: colors.text, marginTop: 14 }]}>Disciplina / Tema</Text>
            <View style={styles.chipCol}>
              <TouchableOpacity
                onPress={() => {
                  triggerLightHaptic();
                  onChangeFiltros({ ...filtros, category: 'all' });
                }}
                style={[
                  styles.fullChip,
                  {
                    backgroundColor: (!filtros.category || filtros.category === 'all')
                      ? colors.primary
                      : colors.subtle,
                    borderColor: colors.cardBorder,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    {
                      color: (!filtros.category || filtros.category === 'all')
                        ? '#ffffff'
                        : colors.text,
                    },
                  ]}
                >
                  Todas as Categorias
                </Text>
              </TouchableOpacity>

              {categories.map((cat) => {
                const isSel = filtros.category === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => {
                      triggerLightHaptic();
                      onChangeFiltros({ ...filtros, category: cat });
                    }}
                    style={[
                      styles.fullChip,
                      {
                        backgroundColor: isSel ? colors.primary : colors.subtle,
                        borderColor: colors.cardBorder,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: isSel ? '#ffffff' : colors.text },
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={[styles.footer, { borderTopColor: colors.cardBorder }]}>
            <TouchableOpacity onPress={onLimparFiltros} style={styles.clearBtn}>
              <Text style={[styles.clearBtnText, { color: colors.textMuted }]}>Limpar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onClose}
              style={[styles.applyBtn, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.applyBtnText}>
                Ver {totalEncontradas} {totalEncontradas === 1 ? 'questão' : 'questões'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
  },
  closeBtn: {
    padding: 4,
  },
  scrollContent: {
    padding: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chipCol: {
    gap: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  fullChip: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
  },
  clearBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  clearBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  applyBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  applyBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
});
