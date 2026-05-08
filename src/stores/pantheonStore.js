// stores/pantheonStore.js
// Meta-progression store — persists across ALL runs and sessions via localStorage.
// Tracks: total runs, victories, Pantheon XP, unlocked cards, unlocked relics, unlocked characters.

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

const PANTHEON_STORAGE_KEY = 'ascendant_pantheon_v1'

// XP thresholds per Pantheon level
const XP_PER_LEVEL = [0, 100, 250, 500, 900, 1400, 2100, 3000, 4200, 6000]

function getLevelFromXp(xp) {
  let level = 0
  for (let i = 0; i < XP_PER_LEVEL.length; i++) {
    if (xp >= XP_PER_LEVEL[i]) level = i
    else break
  }
  return level
}

function getXpForNextLevel(currentLevel) {
  return XP_PER_LEVEL[currentLevel + 1] ?? null
}

// Pantheon unlocks — ordered by XP requirement
export const PANTHEON_UNLOCKS = [
  { id: 'card_jp_vocab_thunderstrike',  type: 'card',      campaign: 'japanese', xpRequired: 100,  label: '⚡ Thunder Strike',   description: 'Engineer-path Ship card: big damage when you nail the first check.' },
  { id: 'card_kr_gram_neon_shield',     type: 'card',      campaign: 'korean',   xpRequired: 150,  label: '💠 Neon Shield',       description: 'UI-path Process card: chunky block with a draw attached.' },
  { id: 'relic_scholars_badge',         type: 'relic',     campaign: 'any',      xpRequired: 250,  label: '🎓 Scholar\'s Badge',  description: 'Relic: +1 Energy on your first clean play each fight.' },
  { id: 'card_es_read_ancient_verse',   type: 'card',      campaign: 'spanish',  xpRequired: 350,  label: '📜 Ancient Verse',     description: 'PM-path Insight card: heals and refills your hand a little.' },
  { id: 'relic_pantheon_sigil',         type: 'relic',     campaign: 'any',      xpRequired: 500,  label: '✦ Pantheon Sigil',     description: 'Meta relic: start runs with a free random Blessing.' },
  { id: 'relic_dual_tongue',            type: 'relic',     campaign: 'any',      xpRequired: 750,  label: '🗣️ Dual Track',      description: 'Meta relic: clean Process plays also echo your Ship bonuses.' },
  { id: 'card_jp_rare_spirit_of_fuji',  type: 'card',      campaign: 'japanese', xpRequired: 1000, label: '🗻 Spirit of Fuji',    description: 'Rare engineer card: damage scales with current Block, then fortify.' },
]

const usePantheonStore = create(
  persist(
    (set, get) => ({
      // Stats
      totalRuns: 0,
      totalVictories: 0,
      totalCorrectAnswers: 0,
      totalWrongAnswers: 0,
      totalFloors: 0,
      xp: 0,

      // Unlocks (set of unlock IDs)
      unlockedIds: [],

      // Computed
      getLevel: () => getLevelFromXp(get().xp),
      getXpToNextLevel: () => {
        const level = getLevelFromXp(get().xp)
        return getXpForNextLevel(level)
      },
      getXpProgress: () => {
        const xp = get().xp
        const level = getLevelFromXp(xp)
        const thisLevelXp = XP_PER_LEVEL[level] ?? 0
        const nextLevelXp = XP_PER_LEVEL[level + 1]
        if (!nextLevelXp) return 100 // maxed out
        return Math.round(((xp - thisLevelXp) / (nextLevelXp - thisLevelXp)) * 100)
      },
      getAvailableUnlocks: () => {
        const { xp, unlockedIds } = get()
        return PANTHEON_UNLOCKS.filter(u => u.xpRequired <= xp && !unlockedIds.includes(u.id))
      },
      isUnlocked: (id) => get().unlockedIds.includes(id),

      // Actions
      recordRunEnd: ({ correct = 0, wrong = 0, floors = 0, victory = false }) => set(s => {
        const earnedXp = 
          correct * 2 +          // 2 XP per correct answer
          floors * 20 +           // 20 XP per floor cleared
          (victory ? 100 : 0)    // 100 XP bonus for victory

        return {
          totalRuns: s.totalRuns + 1,
          totalVictories: s.totalVictories + (victory ? 1 : 0),
          totalCorrectAnswers: s.totalCorrectAnswers + correct,
          totalWrongAnswers: s.totalWrongAnswers + wrong,
          totalFloors: s.totalFloors + floors,
          xp: s.xp + earnedXp,
        }
      }),

      claimUnlock: (unlockId) => set(s => ({
        unlockedIds: s.unlockedIds.includes(unlockId) ? s.unlockedIds : [...s.unlockedIds, unlockId],
      })),

      claimAllAvailable: () => {
        const available = get().getAvailableUnlocks()
        if (available.length === 0) return
        set(s => ({
          unlockedIds: [...new Set([...s.unlockedIds, ...available.map(u => u.id)])]
        }))
      },
    }),
    {
      name: PANTHEON_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
    }
  )
)

export default usePantheonStore
