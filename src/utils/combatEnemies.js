/** Multi-enemy combat slots — one entry per on-screen enemy instance. */

export function slotsFromEnemyDefs(defs) {
  return (defs || []).filter(Boolean).map((def, i) => ({
    instanceId: `${def.id}-${i}-${Math.random().toString(36).slice(2, 9)}`,
    def,
    hp: def.hp,
    maxHp: def.hp,
    intentIndex: 0,
    armor: 0,
    furyStacks: 0,
    /** Turns remaining — incoming damage × VULNERABLE_DAMAGE_MULT */
    vulnerableTurns: 0,
    /** Turns remaining — enemy strikes × WEAK_OUTGOING_MULT */
    weakTurns: 0,
    /** Poison stacks — damage & −1 stack each player turn start */
    poisonStacks: 0,
  }))
}

export function legacyFromSlots(slots) {
  if (!slots?.length) {
    return {
      currentEnemy: null,
      enemyHp: 0,
      enemyMaxHp: 0,
      enemyArmor: 0,
      enemyFuryStacks: 0,
      intentIndex: 0,
    }
  }
  const x = slots[0]
  return {
    currentEnemy: x.def,
    enemyHp: x.hp,
    enemyMaxHp: x.maxHp,
    enemyArmor: x.armor ?? 0,
    enemyFuryStacks: x.furyStacks ?? 0,
    intentIndex: x.intentIndex ?? 0,
  }
}

/** Fresh fight: reset HP/armor from defs but keep pack composition. */
export function resetSlotsForNewFight(slots) {
  return (slots || []).map((slot) => ({
    ...slot,
    hp: slot.def.hp,
    maxHp: slot.def.hp,
    intentIndex: 0,
    armor: 0,
    furyStacks: 0,
    vulnerableTurns: 0,
    weakTurns: 0,
    poisonStacks: 0,
  }))
}

/** Slot indices in `combatEnemySlots` with hp > 0; legacy single-enemy without slots → [0]. */
export function aliveEnemySlotIndices(state) {
  const slots = state.combatEnemySlots || []
  if (slots.length) {
    return slots.map((sl, i) => (sl.hp > 0 ? i : null)).filter((i) => i != null)
  }
  if (state.currentEnemy && (state.enemyHp ?? 0) > 0) return [0]
  return []
}

/** Single-target attacks: use focused slot when multiple enemies, else first alive. */
export function resolveSingleTargetDamageSlotIndex(state) {
  const indices = aliveEnemySlotIndices(state)
  if (indices.length === 0) return null
  if (indices.length === 1) return indices[0]
  const focus = state.activeEnemySlotIndex ?? 0
  if (indices.includes(focus)) return focus
  return indices[0]
}

export function pickRandomAliveEnemySlotIndex(state) {
  const indices = aliveEnemySlotIndices(state)
  if (!indices.length) return null
  return indices[Math.floor(Math.random() * indices.length)]
}
