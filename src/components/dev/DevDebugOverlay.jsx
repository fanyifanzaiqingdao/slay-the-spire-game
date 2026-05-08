// Local dev-only run editor (import.meta.env.DEV). Not shipped as game feature.
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import useRunStore from '../../stores/runStore.js'
import { MAX_EQUIPPED_RELICS, RELIC_IDS } from '../../data/relics.js'

export function DevDebugOverlay({ onClose }) {
  const snap = useRunStore()
  const [gold, setGold] = useState(String(snap.gold ?? 0))
  const [hp, setHp] = useState(String(snap.hp ?? 0))
  const [maxHp, setMaxHp] = useState(String(snap.maxHp ?? 80))
  const [floor, setFloor] = useState(String(snap.floor ?? 1))
  const [energy, setEnergy] = useState(String(snap.energy ?? 3))
  const [maxEnergy, setMaxEnergy] = useState(String(snap.maxEnergy ?? 3))
  const [deckText, setDeckText] = useState(() => JSON.stringify(snap.deck ?? [], null, 0))
  const [relicsText, setRelicsText] = useState(() => (snap.relics || []).join(', '))
  const [vaultText, setVaultText] = useState(() => (snap.vaultRelics || []).join(', '))
  const [msg, setMsg] = useState(null)

  useEffect(() => {
    const s = useRunStore.getState()
    setGold(String(s.gold ?? 0))
    setHp(String(s.hp ?? 0))
    setMaxHp(String(s.maxHp ?? 80))
    setFloor(String(s.floor ?? 1))
    setEnergy(String(s.energy ?? 3))
    setMaxEnergy(String(s.maxEnergy ?? 3))
    setDeckText(JSON.stringify(s.deck ?? [], null, 0))
    setRelicsText((s.relics || []).join(', '))
    setVaultText((s.vaultRelics || []).join(', '))
  }, [])

  const parseList = (raw) =>
    raw.split(/[,;\s]+/).map((x) => x.trim()).filter(Boolean)

  const apply = () => {
    try {
      const g = parseInt(gold, 10)
      const h = parseInt(hp, 10)
      const mh = parseInt(maxHp, 10)
      const f = parseInt(floor, 10)
      const e = parseInt(energy, 10)
      const me = parseInt(maxEnergy, 10)

      let deckIds
      try {
        const parsed = JSON.parse(deckText.trim() || '[]')
        deckIds = Array.isArray(parsed) ? parsed.map(String) : parseList(deckText)
      } catch {
        deckIds = parseList(deckText)
      }

      let relicIds = parseList(relicsText)
      relicIds = relicIds.filter((id) => RELIC_IDS.includes(id)).slice(0, MAX_EQUIPPED_RELICS)

      const vaultIds = parseList(vaultText).filter((id) => RELIC_IDS.includes(id))

      useRunStore.setState({
        gold: Number.isFinite(g) ? Math.max(0, g) : snap.gold,
        hp: Number.isFinite(h) ? Math.max(0, h) : snap.hp,
        maxHp: Number.isFinite(mh) ? Math.max(1, mh) : snap.maxHp,
        floor: Number.isFinite(f) ? Math.max(1, f) : snap.floor,
        energy: Number.isFinite(e) ? Math.max(0, e) : snap.energy,
        maxEnergy: Number.isFinite(me) ? Math.max(1, me) : snap.maxEnergy,
        deck: deckIds,
        relics: relicIds,
        vaultRelics: vaultIds,
      })
      setMsg('Applied.')
      setTimeout(() => setMsg(null), 2000)
    } catch (err) {
      setMsg(String(err?.message || err))
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-black/85 flex items-center justify-center backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-amber-800/50 bg-gray-950 p-6 text-sm text-gray-200 shadow-2xl"
      >
        <h2 className="text-lg font-bold text-amber-400 mb-1" style={{ fontFamily: "'Cinzel', serif" }}>
          Local debug (dev only)
        </h2>
        <p className="text-xs text-gray-500 mb-4">
          Equipped relics max {MAX_EQUIPPED_RELICS}. IDs must exist in <code className="text-amber-600">data/relics.js</code>.
        </p>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-gray-500">Gold</span>
            <input value={gold} onChange={(e) => setGold(e.target.value)} className="bg-black/50 border border-gray-700 rounded px-2 py-1" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-gray-500">Floor</span>
            <input value={floor} onChange={(e) => setFloor(e.target.value)} className="bg-black/50 border border-gray-700 rounded px-2 py-1" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-gray-500">HP</span>
            <input value={hp} onChange={(e) => setHp(e.target.value)} className="bg-black/50 border border-gray-700 rounded px-2 py-1" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-gray-500">Max HP</span>
            <input value={maxHp} onChange={(e) => setMaxHp(e.target.value)} className="bg-black/50 border border-gray-700 rounded px-2 py-1" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-gray-500">Energy</span>
            <input value={energy} onChange={(e) => setEnergy(e.target.value)} className="bg-black/50 border border-gray-700 rounded px-2 py-1" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-gray-500">Max energy</span>
            <input value={maxEnergy} onChange={(e) => setMaxEnergy(e.target.value)} className="bg-black/50 border border-gray-700 rounded px-2 py-1" />
          </label>
        </div>

        <label className="flex flex-col gap-1 mb-3">
          <span className="text-xs text-gray-500">Deck (JSON array or comma-separated card ids)</span>
          <textarea
            value={deckText}
            onChange={(e) => setDeckText(e.target.value)}
            rows={4}
            className="bg-black/50 border border-gray-700 rounded px-2 py-1 font-mono text-xs"
          />
        </label>

        <label className="flex flex-col gap-1 mb-3">
          <span className="text-xs text-gray-500">Equipped relics (comma-separated, max {MAX_EQUIPPED_RELICS})</span>
          <input value={relicsText} onChange={(e) => setRelicsText(e.target.value)} className="bg-black/50 border border-gray-700 rounded px-2 py-1 font-mono text-xs" />
        </label>

        <label className="flex flex-col gap-1 mb-4">
          <span className="text-xs text-gray-500">Vault relics (comma-separated)</span>
          <input value={vaultText} onChange={(e) => setVaultText(e.target.value)} className="bg-black/50 border border-gray-700 rounded px-2 py-1 font-mono text-xs" />
        </label>

        {msg && <div className="text-xs text-amber-300 mb-2">{msg}</div>}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={apply}
            className="flex-1 py-2 rounded-lg bg-amber-700 hover:bg-amber-600 text-white font-bold cursor-pointer"
          >
            Apply to run
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-600 text-gray-400 hover:text-white cursor-pointer"
          >
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
