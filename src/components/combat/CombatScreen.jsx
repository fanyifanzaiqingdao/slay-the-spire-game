// components/combat/CombatScreen.jsx — STS style redesign
// Turn state machine: PLAYER_DRAW → PLAYER_TURN → ENEMY_TURN → FIGHT_END
// Assembles all combat components. Owns phase transitions.

import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import useRunStore from '../../stores/runStore.js'
import { useCombat } from '../../hooks/useCombat.js'
import { useEnemyTurn } from '../../hooks/useEnemyTurn.js'
import { useDraft } from '../../hooks/useDraft.js'
import { useAudio } from '../../hooks/useAudio.js'
import { generateFloorMap } from '../../utils/map.js'
import { EnemyDisplay } from './EnemyDisplay.jsx'
import CardHand from './CardHand.jsx'
import { JournalOverlay } from '../journal/JournalOverlay.jsx'
import DraftScreen from '../menus/DraftScreen.jsx'
import { BossDefeatScreen } from './BossDefeatScreen.jsx'
import { ScreenTransition } from '../shared/ScreenTransition.jsx'
import { TopBar, DeckOverlay, HandExhaustEnergyPickOverlay } from '../shared/TopBar.jsx'
import { EnergyOrb, CardPile } from './CombatHudPieces.jsx'
import { getRandomPotionDrop, getPotionDropRate, getPotionData } from '../../data/potions.js'
import { ACT1_MAX_FLOOR, isAct1ProgrammerRun } from '../../constants/act1Pool.js'
import { LootScreen } from './LootScreen.jsx'
import { RELICS, pickRandomRelicForLoot } from '../../data/relics.js'
import { relicLocalizedName } from '../../utils/relicI18n.js'
import { BLITZ_CLIPBOARD_MAX_TURNS, SCRIBES_SEAL_BONUS_DRAW_NEXT_FIGHT } from '../../constants/relicCombat.js'
import {
  collectMasterDeckIdsFromRunState,
  savePvpCollectionDeck,
} from '../../utils/pvpCollectionDeck.js'
import { getEffectiveEnergyCost } from '../../utils/relicCombatHelpers.js'
import { isOverloadMechanicsActive } from '../../utils/overloadMechanics.js'

/** Fallback when portrait PNG/SVG both fail — mirrors CharacterSelect tiles */
const ROLE_PORTRAIT_EMOJI = {
  kenji: '🖥️',
  ren: '🧪',
  minjun: '🎨',
  jiwoo: '✨',
  mateo: '📋',
  elena: '📈',
}

// Turn phases — explicit state machine per AGENT.md v2
// NOTE: CombatScreen subscribes to the full store because it reads many fields.
// TopBar has been optimized with fine-grained selectors to avoid cascading re-renders.
const PHASE = {
  PLAYER_DRAW: 'PLAYER_DRAW',
  PLAYER_TURN: 'PLAYER_TURN',
  ENEMY_TURN: 'ENEMY_TURN',
  BOSS_DEFEAT: 'BOSS_DEFEAT',
  FIGHT_END: 'FIGHT_END',
}

export function CombatScreen() {
  const { t } = useTranslation()
  const campaignId = sessionStorage.getItem('selected_campaign')
  const navigate = useNavigate()
  const store = useRunStore()

  const {
    cardMap, activeCardId, animState, damageNumbers,
    isEnemyDefeated, isPlayerDefeated,
    drawHand, selectCard, completeDiscardPickByIndex, completeHandExhaustEnergyPickByIndex,
  } = useCombat()

  const silencedTypes = useMemo(() => {
    const out = new Set()
    for (const d of store.activePlayerDebuffs) {
      if (d.type === 'silence' && d.target) out.add(d.target)
    }
    return [...out]
  }, [store.activePlayerDebuffs])

  const { draftCards, isDrafting, openDraft, pickCard, skipDraft } = useDraft()
  const { playMusic, playSFX, stopMusic } = useAudio()

  const [turnPhase, setTurnPhase] = useState(null)

  const programmerOverloadActive = isOverloadMechanicsActive(store)

  const hasPlayableCard = useMemo(() => {
    if (turnPhase !== PHASE.PLAYER_TURN) return false
    const silenced = new Set(silencedTypes)
    return store.hand.some((id) => {
      const c = cardMap[id]
      if (!c) return false
      if (store.lockedCards.includes(id)) return false
      if (silenced.has(c.type)) return false
      return store.energy >= getEffectiveEnergyCost(c, store.relics, programmerOverloadActive)
    })
  }, [turnPhase, store.hand, store.lockedCards, store.energy, cardMap, silencedTypes, store.relics, programmerOverloadActive])

  const [bossPhase, setBossPhase] = useState(1)
  const [isShakingEnemy, setIsShakingEnemy] = useState(false)

  const enemySlots = useMemo(() => {
    const slots = store.combatEnemySlots
    if (slots?.length) return slots
    if (store.currentEnemy) {
      return [{
        instanceId: 'legacy-0',
        def: store.currentEnemy,
        hp: store.enemyHp,
        maxHp: store.enemyMaxHp,
        intentIndex: store.intentIndex ?? 0,
        armor: store.enemyArmor ?? 0,
        furyStacks: store.enemyFuryStacks ?? 0,
        vulnerableTurns: store.combatEnemySlots?.[0]?.vulnerableTurns ?? 0,
        weakTurns: store.combatEnemySlots?.[0]?.weakTurns ?? 0,
        poisonStacks: store.combatEnemySlots?.[0]?.poisonStacks ?? 0,
      }]
    }
    return []
  }, [
    store.combatEnemySlots,
    store.currentEnemy,
    store.enemyHp,
    store.enemyMaxHp,
    store.intentIndex,
    store.enemyArmor,
    store.enemyFuryStacks,
  ])
  const [isHitPlayer, setIsHitPlayer] = useState(false)
  const [wrongFlash, setWrongFlash] = useState(false)
  const [journalOpen, setJournalOpen] = useState(false)
  const [openPile, setOpenPile] = useState(null) // 'draw' | 'discard' | null
  const [potionDropped, setPotionDropped] = useState(null) // { id, shattered } or null
  const [loot, setLoot] = useState(null) // Array of loot items when fight ends

  const fightStarted = useRef(false)
  const enemyDropZoneRef = useRef(null)
  /** Which loot row opened the current DraftScreen (e.g. `card` vs `card-swift-bonus`). */
  const activeDraftLootIdRef = useRef('card')
  const [enemyDropHighlight, setEnemyDropHighlight] = useState(false)
  /** PNG/SVG missing or blocked → show emoji slate instead of empty box */
  const [playerPortraitBroken, setPlayerPortraitBroken] = useState(false)

  // Read session each render so portrait path updates after startRun / backfill (useMemo would miss session writes)
  const portraitCampaign =
    store.campaign
    || campaignId
    || (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('lq_run_campaign_id') : '')
    || 'japanese'
  const portraitCharIdRaw =
    store.character?.id
    || (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('lq_run_character_id') : '')
    || 'kenji'
  const portraitCharId =
    portraitCampaign === 'japanese' && (portraitCharIdRaw === 'hana' || portraitCharIdRaw === 'yuki')
      ? 'kenji'
      : portraitCharIdRaw
  const portraitBase = `/images/characters/${portraitCampaign}/${portraitCharId}`

  useEffect(() => {
    setPlayerPortraitBroken(false)
  }, [portraitBase])

  // Backfill session portrait keys for runs started before lq_run_* was added (rehydrate-safe)
  useEffect(() => {
    try {
      if (typeof sessionStorage === 'undefined') return
      if (!store.runId || !store.character?.id) return
      if (!sessionStorage.getItem('lq_run_character_id')) {
        sessionStorage.setItem('lq_run_character_id', store.character.id)
        sessionStorage.setItem('lq_run_campaign_id', store.campaign || campaignId || 'japanese')
      }
    } catch {}
  }, [store.runId, store.character?.id, store.campaign, campaignId])

  const onEnemyDragHover = useCallback((over) => {
    setEnemyDropHighlight(Boolean(over))
  }, [])

  const { executeEnemyTurn, isExecuting: isEnemyTurnRunning, currentAction: enemyAction } = useEnemyTurn({
    onTurnComplete: () => {
      useRunStore.getState().tickEnemyWeakDecayAfterEnemyTurn()
      setTurnPhase(PHASE.PLAYER_DRAW)
    },
  })

  useEffect(() => {
    if (turnPhase !== PHASE.PLAYER_TURN) setEnemyDropHighlight(false)
  }, [turnPhase])

  /** Auto-clear impossible pending picks so End Turn / overlays recover without refresh. */
  useEffect(() => {
    const s = useRunStore.getState()
    if (s.pendingHandExhaustEnergyPick && s.hand.length === 0) {
      useRunStore.setState({ pendingHandExhaustEnergyPick: false })
    }
    if (s.pendingDiscardPick && s.discardPile.length === 0) {
      useRunStore.setState({ pendingDiscardPick: null })
    }
  }, [store.hand, store.discardPile, store.pendingHandExhaustEnergyPick, store.pendingDiscardPick])

  useEffect(() => {
    playMusic(store.campaign || 'japanese', store.currentEnemy?.tier === 'boss' ? 'boss' : 'combat')
  }, [playMusic, store.campaign, store.currentEnemy?.tier])

  useEffect(() => {
    if (fightStarted.current) return
    fightStarted.current = true

    // Check if we are resuming an ongoing fight (e.g. after a page refresh)
    if (store.currentEnemy) {
      if (!store.inCombat) {
        // Fresh encounter
        useRunStore.getState().startFight(store.currentEnemy)
        setTurnPhase(PHASE.PLAYER_DRAW)
      } else {
        // Resuming encounter: skip draw phase if we already have a hand
        if (store.hand.length > 0) {
          setTurnPhase(PHASE.PLAYER_TURN)
        } else {
          setTurnPhase(PHASE.PLAYER_DRAW)
        }
      }
    }
  }, [])

  useEffect(() => {
    if (turnPhase === PHASE.PLAYER_DRAW) {
      drawHand()
      setTimeout(() => setTurnPhase(PHASE.PLAYER_TURN), 200)
    }
  }, [turnPhase])



  useEffect(() => {
    if (isEnemyDefeated && turnPhase !== PHASE.FIGHT_END && turnPhase !== PHASE.BOSS_DEFEAT) {
      if (store.currentEnemy?.tier === 'boss' && store.currentEnemy?.defeat_choices) {
        setTurnPhase(PHASE.BOSS_DEFEAT)
      } else {
        setTurnPhase(PHASE.FIGHT_END)
        handleVictory()
        playSFX('victory')
      }
    }
  }, [isEnemyDefeated, playSFX])

  useEffect(() => {
    if (isPlayerDefeated && turnPhase !== PHASE.FIGHT_END) {
      setTurnPhase(PHASE.FIGHT_END)
      sessionStorage.removeItem('active_encounter')
      navigate('/summary', { replace: true })
    }
  }, [isPlayerDefeated])

  useEffect(() => {
    const enemy = store.currentEnemy
    if (!enemy?.phases) return

    let newPhase = 1
    for (const phase of enemy.phases) {
      if (store.enemyHp <= phase.hp_threshold && store.enemyHp > 0) {
        newPhase = Math.max(newPhase, phase.phase)
      }
    }

    if (newPhase > bossPhase) {
      for (let p = bossPhase + 1; p <= newPhase; p++) {
        const phaseData = enemy.phases.find(x => x.phase === p)
        if (phaseData?.on_enter) {
          const s = useRunStore.getState()
          if (phaseData.on_enter === 'add_chain_armor_15') s.addEnemyArmor(15)
          if (phaseData.on_enter === 'add_chain_armor_20') s.addEnemyArmor(20)
          if (phaseData.on_enter === 'add_fury_3') {
            for (let i = 0; i < 3; i++) s.addEnemyFury()
          }
          if (phaseData.on_enter === 'add_fury_5') {
            for (let i = 0; i < 5; i++) s.addEnemyFury()
          }
        }
      }
      playSFX('boss_appear')
      setBossPhase(newPhase)
    }
  }, [store.enemyHp, bossPhase, playSFX])

  useEffect(() => {
    if (animState === 'wrong') {
      setWrongFlash(true)
      setTimeout(() => setWrongFlash(false), 600)
    }
  }, [animState])

  // Enemy hit shake — triggered whenever a new 'damage' number appears (player dealt damage)
  useEffect(() => {
    const latest = damageNumbers[damageNumbers.length - 1]
    if (latest && latest.type === 'damage') {
      setIsShakingEnemy(true)
      setTimeout(() => setIsShakingEnemy(false), 450)
    }
  }, [damageNumbers])

  useEffect(() => {
    if (isEnemyTurnRunning && enemyAction?.type === 'damage' && enemyAction.value > 0) {
      setIsHitPlayer(true)
      setTimeout(() => setIsHitPlayer(false), 600)
    }
  }, [enemyAction, isEnemyTurnRunning])


  const handleEndTurn = useCallback(() => {
    if (turnPhase !== PHASE.PLAYER_TURN) return
    const s0 = useRunStore.getState()
    /** Unblock soft-locks: pick-from-hand / pick-from-discard with no valid targets. */
    if (s0.pendingHandExhaustEnergyPick && s0.hand.length === 0) {
      useRunStore.setState({ pendingHandExhaustEnergyPick: false })
    }
    if (s0.pendingDiscardPick && s0.discardPile.length === 0) {
      useRunStore.setState({ pendingDiscardPick: null })
    }
    const s1 = useRunStore.getState()
    if (s1.pendingDiscardPick || s1.pendingHandExhaustEnergyPick) return
    playSFX('button_click')
    setTurnPhase(PHASE.ENEMY_TURN)
    executeEnemyTurn()
  }, [turnPhase, executeEnemyTurn, playSFX])

  const handleSelectEnemySlot = useCallback((slotIndex) => {
    if (turnPhase !== PHASE.PLAYER_TURN) return
    const st = useRunStore.getState()
    const pack = st.combatEnemySlots || []
    const hp = pack.length > 0
      ? (pack[slotIndex]?.hp ?? 0)
      : (slotIndex === 0 ? (st.enemyHp ?? 0) : 0)
    if (hp <= 0) return
    playSFX('button_click')
    if (pack.length > 0) {
      st.syncActiveEnemySlot(slotIndex)
    }
    useRunStore.setState({ enemyAttackTargetConfirmed: true })
  }, [turnPhase, playSFX])

  /** Drag-drop onto enemies: resolve slot under cursor so directed attacks aren't blocked by missing click-first. */
  const resolveEnemyTargetFromDrag = useCallback((clientX, clientY) => {
    if (turnPhase !== PHASE.PLAYER_TURN) return
    const stack = typeof document !== 'undefined' ? document.elementsFromPoint(clientX, clientY) : []
    for (const node of stack) {
      const wrap = typeof node.closest === 'function' ? node.closest('[data-enemy-slot-index]') : null
      if (!wrap) continue
      const raw = wrap.getAttribute('data-enemy-slot-index')
      const i = raw != null ? parseInt(raw, 10) : NaN
      if (Number.isNaN(i)) continue
      const slot = enemySlots[i]
      if (slot && (slot.hp ?? 0) > 0) {
        handleSelectEnemySlot(i)
        return
      }
    }
    let best = -1
    let bestD = Infinity
    if (typeof document !== 'undefined') {
      document.querySelectorAll('[data-enemy-slot-index]').forEach((wrap) => {
        const raw = wrap.getAttribute('data-enemy-slot-index')
        const i = raw != null ? parseInt(raw, 10) : NaN
        if (Number.isNaN(i)) return
        const slot = enemySlots[i]
        if (!slot || (slot.hp ?? 0) <= 0) return
        const r = wrap.getBoundingClientRect()
        const cx = (r.left + r.right) / 2
        const cy = (r.top + r.bottom) / 2
        const d = (clientX - cx) ** 2 + (clientY - cy) ** 2
        if (d < bestD) {
          bestD = d
          best = i
        }
      })
    }
    if (best >= 0) handleSelectEnemySlot(best)
  }, [turnPhase, enemySlots, handleSelectEnemySlot])

  const handleVictory = useCallback(async (choice = null) => {
    const s = useRunStore.getState()
    const enemyTier = s.currentEnemy?.tier
    const isBoss = enemyTier === 'boss'
    const accuracy = s.fightTotal > 0 ? s.fightCorrect / s.fightTotal : 1
    const currentFloor = s.floor

    const generatedLoot = []

    const rsPreEnd = useRunStore.getState()
    if (rsPreEnd.relics?.includes('water_cooler_charm')) {
      rsPreEnd.healHp(1)
    }
    if (
      rsPreEnd.relics?.includes('scribes_seal')
      && (rsPreEnd.playerHpLossThisFight || 0) === 0
    ) {
      useRunStore.setState({ bonusDrawFirstHandNextFight: SCRIBES_SEAL_BONUS_DRAW_NEXT_FIGHT })
    }

    if (isOverloadMechanicsActive(rsPreEnd) && rsPreEnd.relics?.includes('radiator_fin')) {
      rsPreEnd.applyOverloadGlobalDelta(-2)
    }

    // 1. Gold
    let baseGold = Math.floor(10 + accuracy * 20)
    if (choice?.reward?.type === 'gold') baseGold += choice.reward.amount
    const relicGold = s.relics.includes('lucky_coin') ? 15 : 0
    generatedLoot.push({ id: 'gold', type: 'gold', amount: baseGold + relicGold, icon: '🪙', label: `${baseGold + relicGold} Gold` })

    // 2. Potion
    const dropRate = getPotionDropRate(enemyTier, isBoss)
    if (Math.random() < dropRate) {
      const potionId = getRandomPotionDrop(currentFloor, { overloadMechanics: isOverloadMechanicsActive(s) })
      const potionData = getPotionData(potionId)
      generatedLoot.push({ id: 'potion', type: 'potion', potionId, icon: potionData?.icon || '🧪', label: potionData?.name || 'Unknown Potion' })
    }

    // 2b. Elite: chance for a random non-owned common/uncommon/rare relic (e.g. Sprint Icebox)
    if (enemyTier === 'elite' && Math.random() < 0.45) {
      const relicId = pickRandomRelicForLoot(s)
      if (relicId) {
        const r = RELICS[relicId]
        generatedLoot.push({
          id: `loot-relic-${relicId}`,
          type: 'relic',
          relicId,
          icon: r?.icon || '💎',
          label: relicLocalizedName(relicId, r?.name || relicId),
        })
      }
    }

    // 3. Card Draft
    let draftRarity = null
    if (choice?.reward?.type === 'card') draftRarity = choice.reward.rarity
    const turnsAtVictory = s.turnNumber
    generatedLoot.push({ id: 'card', type: 'card', rarity: draftRarity, icon: '🃏', label: 'Add a card to your deck' })
    if (s.relics.includes('blitz_clipboard') && turnsAtVictory <= BLITZ_CLIPBOARD_MAX_TURNS) {
      generatedLoot.push({
        id: 'card-swift-bonus',
        type: 'card',
        rarity: draftRarity,
        icon: '🃏',
        label: 'Bonus card (won in ≤5 turns)',
      })
    }

    if (isBoss) {
      const snapshot = collectMasterDeckIdsFromRunState(s)
      savePvpCollectionDeck({ campaign: s.campaign || 'japanese', cardIds: snapshot })
      generatedLoot.push({
        id: 'pvp-collection-notice',
        type: 'notice',
        icon: '📚',
        label: t('pvp.collectionDeckSaved', { count: snapshot.length }),
      })
    }

    s.resetPotionEffects()
    s.endFight()

    if (isBoss) {
      const newFloor = currentFloor + 1
      s.setFloor(newFloor)
      const { nodes, paths } = generateFloorMap(newFloor, s.masteryLevel)
      s.setMap(nodes, paths)
      s.setCurrentNode(null)
    } else {
      stopMusic()
      playSFX('victory')
      if (isAct1ProgrammerRun(s)) {
        const next = Math.min(currentFloor + 1, ACT1_MAX_FLOOR)
        if (next !== currentFloor) s.setFloor(next)
      }
    }

    setLoot(generatedLoot)
    playSFX('loot_appear')
  }, [playSFX, stopMusic, t])

  // Fallback: if fight has ended but loot modal failed to open, return to map.
  useEffect(() => {
    if (turnPhase !== PHASE.FIGHT_END || loot !== null) return
    const timer = setTimeout(() => {
      sessionStorage.removeItem('active_encounter')
      navigate('/map', { replace: true })
    }, 1200)
    return () => clearTimeout(timer)
  }, [turnPhase, loot, navigate])

  const handleClaimLoot = useCallback((lootId) => {
    const s = useRunStore.getState()
    const item = loot.find(l => l.id === lootId)
    if (!item) return

    if (item.type === 'gold') {
      playSFX('gold_gain')
      s.addGold(item.amount)
    } else if (item.type === 'potion') {
      if (s.potions.length >= 3) {
        setPotionDropped({ id: item.potionId, shattered: true })
        playSFX('wrong') // placeholder for shatter
        setTimeout(() => setPotionDropped(null), 2000)
      } else {
        playSFX('relic_obtain') // placeholder for potion gain
        s.addPotion(item.potionId)
      }
    } else if (item.type === 'relic' && item.relicId) {
      playSFX('relic_obtain')
      s.addRelic(item.relicId)
    } else if (item.type === 'notice') {
      playSFX('button_click')
    }
    setLoot(prev => prev.filter(l => l.id !== lootId))
  }, [loot])

  const handleLootDone = useCallback(() => {
    playSFX('button_click')
    sessionStorage.removeItem('active_encounter')
    navigate('/map')
  }, [navigate, playSFX])

  const handleOpenDraftLoot = useCallback((item) => {
    playSFX('draft_open')
    const accuracy = store.fightTotal > 0 ? store.fightCorrect / store.fightTotal : 1
    activeDraftLootIdRef.current = item.id
    openDraft(accuracy, item.rarity)
  }, [openDraft, store.fightTotal, store.fightCorrect, playSFX])

  const handleDraftDone = useCallback((card) => {
    pickCard(card)
    const lid = activeDraftLootIdRef.current
    setLoot(prev => prev.filter(l => l.id !== lid))
  }, [pickCard])

  if (isDrafting) {
    const accuracy = store.fightTotal > 0 ? store.fightCorrect / store.fightTotal : 1
    return (
      <DraftScreen
        cards={draftCards}
        cardMap={cardMap}
        onPick={handleDraftDone}
        onSkip={() => handleDraftDone(null)}
        accuracy={accuracy}
      />
    )
  }

  if (turnPhase === PHASE.BOSS_DEFEAT) {
    return (
      <BossDefeatScreen
        enemy={store.currentEnemy}
        onChoice={(choice) => {
          setTurnPhase(PHASE.FIGHT_END)
          handleVictory(choice)
        }}
      />
    )
  }

  const isPlayerTurn = turnPhase === PHASE.PLAYER_TURN
  const isEnemyPhase = turnPhase === PHASE.ENEMY_TURN
  const awaitingCombatPick = Boolean(store.pendingDiscardPick || store.pendingHandExhaustEnergyPick)

  return (
    <ScreenTransition>
      <div
        className="relative w-full h-screen flex flex-col overflow-hidden"
        style={{ fontFamily: "'Crimson Text', Georgia, serif" }}
      >
        {/* ── Background: art + base color (PNG always ships; SVG optional later) ── */}
        <div
          className="absolute inset-0 z-0"
          style={{
            backgroundColor: '#0f172a',
            backgroundImage: 'url(/images/ui/dungeon_combat_bg.png)',
            backgroundRepeat: 'no-repeat',
            backgroundSize: 'cover',
            backgroundPosition: 'center center',
          }}
        />

        <TopBar hideMapButton={true} potionsLocked={!isPlayerTurn} />

        {/* Wrong answer flash */}
        <AnimatePresence>
          {wrongFlash && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 0.2 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-red-600 pointer-events-none z-10"
            />
          )}
        </AnimatePresence>

        {/* ── Main Combat Arena ── */}
        <div className="flex-1 relative">

          {/* Player Character Sprite (Left) */}
          <div className="absolute left-[18%] bottom-[0%] scale-110 flex flex-col items-center">
            <motion.div
              animate={
                isHitPlayer ? {
                  x: [-10, 10, -10, 10, 0],
                  filter: 'brightness(2) sepia(1) hue-rotate(-50deg) saturate(5)',
                  transition: { duration: 0.3 }
                } : animState === 'player_telegraph_damage' ? {
                  x: [0, -20, -20],
                  y: [0, -5, -5],
                  transition: { duration: 0.35, ease: 'easeOut' }
                } : animState === 'player_telegraph_buff' ? {
                  scale: [1, 1.15, 1.15],
                  filter: ['brightness(1)', 'brightness(1.5)', 'brightness(1.5)'],
                  transition: { duration: 0.35, ease: 'easeOut' }
                } : animState === 'player_attack' ? {
                  x: [-20, 50, 0], // Smoothly leap forward from pullback and return
                  y: [-5, 15, 0],
                  scale: [1.15, 1],
                  filter: ['brightness(1.5)', 'brightness(1)'],
                  transition: { duration: 0.6, times: [0, 0.2, 1], ease: 'easeOut' }
                } : animState === 'player_buff' ? {
                  scale: [1.15, 1], // Snap back from swell
                  filter: ['brightness(1.5)', 'brightness(1)'],
                  transition: { duration: 0.6, ease: 'easeOut' }
                } : { x: 0, y: 0, scale: 1, filter: 'brightness(1)' }
              }
              className="relative flex items-end justify-center"
              style={{ height: '200px' }}
            >
              {playerPortraitBroken ? (
                <div
                  className="flex h-[200px] min-w-[140px] max-w-[220px] items-end justify-center rounded-lg bg-gray-900/80 px-4 text-8xl opacity-95"
                  aria-hidden
                >
                  {ROLE_PORTRAIT_EMOJI[portraitCharId] || '👤'}
                </div>
              ) : (
                <img
                  src={`${portraitBase}.png`}
                  alt={store.character?.name || 'Player'}
                  className="h-[200px] w-auto max-w-[220px] min-w-[120px] object-contain object-bottom"
                  style={{
                    imageRendering: portraitCampaign === 'japanese' ? 'pixelated' : 'auto',
                    filter: 'drop-shadow(0 8px 10px rgba(0,0,0,0.8))',
                  }}
                  onError={(e) => {
                    const el = e.currentTarget
                    if (el.src.endsWith('.png')) {
                      el.src = `${portraitBase}.svg`
                      return
                    }
                    setPlayerPortraitBroken(true)
                  }}
                />
              )}

            </motion.div>

            {/* STS-style Player HP + Block */}
            <div className="w-48 mt-2">
              {/* Block badge */}
              {store.block > 0 && (
                <div className="flex justify-start mb-1">
                  <div className="flex items-center gap-1 bg-gray-800/90 border border-cyan-700 rounded-full px-2 py-0.5">
                    <span className="text-cyan-400 text-sm">🛡️</span>
                    <span className="text-cyan-300 text-xs font-bold">{store.block}</span>
                  </div>
                </div>
              )}
              {/* HP bar with number on it */}
              <div className="relative h-6 bg-gray-900 rounded border border-gray-700 overflow-hidden shadow-inner">
                <motion.div
                  className={`absolute inset-y-0 left-0 rounded ${store.hp / store.maxHp > 0.5 ? 'bg-red-600' :
                    store.hp / store.maxHp > 0.25 ? 'bg-orange-600' : 'bg-red-800'
                    }`}
                  animate={{ width: `${Math.max(0, (store.hp / store.maxHp) * 100)}%` }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                />
                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white"
                  style={{ textShadow: '1px 1px 0 #000,-1px -1px 0 #000,1px -1px 0 #000,-1px 1px 0 #000' }}>
                  {store.hp} / {store.maxHp}
                </span>
              </div>

              {/* Debuff icons below HP bar */}
              {store.activePlayerDebuffs.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {store.activePlayerDebuffs.map((d, i) => {
                    const icons = { silence: '🔇', drain: '⚡', fog: '🌫️', bind: '🔗', confusion: '🔀' }
                    const colors = { silence: 'border-purple-600 bg-purple-950/80', drain: 'border-yellow-600 bg-yellow-950/80', fog: 'border-blue-500 bg-blue-950/80', bind: 'border-orange-500 bg-orange-950/80', confusion: 'border-pink-500 bg-pink-950/80' }
                    const labels = { silence: 'Silenced', drain: 'Drained', fog: 'Fogged', bind: 'Bound', confusion: 'Confused' }
                    const descs = { silence: `${d.target || ''} cards muted`, drain: '−1 Energy/turn', fog: 'Options hidden', bind: '−1 Draw/turn', confusion: 'Options shuffle' }
                    return (
                      <div key={i} className="relative group">
                        <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full border text-[10px] font-bold cursor-help ${colors[d.type] || 'border-gray-600 bg-gray-900'}`}>
                          <span>{icons[d.type] || '❓'}</span>
                          <span className="text-white">{d.duration}</span>
                        </div>
                        {/* Hover tooltip */}
                        <div className="absolute bottom-full left-0 mb-1.5 hidden group-hover:block z-50 pointer-events-none w-40">
                          <div className="bg-gray-950 border border-gray-600 rounded-lg px-3 py-2 shadow-2xl">
                            <div className="text-amber-400 font-bold text-xs mb-0.5">{labels[d.type] || d.type}</div>
                            <div className="text-gray-300 text-[10px]">{descs[d.type] || ''} ({d.duration} turns)</div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Enemy Display (Right) — ref used for drag-card-to-play hit testing */}
          <div
            ref={enemyDropZoneRef}
            className={`absolute right-[6%] bottom-[0%] scale-110 flex flex-row flex-wrap justify-end items-end gap-3 max-w-[48%] rounded-2xl transition-shadow duration-150 ${
              enemyDropHighlight ? 'ring-4 ring-amber-400/80 ring-offset-4 ring-offset-transparent shadow-[0_0_28px_rgba(251,191,36,0.45)]' : ''
            }`}
          >
            {enemySlots.map((slot, i) => (
              <div
                key={slot.instanceId || `enemy-${i}`}
                data-enemy-slot-index={i}
                className="inline-flex flex-col items-center"
              >
                <EnemyDisplay
                  enemy={slot.def}
                  hp={slot.hp}
                  maxHp={slot.maxHp}
                  armor={slot.armor ?? 0}
                  furyStacks={slot.furyStacks ?? 0}
                  intentIndex={slot.intentIndex ?? 0}
                  activeBuffs={store.activeEnemyBuffs}
                  isShaking={isShakingEnemy}
                  enemyAction={isEnemyPhase && (store.activeEnemySlotIndex ?? 0) === i ? enemyAction : null}
                  phase={bossPhase > 1 ? bossPhase : undefined}
                  vulnerableTurns={slot.vulnerableTurns ?? 0}
                  weakTurns={slot.weakTurns ?? 0}
                  poisonStacks={slot.poisonStacks ?? 0}
                  selectable={isPlayerTurn && !awaitingCombatPick && (slot.hp ?? 0) > 0}
                  selected={(store.activeEnemySlotIndex ?? 0) === i}
                  onSelect={() => handleSelectEnemySlot(i)}
                />
              </div>
            ))}
          </div>

          {/* Floating damage numbers */}
          <div className="absolute inset-0 pointer-events-none z-20">
            <AnimatePresence>
              {damageNumbers.map(({ id, value, type }) => (
                <motion.div
                  key={id}
                  initial={{ opacity: 1, y: 0, x: type === 'player_damage' ? '-25vw' : '25vw' }}
                  animate={{ opacity: 0, y: -70 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.9, ease: 'easeOut' }}
                  className={`absolute top-[40%] left-1/2 font-black text-4xl pointer-events-none
                    ${type === 'damage' ? 'text-red-500' : 'text-orange-400'}`}
                  style={{ textShadow: '2px 2px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000' }}
                >
                  {type === 'damage' ? `-${value}` : `+${value}`}
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Floating Enemy Action Text (Buffs/Debuffs/Misc/Damage) */}
            <AnimatePresence mode="wait">
              {enemyAction?.message && enemyAction.type !== 'telegraph' && (
                <motion.div
                  key={enemyAction.id}
                  initial={{ opacity: 1, y: 0, scale: 0.8 }}
                  animate={{ opacity: 0, y: -50, scale: 1.1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.2, ease: 'easeOut' }}
                  className={`absolute top-[35%] font-black pointer-events-none -translate-x-1/2
                    ${enemyAction.type === 'debuff' ? 'text-purple-400 text-2xl left-[30%]' :
                      enemyAction.type === 'damage' ? 'text-red-500 text-5xl left-[30%]' :
                        enemyAction.type === 'selfbuff' ? 'text-blue-400 text-2xl left-[70%]' : 'text-gray-200 text-2xl left-[30%]'}`}
                  style={{ textShadow: '2px 2px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000' }}
                >
                  {enemyAction.type === 'damage' ? (enemyAction.value > 0 ? `-${enemyAction.value}` : t('combat.blocked')) : enemyAction.message}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Potion drop notification */}
            <AnimatePresence>
              {potionDropped && (
                <motion.div
                  key={potionDropped.id + potionDropped.shattered}
                  initial={{ opacity: 0, y: 20, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.5 }}
                  className="absolute right-[25%] top-[30%] flex flex-col items-center gap-1 z-30"
                >
                  {potionDropped.shattered ? (
                    <>
                      <div className="text-3xl">💢</div>
                      <div className="text-xs font-bold text-red-400 bg-black/80 px-2 py-1 rounded">{t('combat.bagFull')}</div>
                    </>
                  ) : (
                    <>
                      <div className="text-3xl animate-bounce">🧪</div>
                      <div className="text-xs font-bold text-green-400 bg-black/80 px-2 py-1 rounded">{t('combat.potionFound')}</div>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Chain indicator (Top Center) */}
          <div className="absolute top-10 left-1/2 -translate-x-1/2">
          </div>

          {/* Turn phase badge + Turn counter (Top Center below chain) */}
          <div className="absolute top-20 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1">
            <AnimatePresence mode="wait">
              <motion.div
                key={turnPhase}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.2 }}
                className={`text-sm font-bold uppercase tracking-widest px-4 py-1 rounded
                  ${isEnemyPhase ? 'text-red-400 bg-red-950/80 border border-red-800' : 'text-amber-400 bg-amber-950/80 border border-amber-800'}`}
              >
                {isEnemyPhase ? t('combat.enemyTurn') : isPlayerTurn ? t('combat.playerTurn') : ''}
              </motion.div>
            </AnimatePresence>
            {/* Turn number indicator */}
            {store.turnNumber > 0 && (
              <div className="text-[10px] text-gray-500 font-mono tracking-widest">
                {t('combat.turnCount', { count: store.turnNumber })}
              </div>
            )}
          </div>
        </div>

        {/* ── Bottom HUD ── */}
        <div className="relative z-30 h-[30vh] flex items-end justify-between px-8 pb-6">

          {/* Bottom-Left: Draw Pile & Energy */}
          <div className="flex items-end gap-6 pb-2">
            <CardPile count={store.deck.length} type="draw" side="left" t={t} onClick={() => { playSFX('button_click'); setOpenPile('draw') }} />
            <EnergyOrb energy={store.energy} maxEnergy={store.maxEnergy} />
          </div>

          {/* Center: Cards (Absolute positioned so they fan out properly) */}
          <div className="absolute top-10 bottom-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-48 pointer-events-none" style={{ perspective: 1000 }}>
            <div className="relative w-full h-full flex justify-center pointer-events-auto">
              <CardHand
                handIds={store.hand}
                cardMap={cardMap}
                currentEnergy={store.energy}
                lockedCards={store.lockedCards}
                silencedTypes={silencedTypes}
                retainedCards={store.retainedCards}
                retainGrowthStacks={store.retainGrowthStacks}
                selectedCardId={activeCardId}
                lastPlayWasAttack={store.lastPlayWasAttack}
                disabled={!isPlayerTurn || awaitingCombatPick}
                onCardSelect={selectCard}
                enemyDropZoneRef={enemyDropZoneRef}
                onDragHoverEnemy={onEnemyDragHover}
                onDragReleaseOnEnemy={resolveEnemyTargetFromDrag}
                relics={store.relics}
                programmerOverloadActive={programmerOverloadActive}
              />
            </div>
          </div>

          {/* Bottom-Right: End Turn & Discard */}
          <div className="flex items-end gap-6 pb-2 relative z-40">
            <motion.button
              animate={(isPlayerTurn && !hasPlayableCard && !awaitingCombatPick) ? {
                boxShadow: ['0px 4px 10px rgba(0,0,0,0.6)', '0px 0px 25px rgba(74, 158, 192, 1)', '0px 4px 10px rgba(0,0,0,0.6)'],
                borderColor: ['#4a9ec0', '#8be9fd', '#4a9ec0']
              } : {
                boxShadow: '0px 4px 10px rgba(0,0,0,0.6)',
                borderColor: (!isPlayerTurn) ? '#111' : '#4a9ec0'
              }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
              whileHover={isPlayerTurn && !awaitingCombatPick ? { scale: 1.05 } : {}}
              whileTap={isPlayerTurn && !awaitingCombatPick ? { scale: 0.95 } : {}}
              onClick={handleEndTurn}
              disabled={!isPlayerTurn || awaitingCombatPick}
              className={`
                px-6 py-4 rounded font-bold text-lg border-2
                transition-colors
                ${(!isPlayerTurn || awaitingCombatPick)
                  ? 'bg-[#1a2228] text-gray-600 cursor-default'
                  : 'bg-gradient-to-b from-[#2a627a] to-[#163e52] text-white hover:brightness-110 cursor-pointer'}
              `}
              style={{ fontFamily: "'Cinzel', serif" }}
            >
              {isEnemyPhase ? t('combat.enemyTurn') : t('combat.endTurn')}
            </motion.button>

            <CardPile count={store.discardPile.length} type="discard" side="right" t={t} onClick={() => {
              if (store.pendingDiscardPick || store.pendingHandExhaustEnergyPick) return
              playSFX('button_click')
              setOpenPile('discard')
            }} />
          </div>
        </div>

        {/* Removed EnemyTurnResolver to stop cutscene feeling */}

        <AnimatePresence>
          {journalOpen && (
            <JournalOverlay
              words={store.journalWords}
              grammar={store.journalGrammar}
              onClose={() => setJournalOpen(false)}
            />
          )}
          {openPile === 'draw' && (
            <DeckOverlay onClose={() => setOpenPile(null)} deck={store.deck} title={t('combat.drawPile')} />
          )}
          {openPile === 'discard' && (
            <DeckOverlay onClose={() => setOpenPile(null)} deck={store.discardPile} title={t('combat.discardPile')} />
          )}
          {store.pendingDiscardPick && (
            <DeckOverlay
              pickMode
              onPickCardIndex={completeDiscardPickByIndex}
              deck={store.discardPile}
              title={t('combat.pickFromDiscardTitle')}
              pickSubtitle={t('combat.pickFromDiscardHint')}
            />
          )}
          {store.pendingHandExhaustEnergyPick && (
            <HandExhaustEnergyPickOverlay
              handIds={store.hand}
              cardMap={cardMap}
              onPickIndex={completeHandExhaustEnergyPickByIndex}
              title={t('combat.pickHandExhaustTitle')}
              pickSubtitle={t('combat.pickHandExhaustHint')}
            />
          )}
        </AnimatePresence>
        {/* ── LOOT SCREEN ── */}
        <AnimatePresence>
          {loot && !isDrafting && (
            <LootScreen
              loot={loot}
              onClaim={handleClaimLoot}
              onSkip={handleLootDone}
              onOpenDraft={handleOpenDraftLoot}
            />
          )}
        </AnimatePresence>

      </div>
    </ScreenTransition>
  )
}
