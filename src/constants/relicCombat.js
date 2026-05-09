// Tunables for relic-driven combat math (single source of truth)

/** Blitz Clipboard: bonus card loot when `turnNumber <= this` at victory */
export const BLITZ_CLIPBOARD_MAX_TURNS = 5

/** Incident Buffer: Block gained at each player turn start */
export const INCIDENT_BUFFER_BLOCK = 3

/** Workflow Bracelet (chain_bracelet): Block when you play your 2nd card in a turn — no card-type dependency */
export const WORKFLOW_BRACELET_BLOCK_ON_SECOND_PLAY = 6

/** Pingback Pins relic id (runStore / enemyTurn) */
export const PINGBACK_PINS_RELIC_ID = 'pingback_pins'

/** Base reflect damage **per stack** when Pingback Pins is equipped (total = stacks × per) */
export const PINGBACK_PINS_DAMAGE_PER_STACK = 3

/** Scope Creep Lapel: subtract from raw enemy strike damage before block */
export const SCOPE_CREEP_ATTACK_REDUCTION = 1

/** Monolith Glossary (pantheon): bonus damage on Ship / vocabulary attack cards */
export const ANCIENT_LEXICON_SHIP_BONUS = 3

/** PR Template Sticker: Block when first card of each lane type is played per combat */
export const PR_TEMPLATE_FIRST_TYPE_BLOCK = 3

/** Zero-Incident Seal: extra cards drawn on first hand of next combat after flawless fight */
export const SCRIBES_SEAL_BONUS_DRAW_NEXT_FIGHT = 2
