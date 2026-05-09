#!/usr/bin/env node
/**
 * Reads src/data/{japanese,korean,spanish}/cards.json and writes:
 *   docs/cards-catalog-export.json
 *   docs/cards-reference.md
 */
import { readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const OUT_JSON = join(ROOT, 'docs/cards-catalog-export.json')
const OUT_MD = join(ROOT, 'docs/cards-reference.md')

const CAMPAIGNS = ['japanese', 'korean', 'spanish']

function loadCards(path) {
  const raw = JSON.parse(readFileSync(path, 'utf8'))
  return Array.isArray(raw) ? raw : raw?.default ?? []
}

function fmtLines(card, lang, growthStacks = 0) {
  const t = lang === 'zh' ? ZH : EN
  const e = card?.effect || {}
  const parts = []

  if (e.damage != null && e.damage_all == null) {
    let bonus = ''
    const ft = e.bonus_correct_first_try || e.bonus_correct_no_hint
    if (ft) bonus += t.effectDamageFirstTry({ n: ft })
    if (e.hits > 1) bonus += t.effectDamageMultiHit({ count: e.hits })
    if (e.damage_target === 'random') {
      parts.push(t.effectDealDamageRandom({ value: e.damage, bonus }))
    } else {
      parts.push(t.effectDealDamage({ value: e.damage, bonus }))
    }
  }

  if (e.damage_all != null) {
    let bonus = ''
    const ft = e.bonus_correct_first_try || e.bonus_correct_no_hint
    if (ft) bonus += t.effectDamageFirstTry({ n: ft })
    if (e.hits > 1) bonus += t.effectDamageMultiHit({ count: e.hits })
    parts.push(t.effectDealDamageAll({ value: e.damage_all, bonus }))
  }

  if (e.block) {
    const grownBlock = e.block + growthStacks * 4
    const growthNote =
      growthStacks > 0 ? t.effectGainBlockGrowth({ turns: growthStacks }) : ''
    parts.push(t.effectGainBlockLine({ value: grownBlock, growth: growthNote }))
  }

  if (e.heal) parts.push(t.effectHeal({ value: e.heal }))

  if (e.draw) {
    const key = e.draw > 1 ? 'effectDraw_other' : 'effectDraw_one'
    parts.push(t[key]({ count: e.draw }))
  }

  if (e.stun) parts.push(t.effectStun({ turns: e.stun }))
  if (e.chain_bonus) parts.push(t.effectChain({ value: e.chain_bonus }))
  if (e.next_hit_damage_bonus) parts.push(t.effectNextHitDamage({ value: e.next_hit_damage_bonus }))
  if (e.bonus_if_block_active) parts.push(t.effectBonusIfBlock({ value: e.bonus_if_block_active }))
  if (e.discard_draw) {
    parts.push(t.effectDiscardDraw({ discard: e.discard_draw, draw: e.discard_draw + 1 }))
  }
  if (e.duplicate_self_when_discarded) parts.push(t.effectDuplicateWhenDiscarded())
  if (e.draw_then_discard_hand) {
    const { draw: dr, discard: di } = e.draw_then_discard_hand
    parts.push(t.effectDrawThenDiscardHand({ draw: dr, discard: di }))
  }
  if (e.pick_from_discard_to_hand) {
    parts.push(e.exhaust_self ? t.effectPickFromDiscardExhaust() : t.effectPickFromDiscardRetain())
  }
  if (e.exhaust_one_hand_gain_its_energy) parts.push(t.effectExhaustHandGainEnergy())
  if (e.exhaust_self_gain_energy) parts.push(t.effectExhaustEnergy({ energy: e.exhaust_self_gain_energy }))
  if (e.retain) parts.push(t.effectRetain())
  if (e.reflect_stacks) parts.push(t.effectReflectStacks({ value: e.reflect_stacks }))
  if (e.reflect_damage) parts.push(t.effectReflectDamage({ value: e.reflect_damage }))

  if (e.enemy_vulnerable_all != null) {
    parts.push(t.effectEnemyVulnerableAll({ n: e.enemy_vulnerable_all }))
  } else if (e.enemy_vulnerable != null) {
    parts.push(t.effectEnemyVulnerable({ n: e.enemy_vulnerable }))
  }
  if (e.enemy_weak_all != null) {
    parts.push(t.effectEnemyWeakAll({ n: e.enemy_weak_all }))
  } else if (e.enemy_weak != null) {
    parts.push(t.effectEnemyWeak({ n: e.enemy_weak }))
  }
  if (e.enemy_poison_all != null) {
    parts.push(t.effectEnemyPoisonAll({ n: e.enemy_poison_all }))
  } else if (e.enemy_poison != null) {
    parts.push(t.effectEnemyPoison({ n: e.enemy_poison }))
  }

  if (e.player_strength) parts.push(t.effectPlayerStrength({ n: e.player_strength }))

  return parts.length ? parts.join(' ') : t.effectSpecial()
}

/** Minimal template helpers (aligned with src/i18n zh + en draft.*) */
const EN = {
  effectDealDamage: ({ value, bonus }) => `Deal ${value} damage${bonus || ''}`,
  effectDealDamageAll: ({ value, bonus }) => `Deal ${value} damage to ALL enemies${bonus || ''}`,
  effectDealDamageRandom: ({ value, bonus }) => `Deal ${value} damage to a RANDOM enemy${bonus || ''}`,
  effectDamageFirstTry: ({ n }) => `, +${n} if first try`,
  effectDamageMultiHit: ({ count }) => ` (×${count} hits)`,
  effectGainBlockLine: ({ value, growth }) => `Gain ${value} Block${growth || ''}`,
  effectGainBlockGrowth: ({ turns }) => ` (retain ×${turns})`,
  effectHeal: ({ value }) => `Heal ${value} HP`,
  effectDraw_one: ({ count }) => `Draw ${count} card`,
  effectDraw_other: ({ count }) => `Draw ${count} cards`,
  effectChain: ({ value }) => `Chain: +${value}`,
  effectReflectStacks: ({ value }) => `+${value} Reflect stack(s) this fight`,
  effectReflectDamage: ({ value }) => `+${value} Reflect damage per stack this fight`,
  effectStun: ({ turns }) => `Stun ${turns} turn(s).`,
  effectNextHitDamage: ({ value }) => `Next damage card this fight +${value}.`,
  effectBonusIfBlock: ({ value }) => `+${value} if Block active.`,
  effectDiscardDraw: ({ discard, draw }) => `Discard ${discard}, draw ${draw}.`,
  effectDuplicateWhenDiscarded: () =>
    'When discarded (not Exhaust): add a copy to Discard.',
  effectDrawThenDiscardHand: ({ draw, discard }) =>
    `Draw ${draw}. Discard ${discard} card(s) from your hand.`,
  effectPickFromDiscardExhaust: () => 'Return 1 card from Discard to your hand. Exhaust.',
  effectPickFromDiscardRetain: () => 'Return 1 card from Discard to your hand.',
  effectExhaustHandGainEnergy: () =>
    'Exhaust 1 card from your hand. Gain Energy equal to its cost.',
  effectExhaustEnergy: ({ energy }) => `Exhaust: +${energy} Energy.`,
  effectRetain: () => 'Retain: +4 Block each turn held.',
  effectEnemyVulnerable: ({ n }) =>
    `Vulnerable ${n} turns (takes +50% damage) — one target`,
  effectEnemyVulnerableAll: ({ n }) => `ALL enemies: Vulnerable ${n} turns`,
  effectEnemyWeak: ({ n }) => `Weak ${n} turns (deals less damage) — one target`,
  effectEnemyWeakAll: ({ n }) => `ALL enemies: Weak ${n} turns`,
  effectEnemyPoison: ({ n }) =>
    `Poison +${n} (HP each turn, then −1 stack) — one target`,
  effectEnemyPoisonAll: ({ n }) => `ALL enemies: Poison +${n}`,
  effectPlayerStrength: ({ n }) =>
    `Gain ${n} Strength (+${n} damage per hit on attacks this combat)`,
  effectSpecial: () => 'Special effect.',
}

const ZH = {
  effectDealDamage: ({ value, bonus }) => `造成 ${value} 点伤害${bonus || ''}`,
  effectDealDamageAll: ({ value, bonus }) => `对所有敌人造成 ${value} 点伤害${bonus || ''}`,
  effectDealDamageRandom: ({ value, bonus }) => `对随机一名敌人造成 ${value} 点伤害${bonus || ''}`,
  effectDamageFirstTry: ({ n }) => `，首打 +${n}`,
  effectDamageMultiHit: ({ count }) => `（${count} 段）`,
  effectGainBlockLine: ({ value, growth }) => `获得 ${value} 点格挡${growth || ''}`,
  effectGainBlockGrowth: ({ turns }) => `（已保留 ${turns} 回合）`,
  effectHeal: ({ value }) => `恢复 ${value} 点生命`,
  effectDraw_one: ({ count }) => `抽 ${count} 张牌`,
  effectDraw_other: ({ count }) => `抽 ${count} 张牌`,
  effectChain: ({ value }) => `连携：+${value}`,
  effectReflectStacks: ({ value }) => `本场战斗反伤次数 +${value}`,
  effectReflectDamage: ({ value }) => `本场战斗每层反伤伤害 +${value}`,
  effectStun: ({ turns }) => `眩晕 ${turns} 回合。`,
  effectNextHitDamage: ({ value }) => `本场下一张伤害牌 +${value}。`,
  effectBonusIfBlock: ({ value }) => `有格挡时额外 +${value}。`,
  effectDiscardDraw: ({ discard, draw }) => `弃 ${discard} 张，抽 ${draw} 张。`,
  effectDuplicateWhenDiscarded: () =>
    '未被消耗并进入弃牌堆时：复制一张加入弃牌堆。',
  effectDrawThenDiscardHand: ({ draw, discard }) =>
    `抽 ${draw} 张；将 ${discard} 张手牌置入弃牌堆。`,
  effectPickFromDiscardExhaust: () => '从弃牌堆将 1 张牌收回手牌。消耗。',
  effectPickFromDiscardRetain: () => '从弃牌堆将 1 张牌收回手牌。',
  effectExhaustHandGainEnergy: () => '消耗 1 张手牌。获得等同于该牌消耗能量的能量。',
  effectExhaustEnergy: ({ energy }) => `消耗：获得 ${energy} 点能量。`,
  effectRetain: () => '保留：每多保留一回合，格挡 +4。',
  effectEnemyVulnerable: ({ n }) => `易伤 ${n} 回合（受到的伤害 +50%）— 单体`,
  effectEnemyVulnerableAll: ({ n }) => `全体易伤 ${n} 回合`,
  effectEnemyWeak: ({ n }) => `虚弱 ${n} 回合（造成的攻击伤害降低）— 单体`,
  effectEnemyWeakAll: ({ n }) => `全体虚弱 ${n} 回合`,
  effectEnemyPoison: ({ n }) =>
    `中毒 +${n}（每回合开始时受伤，再 −1 层）— 单体`,
  effectEnemyPoisonAll: ({ n }) => `全体中毒 +${n} 层`,
  effectPlayerStrength: ({ n }) =>
    `获得 ${n} 点力量（本场战斗中攻击牌每段伤害 +${n}）`,
  effectSpecial: () => '特殊效果。',
}

function statsFor(cards) {
  const byType = {}
  const byRarity = {}
  const byEnergy = {}
  for (const c of cards) {
    byType[c.type] = (byType[c.type] || 0) + 1
    byRarity[c.rarity] = (byRarity[c.rarity] || 0) + 1
    const ec = c.energy_cost ?? '?'
    byEnergy[String(ec)] = (byEnergy[String(ec)] || 0) + 1
  }
  return { byType, byRarity, byEnergy }
}

function main() {
  const all = []
  const byCampaign = {}

  for (const camp of CAMPAIGNS) {
    const path = join(ROOT, 'src/data', camp, 'cards.json')
    const list = loadCards(path)
    byCampaign[camp] = list.length
    for (const card of list) {
      const row = {
        id: card.id,
        campaign: card.campaign ?? camp,
        name_target: card.name_target ?? '',
        name_native: card.name_native ?? '',
        type: card.type ?? '',
        rarity: card.rarity ?? '',
        energy_cost: card.energy_cost ?? 0,
        effect: card.effect ?? {},
        effect_summary_zh: fmtLines(card, 'zh'),
        effect_summary_en: fmtLines(card, 'en'),
        flavor_target: card.flavor_target ?? '',
        flavor_native: card.flavor_native ?? '',
        illustration: card.illustration ?? '',
        upgradeable: Boolean(card.upgradeable),
        upgraded_id: card.upgraded_id ?? null,
        question_tags: Array.isArray(card.question_tags) ? card.question_tags : [],
        keywords: Array.isArray(card.keywords) ? card.keywords : [],
      }
      all.push(row)
    }
  }

  const payload = {
    meta: {
      generatedAt: new Date().toISOString(),
      description:
        'Auto-export of card definitions + plain-language effect summaries (mirrors draft UI strings).',
      sources: CAMPAIGNS.map((c) => `src/data/${c}/cards.json`),
    },
    stats: {
      total: all.length,
      byCampaign,
      overall: statsFor(all),
    },
    cards: all.sort((a, b) =>
      a.campaign.localeCompare(b.campaign) || a.id.localeCompare(b.id),
    ),
  }

  writeFileSync(OUT_JSON, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')

  const md = [`# 卡牌参考（自动生成）`, ``]

  md.push(`> 生成时间：${payload.meta.generatedAt}`)
  md.push(`> 机器可读完整数据：**[cards-catalog-export.json](./cards-catalog-export.json)**`)
  md.push(``)
  md.push(`## 总览`)
  md.push(``)
  md.push(`| 指标 | 数量 |`)
  md.push(`|------|------|`)
  md.push(`| 卡牌总数 | ${payload.stats.total} |`)
  for (const [k, v] of Object.entries(byCampaign)) {
    md.push(`| ${k} | ${v} |`)
  }
  md.push(``)
  md.push(`### 全体：类型 / 稀有度 / 费用`)
  md.push(``)
  md.push(`**类型** ${JSON.stringify(payload.stats.overall.byType)}`)
  md.push(``)
  md.push(`**稀有度** ${JSON.stringify(payload.stats.overall.byRarity)}`)
  md.push(``)
  md.push(`**费用** ${JSON.stringify(payload.stats.overall.byEnergy)}`)
  md.push(``)
  md.push(`## JSON 字段说明`)
  md.push(``)
  md.push(
    [
      ``,
      `| 字段 | 含义 |`,
      `|------|------|`,
      `| \`id\` | 卡牌唯一 ID |`,
      `| \`campaign\` | 战役（语言包） |`,
      `| \`name_target\` / \`name_native\` | 目标语名称 / 本地化名（多为英文） |`,
      `| \`type\` | \`vocabulary\` / \`grammar\` / \`reading\` / \`curse\` |`,
      `| \`rarity\` | \`common\` / \`uncommon\` / \`rare\` / … |`,
      `| \`energy_cost\` | 能量消耗 |`,
      `| \`effect\` | 原始技能对象（与战斗逻辑一致） |`,
      `| \`effect_summary_zh\` / \`effect_summary_en\` | 与卡牌界面草稿描述一致的效果摘要 |`,
      `| \`flavor_target\` / \`flavor_native\` | 风味文本 |`,
      `| \`upgradeable\` / \`upgraded_id\` | 是否可升级 / 升级后 ID |`,
      `| \`question_tags\` | 题库标签（若有） |`,
      `| \`keywords\` | 关键词（如「奇巧」） |`,
      ``,
    ].join('\n'),
  )
  md.push(`## 清单（按战役）`)
  md.push(``)

  for (const camp of CAMPAIGNS) {
    const subset = payload.cards.filter((c) => c.campaign === camp)
    md.push(`### ${camp}（${subset.length}）`)
    md.push(``)
    md.push(`| id | 名称（目标语） | 类型 | 稀有 | 费 | 中文效果摘要 |`)
    md.push(`|----|----------------|------|------|-----|----------------|`)
    for (const c of subset) {
      const name = (c.name_target || '').replace(/\|/g, '\\|')
      const summ = (c.effect_summary_zh || '').replace(/\|/g, '\\|').slice(0, 80)
      md.push(
        `| \`${c.id}\` | ${name} | ${c.type} | ${c.rarity} | ${c.energy_cost} | ${summ}${summ.length >= 80 ? '…' : ''} |`,
      )
    }
    md.push(``)
  }

  writeFileSync(OUT_MD, md.join('\n'), 'utf8')

  console.log(`Wrote ${OUT_JSON}`)
  console.log(`Wrote ${OUT_MD}`)
}

main()
