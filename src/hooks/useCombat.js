// hooks/useCombat.js — v2
// Core combat logic: card play, question resolution, locked cards, chain, debuff checks
// Enemy turn is now handled by useEnemyTurn.js — this hook is PLAYER_TURN only.

import { useState, useCallback, useEffect, useMemo } from 'react'
import useRunStore from '../stores/runStore.js'
import { useAudio } from './useAudio.js'
import { drawCards } from '../utils/deck.js'
import {
  calculateDamage,
  calculateBlock,
  resolveChain,
} from '../utils/combat.js'
import {
  getEffectiveDrawCount,
  getEffectiveMaxEnergy,
  isCardTypeSilenced,
} from '../utils/enemyTurn.js'
import { INCIDENT_BUFFER_BLOCK } from '../constants/relicCombat.js'
import { CARD_KEYWORD_IDS } from '../constants/cardKeywords.js'
import {
  pickRandomAliveEnemySlotIndex,
  resolveSingleTargetDamageSlotIndex,
} from '../utils/combatEnemies.js'

const cardCache = {}

/** Minimal card row when JSON is still loading or id missing — keeps CardHand from filtering everything out. */
function stubCard(id) {
  return {
    id,
    name_target: id,
    name_native: '',
    type: 'vocabulary',
    rarity: 'common',
    energy_cost: 1,
    effect: {},
    illustration: '/images/skill_placeholder.png',
  }
}

function mergeCardMapForIds(base, ids) {
  const m = { ...base }
  for (const id of ids) {
    if (typeof id === 'string' && id && !m[id]) m[id] = stubCard(id)
  }
  return m
}

function collectCardIdsForMerge(s) {
  const ids = [
    ...(s.hand || []),
    ...(s.deck || []),
    ...(s.discardPile || []),
    ...(s.exhaustPile || []),
  ]
  const p = s.pendingDiscardPick
  if (p?.skillCardId) ids.push(p.skillCardId)
  return ids
}

/** Guard nested “discard as play” (奇巧) triggers. */
let ingeniousCallDepth = 0

function expandDiscardWithCurseDupes(discardPile, ids, cardMap) {
  const out = [...discardPile]
  for (const id of ids) {
    out.push(id)
    if (cardMap[id]?.effect?.duplicate_self_when_discarded) out.push(id)
  }
  return out
}

async function loadCards(campaign) {
  if (cardCache[campaign]) return cardCache[campaign]
  try {
    const mod = await import(`../data/${campaign}/cards.json`)
    const raw = mod?.default ?? mod
    const list = Array.isArray(raw) ? raw : raw?.default
    if (!Array.isArray(list)) {
      console.error(`[useCombat] cards.json for ${campaign} is not an array`)
      return {}
    }
    const map = {}
    for (const card of list) map[card.id] = card
    cardCache[campaign] = map
    return cardCache[campaign]
  } catch (e) {
    console.error(`[useCombat] Failed to load cards for ${campaign}:`, e)
    return {}
  }
}

export function useCombat() {
  const store = useRunStore()
  const { playSFX } = useAudio()

  const [loadedCardMap, setLoadedCardMap] = useState({})
  const [activeCardId, setActiveCardId] = useState(null) // kept for card highlight animation

  // Animation state
  const [animState, setAnimState] = useState(null) // 'correct' | 'wrong' | null
  const [damageNumbers, setDamageNumbers] = useState([])

  // Load campaign data on mount
  useEffect(() => {
    if (!store.campaign) return
    loadCards(store.campaign).then(setLoadedCardMap)
  }, [store.campaign])

  const cardMap = useMemo(
    () => mergeCardMapForIds(loadedCardMap, collectCardIdsForMerge(store)),
    [
      loadedCardMap,
      store.hand,
      store.deck,
      store.discardPile,
      store.exhaustPile,
      store.pendingDiscardPick,
    ],
  )

  const getCard = useCallback((cardId) => cardMap[cardId] || null, [cardMap])

  const showDamageNumber = useCallback((value, type) => {
    const id = Date.now() + Math.random()
    setDamageNumbers(prev => [...prev, { id, value, type }])
    setTimeout(() => setDamageNumbers(prev => prev.filter(d => d.id !== id)), 900)
  }, [])

  // ============================================================
  // DRAW HAND
  // Respects Bind debuff (fewer draws) + Drain debuff (less energy)
  // Called at start of PLAYER_DRAW phase
  // ============================================================
  const drawHand = useCallback(() => {
    const s = useRunStore.getState()

    // Poison tick + decay 易伤/虚弱 — not on the opening hand of the fight
    if (s.turnNumber >= 1) {
      s.tickEnemyPoisonAtPlayerTurnStart()
    }

    // v2: unlock all locked cards first
    s.unlockAllCards()
    s.beginPlayerCardPhase()

    // StS-style: lose Block at the start of each player turn (not first draw of fight).
    // bamboo_fan: block does not expire at turn start.
    if (s.turnNumber > 0 && !s.relics.includes('bamboo_fan')) {
      s.clearBlock()
    }

    if (s.relics.includes('incident_buffer')) {
      s.addBlock(INCIDENT_BUFFER_BLOCK)
    }

    // v3: Passively retain cards that have the retain effect
    const currentHand = s.hand
    const retained = currentHand.filter(id => {
      const card = cardMap[id]
      return card?.effect?.retain
    })
    s.setRetainedCards(retained)

    // Tick growth for retained cards (they grow each turn they stay in hand)
    retained.forEach(cardId => s.tickRetainGrowth(cardId))

    const drawCount = getEffectiveDrawCount(s, 5)
    const effectiveEnergy = getEffectiveMaxEnergy(s)

    const gridSnapBonus = s.turnNumber === 0 && s.relics.includes('grid_snap_ruler') ? 1 : 0
    const effectiveDrawCount = drawCount + gridSnapBonus

    // v3: Retained cards stay in the hand — only draw enough to fill up to drawCount
    const slotsToFill = Math.max(0, effectiveDrawCount - retained.length)
    // Cards currently in hand that are NOT retained go to discard
    const nonRetainedInHand = currentHand.filter(id => !retained.includes(id))

    let mergedDiscard = expandDiscardWithCurseDupes(s.discardPile, nonRetainedInHand, cardMap)
    useRunStore.setState({ discardPile: mergedDiscard })

    nonRetainedInHand.forEach((id) => {
      const c = cardMap[id]
      if (!c?.keywords?.includes(CARD_KEYWORD_IDS.INGENIOUS)) return
      if (ingeniousCallDepth >= 12) return
      ingeniousCallDepth++
      try {
        const st = useRunStore.getState()
        const hasChainBracelet = Array.isArray(st.relics) && st.relics.includes('chain_bracelet')
        const { bonusMultiplier } = resolveChain(c.type, { chainActive: st.chainActive, chainType: st.chainType }, st, hasChainBracelet)
        applyCardEffect(c, bonusMultiplier, false, st, { fromDiscardIngenious: true })
      } finally {
        ingeniousCallDepth--
      }
    })

    const stAfter = useRunStore.getState()
    const { drawn, deck: newDeck, discard: newDiscard } = drawCards(stAfter.deck, stAfter.discardPile, slotsToFill)

    // New hand = retained cards (still in hand) + newly drawn cards
    s.setHand([...retained, ...drawn])
    s.setDeck(newDeck)
    s.setDiscard(newDiscard)

    // Reset energy respecting Drain debuff (+ Syntax Stapler: +1 on first player turn of fight)
    let startEnergy = effectiveEnergy
    if (s.turnNumber === 0 && s.relics.includes('syntax_stapler')) {
      startEnergy += 1
    }
    useRunStore.setState({ energy: startEnergy })

    s.incrementTurn()

    drawn.forEach((_, i) => setTimeout(() => playSFX('card_draw_vocab'), i * 80))
  }, [playSFX, cardMap])

  // ============================================================
  // SELECT CARD
  // Energy, silence, lock; chain multiplier; first card this turn = first try.
  // ============================================================
  const selectCard = useCallback(async (cardId) => {
    const s = useRunStore.getState()
    if (s.pendingDiscardPick || s.pendingHandExhaustEnergyPick) return
    const card = cardMap[cardId]
    if (!card) return

    if (s.energy < card.energy_cost) return
    if (s.lockedCards.includes(cardId)) return
    if (isCardTypeSilenced(card.type, s)) return

    const isFirstTry = s.playsThisPlayerTurn === 0
    const hasChainBracelet = Array.isArray(s.relics) && s.relics.includes('chain_bracelet')
    const chainState = { chainActive: s.chainActive, chainType: s.chainType }
    const { bonusMultiplier } = resolveChain(card.type, chainState, s, hasChainBracelet)
    if (bonusMultiplier > 1) playSFX('chain_activate')

    // Exhaust one hand card → gain Energy equal to its cost (pick after skill leaves hand).
    if (card.effect?.exhaust_one_hand_gain_its_energy) {
      const others = s.hand.filter(id => id !== cardId)
      if (others.length === 0) {
        playSFX('wrong')
        return
      }
      setActiveCardId(cardId)
      playSFX('card_play')
      s.trackCardTypePlayed(card.type)
      setAnimState('player_telegraph_buff')
      await new Promise(r => setTimeout(r, 350))

      s.spendEnergy(card.energy_cost)
      s.removeFromHand(card.id)
      s.clearRetainGrowth(card.id)
      const stAfterPlay = useRunStore.getState()
      const newDiscard = expandDiscardWithCurseDupes(stAfterPlay.discardPile, [card.id], cardMap)
      useRunStore.setState({
        discardPile: newDiscard,
        pendingHandExhaustEnergyPick: true,
      })
      s.setLastCardTypePlayed(card.type)
      s.incrementPlaysThisPlayerTurn()

      const prepEx = card.effect?.next_hit_damage_bonus
      if (prepEx != null && Number(prepEx) > 0) {
        useRunStore.getState().queueNextHitDamageBonus(Number(prepEx))
      }

      setAnimState('player_buff')
      setTimeout(() => setAnimState(null), 600)
      setTimeout(() => setActiveCardId(null), 150)
      playSFX('correct')
      return
    }

    // Return one card from discard — resolve placement after player picks (DeckOverlay).
    if (card.effect?.pick_from_discard_to_hand) {
      if (s.discardPile.length === 0) {
        playSFX('wrong')
        return
      }
      setActiveCardId(cardId)
      playSFX('card_play')
      s.trackCardTypePlayed(card.type)
      setAnimState('player_telegraph_buff')
      await new Promise(r => setTimeout(r, 350))

      applyCardEffect(card, bonusMultiplier, isFirstTry, s)

      const afterPick = useRunStore.getState()
      if (afterPick.potionEffects?.echoTonicActive) {
        afterPick.setPotionEffect('echoTonicActive', false)
        applyCardEffect(card, bonusMultiplier, isFirstTry, useRunStore.getState())
      }

      s.spendEnergy(card.energy_cost)
      s.removeFromHand(card.id)
      s.clearRetainGrowth(card.id)
      useRunStore.setState({
        pendingDiscardPick: {
          skillCardId: card.id,
          exhaustSelf: Boolean(card.effect.exhaust_self),
        },
      })
      s.setLastCardTypePlayed(card.type)
      s.incrementPlaysThisPlayerTurn()

      const prepNextPick = card.effect?.next_hit_damage_bonus
      if (prepNextPick != null && Number(prepNextPick) > 0) {
        useRunStore.getState().queueNextHitDamageBonus(Number(prepNextPick))
      }

      setAnimState('player_buff')
      setTimeout(() => setAnimState(null), 600)
      setTimeout(() => setActiveCardId(null), 150)
      playSFX('correct')
      return
    }

    setActiveCardId(cardId)
    playSFX('card_play')

    // Track category usage for enemy focus / modifier interactions.
    s.trackCardTypePlayed(card.type)

    const efx = card.effect || {}
    const isAttack = Boolean(efx.damage) || Boolean(efx.damage_all) || efx.type === 'damage' || efx.type === 'damage_all' || efx.type === 'discard_damage' || efx.type === 'exhaust_damage'
    setAnimState(isAttack ? 'player_telegraph_damage' : 'player_telegraph_buff')
    await new Promise(r => setTimeout(r, 350))

    applyCardEffect(card, bonusMultiplier, isFirstTry, s)

    const afterS = useRunStore.getState()
    if (afterS.potionEffects?.echoTonicActive) {
      afterS.setPotionEffect('echoTonicActive', false)
      applyCardEffect(card, bonusMultiplier, isFirstTry, useRunStore.getState())
    }

    s.spendEnergy(card.energy_cost)
    s.removeFromHand(card.id)
    s.clearRetainGrowth(card.id)
    if (card.effect?.exhaust_self_gain_energy) {
      useRunStore.setState(st => ({ exhaustPile: [...st.exhaustPile, card.id] }))
    } else if (card.effect?.exhaust_self) {
      useRunStore.setState(st => ({ exhaustPile: [...st.exhaustPile, card.id] }))
      playSFX('card_exhaust')
    } else {
      const st = useRunStore.getState()
      const d = expandDiscardWithCurseDupes(st.discardPile, [card.id], cardMap)
      useRunStore.setState({ discardPile: d })
    }
    s.setLastCardTypePlayed(card.type)
    s.incrementPlaysThisPlayerTurn()

    const prepNext = card.effect?.next_hit_damage_bonus
    if (prepNext != null && Number(prepNext) > 0) {
      useRunStore.getState().queueNextHitDamageBonus(Number(prepNext))
    }

    setAnimState(isAttack ? 'player_attack' : 'player_buff')
    setTimeout(() => setAnimState(null), 600)
    setTimeout(() => setActiveCardId(null), 150)
    playSFX('correct')
  }, [cardMap, playSFX])

  // ============================================================
  // CARD EFFECT APPLICATION
  // opts.fromDiscardIngenious — 奇巧: resolve as if played, but do not move the card
  // ============================================================
  function applyCardEffect(card, chainMultiplier, isFirstTry, s, opts = {}) {
    const { fromDiscardIngenious = false } = opts
    const { effect } = card
    if (!effect) return

    if (fromDiscardIngenious) {
      s.trackCardTypePlayed(card.type)
    }

    // Single-target (default) or random one enemy — not used together with damage_all
    if (effect.damage != null && effect.damage_all == null) {
      const prepCarry = useRunStore.getState().pendingNextDamageBonus || 0
      if (prepCarry > 0) {
        useRunStore.setState({ pendingNextDamageBonus: 0 })
      }

      let baseDmg = calculateDamage({
        base: effect.damage,
        bonusCorrectFirstTry: effect.bonus_correct_first_try || effect.bonus_correct_no_hint || 0,
        chainMultiplier,
        cardType: card.type,
        isFirstTry,
        hits: effect.hits || 1,
      })

      const bypassesChainArmor = chainMultiplier > 1

      const coreDmg = bypassesChainArmor
        ? baseDmg
        : (effect.bonus_if_block_active && s.block > 0 ? baseDmg + effect.bonus_if_block_active : baseDmg)

      let finalDmg = coreDmg + prepCarry
      const strPts = useRunStore.getState().playerStrength || 0
      finalDmg += strPts * (effect.hits || 1)

      const stDmg = useRunStore.getState()
      const randomTgt = effect.damage_target === 'random'
      const slotIdx = randomTgt
        ? pickRandomAliveEnemySlotIndex(stDmg)
        : resolveSingleTargetDamageSlotIndex(stDmg)
      if (slotIdx != null) {
        s.damageEnemy(finalDmg, slotIdx)
        showDamageNumber(finalDmg, 'damage')
        playSFX('attack_enemy')
      }
    }

    if (effect.damage_all) {
      const prepCarry = useRunStore.getState().pendingNextDamageBonus || 0
      if (prepCarry > 0) {
        useRunStore.setState({ pendingNextDamageBonus: 0 })
      }

      let baseDmg = calculateDamage({
        base: effect.damage_all,
        bonusCorrectFirstTry: effect.bonus_correct_first_try || effect.bonus_correct_no_hint || 0,
        chainMultiplier,
        cardType: card.type,
        isFirstTry,
        hits: effect.hits || 1,
      })

      const bypassesChainArmor = chainMultiplier > 1

      const coreDmg = bypassesChainArmor
        ? baseDmg
        : (effect.bonus_if_block_active && s.block > 0 ? baseDmg + effect.bonus_if_block_active : baseDmg)

      let finalDmg = coreDmg + prepCarry
      const strPtsAo = useRunStore.getState().playerStrength || 0
      finalDmg += strPtsAo * (effect.hits || 1)

      s.damageAllEnemies(finalDmg)
      showDamageNumber(finalDmg, 'damage')
      playSFX('attack_enemy')
    }

    if (effect.block) {
      // v3: retain growth — each retained turn adds +4 bonus block
      const stacks = s.retainGrowthStacks?.[card.id] || 0
      const growthBonus = stacks * 4
      const blockGained = calculateBlock({ base: effect.block + growthBonus, chainMultiplier })
      s.addBlock(blockGained)
      playSFX('block_gain')
    }

    if (effect.heal) {
      const healAmt = chainMultiplier > 1 ? Math.floor(effect.heal * chainMultiplier) : effect.heal
      s.healHp(healAmt)
      playSFX('heal')
    }

    if (effect.draw) {
      const drawCount = chainMultiplier > 1 ? effect.draw + 1 : effect.draw
      const { drawn, deck: newDeck, discard: newDiscard } = drawCards(s.deck, s.discardPile, drawCount)
      s.setHand([...s.hand, ...drawn])
      s.setDeck(newDeck)
      s.setDiscard(newDiscard)
    }

    if (effect.chain_bonus && chainMultiplier > 1) {
      const st2 = useRunStore.getState()
      const slotIdx = effect.damage_target === 'random'
        ? pickRandomAliveEnemySlotIndex(st2)
        : resolveSingleTargetDamageSlotIndex(st2)
      const extraStr = st2.playerStrength || 0
      if (slotIdx != null) s.damageEnemy(effect.chain_bonus + extraStr, slotIdx)
    }

    if (effect.reflect_stacks) {
      s.addReflectStacks(effect.reflect_stacks)
    }
    if (effect.reflect_damage) {
      s.addReflectDamagePer(effect.reflect_damage)
    }

    if (effect.player_strength) {
      s.addPlayerStrength(effect.player_strength)
      playSFX('block_gain')
    }

    // ── Enemy statuses (易伤 vulnerable / 虚弱 weak / 毒 poison) ──
    const stStatus = useRunStore.getState()
    const statusRandom = effect.enemy_status_target === 'random'
    const statusIdx = statusRandom
      ? pickRandomAliveEnemySlotIndex(stStatus)
      : resolveSingleTargetDamageSlotIndex(stStatus)

    let appliedEnemyStatus = false
    if (effect.enemy_vulnerable_all != null) {
      s.addEnemyVulnerableAll(effect.enemy_vulnerable_all)
      appliedEnemyStatus = true
    } else if (effect.enemy_vulnerable != null && statusIdx != null) {
      s.addEnemyVulnerable(statusIdx, effect.enemy_vulnerable)
      appliedEnemyStatus = true
    }
    if (effect.enemy_weak_all != null) {
      s.addEnemyWeakAll(effect.enemy_weak_all)
      appliedEnemyStatus = true
    } else if (effect.enemy_weak != null && statusIdx != null) {
      s.addEnemyWeak(statusIdx, effect.enemy_weak)
      appliedEnemyStatus = true
    }
    if (effect.enemy_poison_all != null) {
      s.addEnemyPoisonAll(effect.enemy_poison_all)
      appliedEnemyStatus = true
    } else if (effect.enemy_poison != null && statusIdx != null) {
      s.addEnemyPoison(statusIdx, effect.enemy_poison)
      appliedEnemyStatus = true
    }
    if (appliedEnemyStatus) playSFX('debuff_apply')

    // v3: Discard/Draw — discard N cards from hand, draw N+1
    if (effect.discard_draw) {
      const count = effect.discard_draw
      const freshS = useRunStore.getState()
      const eligibleToDiscard = freshS.hand.filter(id => !freshS.retainedCards.includes(id))
      const toDiscard = eligibleToDiscard.slice(0, count)
      const newHand = freshS.hand.filter(id => !toDiscard.includes(id))
      let expanded = expandDiscardWithCurseDupes(freshS.discardPile, toDiscard, cardMap)
      useRunStore.setState({ hand: newHand, discardPile: expanded })
      toDiscard.forEach((id) => {
        const c = cardMap[id]
        if (!c?.keywords?.includes(CARD_KEYWORD_IDS.INGENIOUS)) return
        if (ingeniousCallDepth >= 12) return
        ingeniousCallDepth++
        try {
          const st = useRunStore.getState()
          const hasChainBracelet = Array.isArray(st.relics) && st.relics.includes('chain_bracelet')
          const { bonusMultiplier: bm } = resolveChain(c.type, { chainActive: st.chainActive, chainType: st.chainType }, st, hasChainBracelet)
          applyCardEffect(c, bm, false, st, { fromDiscardIngenious: true })
        } finally {
          ingeniousCallDepth--
        }
      })
      const st2 = useRunStore.getState()
      const { drawn, deck: newDeck, discard: finalDiscard } = drawCards(st2.deck, st2.discardPile, count + 1)
      s.setHand([...st2.hand, ...drawn])
      s.setDeck(newDeck)
      s.setDiscard(finalDiscard)
    }

    // Draw N then discard M from hand (played card still in hand during effect — exclude it)
    if (effect.draw_then_discard_hand) {
      const { draw: nDraw, discard: nDisc } = effect.draw_then_discard_hand
      const st0 = useRunStore.getState()
      const handSansPlayed = st0.hand.filter(id => id !== card.id)
      const { drawn, deck: d2, discard: dis2 } = drawCards(st0.deck, st0.discardPile, nDraw)
      let hand = [...handSansPlayed, ...drawn]
      const eligible = hand.filter(id => !st0.retainedCards.includes(id))
      const toDiscard = eligible.slice(0, nDisc)
      hand = hand.filter(id => !toDiscard.includes(id))
      let expanded = expandDiscardWithCurseDupes(dis2, toDiscard, cardMap)
      useRunStore.setState({ hand, deck: d2, discardPile: expanded })
      toDiscard.forEach((id) => {
        const c = cardMap[id]
        if (!c?.keywords?.includes(CARD_KEYWORD_IDS.INGENIOUS)) return
        if (ingeniousCallDepth >= 12) return
        ingeniousCallDepth++
        try {
          const st = useRunStore.getState()
          const hasChainBracelet = Array.isArray(st.relics) && st.relics.includes('chain_bracelet')
          const { bonusMultiplier: bm } = resolveChain(c.type, { chainActive: st.chainActive, chainType: st.chainType }, st, hasChainBracelet)
          applyCardEffect(c, bm, false, st, { fromDiscardIngenious: true })
        } finally {
          ingeniousCallDepth--
        }
      })
    }

    // v3: Exhaust for energy — movement handled in selectCard; here only bonus energy + SFX
    if (effect.exhaust_self_gain_energy && !fromDiscardIngenious) {
      s.gainBonusEnergy(effect.exhaust_self_gain_energy)
      playSFX('card_exhaust')
    }

  }

  const completeDiscardPickByIndex = useCallback((index) => {
    const s = useRunStore.getState()
    const pending = s.pendingDiscardPick
    if (!pending) return
    const pile = [...s.discardPile]
    if (index < 0 || index >= pile.length) return
    const picked = pile[index]
    pile.splice(index, 1)
    const { skillCardId, exhaustSelf } = pending
    const newHand = [...s.hand, picked]
    let exhaustPile = [...s.exhaustPile]
    let discardPile = pile
    if (exhaustSelf) {
      exhaustPile.push(skillCardId)
    } else {
      discardPile = expandDiscardWithCurseDupes(discardPile, [skillCardId], cardMap)
    }
    useRunStore.setState({
      hand: newHand,
      discardPile,
      exhaustPile,
      pendingDiscardPick: null,
    })
    if (exhaustSelf) playSFX('card_exhaust')
    playSFX('correct')
  }, [cardMap, playSFX])

  const completeHandExhaustEnergyPickByIndex = useCallback((index) => {
    const s = useRunStore.getState()
    if (!s.pendingHandExhaustEnergyPick) return
    const hand = [...s.hand]
    if (index < 0 || index >= hand.length) return
    const pickedId = hand[index]
    hand.splice(index, 1)
    const picked = cardMap[pickedId]
    const gain = picked?.energy_cost ?? 0
    const retained = (s.retainedCards || []).filter(id => id !== pickedId)
    useRunStore.getState().clearRetainGrowth(pickedId)
    useRunStore.setState({
      hand,
      exhaustPile: [...s.exhaustPile, pickedId],
      energy: s.energy + gain,
      retainedCards: retained,
      pendingHandExhaustEnergyPick: false,
    })
    playSFX('card_exhaust')
    playSFX('correct')
  }, [cardMap, playSFX])

  // ============================================================
  // WIN / LOSE
  // ============================================================
  const slotList = store.combatEnemySlots
  const isEnemyDefeated = store.inCombat && (
    slotList?.length > 0
      ? slotList.every(sl => sl.hp <= 0)
      : store.enemyHp <= 0
  )
  const isPlayerDefeated = store.hp <= 0

  return {
    // Data
    cardMap,
    activeCardId,
    animState,
    damageNumbers,

    // Computed
    isEnemyDefeated,
    isPlayerDefeated,

    // Actions
    drawHand,
    selectCard,
    getCard,
    completeDiscardPickByIndex,
    completeHandExhaustEnergyPickByIndex,
  }
}
