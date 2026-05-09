/**
 * Rebalance programmer-route card data (`src/data/japanese/cards.json`, campaign id `japanese`) using sts2_database rough benchmarks:
 * - Strike ~6 @1, Defend ~5 @1, Bash ~8+vuln @2, Pommel ~9+draw @1, Uppercut ~13+debuffs @2
 * Our cards also use bonus_correct_first_try — tone down stacking power creep.
 *
 * Run: node scripts/rebalance-japanese-cards-from-sts.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CARDS_PATH = path.join(__dirname, '../src/data/japanese/cards.json')

function tuneBonusFirstTry(card, e) {
  if (typeof e.bonus_correct_first_try !== 'number') return
  let b = e.bonus_correct_first_try
  if (b >= 6) b = 5
  else if (b >= 4) b -= 1
  const cap = card.rarity === 'rare' ? 5 : card.rarity === 'uncommon' ? 5 : 4
  e.bonus_correct_first_try = Math.max(2, Math.min(b, cap))
}

function tuneDamage(card, e) {
  if (typeof e.damage !== 'number') return
  const cost = card.energy_cost ?? 1
  let d = e.damage
  const hasDraw = (e.draw ?? 0) > 0
  const hybridBlock = typeof e.block === 'number' && e.block > 0

  if (cost === 0) {
    if (d >= 12) d -= 3
    else if (d >= 10) d -= 2
  } else if (cost === 1) {
    if (hasDraw) {
      if (d > 9) d = 9 // Pommel Strike tier
    } else if (hybridBlock) {
      if (d >= 12) d -= 2
      if (d >= 11) d -= 1
    } else {
      if (d >= 14) d = 10
      else if (d >= 12) d = 9
      else if (d >= 11) d = 9
    }
  } else if (cost === 2) {
    if (d >= 18) d = 14
    else if (d >= 16) d = 13
    else if (d >= 15) d = 12
    else if (d >= 14) d = 11
  } else if (cost >= 3) {
    if (d >= 22) d -= 4
    else if (d >= 18) d -= 3
  }
  e.damage = Math.max(0, d)
}

function tuneDamageAll(card, e) {
  if (typeof e.damage_all !== 'number') return
  const cost = card.energy_cost ?? 1
  let d = e.damage_all
  if (cost <= 1) {
    if (d > 8) d = 8
  } else if (cost === 2) {
    if (d >= 10) d -= 2
    else if (d === 9) d = 8
  }
  e.damage_all = Math.max(0, d)
}

function tuneBlock(card, e) {
  if (typeof e.block !== 'number') return
  const cost = card.energy_cost ?? 1
  let b = e.block
  const hybridDmg = typeof e.damage === 'number' && e.damage > 0

  if (cost === 0) {
    if (b > 10) b -= 2
  } else if (cost === 1 && !hybridDmg) {
    if (b > 10) b = 10
  } else if (cost === 2) {
    if (b > 16) b -= 2
    if (b > 14 && card.rarity === 'common') b = Math.min(b, 14)
  } else if (cost >= 3) {
    if (b > 20) b -= 2
  }
  e.block = Math.max(0, b)
}

function tuneChain(e) {
  if (typeof e.chain_bonus === 'number' && e.chain_bonus >= 4) {
    e.chain_bonus -= 1
  }
}

function tuneOverloadExtras(e) {
  if (typeof e.overload_global_add === 'number' && e.overload_global_add >= 4) {
    e.overload_global_add = 3
  }
  if (typeof e.overload_scaling_cap === 'number' && e.overload_scaling_cap > 12) {
    e.overload_scaling_cap = Math.min(e.overload_scaling_cap, 12)
  }
}

function main() {
  const raw = fs.readFileSync(CARDS_PATH, 'utf8')
  const cards = JSON.parse(raw)

  for (const card of cards) {
    const e = card.effect
    if (!e || typeof e !== 'object') continue

    tuneBonusFirstTry(card, e)
    tuneDamage(card, e)
    tuneDamageAll(card, e)
    tuneBlock(card, e)
    tuneChain(e)
    tuneOverloadExtras(e)
  }

  fs.writeFileSync(CARDS_PATH, JSON.stringify(cards, null, 2) + '\n', 'utf8')
  console.log('Wrote tuned cards:', CARDS_PATH)
}

main()
