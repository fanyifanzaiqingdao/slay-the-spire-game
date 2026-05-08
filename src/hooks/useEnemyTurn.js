// hooks/useEnemyTurn.js — v2
// Executes each enemy's action chain sequentially after the player ends their turn.
// Returns { executeEnemyTurn, isExecuting, currentAction }

import { useState, useCallback } from 'react'
import useRunStore from '../stores/runStore.js'
import { useAudio } from './useAudio.js'
import { resolveEnemyAction } from '../utils/enemyTurn.js'

const ACTION_DELAY_MS = 600

export function useEnemyTurn({ onTurnComplete } = {}) {
  const { playSFX } = useAudio()

  const [isExecuting, setIsExecuting] = useState(false)
  const [currentAction, setCurrentAction] = useState(null)

  const executeEnemyTurn = useCallback(async () => {
    const s0 = useRunStore.getState()
    if (!s0.currentEnemy) return

    const slots = s0.combatEnemySlots?.length ? s0.combatEnemySlots : null
    const instanceOrder = slots?.length
      ? slots.filter(sl => sl.hp > 0).map(sl => sl.instanceId)
      : ['legacy-single']

    setIsExecuting(true)
    playSFX?.('enemy_turn_start')

    for (const instanceId of instanceOrder) {
      const st = useRunStore.getState()
      let attackerIdx = 0
      let currentEnemy = st.currentEnemy
      let intentIdx = st.intentIndex ?? 0

      if (instanceId !== 'legacy-single') {
        attackerIdx = st.combatEnemySlots.findIndex(s => s.instanceId === instanceId)
        if (attackerIdx === -1) continue
        const slot = st.combatEnemySlots[attackerIdx]
        if (!slot || slot.hp <= 0) continue
        currentEnemy = slot.def
        intentIdx = slot.intentIndex ?? 0
      }

      st.syncActiveEnemySlot(attackerIdx)

      const pattern = currentEnemy.intent_pattern || []
      const actionList = pattern.length
        ? pattern[intentIdx % pattern.length] || ['strike']
        : ['strike']

      for (const action of actionList) {
        setCurrentAction({ type: 'telegraph', actionType: action })
        await new Promise(r => setTimeout(r, 400))

        useRunStore.getState().syncActiveEnemySlot(attackerIdx)
        const result = await resolveEnemyAction(
          action,
          currentEnemy,
          useRunStore.getState(),
          playSFX,
          attackerIdx,
        )
        setCurrentAction({ ...result, id: Math.random().toString() })
        await new Promise(r => setTimeout(r, ACTION_DELAY_MS))
      }

      if (instanceId !== 'legacy-single') {
        useRunStore.getState().advanceIntentForSlot(attackerIdx)
      } else {
        useRunStore.getState().advanceIntent()
      }
    }

    const sAfter = useRunStore.getState()
    sAfter.clearEnemyBuffs()
    sAfter.tickPlayerDebuffs()
    sAfter.unlockAllCards()

    await new Promise(r => setTimeout(r, 300))

    setCurrentAction(null)
    setIsExecuting(false)

    onTurnComplete?.()
  }, [playSFX, onTurnComplete])

  return { executeEnemyTurn, isExecuting, currentAction }
}
