// components/rooms/MerchantRoom.jsx
import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import useRunStore from '../../stores/runStore.js'
import { HoverTranslate } from '../shared/HoverTranslate.jsx'
import { CARD_TYPE_META, CARD_RARITY_META } from '../../constants/cardTypes.js'
import { shuffle } from '../../utils/deck.js'
import { ScreenTransition } from '../shared/ScreenTransition.jsx'
import { TopBar } from '../shared/TopBar.jsx'
import { useAudio } from '../../hooks/useAudio.js'
import { filterCardsForAct1Draft } from '../../constants/act1Pool.js'
import {
  RELICS,
  pickRandomRelicForLoot,
  SAMPLE_TRAY_RELIC_ID,
  SAMPLE_TRAY_FREE_REROLLS,
} from '../../data/relics.js'
import { relicLocalizedName, relicLocalizedDescription } from '../../utils/relicI18n.js'

const CARD_PRICES = { common: 40, uncommon: 80, rare: 140 }
const REMOVE_PRICE = 75
const RELIC_PRICE = 165
const REROLL_CARDS_PRICE = 50

/** Eight cards: 3 common, 3 uncommon, 2 rare. */
function pickEightShopCards(allCards) {
  const commons = allCards.filter((c) => c.rarity === 'common')
  const uncommons = allCards.filter((c) => c.rarity === 'uncommon')
  const rares = allCards.filter((c) => c.rarity === 'rare')
  return [
    ...shuffle(commons).slice(0, 3),
    ...shuffle(uncommons).slice(0, 3),
    ...shuffle(rares).slice(0, 2),
  ].filter(Boolean)
}

export function MerchantRoom() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const store = useRunStore()
  const { playSFX, playMusic } = useAudio()
  const [shopCards, setShopCards] = useState([])
  const [cardMap, setCardMap] = useState({})
  const [purchased, setPurchased] = useState(new Set())
  const [removeMode, setRemoveMode] = useState(false)
  const [dialogueIdx, setDialogueIdx] = useState(0)
  const [notification, setNotification] = useState(null)
  const [shopRelicId, setShopRelicId] = useState(null)
  const [relicBought, setRelicBought] = useState(false)

  const merchantQuotes = useMemo(
    () => [t('merchant.quote0'), t('merchant.quote1'), t('merchant.quote2')],
    [t, i18n.language],
  )

  useEffect(() => {
    let cancelled = false
    const campaign = store.campaign || 'japanese'

    import(`../../data/${campaign}/cards.json`).then(mod => {
      if (cancelled) return
      const rs = useRunStore.getState()
      const allCards = filterCardsForAct1Draft(mod.default, rs)
      const map = {}
      allCards.forEach(c => { map[c.id] = c })
      setCardMap(map)

      const nodeKey = `${rs.runId ?? ''}|${rs.floor}|${rs.currentNodeId ?? ''}`
      const mo = rs.merchantOffer

      let restoredFromSave = null
      if (
        mo
        && mo.nodeKey === nodeKey
        && Array.isArray(mo.cardIds)
        && mo.cardIds.length > 0
      ) {
        restoredFromSave = mo.cardIds.map(id => map[id]).filter(Boolean)
      }

      if (restoredFromSave && restoredFromSave.length > 0) {
        setShopCards(restoredFromSave)
        setShopRelicId(mo.relicId ?? null)
        setPurchased(new Set(mo.purchasedCardIds || []))
        setRelicBought(Boolean(mo.relicBought))
      } else {
        const picked = pickEightShopCards(allCards)
        const relicId = pickRandomRelicForLoot(rs)
        const freeRerollsLeft = rs.relics?.includes(SAMPLE_TRAY_RELIC_ID) ? SAMPLE_TRAY_FREE_REROLLS : 0
        setShopCards(picked)
        setShopRelicId(relicId)
        setPurchased(new Set())
        setRelicBought(false)
        useRunStore.setState({
          merchantOffer: {
            nodeKey,
            cardIds: picked.map(c => c.id),
            relicId,
            purchasedCardIds: [],
            relicBought: false,
            freeRerollsLeft,
          },
        })
      }

      playMusic(campaign, rs.floor)
    })

    return () => { cancelled = true }
  }, [store.campaign, store.floor, store.runId, store.currentNodeId, playMusic])

  /** All card instances in the run (draw pile, hand, discard, exhaust, icebox) — same idea as master deck. */
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

  // Cycle merchant dialogue
  useEffect(() => {
    const n = merchantQuotes.length || 1
    const id = setInterval(() => {
      setDialogueIdx(i => (i + 1) % n)
    }, 3000)
    return () => clearInterval(id)
  }, [merchantQuotes.length])

  const cardDisplayName = (card) =>
    (i18n.language === 'zh' ? card.name_target : card.name_native) || card.name_target || card.name_native

  const buyCard = (card) => {
    // Curse: merchant_tax increases all prices
    const price = Math.ceil((CARD_PRICES[card.rarity] || 80))
    if (store.gold < price) {
      playSFX('wrong')
      setNotification(t('merchant.notEnoughGold'))
      setTimeout(() => setNotification(null), 1500)
      return
    }
    store.spendGold(price)
    store.addCardToDeck(card.id)
    setPurchased(prev => new Set([...prev, card.id]))
    useRunStore.setState(s => {
      if (!s.merchantOffer) return {}
      return {
        merchantOffer: {
          ...s.merchantOffer,
          purchasedCardIds: [...(s.merchantOffer.purchasedCardIds || []), card.id],
        },
      }
    })
    playSFX('correct')
    setNotification(t('merchant.cardAdded', { name: cardDisplayName(card) }))
    setTimeout(() => setNotification(null), 1800)
  }

  const removeCard = (instance) => {
    if (store.gold < REMOVE_PRICE) {
      playSFX('wrong')
      setNotification(t('merchant.notEnoughGold'))
      setTimeout(() => setNotification(null), 1500)
      return
    }
    store.spendGold(REMOVE_PRICE)
    store.removeCardInstance({ pile: instance.pile, index: instance.index })
    setRemoveMode(false)
    playSFX('correct')
    setNotification(t('merchant.cardRemoved'))
    setTimeout(() => setNotification(null), 1800)
  }

  const buyRelic = () => {
    if (!shopRelicId || relicBought) return
    const price = RELIC_PRICE
    if (store.gold < price) {
      playSFX('wrong')
      setNotification(t('merchant.notEnoughGold'))
      setTimeout(() => setNotification(null), 1500)
      return
    }
    store.spendGold(price)
    store.addRelic(shopRelicId)
    setRelicBought(true)
    useRunStore.setState(s => {
      if (!s.merchantOffer) return {}
      return { merchantOffer: { ...s.merchantOffer, relicBought: true } }
    })
    playSFX('correct')
    const name = relicLocalizedName(shopRelicId, RELICS[shopRelicId]?.name || shopRelicId)
    setNotification(t('merchant.relicAcquired', { name }))
    setTimeout(() => setNotification(null), 2000)
  }

  const dialogueLine = merchantQuotes[dialogueIdx % merchantQuotes.length]
  const has_compass = store.relics.includes('merchants_scale')

  const rerollShopCards = () => {
    const allCards = Object.values(cardMap)
    if (allCards.length === 0) return
    const rs = useRunStore.getState()
    const prev = rs.merchantOffer || {}
    const freeLeft = typeof prev.freeRerollsLeft === 'number' ? prev.freeRerollsLeft : 0

    let nextFree = freeLeft
    let paidGold = 0
    if (freeLeft > 0) {
      nextFree = freeLeft - 1
    } else if (rs.gold >= REROLL_CARDS_PRICE) {
      paidGold = REROLL_CARDS_PRICE
      nextFree = 0
    } else {
      playSFX('wrong')
      setNotification(t('merchant.notEnoughGold'))
      setTimeout(() => setNotification(null), 1500)
      return
    }

    const picked = pickEightShopCards(allCards)
    if (picked.length === 0) return
    if (paidGold > 0) rs.spendGold(paidGold)

    setShopCards(picked)
    setPurchased(new Set())
    useRunStore.setState((s) => {
      const nodeKey = `${s.runId ?? ''}|${s.floor}|${s.currentNodeId ?? ''}`
      const p = s.merchantOffer || {}
      return {
        merchantOffer: {
          ...p,
          nodeKey,
          cardIds: picked.map((c) => c.id),
          purchasedCardIds: [],
          relicId: p.relicId ?? null,
          relicBought: Boolean(p.relicBought),
          freeRerollsLeft: nextFree,
        },
      }
    })
    playSFX('button_click')
    setNotification(t('merchant.cardsRerolled'))
    setTimeout(() => setNotification(null), 1800)
  }

  const freeRerollsLeft = store.merchantOffer?.freeRerollsLeft ?? 0
  const canRerollCards =
    Object.keys(cardMap).length > 0 && (freeRerollsLeft > 0 || store.gold >= REROLL_CARDS_PRICE)

  return (
    <ScreenTransition>
      <div className="relative w-full h-screen flex flex-col items-center justify-center overflow-hidden" style={{ fontFamily: "'Crimson Text', Georgia, serif" }}>
        
        <div className="absolute top-0 left-0 w-full z-50">
          <TopBar />
        </div>

        <div
          className="w-full h-full flex flex-col overflow-hidden pt-20"
          style={{ background: 'linear-gradient(180deg, #0a0516 0%, #001a00 100%)' }}
        >
        <div className="absolute inset-0 opacity-15"
          style={{ backgroundImage: 'radial-gradient(ellipse at 50% 30%, #00AA44 0%, transparent 60%)' }}
        />

        <div className="relative z-10 max-w-5xl mx-auto w-full px-4 py-6 flex flex-col h-full">
          {/* Merchant header */}
          <div className="flex items-center gap-4 mb-6">
            <div className="text-5xl">🏮</div>
            <div className="flex-1">
              <div className="text-xl font-bold text-green-200">{t('merchant.title')}</div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-green-400 italic">
                  「{dialogueLine}」
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-yellow-400 font-bold text-lg">🪙 {store.gold}</div>
              <div className="text-xs text-gray-500">{t('merchant.goldLabel')}</div>
            </div>
          </div>

          {/* Shop cards */}
          <div className="flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h2 className="text-xs text-gray-400 uppercase tracking-wider">— {t('merchant.forSale')} —</h2>
              <motion.button
                type="button"
                whileHover={canRerollCards ? { scale: 1.03 } : {}}
                whileTap={canRerollCards ? { scale: 0.97 } : {}}
                onClick={() => canRerollCards && rerollShopCards()}
                disabled={!canRerollCards}
                className={`
                  px-3 py-1.5 rounded-lg text-xs font-bold border transition-all whitespace-nowrap
                  ${canRerollCards
                    ? 'bg-amber-950/70 border-amber-600/80 text-amber-100 hover:bg-amber-900/70 cursor-pointer'
                    : 'bg-gray-900 border-gray-700 text-gray-600 cursor-default opacity-70'}
                `}
              >
                {freeRerollsLeft > 0
                  ? t('merchant.rerollCardsButtonFree', { n: freeRerollsLeft })
                  : t('merchant.rerollCardsButton', { price: REROLL_CARDS_PRICE })}
              </motion.button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {shopCards.map((card, cardIdx) => {
                const typeMeta = CARD_TYPE_META[card.type] || {}
                const rarityMeta = CARD_RARITY_META[card.rarity] || {}
                const rarityLabel =
                  card.rarity === 'common'
                    ? t('merchant.rarityCommon')
                    : card.rarity === 'uncommon'
                      ? t('merchant.rarityUncommon')
                      : card.rarity === 'rare'
                        ? t('merchant.rarityRare')
                        : card.rarity
                const price = Math.floor((CARD_PRICES[card.rarity] || 80) * (has_compass ? 0.8 : 1))
                const isSold = purchased.has(card.id)
                const canAfford = store.gold >= price

                return (
                  <div key={`${card.id}-${cardIdx}`} className="flex flex-col items-center gap-2">
                    <div
                      className={`
                        w-36 p-3 rounded-xl border-2 ${rarityMeta.borderClass}
                        ${typeMeta.bgClass} transition-all
                        ${isSold ? 'opacity-40' : ''}
                      `}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-sm">{typeMeta.icon}</span>
                        <span className={`text-xs font-bold ${rarityMeta.gemClass?.replace('bg-', 'text-')}`}>
                          {rarityLabel}
                        </span>
                      </div>
                      <div className={`font-bold text-sm ${typeMeta.colorClass} mb-1`}>
                        <HoverTranslate translation={card.name_native}>{card.name_target}</HoverTranslate>
                      </div>
                      <div className="text-xs text-gray-400 mb-1">{t('merchant.energyLine', { n: card.energy_cost })}</div>
                      <div className="text-xs text-gray-300">{getEffectSummary(card, t)}</div>
                    </div>

                    <motion.button
                      whileHover={!isSold && canAfford ? { scale: 1.05 } : {}}
                      whileTap={!isSold && canAfford ? { scale: 0.95 } : {}}
                      onClick={() => !isSold && buyCard(card)}
                      disabled={isSold || !canAfford}
                      className={`
                        px-4 py-1.5 rounded-lg text-sm font-bold border transition-all
                        ${isSold ? 'bg-gray-800 border-gray-700 text-gray-600 cursor-default' :
                          canAfford ? 'bg-green-900/60 border-green-600 text-green-200 hover:bg-green-800/60 cursor-pointer' :
                          'bg-gray-800 border-gray-700 text-gray-600 cursor-default opacity-60'}
                      `}
                    >
                      {isSold ? `✓ ${t('merchant.sold')}` : t('merchant.buyFor', { price })}
                    </motion.button>
                  </div>
                )
              })}
            </div>

            {shopRelicId && (
              <div className="mt-8">
                <h2 className="text-xs text-gray-400 uppercase tracking-wider mb-3">— {t('merchant.relicSection')} —</h2>
                <div className="flex flex-col items-center gap-2 max-w-xs">
                  {(() => {
                    const r = RELICS[shopRelicId]
                    if (!r) return null
                    const price = RELIC_PRICE
                    const canAfford = store.gold >= price
                    return (
                      <>
                        <div
                          className="w-full p-4 rounded-xl border-2 border-amber-700/60 bg-amber-950/20 flex items-center gap-3"
                          style={{ boxShadow: '0 0 12px rgba(251,191,36,0.15)' }}
                        >
                          <span className="text-3xl">{r.icon}</span>
                          <div className="flex-1 text-left">
                            <div className="font-bold text-amber-100 text-sm" style={{ color: r.color }}>{relicLocalizedName(shopRelicId, r.name)}</div>
                            <div className="text-[10px] text-gray-400 mt-1 leading-snug">{relicLocalizedDescription(shopRelicId, r.description)}</div>
                          </div>
                        </div>
                        <motion.button
                          whileHover={!relicBought && canAfford ? { scale: 1.05 } : {}}
                          whileTap={!relicBought && canAfford ? { scale: 0.95 } : {}}
                          onClick={() => !relicBought && buyRelic()}
                          disabled={relicBought || !canAfford}
                          className={`
                            px-4 py-1.5 rounded-lg text-sm font-bold border transition-all
                            ${relicBought ? 'bg-gray-800 border-gray-700 text-gray-600 cursor-default' :
                              canAfford ? 'bg-amber-900/50 border-amber-600 text-amber-100 hover:bg-amber-800/50 cursor-pointer' :
                              'bg-gray-800 border-gray-700 text-gray-600 cursor-default opacity-60'}
                          `}
                        >
                          {relicBought ? `✓ ${t('merchant.sold')}` : t('merchant.buyFor', { price })}
                        </motion.button>
                      </>
                    )
                  })()}
                </div>
              </div>
            )}
          </div>

          {/* Remove card service */}
          <div className="border-t border-gray-800 pt-4 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-gray-300">{t('merchant.removeCardTitle')}</div>
                <div className="text-xs text-gray-500">{t('merchant.removeCardHint')}</div>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => { playSFX('button_click'); setRemoveMode(!removeMode) }}
                disabled={store.gold < REMOVE_PRICE}
                className={`
                  px-4 py-2 rounded-lg text-sm border transition-all
                  ${store.gold >= REMOVE_PRICE
                    ? 'bg-red-950/60 border-red-700 text-red-300 hover:bg-red-900/60 cursor-pointer'
                    : 'bg-gray-800 border-gray-700 text-gray-600 cursor-default opacity-50'}
                `}
              >
                {t('merchant.removeAction', { price: REMOVE_PRICE })}
              </motion.button>
            </div>

            {/* Remove mode: show deck */}
            {removeMode && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-3 max-h-32 overflow-y-auto"
              >
                <div className="flex flex-wrap gap-2">
                  {removableInstances.length === 0 && (
                    <span className="text-xs text-gray-500">{t('merchant.removeNoCards')}</span>
                  )}
                  {removableInstances.map((row) => {
                    const card = cardMap[row.cardId]
                    if (!card) return null
                    return (
                      <button
                        key={row.key}
                        onClick={() => removeCard(row)}
                        className="text-xs px-2 py-1 bg-red-950/40 border border-red-800 rounded text-red-200 hover:bg-red-900/60"
                      >
                        {cardDisplayName(card)}
                      </button>
                    )
                  })}
                </div>
              </motion.div>
            )}
          </div>

          {/* Leave button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => { playSFX('button_click'); sessionStorage.removeItem('active_encounter'); navigate('/map') }}
            className="w-full py-3 rounded-xl border border-gray-700 bg-gray-800/40 text-gray-300 hover:bg-gray-700/40 transition-all font-medium"
          >
            {t('merchant.leaveShop')}
          </motion.button>
        </div>

        {/* Notification toast */}
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-gray-900 border border-gray-700 text-white text-sm px-4 py-2 rounded-xl shadow-xl z-50"
          >
            {notification}
          </motion.div>
        )}
        </div>
      </div>
    </ScreenTransition>
  )
}

function getEffectSummary(card, t) {
  const e = card.effect || {}
  const parts = []
  if (e.damage) parts.push(t('merchant.effectDmg', { n: e.damage }))
  if (e.block) parts.push(t('merchant.effectBlock', { n: e.block }))
  if (e.heal) parts.push(t('merchant.effectHeal', { n: e.heal }))
  if (e.draw) parts.push(t('merchant.effectDraw', { n: e.draw }))
  if (e.reflect_stacks) parts.push(t('merchant.effectReflectStacks', { n: e.reflect_stacks }))
  if (e.reflect_damage) parts.push(t('merchant.effectReflectDmg', { n: e.reflect_damage }))
  if (e.pick_from_discard_to_hand) {
    parts.push(e.exhaust_self ? t('draft.effectPickFromDiscardExhaust') : t('draft.effectPickFromDiscardRetain'))
  }
  if (e.exhaust_one_hand_gain_its_energy) parts.push(t('draft.effectExhaustHandGainEnergy'))
  return parts.join(' / ') || t('merchant.effectSpecial')
}
