/** Card effect lines for UI (hand, draft) — uses i18n `draft.*` + `combat.cardRoles.*`. */
export function formatCardEffectLines(card, growthStacks, t) {
  const e = card?.effect || {}
  const parts = []

  if (e.damage != null && e.damage_all == null) {
    let bonus = ''
    const ft = e.bonus_correct_first_try || e.bonus_correct_no_hint
    if (ft) bonus += t('draft.effectDamageFirstTry', { n: ft })
    if (e.hits > 1) bonus += t('draft.effectDamageMultiHit', { count: e.hits })
    if (e.damage_target === 'random') {
      parts.push(t('draft.effectDealDamageRandom', { value: e.damage, bonus }))
    } else {
      parts.push(t('draft.effectDealDamage', { value: e.damage, bonus }))
    }
  }

  if (e.damage_all != null) {
    let bonus = ''
    const ft = e.bonus_correct_first_try || e.bonus_correct_no_hint
    if (ft) bonus += t('draft.effectDamageFirstTry', { n: ft })
    if (e.hits > 1) bonus += t('draft.effectDamageMultiHit', { count: e.hits })
    parts.push(t('draft.effectDealDamageAll', { value: e.damage_all, bonus }))
  }

  if (e.block) {
    const grownBlock = e.block + (growthStacks || 0) * 4
    const growthNote = (growthStacks || 0) > 0
      ? t('draft.effectGainBlockGrowth', { turns: growthStacks })
      : ''
    parts.push(t('draft.effectGainBlockLine', { value: grownBlock, growth: growthNote }))
  }

  if (e.heal) parts.push(t('draft.effectHeal', { value: e.heal }))

  if (e.draw) {
    const key = e.draw > 1 ? 'draft.effectDraw_other' : 'draft.effectDraw_one'
    parts.push(t(key, { count: e.draw }))
  }

  if (e.stun) parts.push(t('draft.effectStun', { turns: e.stun }))
  if (e.chain_bonus) parts.push(t('draft.effectChain', { value: e.chain_bonus }))
  if (e.next_hit_damage_bonus) parts.push(t('draft.effectNextHitDamage', { value: e.next_hit_damage_bonus }))
  if (e.bonus_if_block_active) parts.push(t('draft.effectBonusIfBlock', { value: e.bonus_if_block_active }))
  if (e.discard_draw) {
    parts.push(t('draft.effectDiscardDraw', { discard: e.discard_draw, draw: e.discard_draw + 1 }))
  }
  if (e.duplicate_self_when_discarded) {
    parts.push(t('draft.effectDuplicateWhenDiscarded'))
  }
  if (e.draw_then_discard_hand) {
    const { draw: dr, discard: di } = e.draw_then_discard_hand
    parts.push(t('draft.effectDrawThenDiscardHand', { draw: dr, discard: di }))
  }
  if (e.pick_from_discard_to_hand) {
    if (e.exhaust_self) parts.push(t('draft.effectPickFromDiscardExhaust'))
    else parts.push(t('draft.effectPickFromDiscardRetain'))
  }
  if (e.exhaust_one_hand_gain_its_energy) {
    parts.push(t('draft.effectExhaustHandGainEnergy'))
  }
  if (e.exhaust_self_gain_energy) {
    parts.push(t('draft.effectExhaustEnergy', { energy: e.exhaust_self_gain_energy }))
  }
  if (e.retain) parts.push(t('draft.effectRetain'))
  if (e.reflect_stacks) parts.push(t('draft.effectReflectStacks', { value: e.reflect_stacks }))
  if (e.reflect_damage) parts.push(t('draft.effectReflectDamage', { value: e.reflect_damage }))

  if (e.enemy_vulnerable_all != null) {
    parts.push(t('draft.effectEnemyVulnerableAll', { n: e.enemy_vulnerable_all }))
  } else if (e.enemy_vulnerable != null) {
    parts.push(t('draft.effectEnemyVulnerable', { n: e.enemy_vulnerable }))
  }
  if (e.enemy_weak_all != null) {
    parts.push(t('draft.effectEnemyWeakAll', { n: e.enemy_weak_all }))
  } else if (e.enemy_weak != null) {
    parts.push(t('draft.effectEnemyWeak', { n: e.enemy_weak }))
  }
  if (e.enemy_poison_all != null) {
    parts.push(t('draft.effectEnemyPoisonAll', { n: e.enemy_poison_all }))
  } else if (e.enemy_poison != null) {
    parts.push(t('draft.effectEnemyPoison', { n: e.enemy_poison }))
  }

  if (e.player_strength) {
    parts.push(t('draft.effectPlayerStrength', { n: e.player_strength }))
  }

  return parts.length ? parts.join(' ') : t('draft.effectSpecial')
}

/** Card role banner (ATTACK / SKILL / …) */
export function formatCardRoleLabel(cardRole, t) {
  return t(`combat.cardRoles.${cardRole}`, { defaultValue: cardRole })
}
