// Shared STS-style combat HUD pieces (Energy orb, draw/discard piles)
import { motion } from 'framer-motion'

/** Energy Orb (STS style bottom-left) */
export function EnergyOrb({ energy, maxEnergy }) {
  return (
    <div className="relative w-24 h-24 flex items-center justify-center">
      <div
        className="absolute inset-0 rounded-full border-[6px] border-[#8a4a1c]"
        style={{
          boxShadow: '0 0 15px rgba(0,0,0,0.8), inset 0 0 10px rgba(0,0,0,0.8)',
          background: '#3a1804',
        }}
      />
      <motion.div
        className="absolute inset-2 rounded-full"
        animate={{
          background: energy > 0
            ? ['radial-gradient(circle, #ffaa00, #ff4400, #3a1804)', 'radial-gradient(circle, #ffcc33, #ff5500, #3a1804)']
            : 'radial-gradient(circle, #553311, #221100)',
          scale: energy > 0 ? [1, 1.05, 1] : 1,
        }}
        transition={{ duration: 2, repeat: Infinity, repeatType: 'reverse' }}
      />
      <div className="relative z-10 text-white font-black text-3xl" style={{ textShadow: '2px 2px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000' }}>
        {energy}/{maxEnergy}
      </div>
    </div>
  )
}

/** Deck / discard pile (STS style bottom corners) */
export function CardPile({ count, type, side, onClick, t }) {
  const pileTitle =
    type === 'draw'
      ? t('combat.drawPile')
      : type === 'discard'
        ? t('combat.discardPile')
        : t('pvp.exhaustPile')
  const pileEmoji = type === 'draw' ? '📚' : type === 'discard' ? '🗑️' : '♻️'
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative flex flex-col items-center justify-end h-20 w-16 cursor-pointer hover:scale-105 transition-transform"
      title={pileTitle}
    >
      <div
        className="relative w-12 h-16 bg-gray-300 rounded border-2 border-gray-600"
        style={{
          boxShadow: '0 4px 6px rgba(0,0,0,0.6)',
          transform: `rotate(${side === 'left' ? '-5deg' : '5deg'})`,
        }}
      >
        <div className="absolute inset-0 flex items-center justify-center opacity-30 text-2xl">
          {pileEmoji}
        </div>
      </div>
      <div className="absolute -bottom-2 -right-2 bg-black border-2 border-gray-500 rounded-full w-8 h-8 flex items-center justify-center text-white font-bold text-sm">
        {count}
      </div>
    </button>
  )
}
