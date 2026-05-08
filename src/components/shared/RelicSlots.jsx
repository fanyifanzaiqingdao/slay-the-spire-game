// components/shared/RelicSlots.jsx
// Campaign-themed relic frames. Used in TopBar.
// Renders equipped relics only (wrap + scroll); empty rows not padded to MAX slots.

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { RELICS, RELIC_TIER_COLORS, RELIC_TIER_GLOW } from '../../data/relics.js'
import { relicLocalizedName, relicLocalizedDescription, relicLocalizedFlavor } from '../../utils/relicI18n.js'

// Campaign slot frame shapes
const FRAME_STYLE = {
  japanese: { border: '2px solid', borderRadius: '6px', background: 'rgba(30,20,10,0.7)' },
  korean:   { border: '1px solid', borderRadius: '4px', background: 'rgba(10,20,40,0.7)', outline: '1px solid rgba(99,102,241,0.2)', outlineOffset: '2px' },
  spanish:  { border: '2px solid', borderRadius: '8px', background: 'rgba(25,15,5,0.7)' },
}

function RelicTooltip({ relic }) {
  const { t } = useTranslation()
  const id = relic.id
  const tierKey = `relic.tier.${relic.tier}`
  const tierLabel = t(tierKey, { defaultValue: relic.tier })
  return (
    <motion.div
      initial={{ opacity: 0, y: 4, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 2 }}
      className="absolute top-full left-1/2 z-[200] mt-2 w-[min(100vw-2rem,220px)] max-w-[220px] -translate-x-1/2 pointer-events-auto"
    >
      <div
        className="rounded-xl border p-3 text-xs shadow-2xl"
        style={{
          background: 'linear-gradient(160deg, #1a1208, #0d0d0d)',
          borderColor: RELIC_TIER_COLORS[relic.tier] || '#4b5563',
          boxShadow: RELIC_TIER_GLOW[relic.tier] || 'none',
        }}
      >
        <div className="font-bold text-sm mb-1" style={{ color: relic.color, fontFamily: "'Cinzel', serif" }}>
          {relic.icon} {relicLocalizedName(id, relic.name)}
        </div>
        <div className="text-[10px] uppercase tracking-widest mb-2" style={{ color: RELIC_TIER_COLORS[relic.tier], opacity: 0.7 }}>
          {tierLabel}
          {relic.pair && <span className="ml-2 text-amber-400">⚡ {t('relic.paired')}</span>}
        </div>
        <p className="text-gray-300 leading-relaxed mb-2">{relicLocalizedDescription(id, relic.description)}</p>
        <p className="text-gray-600 italic">{relicLocalizedFlavor(id, relic.flavor)}</p>
      </div>
    </motion.div>
  )
}

function RelicFrame({ relicId, index, campaign = 'japanese' }) {
  const [hovered, setHovered] = useState(false)
  const relic = relicId ? RELICS[relicId] : null
  const frameStyle = FRAME_STYLE[campaign] || FRAME_STYLE.japanese
  const tierColor = relic ? (RELIC_TIER_COLORS[relic.tier] || '#6b7280') : '#374151'
  const hoverTitle = relic ? relicLocalizedName(relicId, relic.name) : undefined

  return (
    <div
      className="relative flex items-center shrink-0"
      onMouseEnter={() => relic && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <AnimatePresence>
        {hovered && relic && <RelicTooltip key="tip" relic={relic} />}
      </AnimatePresence>

      <motion.div
        whileHover={relic ? { scale: 1.06, y: -1 } : {}}
        title={hoverTitle}
        className="w-10 h-10 shrink-0 flex items-center justify-center relative"
        style={{
          ...frameStyle,
          borderColor: relic ? tierColor : '#1f2937',
          boxShadow: relic ? (RELIC_TIER_GLOW[relic.tier] || 'none') : 'none',
          cursor: relic ? 'help' : 'default',
        }}
        animate={relic?.tier === 'starter' ? { boxShadow: ['0 0 0px transparent', '0 0 12px rgba(245,200,66,0.35)', '0 0 0px transparent'] } : false}
        transition={relic?.tier === 'starter' ? { duration: 2.2, repeat: Infinity } : undefined}
      >
        {relic ? (
          <>
            <span className="text-xl leading-none select-none">{relic.icon}</span>
            {/* Rare/Pantheon pulse */}
            {(relic.tier === 'rare' || relic.tier === 'pantheon') && (
              <motion.div
                className="absolute inset-0 rounded pointer-events-none"
                animate={{ opacity: [0.2, 0.5, 0.2] }}
                transition={{ duration: 2, repeat: Infinity }}
                style={{ boxShadow: `inset 0 0 8px ${relic.color}` }}
              />
            )}
            {/* Paired indicator */}
            {relic.pair && (
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full border border-amber-900 text-[7px] flex items-center justify-center text-white font-bold">
                2
              </div>
            )}
          </>
        ) : (
          // Empty slot — faint frame with slot number
          <span className="text-[10px] text-gray-700 font-mono select-none">{index + 1}</span>
        )}
      </motion.div>
    </div>
  )
}

export function RelicSlots({ equippedRelics = [], campaign = 'japanese' }) {
  if (!equippedRelics.length) {
    return (
      <span className="text-[10px] text-gray-500 px-0.5 select-none italic whitespace-nowrap" title="No relics in save — new run from character select should add your starter.">
        —
      </span>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 max-w-[min(32rem,52vw)] overflow-visible">
      {equippedRelics.map((relicId, i) => (
        <RelicFrame key={`${relicId}-${i}`} index={i} relicId={relicId} campaign={campaign} />
      ))}
    </div>
  )
}
