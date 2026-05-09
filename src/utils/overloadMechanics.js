/**
 * Programmer (Kenji / japanese) overload subsystem — turn energy debt + global overload.
 */

/** @param {{ campaign?: string|null, character?: { id?: string }|null }} store */
export function isOverloadMechanicsActive(store) {
  return store?.campaign === 'japanese' && store?.character?.id === 'kenji'
}

export function isOverloadLethal(overloadGlobal, maxHp) {
  const o = Math.floor(Number(overloadGlobal) || 0)
  const m = Math.floor(Number(maxHp) || 0)
  return m > 0 && o > m
}

/**
 * Flat bonus from global overload: floor(overload × perPoint), optionally capped.
 * @param {number} overloadGlobal
 * @param {number} perPoint - multiplier per overload stack (e.g. 1 = +1 damage per overload)
 * @param {number|undefined|null} cap - optional max total bonus from this scaling only
 */
export function overloadScalingFlat(overloadGlobal, perPoint, cap) {
  const og = Math.max(0, Math.floor(Number(overloadGlobal) || 0))
  const m = Math.max(0, Number(perPoint) || 0)
  let v = Math.floor(og * m)
  if (cap != null && cap !== '' && Number.isFinite(Number(cap))) {
    const c = Math.max(0, Math.floor(Number(cap)))
    v = Math.min(v, c)
  }
  return v
}
