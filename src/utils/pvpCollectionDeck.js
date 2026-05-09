// Persisted "collection deck" for PvP — snapshot saved when you defeat a boss.
import { lqRead, lqWrite, STORAGE_KEYS } from './localStorage.js'

/**
 * All card instance IDs currently in the run (master deck snapshot mid-fight).
 */
export function collectMasterDeckIdsFromRunState(s) {
  return [
    ...(s.deck || []),
    ...(s.hand || []),
    ...(s.discardPile || []),
    ...(s.exhaustPile || []),
    ...(s.iceboxCardIds || []),
  ]
}

/**
 * @returns {{ campaign: string, cardIds: string[], savedAt: string } | null}
 */
export function getPvpCollectionDeck() {
  return lqRead(STORAGE_KEYS.PVP_COLLECTION_DECK, null)
}

/**
 * Overwrites the saved PvP collection deck (one slot).
 */
export function savePvpCollectionDeck({ campaign, cardIds }) {
  if (!Array.isArray(cardIds) || cardIds.length === 0) return false
  const payload = {
    campaign: typeof campaign === 'string' ? campaign : 'japanese',
    cardIds: [...cardIds],
    savedAt: new Date().toISOString(),
  }
  return lqWrite(STORAGE_KEYS.PVP_COLLECTION_DECK, payload)
}
