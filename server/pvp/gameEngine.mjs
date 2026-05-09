/**
 * Authoritative 1v1 PvP state machine (prototype).
 * Rules are a subset of the single-player card JSON — see resolveEffect().
 */
import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import {
  VULNERABLE_DAMAGE_MULT,
  WEAK_OUTGOING_MULT,
  PVP_START_HP,
  PVP_MAX_ENERGY,
  PVP_HAND_SIZE,
} from './constants.mjs'
import { shuffle, drawCards } from './deck.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_ROOT = join(__dirname, '../../src/data')

let CARD_MAP = {}
for (const camp of ['japanese', 'korean', 'spanish']) {
  try {
    const p = join(DATA_ROOT, camp, 'cards.json')
    const raw = JSON.parse(readFileSync(p, 'utf8'))
    const list = Array.isArray(raw) ? raw : raw?.default
    if (!Array.isArray(list)) continue
    for (const c of list) CARD_MAP[c.id] = c
  } catch (e) {
    console.warn(`[pvp] Could not load ${camp}/cards.json:`, e.message)
  }
}

/** Starter deck — mirrors getStarterIdsForCharacter(japanese, 'kenji') */
const DEFAULT_DECK_IDS = [
  'jp_vocab_strike',
  'jp_vocab_strike',
  'jp_vocab_wild_slash',
  'jp_vocab_swift_strike',
  'jp_gram_ward',
  'jp_gram_ward',
  'jp_gram_particle_shield',
  'jp_job_dev_stack_push',
  'jp_job_dev_rubber_duck',
]

const PVP_DECK_MIN = 5
const PVP_DECK_MAX = 50

/**
 * @param {unknown} raw
 * @returns {string[]}
 */
export function normalizePvpDeckIds(raw) {
  const list = Array.isArray(raw) ? raw : []
  const known = list.filter((id) => typeof id === 'string' && CARD_MAP[id])
  if (known.length < PVP_DECK_MIN) return [...DEFAULT_DECK_IDS]
  return known.slice(0, PVP_DECK_MAX)
}

function emptyPlayer() {
  return {
    hp: PVP_START_HP,
    maxHp: PVP_START_HP,
    block: 0,
    energy: PVP_MAX_ENERGY,
    maxEnergy: PVP_MAX_ENERGY,
    hand: [],
    deck: [],
    discard: [],
    exhaust: [],
    strength: 0,
    vulnerableTurns: 0,
    weakTurns: 0,
    poisonStacks: 0,
  }
}

function applyIncomingDamage(defender, amount) {
  let dmg = Math.max(0, Math.floor(Number(amount) || 0))
  if ((defender.vulnerableTurns ?? 0) > 0) {
    dmg = Math.floor(dmg * VULNERABLE_DAMAGE_MULT)
  }
  let blocked = Math.min(defender.block || 0, dmg)
  defender.block -= blocked
  const hpLoss = dmg - blocked
  defender.hp = Math.max(0, defender.hp - hpLoss)
}

function clonePlayerPublic(p, hideHand) {
  const base = {
    hp: p.hp,
    maxHp: p.maxHp,
    block: p.block,
    energy: p.energy,
    maxEnergy: p.maxEnergy,
    handCount: p.hand.length,
    deckCount: p.deck.length,
    discardCount: p.discard.length,
    exhaustCount: p.exhaust.length,
    strength: p.strength,
    vulnerableTurns: p.vulnerableTurns,
    weakTurns: p.weakTurns,
    poisonStacks: p.poisonStacks,
  }
  if (!hideHand) {
    base.hand = [...p.hand]
    base.deck = [...p.deck]
    base.discard = [...p.discard]
    base.exhaust = [...p.exhaust]
  }
  return base
}

/**
 * Poison ticks on opponent at start of active player's turn; vulnerable decays on opponent.
 */
function tickOpponentForTurnStart(activeIdx, players, log) {
  const oppIdx = 1 - activeIdx
  const opp = players[oppIdx]
  if (opp.poisonStacks > 0) {
    const raw = opp.poisonStacks
    let blocked = Math.min(opp.block || 0, raw)
    opp.block -= blocked
    const hpLoss = raw - blocked
    opp.hp = Math.max(0, opp.hp - hpLoss)
    opp.poisonStacks = Math.max(0, opp.poisonStacks - 1)
    log.push({ type: 'poison_tick', target: oppIdx, amount: raw })
  }
  if (opp.vulnerableTurns > 0) {
    opp.vulnerableTurns -= 1
  }
}

function decayWeakAtEndTurn(playerIdx, players, log) {
  const p = players[playerIdx]
  if ((p.weakTurns ?? 0) > 0) {
    p.weakTurns -= 1
    log.push({ type: 'weak_decay', player: playerIdx })
  }
}

function resolveEffect(effect, actor, target, actorIdx, log, ctx) {
  if (!effect) return

  const hits = effect.hits || 1
  const weakMult = (actor.weakTurns ?? 0) > 0 ? WEAK_OUTGOING_MULT : 1

  const dealSingleTarget = (baseCore) => {
    let dmg = Math.max(0, Math.floor(baseCore))
    dmg += (actor.strength || 0) * hits
    dmg = Math.floor(dmg * weakMult)
    applyIncomingDamage(target, dmg)
    log.push({ type: 'damage', from: actorIdx, to: 1 - actorIdx, amount: dmg })
  }

  if (effect.damage != null && effect.damage_all == null) {
    const perHit = effect.damage || 0
    let core = perHit * hits
    if (typeof effect.chain_bonus === 'number') core += effect.chain_bonus
    dealSingleTarget(core)
  } else if (effect.damage_all != null) {
    const perHit = effect.damage_all || 0
    let core = perHit * hits
    if (typeof effect.chain_bonus === 'number') core += effect.chain_bonus
    dealSingleTarget(core)
  }

  if (effect.block) {
    let b = effect.block
    if (typeof effect.chain_bonus === 'number' && effect.damage == null) b += effect.chain_bonus
    actor.block = (actor.block || 0) + b
    log.push({ type: 'block', player: actorIdx, amount: b })
  }

  if (effect.heal) {
    actor.hp = Math.min(actor.maxHp, actor.hp + effect.heal)
    log.push({ type: 'heal', player: actorIdx, amount: effect.heal })
  }

  if (effect.draw) {
    const { drawn, deck: d2, discard: dis2 } = drawCards(actor.deck, actor.discard, effect.draw)
    actor.deck = d2
    actor.discard = dis2
    actor.hand.push(...drawn)
    log.push({ type: 'draw', player: actorIdx, n: drawn.length })
  }

  if (effect.player_strength) {
    actor.strength = (actor.strength || 0) + effect.player_strength
    log.push({ type: 'strength', player: actorIdx, add: effect.player_strength })
  }

  if (effect.enemy_weak != null) {
    target.weakTurns = (target.weakTurns || 0) + effect.enemy_weak
    log.push({ type: 'apply_weak', target: 1 - actorIdx, stacks: effect.enemy_weak })
  }
  if (effect.enemy_vulnerable != null) {
    target.vulnerableTurns = (target.vulnerableTurns || 0) + effect.enemy_vulnerable
    log.push({ type: 'apply_vulnerable', target: 1 - actorIdx, stacks: effect.enemy_vulnerable })
  }
  if (effect.enemy_poison != null) {
    target.poisonStacks = (target.poisonStacks || 0) + effect.enemy_poison
    log.push({ type: 'apply_poison', target: 1 - actorIdx, stacks: effect.enemy_poison })
  }

  if (effect.discard_draw) {
    const hand = actor.hand
    const count = Math.min(effect.discard_draw, hand.length)
    const toDiscard = hand.slice(0, count)
    actor.discard.push(...toDiscard)
    const remaining = hand.slice(count)
    const { drawn, deck: d3, discard: dis3 } = drawCards(actor.deck, actor.discard, count + 1)
    actor.deck = d3
    actor.discard = dis3
    actor.hand = [...remaining, ...drawn]
    log.push({ type: 'discard_draw', player: actorIdx, discarded: count, drawn: drawn.length })
  }

  if (effect.exhaust_self_gain_energy && !ctx.skipExhaustEnergy) {
    actor.energy += effect.exhaust_self_gain_energy
    log.push({ type: 'gain_energy', player: actorIdx, amount: effect.exhaust_self_gain_energy })
  }
}

export function createInitialGame(deckIdsP0 = DEFAULT_DECK_IDS, deckIdsP1 = DEFAULT_DECK_IDS) {
  const d0 = normalizePvpDeckIds(deckIdsP0)
  const d1 = normalizePvpDeckIds(deckIdsP1)
  const players = [emptyPlayer(), emptyPlayer()]
  players[0].deck = shuffle([...d0])
  players[1].deck = shuffle([...d1])
  for (let i = 0; i < 2; i++) {
    players[i].energy = PVP_MAX_ENERGY
  }
  // Only player 0 draws their opening hand; player 1 draws at the start of their first turn (after P0 ends).
  const p0 = players[0]
  const draw0 = drawCards(p0.deck, [], PVP_HAND_SIZE)
  p0.deck = draw0.deck
  p0.discard = draw0.discard
  p0.hand = draw0.drawn
  return {
    phase: 'playing',
    turn: 0,
    players,
    log: [{ type: 'game_start' }],
    winner: null,
  }
}

export function buildPublicState(game, viewerSlot) {
  const opp = 1 - viewerSlot
  return {
    phase: game.phase,
    turn: game.turn,
    yourSlot: viewerSlot,
    you: clonePlayerPublic(game.players[viewerSlot], false),
    opponent: clonePlayerPublic(game.players[opp], true),
    winner: game.winner,
    logTail: game.log.slice(-12),
  }
}

export function playCard(game, slot, handIndex) {
  const log = game.log
  if (game.phase !== 'playing' || game.winner != null) {
    return { ok: false, error: 'game_not_active' }
  }
  if (game.turn !== slot) {
    return { ok: false, error: 'not_your_turn' }
  }
  const actor = game.players[slot]
  const target = game.players[1 - slot]
  if (handIndex < 0 || handIndex >= actor.hand.length) {
    return { ok: false, error: 'bad_hand_index' }
  }

  const cardId = actor.hand[handIndex]
  const card = CARD_MAP[cardId]
  if (!card) return { ok: false, error: 'unknown_card' }

  const cost = card.energy_cost ?? 1
  if ((actor.energy || 0) < cost) {
    return { ok: false, error: 'not_enough_energy' }
  }

  actor.energy -= cost

  const newHand = actor.hand.filter((_, i) => i !== handIndex)
  actor.hand = newHand

  const effect = card.effect || {}

  const exhaust = Boolean(effect.exhaust_self || effect.exhaust_self_gain_energy)
  if (!exhaust) {
    actor.discard.push(cardId)
  } else {
    actor.exhaust.push(cardId)
  }

  const ctx = { skipExhaustEnergy: false }

  resolveEffect(effect, actor, target, slot, log, ctx)

  if (target.hp <= 0) {
    game.phase = 'ended'
    game.winner = slot
    log.push({ type: 'win', winner: slot })
  } else if (actor.hp <= 0) {
    game.phase = 'ended'
    game.winner = 1 - slot
    log.push({ type: 'win', winner: 1 - slot })
  }

  log.push({ type: 'play_card', slot, cardId })
  return { ok: true }
}

export function endTurn(game, slot) {
  const log = game.log
  if (game.phase !== 'playing' || game.winner != null) {
    return { ok: false, error: 'game_not_active' }
  }
  if (game.turn !== slot) {
    return { ok: false, error: 'not_your_turn' }
  }

  const actor = game.players[slot]
  decayWeakAtEndTurn(slot, game.players, log)

  actor.discard.push(...actor.hand)
  actor.hand = []

  game.turn = 1 - slot
  const next = game.players[game.turn]

  tickOpponentForTurnStart(game.turn, game.players, log)

  next.block = 0
  next.energy = next.maxEnergy

  const need = PVP_HAND_SIZE
  const { drawn, deck: d2, discard: dis2 } = drawCards(next.deck, next.discard, need)
  next.deck = d2
  next.discard = dis2
  next.hand = drawn

  log.push({ type: 'end_turn', from: slot, next: game.turn })

  return { ok: true }
}

export function getCardMap() {
  return CARD_MAP
}
