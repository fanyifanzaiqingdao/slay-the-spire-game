// components/rooms/MerchantRoom.jsx
import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
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
  pickMerchantRelicOffers,
  SAMPLE_TRAY_RELIC_ID,
  SAMPLE_TRAY_FREE_REROLLS,
} from '../../data/relics.js'
import { relicLocalizedName, relicLocalizedDescription } from '../../utils/relicI18n.js'
import { getCardEffectParts } from '../../utils/cardEffectI18n.js'
import { CardMechanicHoverPanel } from '../shared/CardMechanicHoverPanel.jsx'

const CARD_PRICES = { common: 40, uncommon: 80, rare: 140 }
const REMOVE_PRICE = 75
const RELIC_PRICE = 165
const REROLL_CARDS_PRICE = 50
const RELIC_OFFER_SLOTS = 4

/** Migrate persisted merchant offers: single `relicId` / `relicBought` → four slots. */
function normalizeMerchantRelicOffer(mo) {
  const pad = (ids, pur) => {
    const pi = [...ids]
    while (pi.length < RELIC_OFFER_SLOTS) pi.push(null)
    const pp = [...pur]
    while (pp.length < RELIC_OFFER_SLOTS) pp.push(false)
    return {
      relicIds: pi.slice(0, RELIC_OFFER_SLOTS),
      relicsPurchased: pp.slice(0, RELIC_OFFER_SLOTS),
    }
  }
  if (!mo) return pad([], [])
  if (Array.isArray(mo.relicIds)) {
    return pad(
      mo.relicIds,
      Array.isArray(mo.relicsPurchased) ? mo.relicsPurchased : [],
    )
  }
  if (mo.relicId != null) {
    return pad([mo.relicId], [Boolean(mo.relicBought)])
  }
  return pad([], [])
}

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
  const [removeModalOpen, setRemoveModalOpen] = useState(false)
  const [dialogueIdx, setDialogueIdx] = useState(0)
  const [notification, setNotification] = useState(null)
  const [shopRelicIds, setShopRelicIds] = useState(() => Array.from({ length: RELIC_OFFER_SLOTS }, () => null))
  const [relicsPurchased, setRelicsPurchased] = useState(() => Array(RELIC_OFFER_SLOTS).fill(false))

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
      const rawList = Array.isArray(mod.default) ? mod.default : []
      const map = {}
      rawList.forEach((c) => {
        map[c.id] = c
      })
      setCardMap(map)
      const allCards = filterCardsForAct1Draft(rawList, rs)

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
        const { relicIds, relicsPurchased: rp } = normalizeMerchantRelicOffer(mo)
        setShopRelicIds(relicIds)
        setRelicsPurchased(rp)
        setPurchased(new Set(mo.purchasedCardIds || []))
        useRunStore.setState((s) => {
          if (!s.merchantOffer) return {}
          return {
            merchantOffer: {
              ...s.merchantOffer,
              relicIds,
              relicsPurchased: rp,
            },
          }
        })
      } else {
        const picked = pickEightShopCards(allCards)
        const relicIds = pickMerchantRelicOffers(rs, RELIC_OFFER_SLOTS)
        const rp = Array(RELIC_OFFER_SLOTS).fill(false)
        const freeRerollsLeft = rs.relics?.includes(SAMPLE_TRAY_RELIC_ID) ? SAMPLE_TRAY_FREE_REROLLS : 0
        setShopCards(picked)
        setShopRelicIds(relicIds)
        setRelicsPurchased(rp)
        setPurchased(new Set())
        useRunStore.setState({
          merchantOffer: {
            nodeKey,
            cardIds: picked.map(c => c.id),
            relicIds,
            relicsPurchased: rp,
            purchasedCardIds: [],
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
    setRemoveModalOpen(false)
    playSFX('correct')
    setNotification(t('merchant.cardRemoved'))
    setTimeout(() => setNotification(null), 1800)
  }

  const buyRelic = (slotIndex) => {
    const rid = shopRelicIds[slotIndex]
    if (!rid || relicsPurchased[slotIndex]) return
    const price = RELIC_PRICE
    if (store.gold < price) {
      playSFX('wrong')
      setNotification(t('merchant.notEnoughGold'))
      setTimeout(() => setNotification(null), 1500)
      return
    }
    store.spendGold(price)
    store.addRelic(rid)
    setRelicsPurchased((prev) => {
      const next = [...prev]
      next[slotIndex] = true
      return next
    })
    useRunStore.setState((s) => {
      if (!s.merchantOffer) return {}
      const rp = [...(s.merchantOffer.relicsPurchased || [])]
      while (rp.length < RELIC_OFFER_SLOTS) rp.push(false)
      rp[slotIndex] = true
      return {
        merchantOffer: {
          ...s.merchantOffer,
          relicIds: s.merchantOffer.relicIds || shopRelicIds,
          relicsPurchased: rp.slice(0, RELIC_OFFER_SLOTS),
        },
      }
    })
    playSFX('correct')
    const name = relicLocalizedName(rid, RELICS[rid]?.name || rid)
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
      const { relicIds, relicsPurchased: rp } = normalizeMerchantRelicOffer(p)
      return {
        merchantOffer: {
          ...p,
          nodeKey,
          cardIds: picked.map((c) => c.id),
          purchasedCardIds: [],
          relicIds,
          relicsPurchased: rp,
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
          className="w-full h-full min-h-0 flex flex-col overflow-hidden pt-20"
          style={{ background: 'linear-gradient(180deg, #0a0516 0%, #001a00 100%)' }}
        >
        <div className="absolute inset-0 opacity-15"
          style={{ backgroundImage: 'radial-gradient(ellipse at 50% 30%, #00AA44 0%, transparent 60%)' }}
        />

        <div className="relative z-10 max-w-6xl mx-auto w-full px-4 py-6 flex flex-col h-full min-h-0">
          {/* Merchant header */}
          <div className="flex shrink-0 items-center gap-4 mb-6">
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

          {/* Shop cards — scroll so footer actions stay on screen */}
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain pb-2">
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
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {shopCards.map((card, cardIdx) => {
                const typeMeta = CARD_TYPE_META[card.type] || {}
                const rarityMeta = CARD_RARITY_META[card.rarity] || {}
                const effectParts = getCardEffectParts(card, 0, t)
                const effectTooltip = effectParts.join('\n')
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
                  <div key={`${card.id}-${cardIdx}`} className="flex flex-col items-stretch gap-2 min-w-0">
                    <div
                      title={effectTooltip}
                      className={`
                        relative group w-full min-h-[12rem] flex flex-col p-3 rounded-xl border-2 ${rarityMeta.borderClass}
                        ${typeMeta.bgClass} transition-all cursor-default
                        ${isSold ? 'opacity-40' : ''}
                      `}
                    >
                      <div className="flex justify-between items-start mb-2 shrink-0">
                        <span className="text-sm">{typeMeta.icon}</span>
                        <span className={`text-xs font-bold ${rarityMeta.gemClass?.replace('bg-', 'text-')}`}>
                          {rarityLabel}
                        </span>
                      </div>
                      <div className={`font-bold text-sm leading-tight ${typeMeta.colorClass} mb-1 shrink-0`}>
                        <HoverTranslate translation={card.name_native}>{card.name_target}</HoverTranslate>
                      </div>
                      <div className="text-xs text-gray-400 mb-2 shrink-0">{t('merchant.energyLine', { n: card.energy_cost })}</div>
                      <div
                        className="flex-1 flex flex-col gap-1.5 text-[11px] sm:text-xs text-gray-200 leading-snug break-words"
                        aria-label={effectTooltip}
                      >
                        {effectParts.map((line, li) => (
                          <p key={li} className="border-l-2 border-white/20 pl-2 text-gray-300">
                            {line}
                          </p>
                        ))}
                      </div>
                      <CardMechanicHoverPanel card={card} position="bottom" />
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

            <div className="mt-8">
                <h2 className="text-xs text-gray-400 uppercase tracking-wider mb-3">— {t('merchant.relicSection')} —</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-4xl mx-auto">
                  {shopRelicIds.map((rid, slotIndex) => {
                    if (!rid) {
                      return (
                        <div
                          key={`empty-${slotIndex}`}
                          className="flex flex-col gap-2 rounded-xl border border-gray-800/80 bg-gray-950/40 p-3 min-h-[120px] opacity-60"
                        >
                          <div className="text-xs text-gray-600 text-center py-6">{t('merchant.relicSlotEmpty')}</div>
                        </div>
                      )
                    }
                    const r = RELICS[rid]
                    if (!r) return null
                    const price = RELIC_PRICE
                    const sold = relicsPurchased[slotIndex]
                    const canAfford = store.gold >= price
                    return (
                      <div key={`${rid}-${slotIndex}`} className="flex flex-col items-stretch gap-2">
                        <div
                          className="w-full p-3 rounded-xl border-2 border-amber-700/60 bg-amber-950/20 flex items-start gap-2 flex-1"
                          style={{ boxShadow: '0 0 12px rgba(251,191,36,0.15)' }}
                        >
                          <span className="text-2xl shrink-0">{r.icon}</span>
                          <div className="flex-1 text-left min-w-0">
                            <div className="font-bold text-amber-100 text-sm leading-tight" style={{ color: r.color }}>{relicLocalizedName(rid, r.name)}</div>
                            <div className="text-[10px] text-gray-400 mt-1 leading-snug">{relicLocalizedDescription(rid, r.description)}</div>
                          </div>
                        </div>
                        <motion.button
                          whileHover={!sold && canAfford ? { scale: 1.02 } : {}}
                          whileTap={!sold && canAfford ? { scale: 0.98 } : {}}
                          onClick={() => !sold && buyRelic(slotIndex)}
                          disabled={sold || !canAfford}
                          className={`
                            px-3 py-1.5 rounded-lg text-sm font-bold border transition-all w-full
                            ${sold ? 'bg-gray-800 border-gray-700 text-gray-600 cursor-default' :
                              canAfford ? 'bg-amber-900/50 border-amber-600 text-amber-100 hover:bg-amber-800/50 cursor-pointer' :
                              'bg-gray-800 border-gray-700 text-gray-600 cursor-default opacity-60'}
                          `}
                        >
                          {sold ? `✓ ${t('merchant.sold')}` : t('merchant.buyFor', { price })}
                        </motion.button>
                      </div>
                    )
                  })}
                </div>
              </div>
          </div>

          {/* Remove card service */}
          <div className="shrink-0 border-t border-gray-800 pt-4 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-gray-300">{t('merchant.removeCardTitle')}</div>
                <div className="text-xs text-gray-500">{t('merchant.removeCardHint')}</div>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  playSFX('button_click')
                  if (store.gold < REMOVE_PRICE) return
                  if (removableInstances.length === 0) {
                    setNotification(t('merchant.removeNoCards'))
                    setTimeout(() => setNotification(null), 1500)
                    return
                  }
                  setRemoveModalOpen(true)
                }}
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
          </div>

          {/* Leave button */}
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => { playSFX('button_click'); sessionStorage.removeItem('active_encounter'); navigate('/map') }}
            className="shrink-0 w-full py-3 rounded-xl border border-gray-700 bg-gray-800/40 text-gray-300 hover:bg-gray-700/40 transition-all font-medium"
          >
            {t('merchant.leaveShop')}
          </motion.button>
        </div>

        {/* Remove card — same modal pattern as EventRoom */}
        <AnimatePresence>
          {removeModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75"
              onClick={(e) => {
                if (e.target === e.currentTarget) setRemoveModalOpen(false)
              }}
            >
              <div
                className="max-w-lg w-full rounded-2xl border border-purple-700/50 bg-gray-950/95 p-4 shadow-xl"
                role="dialog"
                aria-modal="true"
                aria-labelledby="merchant-remove-card-title"
                onClick={(e) => e.stopPropagation()}
              >
                <h2 id="merchant-remove-card-title" className="text-sm font-bold text-gray-200 mb-1">
                  {t('merchant.removeCardTitle')}
                </h2>
                <p className="text-xs text-gray-500 mb-1">{t('merchant.removeCardHint')}</p>
                <p className="text-xs text-amber-200/90 mb-3">
                  {t('merchant.removeAction', { price: REMOVE_PRICE })}
                </p>
                <div className="max-h-[min(70vh,26rem)] overflow-y-auto flex flex-col gap-2 pr-1">
                  {removableInstances.length === 0 ? (
                    <p className="text-xs text-gray-500 py-2">{t('merchant.removeNoCards')}</p>
                  ) : (
                    removableInstances.map((row) => {
                      const card = cardMap[row.cardId]
                      if (!card) {
                        return (
                          <button
                            key={row.key}
                            type="button"
                            onClick={() => removeCard(row)}
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
                      const rmParts = getCardEffectParts(card, 0, t)
                      return (
                        <button
                          key={row.key}
                          type="button"
                          onClick={() => removeCard(row)}
                          className="text-left w-full rounded-xl border border-red-800/70 bg-red-950/35 px-3 py-2.5 hover:bg-red-900/45 transition-colors"
                        >
                          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                            <span className="text-sm font-semibold text-red-100">{cardDisplayName(card)}</span>
                            <span className="text-[11px] text-gray-500 tabular-nums">
                              ⚡{card.energy_cost ?? '–'}
                            </span>
                          </div>
                          <div className="mt-1.5 flex flex-col gap-1">
                            {rmParts.map((line, li) => (
                              <p key={li} className="text-xs text-gray-300 leading-snug border-l-2 border-white/15 pl-2">
                                {line}
                              </p>
                            ))}
                          </div>
                          {flavor ? (
                            <p className="text-[11px] text-gray-500 mt-1.5 italic leading-snug">{flavor}</p>
                          ) : null}
                        </button>
                      )
                    })
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => { playSFX('button_click'); setRemoveModalOpen(false) }}
                  className="mt-4 w-full py-2 rounded-lg border border-gray-700 bg-gray-800/60 text-gray-300 text-sm hover:bg-gray-700/60"
                >
                  {t('common.close')}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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

