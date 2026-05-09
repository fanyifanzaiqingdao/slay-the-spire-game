// components/combat/ChainIndicator.jsx
import { motion, AnimatePresence } from 'framer-motion'
import { ATTACK_CHAIN_FLAT_PER } from '../../constants/combatChain.js'

/**
 * Shows combo banner when the previous card played this turn was an attack (next attack gets bonus).
 * @param {boolean} lastPlayWasAttack
 * @param {number} consecutiveAttackPlays - attacks already resolved this turn (before playing next)
 */
export function ChainIndicator({ lastPlayWasAttack, consecutiveAttackPlays }) {
  const nextBonus = lastPlayWasAttack
    ? ATTACK_CHAIN_FLAT_PER * ((consecutiveAttackPlays || 0) + 1)
    : null

  return (
    <AnimatePresence>
      {lastPlayWasAttack && nextBonus != null && (
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/40 rounded-lg"
        >
          <motion.div
            animate={{ boxShadow: ['0 0 6px #EAB308', '0 0 16px #EAB308', '0 0 6px #EAB308'] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="w-2 h-2 rounded-full bg-yellow-400"
          />
          <span className="text-xs font-bold text-yellow-300 tracking-widest">COMBO</span>
          <span className="text-xs text-amber-200/90">
            next attack +{nextBonus}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
