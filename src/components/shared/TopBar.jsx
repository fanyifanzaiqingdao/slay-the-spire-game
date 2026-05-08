// components/shared/TopBar.jsx (optimized)
// Optimization: use fine-grained selectors instead of subscribing to the entire store.
// This prevents TopBar from re-rendering on every combat state mutation.
import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import useRunStore from '../../stores/runStore.js'
import useSettingsStore from '../../stores/settingsStore.js'
import { useAudio } from '../../hooks/useAudio.js'
import { JournalOverlay } from '../journal/JournalOverlay.jsx'
import { PotionSlots } from '../combat/PotionSlots.jsx'
import { usePotions } from '../../hooks/usePotions.js'
import { RelicSlots } from './RelicSlots.jsx'
import { VaultScreen } from '../menus/VaultScreen.jsx'
import { MapOverlay } from '../map/MapOverlay.jsx'
import { RELICS } from '../../data/relics.js'
import { relicLocalizedName, relicLocalizedDescription } from '../../utils/relicI18n.js'
import { CARD_TYPE_META, CARD_RARITY_META } from '../../constants/cardTypes.js'
import { HoverTranslate } from './HoverTranslate.jsx'
import { DevDebugOverlay } from '../dev/DevDebugOverlay.jsx'

// Fine-grained selectors — each subscribes only to the fields it needs.
// This prevents unnecessary re-renders when unrelated state changes.
const selectCharacterName = s => s.character?.name || 'Traveler'
const selectHp = s => s.hp
const selectMaxHp = s => s.maxHp
const selectGold = s => s.gold
const selectFloor = s => s.floor
const selectPotions = s => s.potions
const selectRelics = s => s.relics
const selectVaultRelics = s => s.vaultRelics
const selectCampaign = s => s.campaign
const selectInCombat = s => s.inCombat
const selectDeck = s => s.deck
const selectHand = s => s.hand
const selectDiscardPile = s => s.discardPile
const selectExhaustPile = s => s.exhaustPile
const selectIceboxCardIds = s => s.iceboxCardIds ?? []
const selectJournalWords = s => s.journalWords
const selectJournalGrammar = s => s.journalGrammar

export function TopBar({ hideMapButton = false, potionsLocked = false }) {
  const { t } = useTranslation()
  const characterName = useRunStore(selectCharacterName)
  const hp = useRunStore(selectHp)
  const maxHp = useRunStore(selectMaxHp)
  const gold = useRunStore(selectGold)
  const floor = useRunStore(selectFloor)
  const potions = useRunStore(selectPotions)
  const relics = useRunStore(selectRelics)
  const vaultRelics = useRunStore(selectVaultRelics)
  const campaign = useRunStore(selectCampaign)
  const inCombat = useRunStore(selectInCombat)
  const deck = useRunStore(selectDeck)
  const hand = useRunStore(selectHand)
  const discardPile = useRunStore(selectDiscardPile)
  const exhaustPile = useRunStore(selectExhaustPile)
  const iceboxCardIds = useRunStore(selectIceboxCardIds)
  const hasSprintIcebox = useRunStore(s => s.relics.includes('sprint_icebox'))
  const journalWords = useRunStore(selectJournalWords)
  const journalGrammar = useRunStore(selectJournalGrammar)

  const navigate = useNavigate()
  const location = useLocation()
  const { playSFX } = useAudio()

  const [openModal, setOpenModal] = useState(null) // 'deck' | 'relics' | 'map' | 'settings' | 'journal' | 'vault' | 'devDebug'

  const closeModal = () => setOpenModal(null)

  const handleOpen = (modal) => {
    playSFX('button_click')
    setOpenModal(modal)
  }

  const { usePotion } = usePotions({ isQuestionOpen: potionsLocked, playSFX })

  // Compute master deck only when deck overlay is open
  const masterDeck = useMemo(() => {
    if (openModal !== 'deck') return []
    return inCombat
      ? [...deck, ...hand, ...discardPile, ...(exhaustPile || [])]
      : deck
  }, [openModal, inCombat, deck, hand, discardPile, exhaustPile])

  return (
    <div className="relative w-full z-50">
      <div
        className="flex items-center justify-between px-4 py-1.5 w-full relative z-40"
        style={{
          background: 'linear-gradient(180deg, #2b353f 0%, #1a2228 100%)',
          borderBottom: '2px solid #111',
          boxShadow: '0 4px 10px rgba(0,0,0,0.6)',
          color: '#ddd',
          fontSize: '0.85rem'
        }}
      >
        {/* Left: Player Info — wrap so potions + relics stay visible (relics are NOT the urn icons) */}
        <div className="flex items-center flex-wrap gap-x-3 gap-y-1 min-w-0 flex-1 mr-2">
          <div className="flex flex-col justify-center mr-1 shrink-0">
            <div className="font-bold text-white text-base leading-none">{characterName}</div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-red-400">❤️</span>
            <span className="font-bold text-red-100">{hp}/{maxHp}</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-yellow-400">🪙</span>
            <span className="font-bold text-yellow-100">{gold}</span>
          </div>

          {/* Potion Slots — urn/vial shapes are EMPTY potion bottles, not relics */}
          <div
            className="flex items-center gap-1 ml-1 sm:ml-2 border-l border-gray-600 pl-2 shrink-0"
            title={t('topbar.potionsHint')}
          >
            <span className="text-[9px] text-gray-500 uppercase tracking-wider leading-none shrink-0">{t('topbar.potions')}</span>
            <PotionSlots
              potions={potions}
              onUse={usePotion}
              isLocked={potionsLocked}
              campaign={campaign}
            />
          </div>

          {/* Relic Slots — count + emoji + English name (starter is only 1 relic at run start) */}
          <div
            className="flex items-center gap-1.5 ml-1 sm:ml-2 border-l border-gray-600 pl-2 shrink-0 min-w-0 overflow-visible rounded-r-md bg-amber-950/30 px-2 py-1 ring-1 ring-amber-600/35"
            title={t('topbar.relicsHint')}
          >
            <span className="text-[9px] text-amber-200 font-bold leading-none shrink-0 whitespace-nowrap">
              {t('topbar.relicsCount', { count: Array.isArray(relics) ? relics.length : 0 })}
            </span>
            <RelicSlots
              equippedRelics={relics}
              campaign={campaign}
            />
            {/* Vault indicator */}
            {vaultRelics?.length > 0 && (
              <button
                onClick={() => handleOpen('vault')}
                className="ml-1 flex items-center gap-0.5 text-[10px] text-gray-500 hover:text-gray-300 transition-colors cursor-pointer bg-gray-800/60 px-1.5 py-0.5 rounded border border-gray-700 hover:border-gray-500"
                title={t('topbar.viewVault')}
              >
                🗄 {vaultRelics.length}
              </button>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          <div className="bg-gray-800/80 px-2 py-0.5 rounded border border-gray-600 font-bold mr-2">
            {t('topbar.floor', { floor })}
          </div>

          <button onClick={() => handleOpen('deck')} className="text-xl hover:scale-110 transition-transform cursor-pointer" title={t('topbar.viewDeck')}>
            🃏
          </button>

          {(!hideMapButton || location.pathname !== '/map') && (
            <button onClick={() => handleOpen('map')} className="text-xl hover:scale-110 transition-transform cursor-pointer" title={t('topbar.viewMap')}>
              🗺️
            </button>
          )}

          <button onClick={() => handleOpen('journal')} className="text-xl hover:scale-110 transition-transform cursor-pointer" title={t('topbar.openJournal')}>
            📖
          </button>

          <button onClick={() => handleOpen('settings')} className="text-xl hover:scale-110 transition-transform cursor-pointer" title={t('topbar.openSettings')}>
            ⚙️
          </button>
          {import.meta.env.DEV && (
            <button
              type="button"
              onClick={() => handleOpen('devDebug')}
              className="text-lg hover:scale-110 transition-transform cursor-pointer text-amber-500/90"
              title="Local debug (dev)"
            >
              🛠
            </button>
          )}
        </div>
      </div>

      {/* OVERLAYS */}
      <AnimatePresence>
        {openModal === 'settings' && (
          <SettingsOverlay onClose={closeModal} />
        )}
        {import.meta.env.DEV && openModal === 'devDebug' && (
          <DevDebugOverlay onClose={closeModal} />
        )}
        {openModal === 'deck' && (
          <DeckOverlay
            onClose={closeModal}
            deck={masterDeck}
            title={t('overlays.masterDeck')}
            iceboxIds={iceboxCardIds}
            iceboxMode={hasSprintIcebox && !inCombat}
            onParkDeckIndex={(i) => useRunStore.getState().parkDeckSlotAtIndex(i)}
            onUnparkIceboxSlot={(i) => useRunStore.getState().unparkIceboxSlot(i)}
          />
        )}
        {openModal === 'relics' && (
          <RelicsOverlay onClose={closeModal} relics={relics} vaultRelics={vaultRelics} />
        )}
        {openModal === 'vault' && (
          <VaultScreen onClose={closeModal} />
        )}
        {openModal === 'map' && (
          <MapOverlay onClose={closeModal} />
        )}
        {openModal === 'journal' && (
          <JournalOverlay onClose={closeModal} words={journalWords} grammar={journalGrammar} />
        )}
      </AnimatePresence>
    </div>
  )
}

function SettingsOverlay({ onClose }) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const uiLanguage = useSettingsStore(s => s.uiLanguage)
  const setUiLanguage = useSettingsStore(s => s.setUiLanguage)
  const { playSFX } = useAudio()

  const handleQuit = () => {
    playSFX('button_click')
    navigate('/')
  }

  const handleAbandon = () => {
    playSFX('button_click')
    useRunStore.getState().endRun()
    navigate('/')
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={e => e.stopPropagation()}
        className="rounded-2xl border border-gray-600 p-8 w-96 flex flex-col gap-4"
        style={{ background: 'linear-gradient(160deg, #1a1208, #0d0d0d)', boxShadow: '0 0 60px rgba(0,0,0,0.8)' }}
      >
        <h2 className="text-2xl font-bold text-amber-300 text-center mb-4" style={{ fontFamily: "'Cinzel', serif" }}>{t('common.settings')}</h2>

        <button className="w-full py-3 rounded-lg border border-gray-600 text-gray-200 hover:bg-gray-800 transition-colors cursor-pointer">
          {t('overlays.options')}
        </button>

        <div className="w-full flex items-center justify-between rounded-lg border border-gray-700 px-3 py-2 text-sm text-gray-200">
          <span>{t('language.label')}</span>
          <select
            value={uiLanguage}
            onChange={(e) => setUiLanguage(e.target.value)}
            className="bg-black/40 border border-gray-600 rounded px-2 py-1 text-amber-300"
          >
            <option value="en">{t('language.en')}</option>
            <option value="zh">{t('language.zh')}</option>
          </select>
        </div>

        <button
          onClick={handleAbandon}
          className="w-full py-3 rounded-lg border border-gray-600 text-gray-200 hover:bg-gray-800 transition-colors cursor-pointer"
        >
          {t('overlays.abandonRun')}
        </button>

        <button
          onClick={handleQuit}
          className="w-full py-3 rounded-lg border border-amber-800 bg-amber-950/30 text-amber-200 hover:bg-amber-900/50 hover:border-amber-600 transition-all font-bold cursor-pointer"
        >
          {t('overlays.saveQuit')}
        </button>

        <button
          onClick={onClose}
          className="w-full py-3 mt-4 rounded-lg border border-gray-700 bg-gray-900 text-gray-400 hover:text-white transition-colors cursor-pointer"
        >
          {t('overlays.returnGame')}
        </button>
      </motion.div>
    </motion.div>
  )
}

const cardsCache = {}
async function loadCardsForCampaign(campaign) {
  if (cardsCache[campaign]) return cardsCache[campaign]
  try {
    const mod = await import(`../../data/${campaign}/cards.json`)
    const map = {}
    for (const card of mod.default) map[card.id] = card
    cardsCache[campaign] = map
    return map
  } catch {
    return {}
  }
}

export function DeckOverlay({
  onClose,
  deck,
  title = 'Master Deck',
  iceboxIds = [],
  iceboxMode = false,
  onParkDeckIndex,
  onUnparkIceboxSlot,
  /** When set, each card is clickable; index passed for duplicate ids in pile. */
  pickMode = false,
  onPickCardIndex,
  pickSubtitle,
  /** When set (e.g. PvP screen), skip campaign fetch and use this map for card metadata. */
  cardMapOverride = null,
}) {
  const { t } = useTranslation()
  const campaign = useRunStore(selectCampaign)
  const [cardMap, setCardMap] = useState({})

  useEffect(() => {
    if (cardMapOverride && typeof cardMapOverride === 'object' && Object.keys(cardMapOverride).length > 0) {
      setCardMap(cardMapOverride)
      return
    }
    let cancelled = false
    loadCardsForCampaign(campaign || 'japanese').then((map) => {
      if (!cancelled) setCardMap(map)
    })
    return () => { cancelled = true }
  }, [campaign, cardMapOverride])

  const canParkMore = iceboxMode && iceboxIds.length < 2
  const iceboxSlots = [0, 1].map((slot) => iceboxIds[slot] ?? null)

  function renderMiniCard(cardId, key, opts = {}) {
    const { onClick, className = '' } = opts
    const card = cardMap[cardId]
    const typeMeta = card ? (CARD_TYPE_META[card.type] || {}) : {}
    const rarityMeta = card ? (CARD_RARITY_META[card.rarity] || {}) : {}
    const inner = card ? (
      <>
        <div className="flex items-center justify-between text-[10px]">
          <span>{typeMeta.icon || '🃏'}</span>
          <span className={`${rarityMeta.gemClass?.replace('bg-', 'text-') || 'text-gray-400'} font-bold`}>
            {card.rarity}
          </span>
        </div>
        <div className={`text-xs font-bold leading-tight ${typeMeta.colorClass || 'text-white'}`}>
          <HoverTranslate translation={card.name_native}>
            {card.name_target}
          </HoverTranslate>
        </div>
        <div className="text-[10px] text-gray-400 leading-tight">{card.name_native}</div>
        <div className="text-[10px] text-gray-300 mt-1">⚡ {card.energy_cost}</div>
        <div className="mt-auto text-[9px] text-gray-500 uppercase">{card.type}</div>
      </>
    ) : (
      <div className="h-full flex items-center justify-center text-xs font-bold text-gray-300 break-words">
        {t('overlays.unknownCard', { id: cardId })}
      </div>
    )
    const Tag = onClick ? 'button' : 'div'
    return (
      <Tag
        key={key}
        type={onClick ? 'button' : undefined}
        onClick={onClick}
        className={`w-32 h-44 rounded-lg border-2 flex flex-col text-center p-2 gap-1 bg-[#1b2533] ${className}`}
      >
        {inner}
      </Tag>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/90 flex flex-col p-8 overflow-hidden backdrop-blur-md"
    >
      <div className="flex justify-between items-start mb-4 gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white" style={{ fontFamily: "'Cinzel', serif" }}>
            {title} ({t('overlays.cardsCount', { count: deck.length })})
          </h2>
          {iceboxMode && (
            <p className="text-sm text-sky-200/90 mt-2 max-w-3xl leading-snug">
              {t('overlays.iceboxHint')}
            </p>
          )}
        </div>
        {!pickMode && (
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-white text-4xl cursor-pointer shrink-0">×</button>
        )}
      </div>

      {pickSubtitle && (
        <p className="text-sm text-amber-200/90 mb-4 max-w-3xl leading-snug">{pickSubtitle}</p>
      )}

      {iceboxMode && (
        <div className="mb-6 rounded-xl border border-sky-700/60 bg-sky-950/30 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sky-200 font-bold tracking-wide">🧊 {t('overlays.iceboxTitle')}</span>
            <span className="text-xs text-sky-300/80">{t('overlays.iceboxParkedCount', { current: iceboxIds.length })}</span>
          </div>
          <div className="flex flex-wrap gap-4 justify-center sm:justify-start">
            {iceboxSlots.map((cardId, slot) => (
              cardId
                ? renderMiniCard(cardId, `ice-${slot}`, {
                    onClick: () => onUnparkIceboxSlot?.(slot),
                    className: 'border-sky-500 cursor-pointer hover:ring-2 hover:ring-sky-400/80 hover:scale-[1.02] transition-transform',
                  })
                : (
                  <div
                    key={`ice-empty-${slot}`}
                    className="w-32 h-44 rounded-lg border-2 border-dashed border-sky-800/80 flex items-center justify-center text-xs text-sky-600/90 bg-black/20"
                  >
                    {t('overlays.iceboxEmpty')}
                  </div>
                  )
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 pb-20">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6 justify-items-center">
          {deck.map((cardId, i) => (
            (() => {
              const card = cardMap[cardId]
              const typeMeta = card ? (CARD_TYPE_META[card.type] || {}) : {}
              const rarityMeta = card ? (CARD_RARITY_META[card.rarity] || {}) : {}
              const parkable = canParkMore && onParkDeckIndex
              const cardBody = card ? (
                <>
                  <div className="flex items-center justify-between text-[10px]">
                    <span>{typeMeta.icon || '🃏'}</span>
                    <span className={`${rarityMeta.gemClass?.replace('bg-', 'text-') || 'text-gray-400'} font-bold`}>
                      {card.rarity}
                    </span>
                  </div>
                  <div className={`text-xs font-bold leading-tight ${typeMeta.colorClass || 'text-white'}`}>
                    <HoverTranslate translation={card.name_native}>
                      {card.name_target}
                    </HoverTranslate>
                  </div>
                  <div className="text-[10px] text-gray-400 leading-tight">{card.name_native}</div>
                  <div className="text-[10px] text-gray-300 mt-1">⚡ {card.energy_cost}</div>
                  <div className="mt-auto text-[9px] text-gray-500 uppercase">{card.type}</div>
                </>
              ) : (
                <div className="h-full flex items-center justify-center text-xs font-bold text-gray-300 break-words">
                  {t('overlays.unknownCard', { id: cardId })}
                </div>
              )
              const pickable = pickMode && typeof onPickCardIndex === 'function'
              const shellClass = `w-32 h-44 rounded-lg border-2 flex flex-col text-center p-2 gap-1 bg-[#1b2533] ${
                parkable ? 'border-cyan-600 cursor-pointer hover:ring-2 hover:ring-cyan-400/70 hover:scale-[1.02] transition-transform'
                  : pickable ? 'border-amber-500 cursor-pointer hover:ring-2 hover:ring-amber-400/80 hover:scale-[1.02] transition-transform'
                    : 'border-gray-600'
              }`
              if (parkable) {
                return (
                  <button type="button" key={`${cardId}-${i}`} onClick={() => onParkDeckIndex(i)} className={shellClass}>
                    {cardBody}
                  </button>
                )
              }
              if (pickable) {
                return (
                  <button type="button" key={`${cardId}-${i}`} onClick={() => onPickCardIndex(i)} className={shellClass}>
                    {cardBody}
                  </button>
                )
              }
              return (
                <div key={`${cardId}-${i}`} className={shellClass}>
                  {cardBody}
                </div>
              )
            })()
          ))}
        </div>
      </div>
    </motion.div>
  )
}

/** Full-screen: choose a hand card to exhaust and gain its energy cost (e.g. energy scavenge). */
export function HandExhaustEnergyPickOverlay({
  handIds = [],
  cardMap = {},
  onPickIndex,
  title = 'Exhaust a card',
  pickSubtitle,
}) {
  if (!handIds.length) return null
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/90 flex flex-col p-8 overflow-hidden backdrop-blur-md"
    >
      <div className="mb-4">
        <h2 className="text-3xl font-bold text-white" style={{ fontFamily: "'Cinzel', serif" }}>
          {title} ({handIds.length})
        </h2>
        {pickSubtitle && (
          <p className="text-sm text-amber-200/90 mt-2 max-w-3xl leading-snug">{pickSubtitle}</p>
        )}
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 pb-20">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6 justify-items-center">
          {handIds.map((cardId, i) => {
            const card = cardMap[cardId]
            const typeMeta = card ? (CARD_TYPE_META[card.type] || {}) : {}
            const rarityMeta = card ? (CARD_RARITY_META[card.rarity] || {}) : {}
            const gain = card?.energy_cost ?? 0
            return (
              <button
                type="button"
                key={`${cardId}-handex-${i}`}
                onClick={() => onPickIndex?.(i)}
                className="w-32 h-48 rounded-lg border-2 border-amber-600 flex flex-col text-center p-2 gap-1 bg-[#1b2533] cursor-pointer hover:ring-2 hover:ring-amber-400/80 hover:scale-[1.02] transition-transform"
              >
                {card ? (
                  <>
                    <div className="flex items-center justify-between text-[10px]">
                      <span>{typeMeta.icon || '🃏'}</span>
                      <span className={`${rarityMeta.gemClass?.replace('bg-', 'text-') || 'text-gray-400'} font-bold`}>
                        {card.rarity}
                      </span>
                    </div>
                    <div className={`text-xs font-bold leading-tight ${typeMeta.colorClass || 'text-white'}`}>
                      <HoverTranslate translation={card.name_native}>
                        {card.name_target}
                      </HoverTranslate>
                    </div>
                    <div className="text-[10px] text-amber-300/90 font-bold">+{gain} {t('draft.energy')}</div>
                    <div className="mt-auto text-[9px] text-gray-500 uppercase">{card.type}</div>
                  </>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-gray-300 break-words">
                    {cardId}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </motion.div>
  )
}

function RelicsOverlay({ onClose, relics, vaultRelics = [] }) {
  const { t } = useTranslation()
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
        onClick={e => e.stopPropagation()}
        className="rounded-2xl border border-gray-600 p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
        style={{ background: '#111', boxShadow: '0 0 60px rgba(0,0,0,0.8)' }}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-amber-300" style={{ fontFamily: "'Cinzel', serif" }}>{t('overlays.relics')}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-3xl cursor-pointer">×</button>
        </div>

        {/* Equipped */}
        <div className="mb-6">
          <div className="text-xs uppercase tracking-widest text-gray-500 mb-3">{t('overlays.equipped', { count: relics.length })}</div>
          {relics.length === 0 ? (
            <p className="text-gray-600 italic text-center py-4">{t('overlays.noRelics')}</p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {relics.map((relicId) => {
                const r = RELICS[relicId]
                return r ? (
                  <div key={relicId} className="flex flex-col items-center gap-1 p-3 bg-gray-900 rounded-lg border border-gray-700 w-24" title={relicLocalizedDescription(relicId, r.description)}>
                    <span className="text-2xl">{r.icon}</span>
                    <div className="text-[10px] text-center font-bold break-words w-full" style={{ color: r.color }}>{relicLocalizedName(relicId, r.name)}</div>
                    <div className="text-[9px] text-gray-600 uppercase">{t(`relic.tier.${r.tier}`, { defaultValue: r.tier })}</div>
                  </div>
                ) : (
                  <div key={relicId} className="w-24 h-16 bg-gray-900 rounded border border-gray-700 flex items-center justify-center text-xs text-gray-600">{relicId}</div>
                )
              })}
            </div>
          )}
        </div>

        {/* Vault */}
        {vaultRelics.length > 0 && (
          <div>
            <div className="text-xs uppercase tracking-widest text-gray-500 mb-3">{t('overlays.vault', { count: vaultRelics.length })}</div>
            <div className="flex flex-wrap gap-3">
              {vaultRelics.map((relicId) => {
                const r = RELICS[relicId]
                return r ? (
                  <div key={relicId} className="flex flex-col items-center gap-1 p-3 bg-gray-800/50 rounded-lg border border-gray-800 w-24 opacity-60" title={relicLocalizedDescription(relicId, r.description)}>
                    <span className="text-2xl">{r.icon}</span>
                    <div className="text-[10px] text-center font-bold break-words w-full" style={{ color: r.color }}>{relicLocalizedName(relicId, r.name)}</div>
                    <div className="text-[9px] text-gray-600 uppercase">{t(`relic.tier.${r.tier}`, { defaultValue: r.tier })}</div>
                  </div>
                ) : null
              })}
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
