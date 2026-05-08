// Tunables for relic-driven combat math (single source of truth)

/** Blitz Clipboard: bonus card loot when `turnNumber <= this` at victory */
export const BLITZ_CLIPBOARD_MAX_TURNS = 5

/** Incident Buffer: Block gained at each player turn start */
export const INCIDENT_BUFFER_BLOCK = 3

/** Pingback Pins relic id (runStore / enemyTurn) */
export const PINGBACK_PINS_RELIC_ID = 'pingback_pins'

/** Base reflect damage **per stack** when Pingback Pins is equipped (total = stacks × per) */
export const PINGBACK_PINS_DAMAGE_PER_STACK = 3
