// data/relics.js — Full Relic Registry
// equippedRelics = active relics (cap MAX_EQUIPPED_RELICS) | vaultRelics = stored but inactive

export const RELIC_TIER = { STARTER: 'starter', COMMON: 'common', UNCOMMON: 'uncommon', RARE: 'rare', PANTHEON: 'pantheon' }

export const RELICS = {
  // ── STARTER ─────────────────────────────────────────────────────────
  cracked_hourglass: {
    id: 'cracked_hourglass',
    name: 'Cracked Hourglass',
    tier: RELIC_TIER.STARTER,
    icon: '⏳',
    color: '#a78bfa',
    description: 'When a play locks you out, add 1 extra lock counter. Gain 1 Energy at turn start.',
    flavor: 'No timer in the IDE — only the meter running somewhere you cannot see.',
  },
  fox_mask: {
    id: 'fox_mask',
    name: 'Noise-Cancelling Shell',
    tier: RELIC_TIER.STARTER,
    icon: '🎧',
    color: '#f97316',
    description: 'Start each fight with 10 Block.',
    flavor: 'First line of defense against open offices.',
  },
  lucky_coin: {
    id: 'lucky_coin',
    name: 'Lucky Coin',
    tier: RELIC_TIER.STARTER,
    icon: '🪙',
    color: '#facc15',
    description: 'Gain +15 Gold after every fight.',
    flavor: 'Someone spent their last token on coffee. You found the change.',
  },
  travelers_compass: {
    id: 'travelers_compass',
    name: 'Standup Compass',
    tier: RELIC_TIER.STARTER,
    icon: '🧭',
    color: '#34d399',
    description: 'Whenever you play your 3rd card in a turn, gain +1 Energy at the start of your next turn.',
    flavor: 'Every third update points to the next milestone.',
  },
  pager_rattle: {
    id: 'pager_rattle',
    name: 'Pager Rattle',
    tier: RELIC_TIER.STARTER,
    icon: '📟',
    color: '#94a3b8',
    description: 'Start each fight with +2 Block.',
    flavor: 'Vibration before the message — you already braced.',
  },
  brief_rain: {
    id: 'brief_rain',
    name: 'Brief Rain',
    tier: RELIC_TIER.STARTER,
    icon: '🌦️',
    color: '#38bdf8',
    description: 'At the start of each fight, gain 3 Gold.',
    flavor: 'Scope drizzle that still wets the roadmap.',
  },
  grid_snap_ruler: {
    id: 'grid_snap_ruler',
    name: 'Grid Snap Ruler',
    tier: RELIC_TIER.STARTER,
    icon: '📐',
    color: '#c084fc',
    description: 'On your first hand of each fight, draw 1 extra card.',
    flavor: 'Everything aligns to the baseline — once.',
  },
  syntax_stapler: {
    id: 'syntax_stapler',
    name: 'Syntax Stapler',
    tier: RELIC_TIER.STARTER,
    icon: '📎',
    color: '#fbbf24',
    description: 'On your first turn of each fight, gain +1 Energy.',
    flavor: 'Clips the loose line so the block compiles.',
  },
  handoff_marker: {
    id: 'handoff_marker',
    name: 'Handoff Marker',
    tier: RELIC_TIER.STARTER,
    icon: '🖍️',
    color: '#fb923c',
    description: 'At the start of each fight, heal 2 HP.',
    flavor: 'Someone circled the acceptance criteria in green.',
  },

  // ── COMMON ──────────────────────────────────────────────────────────
  chain_bracelet: {
    id: 'chain_bracelet',
    name: 'Workflow Bracelet',
    tier: RELIC_TIER.COMMON,
    icon: '🔗',
    color: '#60a5fa',
    description: 'Each turn, the second card you play gives you 6 Block (does not depend on card type).',
    flavor: 'Close the loop — then brace for the next handoff.',
  },
  pingback_pins: {
    id: 'pingback_pins',
    name: 'Pingback Pins',
    tier: RELIC_TIER.COMMON,
    icon: '📌',
    color: '#fb7185',
    description: 'Start each fight with 1 Reflect stack and 3 damage per stack. When an enemy attack deals HP loss, deal (stacks × damage per stack) back (each Swift Strike segment rolls separately). Cards can add stacks or damage per stack.',
    flavor: 'Every strike gets a read receipt.',
  },
  merchants_scale: {
    id: 'merchants_scale',
    name: 'Vendor Scorecard',
    tier: RELIC_TIER.COMMON,
    icon: '⚖️',
    color: '#fbbf24',
    description: 'Merchant card prices are 20% lower.',
    flavor: 'Better selection for the discerning buyer.',
  },
  sample_tray: {
    id: 'sample_tray',
    name: 'Sample Tray',
    tier: RELIC_TIER.COMMON,
    icon: '🧺',
    color: '#f472b6',
    description: 'Each shop visit: your first 3 card-offer refreshes cost 0 gold.',
    flavor: 'Try before you buy the sprint.',
  },
  newcomers_phrasebook: {
    id: 'newcomers_phrasebook',
    name: 'Onboarding Cheat Sheet',
    tier: RELIC_TIER.COMMON,
    icon: '📖',
    color: '#6ee7b7',
    description: 'First misplay each fight gives a free brief instead of locking the card.',
    flavor: 'Everyone ships a broken first build.',
  },
  returnees_old_notes: {
    id: 'returnees_old_notes',
    name: 'Runbook Margins',
    tier: RELIC_TIER.COMMON,
    icon: '📝',
    color: '#a3e635',
    description: 'Process cards auto-show their play hint when selected.',
    flavor: 'You scribbled this during the last outage.',
  },
  worn_dictionary: {
    id: 'worn_dictionary',
    name: 'Internal Wiki Tab',
    tier: RELIC_TIER.COMMON,
    icon: '📚',
    color: '#94a3b8',
    description: 'Once per fight, reveal the optimal line for a Ship-card check.',
    flavor: 'Dog-eared but still searchable.',
  },
  incident_buffer: {
    id: 'incident_buffer',
    name: 'Incident Buffer',
    tier: RELIC_TIER.COMMON,
    icon: '🦺',
    color: '#38bdf8',
    description: 'At the start of each turn, gain 3 Block.',
    flavor: 'Padding for when the pager goes off before standup ends.',
  },
  scope_creep_lapel: {
    id: 'scope_creep_lapel',
    name: 'Scope Creep Lapel',
    tier: RELIC_TIER.COMMON,
    icon: '📎',
    color: '#94a3b8',
    description: 'Enemy strikes deal 1 less damage (before Block).',
    flavor: 'Every slide adds a bullet; every bullet schedules another review.',
  },
  pr_template_sticker: {
    id: 'pr_template_sticker',
    name: 'PR Template Sticker',
    tier: RELIC_TIER.COMMON,
    icon: '🏷️',
    color: '#a78bfa',
    description: 'The first time you play an Offense, Defense, and Utility card each combat, gain 3 Block.',
    flavor: 'Three lanes, three checkboxes — ship it once per fight.',
  },
  water_cooler_charm: {
    id: 'water_cooler_charm',
    name: 'Water Cooler Charm',
    tier: RELIC_TIER.COMMON,
    icon: '🥤',
    color: '#6ee7b7',
    description: 'Heal 1 HP when you win a combat.',
    flavor: 'You debriefed by the cooler — gossip counts as recovery.',
  },

  // ── UNCOMMON ────────────────────────────────────────────────────────
  ink_stone: {
    id: 'ink_stone',
    name: 'Rubber-Duck Stone',
    tier: RELIC_TIER.UNCOMMON,
    icon: '🪨',
    color: '#818cf8',
    description: 'After playing 3 cards of the same type in one turn, draw 1 card.',
    flavor: 'Repetition fills the context window — then your hands remember how to type.',
  },
  bamboo_fan: {
    id: 'bamboo_fan',
    name: 'Focus Timer Fan',
    tier: RELIC_TIER.UNCOMMON,
    icon: '🪭',
    color: '#4ade80',
    description: 'Block does not expire at the start of your turn (persists until hit).',
    flavor: 'Deep work blocks incoming pings.',
  },
  red_envelope: {
    id: 'red_envelope',
    name: 'Spot-Bonus Envelope',
    tier: RELIC_TIER.UNCOMMON,
    icon: '🧧',
    color: '#f87171',
    description: 'At the start of each fight, gain 5 Gold.',
    flavor: 'A small blessing before the battle.',
  },
  sprint_icebox: {
    id: 'sprint_icebox',
    name: 'Sprint Icebox',
    tier: RELIC_TIER.UNCOMMON,
    icon: '🧊',
    color: '#7dd3fc',
    description: 'While not in combat, open your deck and park up to 2 cards in the Icebox. Parked cards are removed from your draw pool until you tap them to return.',
    flavor: '冲刺冰柜：本迭代先不上桌的两张票，解冻时再捞。',
  },
  blitz_clipboard: {
    id: 'blitz_clipboard',
    name: 'Blitz Clipboard',
    tier: RELIC_TIER.UNCOMMON,
    icon: '📋',
    color: '#f472b6',
    description: 'If you win within 5 player turns, gain an extra card reward (same draft rules as the first pick).',
    flavor: 'Merged before standup — scope for one more ticket.',
  },
  standup_applause: {
    id: 'standup_applause',
    name: 'Standup Applause',
    tier: RELIC_TIER.UNCOMMON,
    icon: '👏',
    color: '#fbbf24',
    description: 'Whenever you play your 4th card in a turn, draw 1 card.',
    flavor: 'Fourth update gets a round of Slack reactions — and one more card.',
  },

  // ── RARE ────────────────────────────────────────────────────────────
  pantheon_sigil: {
    id: 'pantheon_sigil',
    name: 'Exec Sponsor Sigil',
    tier: RELIC_TIER.RARE,
    icon: '🔱',
    color: '#fbbf24',
    description: 'Start the run with a free Blessing (no paired Curse required).',
    flavor: 'Leadership owes you air cover.',
  },
  scribes_seal: {
    id: 'scribes_seal',
    name: 'Zero-Incident Seal',
    tier: RELIC_TIER.RARE,
    icon: '🪬',
    color: '#c084fc',
    description: 'After winning a fight without taking damage, draw 2 extra cards next fight\'s first turn.',
    flavor: 'Clean postmortems deserve rewards.',
  },
  corner_office_keycard: {
    id: 'corner_office_keycard',
    name: 'Corner Office Keycard',
    tier: RELIC_TIER.RARE,
    icon: '🗝️',
    color: '#eab308',
    description: 'Start each combat with +2 Strength.',
    flavor: 'Title opens the door; numbers walk through.',
  },

  // ── NEW SLOT-SYSTEM RELICS ───────────────────────────────────────────
  resonance_stone: {
    id: 'resonance_stone',
    name: 'Cross-Functional Gem',
    tier: RELIC_TIER.RARE,
    icon: '💎',
    color: '#38bdf8',
    description: 'If your equipped relics cover Ship, Process, and Insight (across your loadout), all relic effects are amplified 20%.',
    flavor: 'Harmony between disciplines.',
  },
  the_empty_throne: {
    id: 'the_empty_throne',
    name: 'Headcount Freeze',
    tier: RELIC_TIER.RARE,
    icon: '🪑',
    color: '#6b7280',
    description: 'If one relic slot is intentionally left empty for an entire floor, gain +5 Max HP at floor end.',
    flavor: 'Restraint is its own power.',
  },
  scholars_left_hand: {
    id: 'scholars_left_hand',
    name: 'Process Owner (Left)',
    tier: RELIC_TIER.UNCOMMON,
    icon: '🫲',
    color: '#818cf8',
    description: 'Process cards cost 1 less Energy. (Pair with Process Owner (Right) for full effect.)',
    flavor: 'The left hand owns the checklist.',
    pair: 'scholars_right_hand',
  },
  scholars_right_hand: {
    id: 'scholars_right_hand',
    name: 'Process Owner (Right)',
    tier: RELIC_TIER.UNCOMMON,
    icon: '🫱',
    color: '#818cf8',
    description: 'Process cards deal bonus damage equal to their block value. (Pair with Process Owner (Left) for full effect.)',
    flavor: 'The right hand enforces SLAs.',
    pair: 'scholars_left_hand',
  },

  /** Programmer route only — see overloadMechanicsOnly */
  radiator_fin: {
    id: 'radiator_fin',
    name: 'Radiator Fin',
    tier: RELIC_TIER.COMMON,
    icon: '🧊',
    color: '#38bdf8',
    description: 'After each combat, reduce Global Overload by 2.',
    flavor: 'Attach to any sprint — bleed heat before it reaches prod.',
    overloadMechanicsOnly: true,
  },

  // ── PANTHEON ────────────────────────────────────────────────────────
  ancient_lexicon: {
    id: 'ancient_lexicon',
    name: 'Monolith Glossary',
    tier: RELIC_TIER.PANTHEON,
    icon: '📜',
    color: '#fde68a',
    description: 'All Ship-type cards deal +3 bonus damage.',
    flavor: 'Old service names still cut deep.',
  },
  memory_palace: {
    id: 'memory_palace',
    name: 'Postmortem Palace',
    tier: RELIC_TIER.PANTHEON,
    icon: '🏛️',
    color: '#fde68a',
    description: 'First-try successful plays heal 1 HP.',
    flavor: 'Your mind becomes the runbook.',
  },
}

/** Common / uncommon / rare relic not already in equipped or vault (for elite loot & merchant). */
export function pickRandomRelicForLoot(runState) {
  const owned = new Set([...(runState.relics || []), ...(runState.vaultRelics || [])])
  const programmer = runState?.campaign === 'japanese' && runState?.character?.id === 'kenji'
  const candidates = Object.keys(RELICS).filter((id) => {
    if (owned.has(id)) return false
    const def = RELICS[id]
    if (def?.overloadMechanicsOnly && !programmer) return false
    const t = def?.tier
    return t === RELIC_TIER.COMMON || t === RELIC_TIER.UNCOMMON || t === RELIC_TIER.RARE
  })
  if (!candidates.length) return null
  return candidates[Math.floor(Math.random() * candidates.length)]
}

/** Up to `count` distinct shop relic offers (common/uncommon/rare), excluding owned/vault and already-picked-for-this-shop ids. */
export function pickMerchantRelicOffers(runState, count = 4) {
  const owned = new Set([...(runState.relics || []), ...(runState.vaultRelics || [])])
  const exclude = new Set()
  const out = []
  for (let i = 0; i < count; i++) {
    const programmer = runState?.campaign === 'japanese' && runState?.character?.id === 'kenji'
    const candidates = Object.keys(RELICS).filter((id) => {
      if (owned.has(id) || exclude.has(id)) return false
      const def = RELICS[id]
      if (def?.overloadMechanicsOnly && !programmer) return false
      const tier = def?.tier
      return tier === RELIC_TIER.COMMON || tier === RELIC_TIER.UNCOMMON || tier === RELIC_TIER.RARE
    })
    if (!candidates.length) {
      out.push(null)
      continue
    }
    const id = candidates[Math.floor(Math.random() * candidates.length)]
    exclude.add(id)
    out.push(id)
  }
  return out
}

/** Random rare-tier relic not already owned (for high-risk event trades). Falls back to general loot if none left. */
export function pickRandomRareRelicForLoot(runState) {
  const owned = new Set([...(runState.relics || []), ...(runState.vaultRelics || [])])
  const programmer = runState?.campaign === 'japanese' && runState?.character?.id === 'kenji'
  const candidates = Object.keys(RELICS).filter((id) => {
    if (owned.has(id)) return false
    const def = RELICS[id]
    if (def?.overloadMechanicsOnly && !programmer) return false
    return def?.tier === RELIC_TIER.RARE
  })
  if (!candidates.length) return null
  return candidates[Math.floor(Math.random() * candidates.length)]
}

export const RELIC_IDS = Object.keys(RELICS)

export const MAX_EQUIPPED_RELICS = 4

/** Free merchant refreshes per visit when this relic is owned. */
export const SAMPLE_TRAY_RELIC_ID = 'sample_tray'
export const SAMPLE_TRAY_FREE_REROLLS = 3

// Tier display colors
export const RELIC_TIER_COLORS = {
  starter:  '#94a3b8',
  common:   '#e5e7eb',
  uncommon: '#818cf8',
  rare:     '#fbbf24',
  pantheon: '#fde68a',
}

export const RELIC_TIER_GLOW = {
  starter:  'none',
  common:   'none',
  uncommon: '0 0 10px rgba(129,140,248,0.5)',
  rare:     '0 0 14px rgba(251,191,36,0.6)',
  pantheon: '0 0 18px rgba(253,230,138,0.8)',
}
