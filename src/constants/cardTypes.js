// constants/cardTypes.js
// Card type enums and associated visual/mechanical metadata
// Internal keys unchanged; labels are career-themed (Ship / Process / Insight).

export const CARD_TYPES = {
  VOCABULARY: 'vocabulary',
  GRAMMAR: 'grammar',
  READING: 'reading',
  CURSE: 'curse',
}

export const CARD_TYPE_META = {
  [CARD_TYPES.VOCABULARY]: {
    label: 'Ship',
    icon: '⚔️',
    colorClass: 'text-red-400',
    bgClass: 'bg-red-950/40',
    borderClass: 'border-red-800',
    glowClass: 'shadow-red-900/60',
    wrongAnswerBuff: 'confusion',
    wrongAnswerDescription: 'Scope noise: enemy gains +2 ATK this turn',
    primes: 'grammar',
  },
  [CARD_TYPES.GRAMMAR]: {
    label: 'Process',
    icon: '🛡️',
    colorClass: 'text-blue-400',
    bgClass: 'bg-blue-950/40',
    borderClass: 'border-blue-800',
    glowClass: 'shadow-blue-900/60',
    wrongAnswerBuff: 'conjugation_armor',
    wrongAnswerDescription: 'Process armor: enemy blocks Process cards next turn',
    primes: 'reading',
  },
  [CARD_TYPES.READING]: {
    label: 'Insight',
    icon: '📖',
    colorClass: 'text-emerald-400',
    bgClass: 'bg-emerald-950/40',
    borderClass: 'border-emerald-800',
    glowClass: 'shadow-emerald-900/60',
    wrongAnswerBuff: 'fortify',
    wrongAnswerDescription: 'Fortify: stakeholder buffers +5 max HP temporarily',
    primes: null,
  },
  [CARD_TYPES.CURSE]: {
    label: 'Blocker',
    icon: '💀',
    colorClass: 'text-purple-400',
    bgClass: 'bg-purple-950/40',
    borderClass: 'border-purple-800',
    glowClass: 'shadow-purple-900/60',
    wrongAnswerBuff: null,
    wrongAnswerDescription: null,
    primes: null,
  },
}

export const CARD_RARITIES = {
  COMMON: 'common',
  UNCOMMON: 'uncommon',
  RARE: 'rare',
  STORY_RARE: 'story_rare',
  CURSE: 'curse',
}

export const CARD_RARITY_META = {
  [CARD_RARITIES.COMMON]: {
    label: 'Common',
    colorClass: 'text-gray-300',
    borderClass: 'border-gray-500',
    gemClass: 'bg-gray-400',
  },
  [CARD_RARITIES.UNCOMMON]: {
    label: 'Uncommon',
    colorClass: 'text-blue-300',
    borderClass: 'border-blue-500',
    gemClass: 'bg-blue-400',
  },
  [CARD_RARITIES.RARE]: {
    label: 'Rare',
    colorClass: 'text-yellow-300',
    borderClass: 'border-yellow-500',
    gemClass: 'bg-yellow-400',
  },
  [CARD_RARITIES.STORY_RARE]: {
    label: 'Story Rare',
    colorClass: 'text-red-300',
    borderClass: 'border-red-500',
    gemClass: 'bg-red-400',
  },
  [CARD_RARITIES.CURSE]: {
    label: 'Overtime',
    colorClass: 'text-purple-300',
    borderClass: 'border-purple-500',
    gemClass: 'bg-purple-400',
  },
}
