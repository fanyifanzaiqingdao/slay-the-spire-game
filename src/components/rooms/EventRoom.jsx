// components/rooms/EventRoom.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import useRunStore from '../../stores/runStore.js'
import { HoverTranslate } from '../shared/HoverTranslate.jsx'
import { ScreenTransition } from '../shared/ScreenTransition.jsx'
import { useAudio } from '../../hooks/useAudio.js'
import { TopBar } from '../shared/TopBar.jsx'
import { getEvents } from '../../utils/dataLoader.js'
import { pickRandomRelicForLoot } from '../../data/relics.js'

export function EventRoom() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const store = useRunStore()
  const { playSFX, playMusic } = useAudio()
  const [chosen, setChosen] = useState(null)
  const [outcome, setOutcome] = useState(null)

  useEffect(() => {
    playMusic(store.campaign || 'japanese', store.floor)
  }, [playMusic, store.campaign, store.floor])

  // Load event from sessionStorage
  const cachedEvent = (() => {
    try {
      const raw = sessionStorage.getItem('lq_current_event')
      return raw ? JSON.parse(raw) : null
    } catch { return null }
  })()

  // Hotfix: refresh event payload by id so old cached schema won't break i18n fields.
  const eventData = (() => {
    if (!cachedEvent) return null
    const campaign = cachedEvent.campaign || store.campaign || 'japanese'
    const latest = getEvents(campaign).find(e => e.id === cachedEvent.id)
    if (!latest) return cachedEvent
    return { ...cachedEvent, ...latest, options: latest.options || cachedEvent.options || [] }
  })()

  const getLocalizedText = (primary, translated) => {
    if (primary && translated) return { text: primary, translation: translated }
    if (primary) return { text: primary, translation: null }
    if (translated) return { text: translated, translation: null }
    return { text: '', translation: null }
  }

  if (!eventData) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-950">
        <div className="text-gray-400">{t('event.noData')}</div>
        <button onClick={() => navigate('/map')} className="ml-4 text-gray-300 underline">{t('event.returnToMap')}</button>
      </div>
    )
  }

  const title = getLocalizedText(eventData.title_target, eventData.title)
  const setup = getLocalizedText(eventData.setup_text_target, eventData.setup_text)
  const npcDialogue = getLocalizedText(eventData.npc_dialogue, eventData.npc_dialogue_translation)

  const handleChoice = (option, idx) => {
    if (chosen !== null) return
    playSFX('button_click')
    setChosen(idx)
    setOutcome(option)

    // Apply reward/penalty
    setTimeout(() => {
      const r = option.reward
      if (!r) return
      switch (r.type) {
        case 'heal': store.healHp(r.amount); break
        case 'gold': store.addGold(r.amount); break
        case 'hp_loss': store.setHp(store.hp - r.amount); break
        case 'card_upgrade': break // Phase 2: card upgrade logic
        case 'relic_random': {
          const rs = useRunStore.getState()
          const relicId = pickRandomRelicForLoot(rs)
          if (relicId) store.addRelic(relicId)
          break
        }
        default: break
      }
    }, 500)
  }

  return (
    <ScreenTransition>
      <div className="relative w-full h-screen flex flex-col items-center justify-center overflow-hidden">
        
        <div className="absolute top-0 left-0 w-full z-50">
          <TopBar />
        </div>

        <div
          className="w-full h-full flex flex-col items-center justify-center px-4 pt-16"
          style={{ background: 'linear-gradient(180deg, #0a0516 0%, #0d0a1a 100%)' }}
        >
        <div className="absolute inset-0 opacity-15"
          style={{ backgroundImage: 'radial-gradient(ellipse at 50% 30%, #9333EA 0%, transparent 60%)' }}
        />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 max-w-lg w-full"
        >
          {/* Event title */}
          <div className="text-center mb-6">
            <div className="text-4xl mb-3">❓</div>
            <h1 className="text-xl font-bold text-purple-200">
              <HoverTranslate translation={title.translation}>{title.text}</HoverTranslate>
            </h1>
            <div className="text-xs text-gray-500 mt-0.5">
              {t('event.titleHint')}
            </div>
          </div>

          {/* Setup text */}
          <p className="text-sm text-gray-300 mb-3 text-center">
            <HoverTranslate translation={setup.translation}>{setup.text}</HoverTranslate>
          </p>

          {/* NPC dialogue */}
          <div className="bg-gray-900/60 border border-purple-600/30 rounded-xl p-4 mb-6 text-center">
            <HoverTranslate translation={npcDialogue.translation} className="text-lg text-purple-200 font-medium">
              {npcDialogue.text}
            </HoverTranslate>
          </div>

          {/* Choices */}
          <div className="flex flex-col gap-3">
            {eventData.options.map((option, idx) => (
              <motion.button
                key={idx}
                whileHover={chosen === null ? { scale: 1.01 } : {}}
                whileTap={chosen === null ? { scale: 0.99 } : {}}
                onClick={() => handleChoice(option, idx)}
                className={`
                  p-4 rounded-xl border-2 text-left transition-all
                  ${chosen === idx
                    ? option.outcome === 'reward' ? 'border-green-500 bg-green-900/30' :
                      option.outcome === 'penalty' ? 'border-red-500 bg-red-900/30' :
                      'border-blue-500 bg-blue-900/30'
                    : chosen !== null ? 'border-gray-700 bg-gray-900/20 opacity-40'
                    : 'border-purple-700/50 bg-purple-950/20 hover:border-purple-500 hover:bg-purple-950/40 cursor-pointer'
                  }
                `}
                disabled={chosen !== null}
              >
                <HoverTranslate translation={option.translation || null} className="text-white font-medium">
                  {option.text || option.translation}
                </HoverTranslate>
              </motion.button>
            ))}
          </div>

          {/* Outcome display */}
          <AnimatePresence>
            {outcome && (
              (() => {
                const localizedOutcome = getLocalizedText(outcome.outcome_text_target, outcome.outcome_text)
                const localizedRewardDesc = getLocalizedText(
                  outcome.reward?.description_target,
                  outcome.reward?.description
                )
                return (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`mt-4 p-3 rounded-xl text-sm text-center
                  ${outcome.outcome === 'reward' ? 'bg-green-900/30 text-green-200 border border-green-700' :
                    outcome.outcome === 'penalty' ? 'bg-red-900/30 text-red-200 border border-red-700' :
                    'bg-blue-900/30 text-blue-200 border border-blue-700'}`}
              >
                <p className="mb-1">
                  <HoverTranslate translation={localizedOutcome.translation}>
                    {localizedOutcome.text}
                  </HoverTranslate>
                </p>
                <p className="text-xs text-gray-400">
                  <HoverTranslate translation={localizedRewardDesc.translation}>
                    {localizedRewardDesc.text}
                  </HoverTranslate>
                </p>
              </motion.div>
                )
              })()
            )}
          </AnimatePresence>

          {/* Continue button */}
          {chosen !== null && (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => { playSFX('button_click'); sessionStorage.removeItem('active_encounter'); navigate('/map') }}
              className="mt-5 w-full py-3 rounded-xl bg-gray-800/60 border border-gray-700 text-gray-200 hover:bg-gray-700/60 transition-all font-medium"
            >
              {t('event.continue')} →
            </motion.button>
          )}
        </motion.div>
        </div>
      </div>
    </ScreenTransition>
  )
}
