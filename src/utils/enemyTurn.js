// utils/enemyTurn.js — v2 (optimized)
// All enemy action resolution logic. Called by useEnemyTurn.js.
// Pure functions that read and write to the store via actions — never mutate directly.

import { WEAK_OUTGOING_MULT } from '../constants/enemyStatus.js'
import { SCOPE_CREEP_ATTACK_REDUCTION } from '../constants/relicCombat.js'

/** Call after enemy strike SFX — only when that strike dealt HP loss (not fully blocked). */
function maybeApplyReflectDamage(store, playSFX, hpLostThisStrike, reflectSlotIndex = 0) {
  if (!hpLostThisStrike || hpLostThisStrike <= 0) return
  const slots = store.combatEnemySlots || []
  const idx = reflectSlotIndex ?? store.activeEnemySlotIndex ?? 0
  const slotHp = slots[idx]?.hp ?? store.enemyHp
  if (!store.inCombat || slotHp <= 0) return
  const stacks = Math.max(0, Math.floor(Number(store.reflectStacks) || 0))
  const per = Math.max(0, Math.floor(Number(store.reflectDamagePer) || 0))
  const total = stacks * per
  if (total <= 0) return
  store.damageEnemy(total, idx)
  playSFX?.('attack_enemy')
}

// ── Shared helper: apply strike damage with block, fury, last_stand ──
function applyStrikeDamage(rawDamage, store) {
  let damage = rawDamage

  const slots = store.combatEnemySlots || []
  const idx = store.activeEnemySlotIndex ?? 0
  const atkSlot = slots[idx]
  if (atkSlot && (atkSlot.weakTurns ?? 0) > 0) {
    damage = Math.floor(damage * WEAK_OUTGOING_MULT)
  }

  // Apply accumulated wrong-answer buffs (confusion → bonus attack)
  const confusionBuff = store.activeEnemyBuffs.find(b => b.type === 'confusion')
  if (confusionBuff) damage += (confusionBuff.attack_bonus || 2)

  // Fury stacks: at 3 stacks, damage doubles, fury resets
  if (store.enemyFuryStacks >= 3) {
    damage *= 2
    store.clearEnemyFury()
  }

  if (Array.isArray(store.relics) && store.relics.includes('scope_creep_lapel')) {
    damage = Math.max(0, damage - SCOPE_CREEP_ATTACK_REDUCTION)
  }

  // Apply player block
  const currentBlock = store.block
  const blocked = Math.min(currentBlock, damage)
  const remaining = damage - blocked
  if (blocked > 0) store.spendBlock(blocked)
  if (remaining > 0) {
    const newHp = store.hp - remaining
    store.setHp(newHp)
    store.registerPlayerHpLossThisFight?.(remaining)
  }

  return { blocked, remaining, damage }
}

/**
 * Execute one enemy action. The store is read via getState() inside for freshness.
 * @param {string} action - MOVE_TYPE string
 * @param {Object} enemy  - current enemy data
 * @param {Object} store  - runStore instance (has all action methods)
 * @param {function} playSFX
 * @returns {Promise<{ message: string, icon: string }>} - what to display during animation
 */
export async function resolveEnemyAction(action, enemy, store, playSFX, attackerSlotIndex = 0) {
  switch (action) {
    case 'strike': {
      const { blocked, remaining, damage } = applyStrikeDamage(enemy.base_attack, store)
      playSFX?.('enemy_strike')
      maybeApplyReflectDamage(store, playSFX, remaining, attackerSlotIndex)
      return {
        icon: '⚔️',
        message: blocked > 0
          ? `Strike! ${remaining > 0 ? `-${remaining} HP` : `Blocked!`}`
          : `-${damage} HP`,
        type: 'damage',
        value: remaining,
      }
    }

    case 'debuff_silence': {
      const silenceTarget = enemy.silence_type || 'vocabulary'
      store.addPlayerDebuff({ type: 'silence', target: silenceTarget, duration: 2 })
      playSFX?.('debuff_apply')
      return { icon: '🔇', message: `Silence! ${silenceTarget} cards muted`, type: 'debuff' }
    }

    case 'debuff_drain': {
      store.addPlayerDebuff({ type: 'drain', energy_penalty: 1, duration: 2 })
      playSFX?.('debuff_apply')
      return { icon: '⚡', message: 'Drain! −1 Energy next turn', type: 'debuff' }
    }

    case 'debuff_fog': {
      store.addPlayerDebuff({ type: 'fog', duration: 1 })
      playSFX?.('debuff_apply')
      return { icon: '🌫️', message: 'Fog! Next answer obscured', type: 'debuff' }
    }

    case 'debuff_bind': {
      store.addPlayerDebuff({ type: 'bind', draw_penalty: 1, duration: 2 })
      playSFX?.('debuff_apply')
      return { icon: '🔗', message: 'Bind! Draw 1 fewer card', type: 'debuff' }
    }

    case 'debuff_confusion': {
      store.addPlayerDebuff({ type: 'confusion', duration: 1 })
      playSFX?.('debuff_apply')
      return { icon: '🔀', message: 'Confusion! Options shuffle at 3s', type: 'debuff' }
    }

    case 'self_buff_armor_up': {
      store.addEnemyArmor(8)
      playSFX?.('enemy_buff')
      return { icon: '🛡️', message: 'Armor Up! +8 armor', type: 'selfbuff' }
    }

    case 'self_buff_harden': {
      store.addEnemyArmor(15)
      playSFX?.('enemy_buff')
      return { icon: '💎', message: 'Harden! +15 armor', type: 'selfbuff' }
    }

    case 'self_buff_recover': {
      if (store.enemyHp < store.enemyMaxHp * 0.5) {
        store.healEnemy(15)
        playSFX?.('enemy_heal')
        return { icon: '💉', message: 'Recover! +15 HP', type: 'selfbuff' }
      }
      return { icon: '💉', message: 'Recover (HP too high)', type: 'selfbuff' }
    }

    case 'self_buff_power_up': {
      // FIX: read fury BEFORE adding, then add — avoids stale read after mutation
      const furyBefore = store.enemyFuryStacks
      store.addEnemyFury()
      const newFury = furyBefore + 1
      playSFX?.('enemy_buff')
      return {
        icon: '🔥',
        message: `Power Up! Fury ${newFury}/3${newFury >= 3 ? ' — NEXT STRIKE DOUBLES' : ''}`,
        type: 'selfbuff',
      }
    }

    case 'self_buff_enrage': {
      // Gains 2 fury at once — aggressive escalation
      // FIX: read fury BEFORE adding both stacks
      const furyBefore = store.enemyFuryStacks
      store.addEnemyFury()
      store.addEnemyFury()
      const furyAfter = furyBefore + 2
      playSFX?.('enemy_buff')
      return {
        icon: '😤',
        message: `Enrage! Fury +2 (${furyAfter}/3)`,
        type: 'selfbuff',
      }
    }

    case 'self_buff_focus': {
      const mostUsed = getMostUsedCardType(store)
      if (mostUsed) {
        store.setEnemyFocusType(mostUsed)
        playSFX?.('enemy_buff')
        return { icon: '👁️', message: `Focus! Resists ${mostUsed} cards (−50% dmg)`, type: 'selfbuff' }
      }
      return { icon: '👁️', message: 'Focus (observing...)', type: 'selfbuff' }
    }

    // ── EXTENDED ACTION TYPES ──

    case 'strike_heavy': {
      // Slow but deals 1.8× base damage
      const { blocked, remaining, damage } = applyStrikeDamage(Math.floor(enemy.base_attack * 1.8), store)
      playSFX?.('enemy_strike')
      maybeApplyReflectDamage(store, playSFX, remaining, attackerSlotIndex)
      return {
        icon: '💥',
        message: blocked > 0 ? `Heavy Strike! ${remaining > 0 ? `-${remaining} HP` : 'Blocked!'}` : `-${damage} HP`,
        type: 'damage',
        value: remaining,
      }
    }

    case 'strike_swift': {
      // Hits twice at 0.6× — split damage pierces small blocks
      const dmg1 = Math.floor(enemy.base_attack * 0.6)
      const dmg2 = Math.floor(enemy.base_attack * 0.6)
      let totalRemaining = 0
      for (const raw of [dmg1, dmg2]) {
        let dmg = raw
        if (Array.isArray(store.relics) && store.relics.includes('scope_creep_lapel')) {
          dmg = Math.max(0, dmg - SCOPE_CREEP_ATTACK_REDUCTION)
        }
        const b = Math.min(store.block, dmg)
        const r = dmg - b
        if (b > 0) store.spendBlock(b)
        if (r > 0) {
          store.setHp(Math.max(0, store.hp - r))
          store.registerPlayerHpLossThisFight?.(r)
          totalRemaining += r
        }
        playSFX?.('enemy_strike')
        maybeApplyReflectDamage(store, playSFX, r, attackerSlotIndex)
      }
      return { icon: '⚡', message: `Swift Strike ×2! −${totalRemaining} HP`, type: 'damage', value: totalRemaining }
    }

    case 'debuff_curse': {
      // Applies both silence AND drain in one action — brutal combo
      const silenceTarget = enemy.silence_type || 'vocabulary'
      store.addPlayerDebuff({ type: 'silence', target: silenceTarget, duration: 2 })
      store.addPlayerDebuff({ type: 'drain', energy_penalty: 1, duration: 1 })
      playSFX?.('debuff_apply')
      return { icon: '💀', message: `Curse! Silence + Drain applied`, type: 'debuff' }
    }

    case 'debuff_taunt': {
      // Forces player to play an extra card or lose 5 HP (simulated: lose 5 HP if not in attack mode)
      store.addPlayerDebuff({ type: 'bind', draw_penalty: 1, duration: 1 })
      store.addPlayerDebuff({ type: 'confusion', duration: 1 })
      playSFX?.('debuff_apply')
      return { icon: '😡', message: 'Taunt! Bind + Confusion', type: 'debuff' }
    }

    /** Act1: Echo Invoice curse — only from elite/boss intents, never card rewards */
    case 'add_echo_invoice': {
      const cardId = enemy.echo_invoice_card_id || 'dev_act1_curse_echo_invoice'
      store.addCardToDeck(cardId)
      playSFX?.('debuff_apply')
      return { icon: '🧾', message: 'Echo Invoice slips into your deck…', type: 'debuff' }
    }

    default: {
      // DECISION: unknown or special moves log a warning and are skipped
      console.warn(`[Ascendant] Unknown enemy action: ${action}`)
      return { icon: '❓', message: `${action}`, type: 'special' }
    }
  }
}

/**
 * Returns the card type the player has played most this fight.
 * Used by self_buff_focus to choose which type to resist.
 */
function getMostUsedCardType(store) {
  const counts = store.cardTypesPlayedThisFight || {}
  const entries = Object.entries(counts)
  if (entries.length === 0) return null
  return entries.sort((a, b) => b[1] - a[1])[0][0]
}

/**
 * Compute effective draw count (respects Bind debuff)
 */
export function getEffectiveDrawCount(store, base = 5) {
  const bindDebuff = store.activePlayerDebuffs.find(d => d.type === 'bind')
  return bindDebuff ? base - (bindDebuff.draw_penalty || 1) : base
}

/**
 * Compute effective starting energy (respects Drain debuff)
 */
export function getEffectiveMaxEnergy(store) {
  const drainDebuff = store.activePlayerDebuffs.find(d => d.type === 'drain')
  return drainDebuff ? store.maxEnergy - (drainDebuff.energy_penalty || 1) : store.maxEnergy
}

/**
 * Check if a card type is silenced by an active Silence debuff
 */
export function isCardTypeSilenced(cardType, store) {
  return store.activePlayerDebuffs.some(
    d => d.type === 'silence' && d.target === cardType
  )
}
