/**
 * Derive glossary mechanic ids from card.effect for hover explanations.
 * Order is stable for consistent UI.
 */

const ORDER = [
  'poison',
  'vulnerable',
  'weak',
  'first_try',
  'chain',
  'reflect',
  'stun',
  'retain',
  'strength',
  'next_hit',
  'bonus_if_block',
  'discard_draw',
  'draw_then_discard',
  'pick_discard',
  'exhaust_hand_energy',
  'exhaust_gain_energy',
  'multi_hit',
  'random_target',
  'duplicate_discard',
  'poison_aura',
]

/**
 * @param {Record<string, unknown>|null|undefined} effect
 * @returns {string[]}
 */
export function collectMechanicIdsFromEffect(effect) {
  if (!effect || typeof effect !== 'object') return []
  const e = effect
  const set = new Set()

  if (e.enemy_poison != null || e.enemy_poison_all != null) set.add('poison')
  if (e.enemy_vulnerable != null || e.enemy_vulnerable_all != null) set.add('vulnerable')
  if (e.enemy_weak != null || e.enemy_weak_all != null) set.add('weak')
  if (e.bonus_correct_first_try || e.bonus_correct_no_hint) set.add('first_try')
  if (e.chain_bonus) set.add('chain')
  if (e.reflect_stacks || e.reflect_damage) set.add('reflect')
  if (e.stun) set.add('stun')
  if (e.retain) set.add('retain')
  if (e.player_strength) set.add('strength')
  if (e.next_hit_damage_bonus) set.add('next_hit')
  if (e.bonus_if_block) set.add('bonus_if_block')
  if (e.discard_draw) set.add('discard_draw')
  if (e.draw_then_discard_hand) set.add('draw_then_discard')
  if (e.pick_from_discard_to_hand) set.add('pick_discard')
  if (e.exhaust_one_hand_gain_its_energy) set.add('exhaust_hand_energy')
  if (e.exhaust_self_gain_energy) set.add('exhaust_gain_energy')
  if (e.hits > 1) set.add('multi_hit')
  if (e.damage_target === 'random') set.add('random_target')
  if (e.duplicate_self_when_discarded) set.add('duplicate_discard')
  if (e.register_poison_all_each_turn != null) set.add('poison_aura')

  return ORDER.filter((id) => set.has(id))
}

/**
 * @param {object|null|undefined} card
 * @returns {string[]}
 */
export function collectMechanicIdsFromCard(card) {
  return collectMechanicIdsFromEffect(card?.effect)
}
