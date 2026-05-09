/**
 * Starting deck = shared neutral strip + two signature job cards per character.
 * Jobs: dev (程序员), ui (UI), pm (产品经理), qa (测试).
 */

/** Japan campaign — everyone shares this 7-card neutral core before job cards */
export const STARTER_BASE_JAPANESE = [
  'starter_code_strike',
  'starter_code_strike',
  'common_printf_debug',
  'jp_vocab_swift_strike',
  'starter_defensive_logic',
  'starter_defensive_logic',
  'jp_gram_particle_shield',
]

export const STARTER_BASE_KOREAN = [
  'kr_vocab_strike',
  'kr_vocab_strike',
  'kr_vocab_wild_slash',
  'kr_vocab_swift_strike',
  'kr_gram_ward',
  'kr_gram_ward',
  'kr_gram_particle_shield',
]

export const STARTER_BASE_SPANISH = [
  'es_vocab_strike',
  'es_vocab_strike',
  'es_vocab_wild_slash',
  'es_vocab_swift_strike',
  'es_gram_ward',
  'es_gram_ward',
  'es_gram_particle_shield',
]

/** Two signature cards appended per character (9 total + 1 rare from CharacterSelect) */
export const STARTER_JOB_BY_CHARACTER_ID = {
  // 程序员 — 栈推进击 / 小黄鸭格挡
  kenji: ['jp_job_dev_stack_push', 'jp_job_dev_rubber_duck'],
  // 测试 — 虚弱 + 消耗
  ren: ['jp_job_qa_flaky_run', 'jp_job_qa_triage_barrier'],
  // UI — 连击条带 / 手读混合（力量见 kr_ui 系列扩展牌）
  minjun: ['kr_job_ui_snap_lines', 'kr_job_ui_handoff_spec'],
  jiwoo: ['kr_job_ui_snap_lines', 'kr_job_ui_handoff_spec'],
  // 产品 — 弃牌循环（见 es_job 系列）
  mateo: ['es_job_pm_priority_axis', 'es_job_pm_scope_creep_armor'],
  elena: ['es_job_pm_priority_axis', 'es_job_pm_scope_creep_armor'],
}

const BASE_BY_CAMPAIGN = {
  japanese: STARTER_BASE_JAPANESE,
  korean: STARTER_BASE_KOREAN,
  spanish: STARTER_BASE_SPANISH,
}

/** Pre-job-split decks (two spirit scrolls) — fallback only */
export const LEGACY_FALLBACK_STARTERS = {
  japanese: [
    ...STARTER_BASE_JAPANESE,
    'jp_read_spirit_scroll',
    'jp_read_spirit_scroll',
  ],
  korean: [
    ...STARTER_BASE_KOREAN,
    'kr_read_spirit_scroll',
    'kr_read_spirit_scroll',
  ],
  spanish: [
    ...STARTER_BASE_SPANISH,
    'es_read_spirit_scroll',
    'es_read_spirit_scroll',
  ],
}

/**
 * @param {string} campaignId - japanese | korean | spanish
 * @param {string} characterId
 * @param {string[]=} fallbackStrip - optional legacy strip (e.g. old saved campaigns.js)
 */
export function getStarterIdsForCharacter(campaignId, characterId, fallbackStrip) {
  let cid = characterId
  if (campaignId === 'japanese' && (characterId === 'hana' || characterId === 'yuki')) {
    cid = 'kenji'
  }
  const base = BASE_BY_CAMPAIGN[campaignId]
  const job = STARTER_JOB_BY_CHARACTER_ID[cid]
  if (base?.length && job?.length === 2) {
    return [...base, ...job]
  }
  if (fallbackStrip?.length) return [...fallbackStrip]
  const legacy = LEGACY_FALLBACK_STARTERS[campaignId]
  return legacy?.length ? [...legacy] : []
}
