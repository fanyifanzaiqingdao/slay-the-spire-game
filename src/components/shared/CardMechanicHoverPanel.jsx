// Hover glossary for card mechanic keywords (poison, vulnerable, first try, chain, …)
import React, { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { collectMechanicIdsFromCard } from '../../utils/cardMechanicGlossary.js'

/**
 * Absolutely positioned panel — parent must be `relative group`.
 * Shows when pointer hovers the card (group-hover).
 *
 * @param {'top'|'bottom'} position — panel grows toward top (above card) or below card
 */
export function CardMechanicHoverPanel({ card, position = 'top', className = '' }) {
  const { t } = useTranslation()
  const ids = useMemo(() => collectMechanicIdsFromCard(card), [card])

  if (!ids.length) return null

  const posCls =
    position === 'bottom'
      ? 'top-full mt-1'
      : 'bottom-full mb-1'

  return (
    <div
      className={`
        absolute left-1/2 -translate-x-1/2 ${posCls} z-[400] w-[min(16rem,calc(100vw-1rem))]
        opacity-0 invisible scale-95
        group-hover:opacity-100 group-hover:visible group-hover:scale-100
        transition-all duration-150 ease-out
        pointer-events-none group-hover:pointer-events-auto
        ${className}
      `}
      role="tooltip"
    >
      <div
        className="rounded-lg border border-amber-600/60 bg-gray-950/98 px-2 py-2 shadow-2xl backdrop-blur-sm"
        style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.85)' }}
      >
        <div className="text-[9px] font-bold uppercase tracking-wide text-amber-400/95 mb-1.5 border-b border-amber-700/40 pb-1">
          {t('cardGlossary.sectionTitle')}
        </div>
        <ul className="space-y-1.5 max-h-[min(12rem,40vh)] overflow-y-auto pr-0.5">
          {ids.map((id) => (
            <li key={id} className="text-left">
              <span className="text-[10px] font-bold text-amber-100">
                {t(`cardGlossary.${id}.name`)}
              </span>
              <p className="text-[9px] leading-snug text-gray-200 mt-0.5">
                {t(`cardGlossary.${id}.desc`)}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
