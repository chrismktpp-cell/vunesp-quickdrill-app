import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Question, CategoryType } from '../types/schema';
import { triggerLightHaptic } from '../utils/storage';

interface MuralDeMacetesProps {
  questions: Question[];
  categories: CategoryType[];
  favorites: string[];
  blindSpots: string[];
  onToggleFavorite: (questionId: string) => void;
  isDark: boolean;
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
  getCategoryColor: (cat: CategoryType) => {
    accent: string;
    soft: string;
    badgeText: string;
  };
}

export const MuralDeMacetes: React.FC<MuralDeMacetesProps> = ({
  questions,
  categories,
  favorites,
  blindSpots,
  onToggleFavorite,
  isDark,
  colors,
  getCategoryColor,
}) => {
  // View mode: 'feed' (scrollable list) or 'card' (interactive flip flashcard)
  const [viewMode, setViewMode] = useState<'feed' | 'card'>('feed');

  // Filters
  const [selectedCat, setSelectedCat] = useState<CategoryType | 'all' | 'favorites' | 'blind_spots'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Interactive flashcard index and flipped state
  const [cardIndex, setCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // Filter questions
  const filteredList = useMemo(() => {
    let list = [...questions];

    if (selectedCat === 'favorites') {
      list = list.filter((q) => favorites.includes(q.id));
    } else if (selectedCat === 'blind_spots') {
      list = list.filter((q) => blindSpots.includes(q.id));
    } else if (selectedCat !== 'all') {
      list = list.filter((q) => q.category === selectedCat);
    }

    if (searchQuery.trim().length > 0) {
      const qLower = searchQuery.toLowerCase();
      list = list.filter(
        (q) =>
          q.raioX.toLowerCase().includes(qLower) ||
          q.statement.toLowerCase().includes(qLower) ||
          q.subtopic.toLowerCase().includes(qLower) ||
          q.options.some((opt) => opt.toLowerCase().includes(qLower))
      );
    }

    return list;
  }, [questions, selectedCat, searchQuery, favorites, blindSpots]);

  // Reset card index when list changes
  React.useEffect(() => {
    setCardIndex(0);
    setIsFlipped(false);
  }, [selectedCat, searchQuery, viewMode]);

  const currentFlashcard = filteredList[cardIndex] || null;

  const handleNextCard = () => {
    triggerLightHaptic();
    setIsFlipped(false);
    if (filteredList.length > 0) {
      setCardIndex((prev) => (prev + 1) % filteredList.length);
    }
  };

  const handlePrevCard = () => {
    triggerLightHaptic();
    setIsFlipped(false);
    if (filteredList.length > 0) {
      setCardIndex((prev) => (prev - 1 + filteredList.length) % filteredList.length);
    }
  };

  const handleFlip = () => {
    triggerLightHaptic();
    setIsFlipped((prev) => !prev);
  };

  const renderStatementWithAnswer = (statement: string, answer: string, accentColor: string) => {
    const parts = statement.split('_____');
    if (parts.length === 1) return <Text style={{ color: colors.text }}>{statement}</Text>;
    return (
      <Text style={{ color: colors.text }}>
        {parts[0]}
        <Text style={{ fontWeight: '900', color: accentColor, textDecorationLine: 'underline' }}>
          {' ' + answer + ' '}
        </Text>
        {parts[1]}
      </Text>
    );
  };

  return (
    <View style={styles.container}>
      {/* SEARCH BAR & VIEW SWITCH */}
      <View style={styles.topControlRow}>
        <View style={[styles.searchBox, { backgroundColor: colors.subtle, borderColor: colors.cardBorder }]}>
          <Ionicons name="search" size={16} color={colors.textMuted} />
          <TextInput
            placeholder="Buscar macete, palavra ou lei..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={[styles.searchInput, { color: colors.text }]}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* View mode toggle button */}
        <View style={[styles.toggleViewContainer, { backgroundColor: colors.subtle }]}>
          <TouchableOpacity
            onPress={() => {
              triggerLightHaptic();
              setViewMode('feed');
            }}
            style={[
              styles.viewToggleBtn,
              viewMode === 'feed' && [styles.viewToggleBtnActive, { backgroundColor: colors.cardBg }],
            ]}
          >
            <Ionicons name="list" size={16} color={viewMode === 'feed' ? colors.primary : colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              triggerLightHaptic();
              setViewMode('card');
            }}
            style={[
              styles.viewToggleBtn,
              viewMode === 'card' && [styles.viewToggleBtnActive, { backgroundColor: colors.cardBg }],
            ]}
          >
            <Ionicons name="albums" size={16} color={viewMode === 'card' ? colors.primary : colors.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* FILTER PILLS */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
        <TouchableOpacity
          onPress={() => {
            triggerLightHaptic();
            setSelectedCat('all');
          }}
          style={[
            styles.filterChip,
            selectedCat === 'all'
              ? { backgroundColor: colors.primary, borderColor: colors.primary }
              : { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
          ]}
        >
          <Text style={[styles.filterChipText, { color: selectedCat === 'all' ? '#ffffff' : colors.textMuted }]}>
            Todos ({questions.length})
          </Text>
        </TouchableOpacity>

        {/* Favoritos */}
        <TouchableOpacity
          onPress={() => {
            triggerLightHaptic();
            setSelectedCat('favorites');
          }}
          style={[
            styles.filterChip,
            selectedCat === 'favorites'
              ? { backgroundColor: colors.amber, borderColor: colors.amber }
              : { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
          ]}
        >
          <Ionicons
            name="star"
            size={12}
            color={selectedCat === 'favorites' ? '#ffffff' : colors.amber}
            style={{ marginRight: 4 }}
          />
          <Text style={[styles.filterChipText, { color: selectedCat === 'favorites' ? '#ffffff' : colors.textMuted }]}>
            Favoritos ({favorites.length})
          </Text>
        </TouchableOpacity>

        {/* Pontos Cegos */}
        {blindSpots.length > 0 && (
          <TouchableOpacity
            onPress={() => {
              triggerLightHaptic();
              setSelectedCat('blind_spots');
            }}
            style={[
              styles.filterChip,
              selectedCat === 'blind_spots'
                ? { backgroundColor: colors.rose, borderColor: colors.rose }
                : { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
            ]}
          >
            <Ionicons
              name="warning"
              size={12}
              color={selectedCat === 'blind_spots' ? '#ffffff' : colors.rose}
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.filterChipText, { color: selectedCat === 'blind_spots' ? '#ffffff' : colors.textMuted }]}>
              Pontos Cegos ({blindSpots.length})
            </Text>
          </TouchableOpacity>
        )}

        {/* Categories */}
        {categories.map((cat) => {
          const isSel = selectedCat === cat;
          const catColor = getCategoryColor(cat);
          return (
            <TouchableOpacity
              key={cat}
              onPress={() => {
                triggerLightHaptic();
                setSelectedCat(cat);
              }}
              style={[
                styles.filterChip,
                isSel
                  ? { backgroundColor: catColor.accent, borderColor: catColor.accent }
                  : { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
              ]}
            >
              <Text style={[styles.filterChipText, { color: isSel ? '#ffffff' : colors.textMuted }]}>
                {cat.split(' ')[0]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* SUBTITLE STATS */}
      <View style={styles.subInfoRow}>
        <Text style={[styles.subInfoText, { color: colors.textMuted }]}>
          {filteredList.length} {filteredList.length === 1 ? 'macete exibido' : 'macetes exibidos'} • Modo {viewMode === 'feed' ? 'Mural' : 'Flashcard'}
        </Text>
        <Text style={[styles.subInfoHint, { color: colors.amber }]}>
          ★ Toque na estrela para salvar
        </Text>
      </View>

      {/* CONTENT: FEED MODE OR FLASHCARD MODE */}
      {filteredList.length === 0 ? (
        <View style={[styles.emptyBox, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
          <Ionicons name="search" size={40} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Nenhum macete encontrado</Text>
          <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>
            {selectedCat === 'favorites'
              ? 'Você ainda não favoritou nenhum macete. Toque na estrela dos cards para montar seu mural de véspera!'
              : selectedCat === 'blind_spots'
                ? 'Nenhum ponto cego ativo registrado no momento.'
                : 'Tente alterar os termos da busca.'}
          </Text>
        </View>
      ) : viewMode === 'feed' ? (
        /* FEED DE MACETES (SCROLL LIST) */
        <ScrollView style={styles.feedScroll} showsVerticalScrollIndicator={false}>
          {filteredList.map((item) => {
            const catColors = getCategoryColor(item.category);
            const isFav = favorites.includes(item.id);
            const isBlind = blindSpots.includes(item.id);

            return (
              <View
                key={item.id}
                style={[
                  styles.maceteCard,
                  {
                    backgroundColor: colors.cardBg,
                    borderColor: isBlind ? colors.rose : colors.cardBorder,
                    borderLeftColor: catColors.accent,
                    borderLeftWidth: 4,
                  },
                ]}
              >
                {/* Header of Macete */}
                <View style={styles.maceteCardHeader}>
                  <View style={styles.metaBadgeGroup}>
                    <View style={[styles.catBadge, { backgroundColor: catColors.soft }]}>
                      <Text style={[styles.catBadgeText, { color: catColors.badgeText }]}>
                        {item.category.split(' ')[0]}
                      </Text>
                    </View>
                    <Text style={[styles.subtopicLabel, { color: colors.textMuted }]}>
                      {item.subtopic}
                    </Text>
                    {isBlind && (
                      <View style={[styles.blindMiniBadge, { backgroundColor: colors.roseSoft }]}>
                        <Text style={[styles.blindMiniText, { color: colors.rose }]}>Ponto Cego</Text>
                      </View>
                    )}
                  </View>

                  {/* Favorite button */}
                  <TouchableOpacity
                    onPress={() => onToggleFavorite(item.id)}
                    style={styles.favBtn}
                    accessibilityLabel="Favoritar macete"
                  >
                    <Ionicons
                      name={isFav ? 'star' : 'star-outline'}
                      size={20}
                      color={isFav ? colors.amber : colors.textMuted}
                    />
                  </TouchableOpacity>
                </View>

                {/* Enunciado com o gabarito preenchido */}
                <View style={styles.statementBox}>
                  <Text style={[styles.statementLabel, { color: colors.textMuted }]}>Exemplo Prático:</Text>
                  <Text style={[styles.statementText, { color: colors.text }]}>
                    {renderStatementWithAnswer(
                      item.statement,
                      item.options[item.correctIndex],
                      catColors.accent
                    )}
                  </Text>
                </View>

                {/* O RAIO-X / MACETE EM 1 FRASE (DESTAQUE MÁXIMO) */}
                <View style={[styles.raioXBox, { backgroundColor: catColors.soft, borderColor: catColors.accent }]}>
                  <View style={styles.raioXTag}>
                    <Ionicons name="bulb" size={16} color={colors.amber} />
                    <Text style={[styles.raioXTagText, { color: catColors.accent }]}>
                      MACETE VUNESP:
                    </Text>
                  </View>
                  <Text style={[styles.raioXText, { color: colors.text }]}>
                    "{item.raioX}"
                  </Text>
                </View>

                {/* Fundamentação legal */}
                {item.legalBasis && (
                  <View style={styles.legalRow}>
                    <Ionicons name="book-outline" size={12} color={colors.textMuted} />
                    <Text style={[styles.legalText, { color: colors.textMuted }]}>
                      {item.legalBasis}
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
          <View style={{ height: 40 }} />
        </ScrollView>
      ) : (
        /* MODO FLASHCARD INTERATIVO (FLIP CARD) */
        <View style={styles.flashcardContainer}>
          {/* Card counter */}
          <View style={styles.flashcardCounterRow}>
            <Text style={[styles.counterText, { color: colors.textMuted }]}>
              Flashcard {cardIndex + 1} de {filteredList.length}
            </Text>
            <TouchableOpacity
              onPress={() => onToggleFavorite(currentFlashcard!.id)}
              style={styles.favBtnCard}
            >
              <Ionicons
                name={favorites.includes(currentFlashcard!.id) ? 'star' : 'star-outline'}
                size={22}
                color={favorites.includes(currentFlashcard!.id) ? colors.amber : colors.textMuted}
              />
            </TouchableOpacity>
          </View>

          {/* THE FLASHCARD */}
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={handleFlip}
            style={[
              styles.flashcard,
              {
                backgroundColor: colors.cardBg,
                borderColor: colors.cardBorder,
                borderTopColor: getCategoryColor(currentFlashcard!.category).accent,
                borderTopWidth: 4,
              },
            ]}
          >
            {/* Top Chip */}
            <View style={styles.flashcardTopRow}>
              <View
                style={[
                  styles.catBadge,
                  { backgroundColor: getCategoryColor(currentFlashcard!.category).soft },
                ]}
              >
                <Text
                  style={[
                    styles.catBadgeText,
                    { color: getCategoryColor(currentFlashcard!.category).badgeText },
                  ]}
                >
                  {currentFlashcard!.category}
                </Text>
              </View>
              <Text style={[styles.subtopicLabel, { color: colors.textMuted }]}>
                {currentFlashcard!.subtopic}
              </Text>
            </View>

            {/* FRONT VS BACK */}
            {!isFlipped ? (
              /* FRENTE: O DESAFIO */
              <View style={styles.cardFrontContent}>
                <View style={styles.frontTag}>
                  <Ionicons name="help-circle" size={18} color={getCategoryColor(currentFlashcard!.category).accent} />
                  <Text style={[styles.frontTagText, { color: getCategoryColor(currentFlashcard!.category).accent }]}>
                    COMO PREENCHER?
                  </Text>
                </View>

                <Text style={[styles.cardStatement, { color: colors.text }]}>
                  {currentFlashcard!.statement}
                </Text>

                <View style={styles.optionsPreviewRow}>
                  {currentFlashcard!.options.map((opt) => (
                    <View
                      key={opt}
                      style={[styles.optionPreviewChip, { backgroundColor: colors.subtle, borderColor: colors.cardBorder }]}
                    >
                      <Text style={[styles.optionPreviewText, { color: colors.text }]}>{opt}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.tapToFlipNotice}>
                  <Ionicons name="sync" size={14} color={colors.primary} />
                  <Text style={[styles.tapToFlipText, { color: colors.primary }]}>
                    Toque para ver a resposta & o macete
                  </Text>
                </View>
              </View>
            ) : (
              /* VERSO: A RESPOSTA & O MACETE */
              <View style={styles.cardBackContent}>
                <View style={styles.answerConfirmedBox}>
                  <Text style={[styles.answerLabel, { color: colors.emerald }]}>
                    GABARITO OFICIAL:
                  </Text>
                  <Text style={[styles.answerValue, { color: colors.emerald }]}>
                    {currentFlashcard!.options[currentFlashcard!.correctIndex]}
                  </Text>
                </View>

                {/* Exemplo Preenchido */}
                <Text style={[styles.answeredStatement, { color: colors.text }]}>
                  {renderStatementWithAnswer(
                    currentFlashcard!.statement,
                    currentFlashcard!.options[currentFlashcard!.correctIndex],
                    getCategoryColor(currentFlashcard!.category).accent
                  )}
                </Text>

                {/* Raio-X */}
                <View
                  style={[
                    styles.raioXBoxCard,
                    {
                      backgroundColor: getCategoryColor(currentFlashcard!.category).soft,
                      borderColor: getCategoryColor(currentFlashcard!.category).accent,
                    },
                  ]}
                >
                  <View style={styles.raioXTag}>
                    <Ionicons name="bulb" size={16} color={colors.amber} />
                    <Text
                      style={[
                        styles.raioXTagText,
                        { color: getCategoryColor(currentFlashcard!.category).accent },
                      ]}
                    >
                      MACETE EM 1 FRASE:
                    </Text>
                  </View>
                  <Text style={[styles.raioXTextCard, { color: colors.text }]}>
                    "{currentFlashcard!.raioX}"
                  </Text>
                </View>

                {/* Fundamentação */}
                {currentFlashcard!.legalBasis && (
                  <Text style={[styles.legalBasisCard, { color: colors.textMuted }]}>
                    Fundamento: {currentFlashcard!.legalBasis}
                  </Text>
                )}
              </View>
            )}
          </TouchableOpacity>

          {/* NAVIGATION BUTTONS */}
          <View style={styles.flashcardNavRow}>
            <TouchableOpacity
              onPress={handlePrevCard}
              style={[styles.navBtn, { backgroundColor: colors.subtle, borderColor: colors.cardBorder }]}
            >
              <Ionicons name="arrow-back" size={18} color={colors.text} />
              <Text style={[styles.navBtnText, { color: colors.text }]}>Anterior</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleFlip}
              style={[styles.flipBtn, { backgroundColor: colors.primary }]}
            >
              <Ionicons name="sync" size={16} color="#ffffff" />
              <Text style={styles.flipBtnText}>{isFlipped ? 'Ver Pergunta' : 'Ver Macete'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleNextCard}
              style={[styles.navBtn, { backgroundColor: colors.subtle, borderColor: colors.cardBorder }]}
            >
              <Text style={[styles.navBtnText, { color: colors.text }]}>Próximo</Text>
              <Ionicons name="arrow-forward" size={18} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    padding: 0,
  },
  toggleViewContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 3,
  },
  viewToggleBtn: {
    padding: 8,
    borderRadius: 9,
  },
  viewToggleBtnActive: {
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  filterScroll: {
    gap: 8,
    paddingBottom: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  subInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 6,
    paddingHorizontal: 2,
  },
  subInfoText: {
    fontSize: 11,
    fontWeight: '600',
  },
  subInfoHint: {
    fontSize: 11,
    fontWeight: '700',
  },
  feedScroll: {
    marginTop: 6,
  },
  maceteCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  maceteCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  metaBadgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    flex: 1,
  },
  catBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  catBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  subtopicLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  blindMiniBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  blindMiniText: {
    fontSize: 9,
    fontWeight: '800',
  },
  favBtn: {
    padding: 4,
  },
  statementBox: {
    marginBottom: 10,
  },
  statementLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  statementText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  raioXBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
  },
  raioXTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  raioXTagText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  raioXText: {
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 20,
  },
  legalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legalText: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  emptyBox: {
    padding: 32,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 10,
  },
  emptyDesc: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
    maxWidth: 280,
  },
  flashcardContainer: {
    marginTop: 6,
  },
  flashcardCounterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  counterText: {
    fontSize: 12,
    fontWeight: '700',
  },
  favBtnCard: {
    padding: 4,
  },
  flashcard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    minHeight: 280,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
    justifyContent: 'space-between',
  },
  flashcardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  cardFrontContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
  },
  frontTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  frontTagText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  cardStatement: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: 20,
  },
  optionsPreviewRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  optionPreviewChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  optionPreviewText: {
    fontSize: 14,
    fontWeight: '700',
  },
  tapToFlipNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  tapToFlipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  cardBackContent: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  answerConfirmedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  answerLabel: {
    fontSize: 12,
    fontWeight: '900',
  },
  answerValue: {
    fontSize: 16,
    fontWeight: '900',
  },
  answeredStatement: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
  },
  raioXBoxCard: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
    marginBottom: 10,
  },
  raioXTextCard: {
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 22,
  },
  legalBasisCard: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  flashcardNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 10,
  },
  navBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
  },
  navBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  flipBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    gap: 6,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  flipBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
});
