// components/rooms/RestRoom.jsx — Heal OR upgrade one deck card (classic campfire).
import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import useRunStore from '../../stores/runStore.js'
import { isRuleActive } from '../../constants/masteryRules.js'
import { ScreenTransition } from '../shared/ScreenTransition.jsx'
import { useAudio } from '../../hooks/useAudio.js'
import { TopBar } from '../shared/TopBar.jsx'
import { isOverloadMechanicsActive } from '../../utils/overloadMechanics.js'

const FITNESS_HP_GAIN = 8
const FITNESS_OVERLOAD_GAIN = 5

async function loadCampaignCardMap(campaign) {
  try {
    const mod = await import(`../../data/${campaign}/cards.json`)
    const raw = mod?.default ?? mod
    const list = Array.isArray(raw) ? raw : raw?.default
    if (!Array.isArray(list)) return {}
    const map = {}
    for (const card of list) map[card.id] = card
    return map
  } catch {
    return {}
  }
}

export function RestRoom() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const store = useRunStore()
  const { playSFX, playMusic } = useAudio()
  const [chosen, setChosen] = useState(null)
  const [cardMap, setCardMap] = useState({})
  const [upgradeOpen, setUpgradeOpen] = useState(false)

  useEffect(() => {
    playMusic(store.campaign || 'japanese', store.floor)
  }, [playMusic, store.campaign, store.floor])

  useEffect(() => {
    if (!store.campaign) return
    loadCampaignCardMap(store.campaign).then(setCardMap)
  }, [store.campaign])

  const restUpgradeOnly = isRuleActive('rest_review_only', store.masteryLevel)
  const healAmount = Math.floor(store.maxHp * 0.25)
  const canHeal = store.hp < store.maxHp

  const upgradeCandidates = useMemo(() => {
    const out = []
    for (let i = 0; i < store.deck.length; i++) {
      const id = store.deck[i]
      const c = cardMap[id]
      if (c?.upgradeable && c?.upgraded_id) out.push({ index: i, card: c })
    }
    return out
  }, [store.deck, cardMap])

  const canUpgrade = upgradeCandidates.length > 0
  const showFitness = isOverloadMechanicsActive(store)

  const mustLeaveWithoutBenefit =
    chosen === null &&
    ((restUpgradeOnly && !canUpgrade) ||
      (!restUpgradeOnly && !canHeal && !canUpgrade && !showFitness))

  const handleContinueOnly = () => {
    playSFX('button_click')
    sessionStorage.removeItem('active_encounter')
    navigate('/map')
  }

  const handleHeal = () => {
    setChosen('heal')
    playSFX('correct')
    store.healHp(healAmount)
    sessionStorage.removeItem('active_encounter')
    setTimeout(() => navigate('/map'), 1200)
  }

  const handleFitness = () => {
    setChosen('fitness')
    playSFX('correct')
    useRunStore.getState().raiseMaxHpFromFitness(FITNESS_HP_GAIN, FITNESS_OVERLOAD_GAIN)
    sessionStorage.removeItem('active_encounter')
    setTimeout(() => navigate('/map'), 1200)
  }

  const applyUpgrade = useCallback((deckIndex, card) => {
    const nextId = card.upgraded_id
    if (!nextId) return
    useRunStore.getState().replaceDeckCardAtIndex(deckIndex, nextId)
    setChosen('upgrade')
    setUpgradeOpen(false)
    playSFX('correct')
    sessionStorage.removeItem('active_encounter')
    setTimeout(() => navigate('/map'), 1200)
  }, [playSFX, navigate])

  const handleUpgradeOptionClick = () => {
    if (!chosen && canUpgrade) setUpgradeOpen(true)
  }

  return (
    <ScreenTransition>
      <div className="relative w-full h-screen flex flex-col items-center justify-center overflow-hidden">

        <div className="absolute top-0 left-0 w-full z-50">
          <TopBar />
        </div>

        <div
          className="w-full h-full flex flex-col items-center justify-center px-6 pt-16"
          style={{ background: 'linear-gradient(180deg, #0a0516 0%, #1a0a00 100%)' }}
        >
          <div
            className="absolute inset-0 opacity-20"
            style={{ backgroundImage: 'radial-gradient(ellipse at 50% 50%, #FF8C00 0%, transparent 60%)' }}
          />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative z-10 max-w-md w-full px-6"
          >
            <div className="text-center mb-8">
              <div className="text-5xl mb-3">🔥</div>
              <h1 className="text-2xl font-bold text-amber-200">{t('restSite.title')}</h1>
              <p className="text-gray-400 text-sm mt-1">{t('restSite.subtitle')}</p>
            </div>

            <div className="flex flex-col gap-4">
              {!restUpgradeOnly && (
                <motion.button
                  whileHover={!chosen ? { scale: 1.02 } : {}}
                  whileTap={!chosen ? { scale: 0.98 } : {}}
                  onClick={!chosen ? handleHeal : undefined}
                  disabled={!!chosen || !canHeal}
                  className={`
                  p-5 rounded-2xl border-2 text-left transition-all
                  ${chosen === 'heal' ? 'border-emerald-500 bg-emerald-900/30' :
                    !canHeal ? 'border-gray-700 bg-gray-900/30 opacity-50' :
                    'border-amber-700/60 bg-amber-950/20 hover:border-amber-500 hover:bg-amber-950/40 cursor-pointer'}
                `}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">❤️</span>
                    <div>
                      <div className="font-bold text-white">{t('restSite.healTitle')}</div>
                      <div className="text-xs text-gray-400">{t('restSite.healDesc', { amount: healAmount })}</div>
                    </div>
                    {chosen === 'heal' && <span className="ml-auto text-emerald-400 text-lg">✓</span>}
                  </div>
                  <div className="text-xs text-gray-500">
                    {t('restSite.currentHp', { hp: store.hp, maxHp: store.maxHp })}
                    {!canHeal && t('restSite.alreadyMax')}
                  </div>
                </motion.button>
              )}

              {showFitness && (
                <motion.button
                  whileHover={!chosen ? { scale: 1.02 } : {}}
                  whileTap={!chosen ? { scale: 0.98 } : {}}
                  onClick={!chosen ? handleFitness : undefined}
                  disabled={!!chosen}
                  className={`
                  p-5 rounded-2xl border-2 text-left transition-all
                  ${chosen === 'fitness' ? 'border-orange-500 bg-orange-950/40' :
                    'border-orange-700/50 bg-orange-950/15 hover:border-orange-400 hover:bg-orange-950/30 cursor-pointer'}
                `}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">🏋️</span>
                    <div>
                      <div className="font-bold text-white">{t('restSite.fitnessTitle')}</div>
                      <div className="text-xs text-gray-400">
                        {t('restSite.fitnessDesc', { hp: FITNESS_HP_GAIN, overload: FITNESS_OVERLOAD_GAIN })}
                      </div>
                    </div>
                    {chosen === 'fitness' && <span className="ml-auto text-orange-400 text-lg">✓</span>}
                  </div>
                  <div className="text-xs text-gray-500">{t('restSite.fitnessWarn')}</div>
                </motion.button>
              )}

              <motion.button
                whileHover={!chosen && canUpgrade ? { scale: 1.02 } : {}}
                whileTap={!chosen && canUpgrade ? { scale: 0.98 } : {}}
                onClick={!chosen ? handleUpgradeOptionClick : undefined}
                disabled={!!chosen || !canUpgrade}
                className={`
                p-5 rounded-2xl border-2 text-left transition-all
                ${chosen === 'upgrade' ? 'border-blue-500 bg-blue-900/30' :
                  !canUpgrade ? 'border-gray-700 bg-gray-900/30 opacity-50 cursor-default' :
                  'border-blue-700/60 bg-blue-950/20 hover:border-blue-500 hover:bg-blue-950/40 cursor-pointer'}
              `}
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">⚔️</span>
                  <div>
                    <div className="font-bold text-white">{t('restSite.upgradeTitle')}</div>
                    <div className="text-xs text-gray-400">{t('restSite.upgradeDesc')}</div>
                  </div>
                  {chosen === 'upgrade' && <span className="ml-auto text-blue-400 text-lg">✓</span>}
                </div>
                <div className="text-xs text-gray-500">
                  {canUpgrade ? t('restSite.upgradeHint') : t('restSite.upgradeNoTargets')}
                </div>
              </motion.button>
            </div>

            {mustLeaveWithoutBenefit && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                type="button"
                onClick={handleContinueOnly}
                className="mt-4 w-full py-3 rounded-xl border border-gray-600 bg-gray-900/40 text-gray-300 hover:bg-gray-800/60 text-sm"
              >
                {t('restSite.continueToMap')}
              </motion.button>
            )}

            <p className="text-center text-xs text-gray-600 mt-6 italic">
              {t('restSite.footer')}
            </p>
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {upgradeOpen && (
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 px-4 py-8"
            onClick={() => setUpgradeOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#14101f] border border-amber-800/40 rounded-2xl max-w-lg w-full max-h-[min(80vh,520px)] overflow-hidden flex flex-col shadow-xl"
            >
              <div className="p-5 border-b border-white/10">
                <h2 className="text-lg font-bold text-amber-200">{t('restSite.pickCardToUpgrade')}</h2>
                <p className="text-xs text-gray-400 mt-1">{t('restSite.upgradeOverlayHint')}</p>
              </div>
              <div className="overflow-y-auto p-4 flex flex-col gap-2">
                {upgradeCandidates.map(({ index, card }) => {
                  const plus = cardMap[card.upgraded_id]
                  return (
                    <button
                      key={`${card.id}-${index}`}
                      type="button"
                      onClick={() => applyUpgrade(index, card)}
                      className="text-left p-4 rounded-xl border border-blue-800/50 bg-blue-950/20 hover:border-sky-400/70 hover:bg-blue-950/40 transition-colors"
                    >
                      <span className="font-bold text-white">{card.name_target}</span>
                      {plus && (
                        <span className="text-gray-400 text-sm">
                          {' → '}
                          {plus.name_target}
                        </span>
                      )}
                      <span className="block text-[10px] text-gray-600 mt-1 font-mono">
                        #{index + 1}
                      </span>
                    </button>
                  )
                })}
              </div>
              <div className="p-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setUpgradeOpen(false)}
                  className="w-full py-2 rounded-lg bg-white/5 text-gray-300 hover:bg-white/10"
                >
                  {t('common.close')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ScreenTransition>
  )
}
