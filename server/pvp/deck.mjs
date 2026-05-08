/** Shuffle deck (Fisher–Yates) */
export function shuffle(arr, rng = Math.random) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * Draw n cards from deck; reshuffle discard into deck if deck empty (Slay-style).
 * @returns {{ drawn: string[], deck: string[], discard: string[] }}
 */
export function drawCards(deck, discard, n) {
  let d = [...deck]
  let dis = [...discard]
  const drawn = []
  for (let i = 0; i < n; i++) {
    if (d.length === 0 && dis.length > 0) {
      d = shuffle(dis)
      dis = []
    }
    if (d.length === 0) break
    drawn.push(d.shift())
  }
  return { drawn, deck: d, discard: dis }
}
