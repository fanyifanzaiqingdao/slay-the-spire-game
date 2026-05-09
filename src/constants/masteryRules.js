// constants/masteryRules.js
// All mastery level rule definitions — per SKILL.md

export const MASTERY_RULES = {
  1: { id: 'no_romanization', description: 'Play hints hidden on all cards until mastered', shortLabel: 'No Hints' },
  2: { id: 'three_options', description: 'Choice prompts reduced from 4 to 3', shortLabel: '3 Options' },
  3: { id: 'one_random_nohint', description: 'One random card per floor has no brief available', shortLabel: 'Blind Card' },
  4: { id: 'faster_timer', description: 'Decision timer reduced by 5 seconds', shortLabel: 'Fast Timer' },
  5: { id: 'double_buffs', description: 'Enemy pressure from misplays is doubled', shortLabel: 'Double Pressure' },
  6: { id: 'rest_review_only', description: 'Rest sites no longer offer Heal — only Upgrade a card', shortLabel: 'No Healing' },
  7: { id: 'merchant_target_only', description: 'Merchant offers copy-only-in-jargon with no hover cheat sheet', shortLabel: 'Jargon Only' },
  8: { id: 'haunting_forced', description: 'Late floors roll tougher encounter modifiers', shortLabel: 'Hard Route' },
  9: { id: 'smaller_draft', description: 'Draft pool sizes are reduced by 1 card each tier', shortLabel: 'Slim Draft' },
  10: { id: 'typed_final_boss', description: 'Final boss Phase 4 — typed commitments only (no multiple choice)', shortLabel: 'Typed Lock-in' },
}

/**
 * Returns all mastery rules active at a given mastery level (cumulative)
 * @param {number} masteryLevel
 * @returns {Array<{id: string, description: string, shortLabel: string}>}
 */
export function getActiveRules(masteryLevel) {
  return Object.entries(MASTERY_RULES)
    .filter(([level]) => parseInt(level) <= masteryLevel)
    .map(([, rule]) => rule)
}

/**
 * Check if a specific rule is active
 * @param {string} ruleId - e.g. 'no_romanization'
 * @param {number} masteryLevel
 * @returns {boolean}
 */
export function isRuleActive(ruleId, masteryLevel) {
  return getActiveRules(masteryLevel).some(r => r.id === ruleId)
}
