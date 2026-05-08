// Act 1 — programmer route (campaign id still "japanese" in data paths)
// Cards use pool: "act1"; enemies use pool: "act1"

export const ACT1_CAMPAIGN_ID = 'japanese'
export const ACT1_MAX_FLOOR = 4

/** Programmer / engineer runs use Japanese data folder + Act1 pools */
export function isAct1ProgrammerRun(store) {
  return store?.campaign === ACT1_CAMPAIGN_ID && (store?.floor ?? 1) <= ACT1_MAX_FLOOR
}

export function cardIsAct1Pool(card) {
  return card?.pool === 'act1'
}

export function enemyIsAct1Pool(enemy) {
  return enemy?.pool === 'act1'
}

/**
 * Draft / merchant: during Act1 programmer, only act1 pool cards (+ optional story picks elsewhere).
 */
export function filterCardsForAct1Draft(allCards, store) {
  if (!isAct1ProgrammerRun(store)) return allCards
  const act = allCards.filter(c => c.campaign === store.campaign && cardIsAct1Pool(c))
  return act.length > 0 ? act : allCards.filter(c => c.campaign === store.campaign)
}

/**
 * Combat spawn: Act1 programmer pulls act1-tagged enemies for this floor when possible.
 */
export function filterEnemiesForAct1Combat(enemies, store, { tier }) {
  if (!isAct1ProgrammerRun(store)) {
    return enemies.filter(e => e.floor === store.floor && e.tier === tier)
  }
  let act = enemies.filter(
    e => enemyIsAct1Pool(e) && e.floor === store.floor && e.tier === tier
  )
  if (act.length > 0) return act
  act = enemies.filter(e => enemyIsAct1Pool(e) && e.tier === tier && e.floor === 1)
  if (act.length > 0) return act
  return enemies.filter(e => e.floor === store.floor && e.tier === tier)
}

export function pickAct1Boss(enemies, store) {
  const tierBoss = enemies.filter(e => e.tier === 'boss')
  if (!isAct1ProgrammerRun(store)) {
    return tierBoss.find(e => e.floor === store.floor) || tierBoss[0]
  }
  let act = tierBoss.find(e => enemyIsAct1Pool(e) && e.floor === store.floor)
  if (act) return act
  act = tierBoss.find(e => enemyIsAct1Pool(e) && e.floor === 1)
  if (act) return act
  return tierBoss.find(e => e.floor === store.floor) || tierBoss[0]
}
