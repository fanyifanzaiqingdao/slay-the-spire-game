// Relic-driven combat math helpers (kept separate from data/relics.js to avoid cycles)
import { CARD_TYPES } from '../constants/cardTypes.js'
import { ANCIENT_LEXICON_SHIP_BONUS } from '../constants/relicCombat.js'

/** Process (grammar) cards: effective energy with Process Owner (Left). */
export function getEffectiveEnergyCost(card, relics = [], programmerEnergyOverdraft = false) {
  if (!card) return 0
  let c = Number(card.energy_cost) || 0
  if (Array.isArray(relics) && relics.includes('scholars_left_hand') && card.type === CARD_TYPES.GRAMMAR) {
    c = Math.max(0, c - 1)
  }
  if (programmerEnergyOverdraft && card.effect?.energy_overdraft) {
    const od = Math.max(0, Math.floor(Number(card.effect.energy_overdraft) || 0))
    c = Math.max(0, c - od)
  }
  return c
}

/** Vocabulary (Ship) attack damage bonus from Monolith Glossary (pantheon). */
export function getAncientLexiconShipBonus(card, relics = []) {
  if (!Array.isArray(relics) || !relics.includes('ancient_lexicon')) return 0
  if (card?.type !== CARD_TYPES.VOCABULARY) return 0
  return ANCIENT_LEXICON_SHIP_BONUS
}

/** Process Owner (Right): add card's block value to attack damage for grammar cards. */
export function getProcessOwnerRightDamageBonus(card, relics = []) {
  if (!Array.isArray(relics) || !relics.includes('scholars_right_hand')) return 0
  if (card?.type !== CARD_TYPES.GRAMMAR) return 0
  const b = card?.effect?.block
  if (b == null || Number(b) <= 0) return 0
  return Math.floor(Number(b))
}
