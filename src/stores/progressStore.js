// stores/progressStore.js
// Campaign clears, mastery levels, unlocks — persisted across sessions
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { STORAGE_KEYS } from '../utils/localStorage.js'

const useProgressStore = create(
  persist(
    (set, get) => ({
      // { [campaign]: { [characterId]: { cleared: bool, masteryLevel: number, bestAccuracy: number } } }
      campaigns: {
        japanese: {
          kenji: { cleared: false, masteryLevel: 0, bestAccuracy: 0, totalRuns: 0 },
          ren: { cleared: false, masteryLevel: 0, bestAccuracy: 0, totalRuns: 0 },
        },
        korean: {
          minjun: { cleared: false, masteryLevel: 0, bestAccuracy: 0, totalRuns: 0 },
          sora: { cleared: false, masteryLevel: 0, bestAccuracy: 0, totalRuns: 0 },
          jiyeon: { cleared: false, masteryLevel: 0, bestAccuracy: 0, totalRuns: 0 },
        },
        spanish: {
          rosa: { cleared: false, masteryLevel: 0, bestAccuracy: 0, totalRuns: 0 },
          marco: { cleared: false, masteryLevel: 0, bestAccuracy: 0, totalRuns: 0 },
          elena: { cleared: false, masteryLevel: 0, bestAccuracy: 0, totalRuns: 0 },
        },
      },

      recordRunEnd: (campaign, characterId, cleared, accuracy) => set(s => {
        const prev = s.campaigns[campaign]?.[characterId] || {}
        const wasCleared = prev.cleared || cleared
        const newMastery = wasCleared && !prev.cleared ? 1 : prev.masteryLevel // unlock mastery 1 on first clear
        return {
          campaigns: {
            ...s.campaigns,
            [campaign]: {
              ...s.campaigns[campaign],
              [characterId]: {
                cleared: wasCleared,
                masteryLevel: (cleared && prev.masteryLevel === 0) ? 1 : prev.masteryLevel,
                bestAccuracy: Math.max(prev.bestAccuracy || 0, accuracy || 0),
                totalRuns: (prev.totalRuns || 0) + 1,
              }
            }
          }
        }
      }),

      unlockMasteryLevel: (campaign, characterId, level) => set(s => ({
        campaigns: {
          ...s.campaigns,
          [campaign]: {
            ...s.campaigns[campaign],
            [characterId]: {
              ...(s.campaigns[campaign]?.[characterId] || {}),
              masteryLevel: level,
            }
          }
        }
      })),

      getMasteryLevel: (campaign, characterId) => {
        return get().campaigns[campaign]?.[characterId]?.masteryLevel || 0
      },

      hasCleared: (campaign, characterId) => {
        return get().campaigns[campaign]?.[characterId]?.cleared || false
      },

      // Check if campaign is newly unlocked (any character cleared it)
      isCampaignUnlocked: (campaign) => {
        const chars = get().campaigns[campaign]
        if (!chars) return false
        return Object.values(chars).some(c => c.cleared)
      },
    }),
    {
      name: STORAGE_KEYS.PROGRESS,
      storage: createJSONStorage(() => localStorage),
      version: 2,
      migrate: (persistedState, _fromVersion) => {
        try {
          const jp = persistedState?.campaigns?.japanese
          if (!jp) return persistedState
          const mergeRow = (a, b) => ({
            cleared: Boolean(a?.cleared || b?.cleared),
            masteryLevel: Math.max(a?.masteryLevel || 0, b?.masteryLevel || 0),
            bestAccuracy: Math.max(a?.bestAccuracy || 0, b?.bestAccuracy || 0),
            totalRuns: (a?.totalRuns || 0) + (b?.totalRuns || 0),
          })
          let k = jp.kenji || { cleared: false, masteryLevel: 0, bestAccuracy: 0, totalRuns: 0 }
          if (jp.hana) k = mergeRow(k, jp.hana)
          if (jp.yuki) k = mergeRow(k, jp.yuki)
          const nextJp = { ...jp, kenji: k }
          delete nextJp.hana
          delete nextJp.yuki
          return {
            ...persistedState,
            campaigns: {
              ...persistedState.campaigns,
              japanese: nextJp,
            },
          }
        } catch {
          return persistedState
        }
      },
    }
  )
)

export default useProgressStore
