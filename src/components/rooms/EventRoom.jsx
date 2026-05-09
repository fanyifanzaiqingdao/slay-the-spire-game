// components/rooms/EventRoom.jsx
import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import useRunStore from '../../stores/runStore.js'
import useSettingsStore from '../../stores/settingsStore.js'
import { HoverTranslate } from '../shared/HoverTranslate.jsx'
import { ScreenTransition } from '../shared/ScreenTransition.jsx'
import { useAudio } from '../../hooks/useAudio.js'
import { TopBar } from '../shared/TopBar.jsx'
import { getEvents } from '../../utils/dataLoader.js'
import { pickRandomRelicForLoot, pickRandomRareRelicForLoot } from '../../data/relics.js'
import { formatCardEffectLines } from '../../utils/cardEffectI18n.js'

/** @param {{ zh?: string, target?: string, en?: string, ja?: string }} fields @param {'en'|'zh'} uiLanguage */
function resolveEventLine(fields, uiLanguage) {
  const s = (v) => (v != null && String(v).trim() !== '' ? String(v).trim() : '')
  const { zh, target, en, ja } = fields
  const secondaryZhOrTarget = s(zh) || s(target)
  if (uiLanguage === 'zh') {
    const main = s(zh) || s(target) || s(en) || s(ja)
    let tip = ''
    if (s(ja) && s(ja) !== main) tip = s(ja)
    else if (s(en) && s(en) !== main) tip = s(en)
    return { text: main, translation: tip || null }
  }
  const main = s(en) || s(zh) || s(target) || s(ja)
  let tip = ''
  if (s(ja) && s(ja) !== main) tip = s(ja)
  else if (secondaryZhOrTarget && secondaryZhOrTarget !== main) tip = secondaryZhOrTarget
  return { text: main, translation: tip || null }
}

/** Hover: localized reward / consequence line only (no alternate-language study text). */
function buildChoiceHoverTooltip(option, uiLanguage) {
  if (!option.reward) return ''
  return resolveEventLine(
    {
      zh: option.reward.description_zh,
      target: option.reward.description_target,
      en: option.reward.description,
      ja: null,
    },
    uiLanguage
  ).text
}

export function EventRoom() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const store = useRunStore()
  const uiLanguage = useSettingsStore((s) => s.uiLanguage)
  const { playSFX, playMusic } = useAudio()
  const [chosen, setChosen] = useState(null)
  const [outcome, setOutcome] = useState(null)
  const [cardMap, setCardMap] = useState({})
  const [removeCardResolved, setRemoveCardResolved] = useState(false)

  useEffect(() => {
    playMusic(store.campaign || 'japanese', store.floor)
  }, [playMusic, store.campaign, store.floor])

  useEffect(() => {
    let cancelled = false
    const c = store.campaign || 'japanese'
    import(`../../data/${c}/cards.json`).then((mod) => {
      if (cancelled) return
      const raw = mod?.default ?? mod
      const list = Array.isArray(raw) ? raw : raw?.default
      if (!Array.isArray(list)) {
        setCardMap({})
        return
      }
      const map = {}
      list.forEach((card) => {
        map[card.id] = card
      })
      setCardMap(map)
    }).catch(() => setCardMap({}))
    return () => {
      cancelled = true
    }
  }, [store.campaign])

  const removableInstances = useMemo(() => {
    const rows = []
    const push = (pile, arr) => {
      (arr || []).forEach((cardId, index) => {
        rows.push({ pile, index, cardId, key: `${pile}-${index}` })
      })
    }
    push('deck', store.deck)
    push('hand', store.hand)
    push('discardPile', store.discardPile)
    push('exhaustPile', store.exhaustPile)
    push('icebox', store.iceboxCardIds)
    return rows
  }, [store.deck, store.hand, store.discardPile, store.exhaustPile, store.iceboxCardIds])

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

  useEffect(() => {
    if (!outcome?.reward || outcome.reward.type !== 'remove_card') return
    if (chosen === null) return
    if (removeCardResolved) return
    if (removableInstances.length === 0) setRemoveCardResolved(true)
  }, [outcome, chosen, removeCardResolved, removableInstances.length])

  if (!eventData) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-950">
        <div className="text-gray-400">{t('event.noData')}</div>
        <button onClick={() => navigate('/map')} className="ml-4 text-gray-300 underline">{t('event.returnToMap')}</button>
      </div>
    )
  }

  const title = resolveEventLine(
    { zh: eventData.title_zh, target: eventData.title_target, en: eventData.title, ja: null },
    uiLanguage
  )
  const setup = resolveEventLine(
    { zh: eventData.setup_zh, target: eventData.setup_text_target, en: eventData.setup_text, ja: null },
    uiLanguage
  )
  const npcDialogue = resolveEventLine(
    {
      zh: eventData.npc_dialogue_zh,
      target: null,
      en: eventData.npc_dialogue_translation,
      ja: eventData.npc_dialogue,
    },
    uiLanguage
  )

  const cardDisplayName = (card) =>
    (i18n.language === 'zh' ? card?.name_target : card?.name_native)
    || card?.name_target || card?.name_native || card?.id

  const applyRemoveCardPick = (instance) => {
    useRunStore.getState().removeCardInstance({ pile: instance.pile, index: instance.index })
    playSFX('correct')
    setRemoveCardResolved(true)
  }

  const handleChoice = (option, idx) => {
    if (chosen !== null) return
    playSFX('button_click')
    setChosen(idx)
    setOutcome(option)

    if (option.reward?.type === 'remove_card') return

    // Apply reward/penalty
    setTimeout(() => {
      const r = option.reward
      if (!r) return
      switch (r.type) {
        case 'heal': store.healHp(r.amount); break
        case 'gold': store.addGold(r.amount); break
        case 'hp_loss': {
          store.setHp(store.hp - r.amount)
          if (r.relic_random_rare) {
            const rs = useRunStore.getState()
            let relicId = pickRandomRareRelicForLoot(rs)
            if (!relicId) relicId = pickRandomRelicForLoot(rs)
            if (relicId) store.addRelic(relicId)
          }
          break
        }
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

  const needsRemovePick = outcome?.reward?.type === 'remove_card'
  const showRemoveModal = Boolean(
    needsRemovePick && chosen !== null && !removeCardResolved && removableInstances.length > 0
  )
  const showOutcomeBlock = Boolean(outcome && (!needsRemovePick || removeCardResolved))
  const canLeaveEvent = chosen !== null && (!needsRemovePick || removeCardResolved)

  return (
    <ScreenTransition>
      <div className="relative w-full h-screen flex flex-col items-center justify-center overflow-hidden">
        
        <div className="absolute top-0 left-0 w-full z-50">
          <TopBar />
        </div>

        <div className="relative w-full h-full flex flex-col items-center justify-center px-4 pt-16">
        {eventData.background_image ? (
          <>
            <div
              className="absolute inset-0 bg-cover bg-center bg-no-repeat"
              style={{ backgroundImage: `url('${eventData.background_image}')` }}
              aria-hidden
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#0a0516]/88 via-[#14081f]/85 to-[#0d0a1a]/92" aria-hidden />
            <div
              className="absolute inset-0 opacity-25 pointer-events-none"
              style={{ backgroundImage: 'radial-gradient(ellipse at 50% 30%, #9333EA 0%, transparent 60%)' }}
              aria-hidden
            />
          </>
        ) : (
          <>
            <div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(180deg, #0a0516 0%, #0d0a1a 100%)' }}
              aria-hidden
            />
            <div
              className="absolute inset-0 opacity-15 pointer-events-none"
              style={{ backgroundImage: 'radial-gradient(ellipse at 50% 30%, #9333EA 0%, transparent 60%)' }}
              aria-hidden
            />
          </>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 max-w-lg w-full"
        >
          {/* Event title */}
          <div className="text-center mb-6">
            <div className="text-4xl mb-3">❓</div>
            <h1 className="text-xl font-bold text-purple-200">
              {title.text}
            </h1>
            <div className="text-xs text-gray-500 mt-0.5">
              {t('event.titleHint')}
            </div>
          </div>

          {/* Setup text */}
          <p className="text-sm text-gray-300 mb-3 text-center">
            {setup.text}
          </p>

          {/* NPC dialogue */}
          <div className="bg-gray-900/60 border border-purple-600/30 rounded-xl p-4 mb-6 text-center text-lg text-purple-200 font-medium">
            {npcDialogue.text}
          </div>

          {/* Choices */}
          <div className="flex flex-col gap-3">
            {eventData.options.map((option, idx) => {
              const choice = resolveEventLine(
                { zh: option.text_zh, target: null, en: option.translation, ja: option.text },
                uiLanguage
              )
              const choiceHover = buildChoiceHoverTooltip(option, uiLanguage)
              return (
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
                {choiceHover ? (
                  <HoverTranslate translation={choiceHover} className="text-white font-medium">
                    {choice.text}
                  </HoverTranslate>
                ) : (
                  <span className="text-white font-medium">{choice.text}</span>
                )}
              </motion.button>
              )
            })}
          </div>

          {/* Outcome display */}
          <AnimatePresence>
            {showOutcomeBlock && outcome && (
              (() => {
                const localizedOutcome = resolveEventLine(
                  {
                    zh: outcome.outcome_text_zh,
                    target: outcome.outcome_text_target,
                    en: outcome.outcome_text,
                    ja: null,
                  },
                  uiLanguage
                )
                const localizedRewardDesc = resolveEventLine(
                  {
                    zh: outcome.reward?.description_zh,
                    target: outcome.reward?.description_target,
                    en: outcome.reward?.description,
                    ja: null,
                  },
                  uiLanguage
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
                <p className="mb-1">{localizedOutcome.text}</p>
                {needsRemovePick && removeCardResolved && removableInstances.length === 0 ? (
                  <p className="text-xs text-amber-300/90 mt-1">{t('merchant.removeNoCards')}</p>
                ) : null}
                {localizedRewardDesc.text ? (
                  <p className="text-xs text-gray-400">{localizedRewardDesc.text}</p>
                ) : null}
              </motion.div>
                )
              })()
            )}
          </AnimatePresence>

          {/* Continue button */}
          {canLeaveEvent && (
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

        {/* Pick a card to remove (events with reward.type remove_card) */}
        <AnimatePresence>
          {showRemoveModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75"
            >
              <div
                className="max-w-lg w-full rounded-2xl border border-purple-700/50 bg-gray-950/95 p-4 shadow-xl"
                role="dialog"
                aria-modal="true"
                aria-labelledby="event-remove-card-title"
              >
                <h2 id="event-remove-card-title" className="text-sm font-bold text-gray-200 mb-1">
                  {t('merchant.removeCardTitle')}
                </h2>
                <p className="text-xs text-gray-500 mb-3">{t('merchant.removeCardHint')}</p>
                <div className="max-h-[min(70vh,26rem)] overflow-y-auto flex flex-col gap-2 pr-1">
                  {removableInstances.map((row) => {
                    const card = cardMap[row.cardId]
                    if (!card) {
                      return (
                        <button
                          key={row.key}
                          type="button"
                          onClick={() => applyRemoveCardPick(row)}
                          className="text-left w-full rounded-xl border border-red-800/70 bg-red-950/35 px-3 py-2.5 hover:bg-red-900/45 transition-colors"
                        >
                          <div className="text-sm font-semibold text-red-100">{row.cardId}</div>
                          <div className="text-[11px] text-gray-500 mt-1">{t('merchant.effectSpecial')}</div>
                        </button>
                      )
                    }
                    const flavor =
                      (i18n.language === 'zh'
                        ? (card.flavor_target || card.flavor_native)
                        : (card.flavor_native || card.flavor_target)) || ''
                    return (
                      <button
                        key={row.key}
                        type="button"
                        onClick={() => applyRemoveCardPick(row)}
                        className="text-left w-full rounded-xl border border-red-800/70 bg-red-950/35 px-3 py-2.5 hover:bg-red-900/45 transition-colors"
                      >
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                          <span className="text-sm font-semibold text-red-100">{cardDisplayName(card)}</span>
                          <span className="text-[11px] text-gray-500 tabular-nums">
                            ⚡{card.energy_cost ?? '–'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-300 mt-1.5 leading-snug">
                          {formatCardEffectLines(card, 0, t)}
                        </p>
                        {flavor ? (
                          <p className="text-[11px] text-gray-500 mt-1.5 italic leading-snug">{flavor}</p>
                        ) : null}
                      </button>
                    )
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        </div>
      </div>
    </ScreenTransition>
  )
}
