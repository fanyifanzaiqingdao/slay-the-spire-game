// components/combat/CardHand.jsx — v2 (optimized)
// Renders up to 5 cards in a fanned arc layout.
// v2: passes isLocked and isSilenced to each card.
// Locked card clicks trigger shake animation instead of selection.
// Optimized: supports duplicate card IDs in hand, improved empty-hand UX.

import React, { useState, useCallback } from 'react'
import { AnimatePresence } from 'framer-motion'
import { CARD_TYPES } from '../../constants/cardTypes.js'
import CardComponent from './CardComponent.jsx'

function isCardPrimedForChain(card, chainActive, chainType, hasChainBracelet) {
  if (!chainActive || !chainType || !card) return false
  if (chainType === CARD_TYPES.VOCABULARY && card.type === CARD_TYPES.GRAMMAR) return true
  if (chainType === CARD_TYPES.GRAMMAR && card.type === CARD_TYPES.READING) return true
  if (hasChainBracelet && chainType === CARD_TYPES.GRAMMAR && card.type === CARD_TYPES.VOCABULARY) return true
  return false
}

/**
 * @param {string[]} handIds        - card IDs in current hand
 * @param {Object} cardMap          - map of cardId → card data
 * @param {number} currentEnergy    - player's current energy
 * @param {string[]} lockedCards    - v2: card IDs locked this turn
 * @param {string[]} silencedTypes  - v2: card types currently silenced (from debuffs)
 * @param {string[]} retainedCards  - v3: card IDs retained across turns
 * @param {Object} retainGrowthStacks - v3: map of cardId → number of growth stacks
 * @param {string|null} selectedCardId
 * @param {boolean} chainActive
 * @param {string|null} chainType   - type of chain active
 * @param {boolean} hasChainBracelet - relic: grammar → vocab completes chain
 * @param {boolean} disabled        - during enemy turn animation
 * @param {function} onCardSelect(cardId, indexInHand)
 * @param {React.RefObject<HTMLElement|null>} enemyDropZoneRef - drag card here to play
 * @param {function(boolean)=} onDragHoverEnemy - highlight enemy drop zone while dragging
 */
const CardHand = React.memo(function CardHand({
  handIds = [],
  cardMap = {},
  currentEnergy = 3,
  lockedCards = [],
  silencedTypes = [],
  retainedCards = [],
  retainGrowthStacks = {},
  selectedCardId = null,
  chainActive = false,
  chainType = null,
  hasChainBracelet = false,
  disabled = false,
  onCardSelect,
  enemyDropZoneRef = null,
  onDragHoverEnemy,
}) {
  // Track which card is currently shaking (locked or silenced click)
  const [shakingCardId, setShakingCardId] = useState(null)

  const handleCardClick = useCallback((cardId, indexInHand) => {
    if (disabled) return
    const card = cardMap[cardId]
    if (!card) return

    // v2: locked card → shake animation, no selection
    if (lockedCards.includes(cardId)) {
      setShakingCardId(cardId)
      setTimeout(() => setShakingCardId(null), 500)
      return
    }

    // v2: silenced type → shake and show (selection blocked in useCombat too)
    if (silencedTypes.includes(card.type)) {
      setShakingCardId(cardId)
      setTimeout(() => setShakingCardId(null), 500)
      return
    }

    onCardSelect?.(cardId, indexInHand)
  }, [disabled, lockedCards, silencedTypes, cardMap, onCardSelect])

  const cards = handIds.map(id => cardMap[id]).filter(Boolean)

  // Empty hand state
  if (cards.length === 0) {
    return (
      <div className="flex items-end justify-center px-4 pb-2 h-40">
        <p className="text-gray-600 text-sm italic pb-4">No cards in hand</p>
      </div>
    )
  }

  return (
    <div className={`flex items-end justify-center px-4 pb-2 ${cards.length <= 2 ? 'gap-6' : 'gap-1'}`}>
      <AnimatePresence mode="popLayout">
        {cards.map((card, i) => {
          const canAfford = currentEnergy >= card.energy_cost
          const isLocked = lockedCards.includes(card.id)
          const isSilenced = silencedTypes.includes(card.type)
          const isRetained = retainedCards.includes(card.id)
          const growthStacks = retainGrowthStacks[card.id] || 0
          const isPrimed = isCardPrimedForChain(card, chainActive, chainType, hasChainBracelet)

          return (
            <CardComponent
              // Deck can contain duplicate card IDs; key must be unique per slot.
              key={`${card.id}-${i}`}
              card={card}
              isPlayable={canAfford && !disabled}
              isLocked={isLocked}
              isSilenced={isSilenced}
              isPrimed={isPrimed}
              isRetained={isRetained}
              growthStacks={growthStacks}
              isSelected={selectedCardId === card.id}
              isShaking={shakingCardId === card.id}
              onSelect={(cid, idx) => handleCardClick(cid, idx)}
              enemyDropZoneRef={enemyDropZoneRef}
              onDragHoverEnemy={onDragHoverEnemy}
              indexInHand={i}
              totalInHand={cards.length}
            />
          )
        })}
      </AnimatePresence>
    </div>
  )
})

export default CardHand
