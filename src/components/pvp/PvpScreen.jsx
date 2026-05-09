// Prototype PvP duel — WebSocket + authoritative server; combat UI reuses CardHand / piles / drag like CombatScreen.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import CardHand from '../combat/CardHand.jsx'
import { EnergyOrb, CardPile } from '../combat/CombatHudPieces.jsx'
import { DeckOverlay } from '../shared/TopBar.jsx'
import { useAudio } from '../../hooks/useAudio.js'
import { getPvpCollectionDeck } from '../../utils/pvpCollectionDeck.js'
import cardsJson from '../../data/japanese/cards.json'

/** Vite may expose JSON as array or `{ default: [...] }` — both must work or cardMap is empty and hand vanishes. */
const CARDS_LIST = Array.isArray(cardsJson) ? cardsJson : cardsJson?.default
const PVP_CARD_MAP_BASE = Object.fromEntries(
  (Array.isArray(CARDS_LIST) ? CARDS_LIST : []).map((c) => [c.id, c]),
)

function stubCard(id) {
  return {
    id,
    name_target: id,
    name_native: '',
    type: 'vocabulary',
    rarity: 'common',
    energy_cost: 1,
    effect: {},
    illustration: '/images/skill_placeholder.png',
  }
}

function mergeCardMapForIds(base, ids) {
  const m = { ...base }
  for (const id of ids) {
    if (typeof id === 'string' && id && !m[id]) m[id] = stubCard(id)
  }
  return m
}

function wsUrl() {
  const fromEnv = import.meta.env.VITE_PVP_WS_URL
  if (fromEnv) return fromEnv
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const host = window.location.hostname
  return `${proto}//${host}:3334`
}

export function PvpScreen() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { playSFX } = useAudio()
  const wsRef = useRef(null)
  const pendingSendRef = useRef([])
  const enemyDropZoneRef = useRef(null)
  const [connected, setConnected] = useState(false)
  const [wsConnecting, setWsConnecting] = useState(false)
  const [roomCode, setRoomCode] = useState('')
  const [joinInput, setJoinInput] = useState('')
  const [lobbyCount, setLobbyCount] = useState(0)
  const [gameState, setGameState] = useState(null)
  const [lastError, setLastError] = useState(null)
  const [enemyDropHighlight, setEnemyDropHighlight] = useState(false)
  const [openPile, setOpenPile] = useState(null) // 'draw' | 'discard' | 'exhaust' | null
  const [campaignCardMap, setCampaignCardMap] = useState(PVP_CARD_MAP_BASE)
  const [registeredDeckSize, setRegisteredDeckSize] = useState(null)
  const deckSentRef = useRef(false)

  const flushPending = useCallback(() => {
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    const q = pendingSendRef.current
    pendingSendRef.current = []
    for (const obj of q) {
      try {
        ws.send(JSON.stringify(obj))
      } catch {
        setLastError('send_failed')
      }
    }
  }, [])

  const connect = useCallback(() => {
    const cur = wsRef.current
    if (cur?.readyState === WebSocket.OPEN || cur?.readyState === WebSocket.CONNECTING) return

    setWsConnecting(true)
    const url = wsUrl()
    const ws = new WebSocket(url)
    wsRef.current = ws
    ws.onopen = () => {
      setWsConnecting(false)
      setConnected(true)
      setLastError(null)
      flushPending()
    }
    ws.onclose = () => {
      setWsConnecting(false)
      setConnected(false)
      wsRef.current = null
    }
    ws.onerror = () => {
      setWsConnecting(false)
      setLastError('websocket_error')
    }
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data)
        if (msg.type === 'error') {
          setLastError(msg.error || 'error')
          return
        }
        if (msg.type === 'room_created') {
          setRoomCode(msg.roomCode)
          setLobbyCount(1)
          setGameState(null)
          deckSentRef.current = false
          setRegisteredDeckSize(null)
          return
        }
        if (msg.type === 'joined') {
          setRoomCode(msg.roomCode)
          setLobbyCount((c) => Math.max(c, msg.slot + 1))
          setGameState(null)
          deckSentRef.current = false
          setRegisteredDeckSize(null)
          return
        }
        if (msg.type === 'pvp_deck_ack') {
          setRegisteredDeckSize(typeof msg.size === 'number' ? msg.size : null)
          return
        }
        if (msg.type === 'lobby_update') {
          setLobbyCount(msg.playerCount || 0)
          return
        }
        if (msg.type === 'peer_left') {
          setLobbyCount(msg.playerCount || 0)
          return
        }
        if (msg.type === 'state') {
          const { type: _t, ...rest } = msg
          setGameState(rest)
          setLastError(null)
        }
      } catch {
        setLastError('bad_message')
      }
    }
  }, [flushPending])

  useEffect(() => {
    connect()
    return () => {
      pendingSendRef.current = []
      wsRef.current?.close()
      wsRef.current = null
    }
  }, [connect])

  const send = useCallback((obj) => {
    const ws = wsRef.current
    if (ws?.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(obj))
      } catch {
        setLastError('send_failed')
      }
      return
    }
    pendingSendRef.current.push(obj)
    if (!ws || ws.readyState === WebSocket.CLOSED) {
      connect()
    }
  }, [connect])

  useEffect(() => {
    const col = getPvpCollectionDeck()
    const camp = col?.campaign || 'japanese'
    if (camp === 'japanese') {
      setCampaignCardMap(PVP_CARD_MAP_BASE)
      return
    }
    let cancelled = false
    import(/* @vite-ignore */ `../../data/${camp}/cards.json`)
      .then((mod) => {
        const raw = mod?.default ?? mod
        const list = Array.isArray(raw) ? raw : raw?.default
        if (cancelled || !Array.isArray(list)) return
        setCampaignCardMap(Object.fromEntries(list.map((c) => [c.id, c])))
      })
      .catch(() => {
        if (!cancelled) setCampaignCardMap(PVP_CARD_MAP_BASE)
      })
    return () => { cancelled = true }
  }, [])

  const createRoom = () => send({ type: 'create_room' })
  const joinRoom = () => {
    const code = joinInput.trim().toUpperCase()
    if (code.length < 4) return
    send({ type: 'join_room', roomCode: code })
  }
  const startGame = () => send({ type: 'start_game' })
  const sendPlayCard = (handIndex) => send({ type: 'play_card', handIndex })
  const sendEndTurn = () => send({ type: 'end_turn' })

  const playing = gameState?.phase === 'playing'
  const ended = gameState?.phase === 'ended'

  useEffect(() => {
    if (!connected || !roomCode) return
    if (playing || ended) return
    if (deckSentRef.current) return
    const col = getPvpCollectionDeck()
    if (!col?.cardIds?.length) return
    send({ type: 'set_pvp_deck', deck: col.cardIds })
    deckSentRef.current = true
  }, [connected, roomCode, playing, ended, send])
  const turnN = Number(gameState?.turn)
  const yourSlotN = Number(gameState?.yourSlot)
  const isYourTurn = playing && !Number.isNaN(turnN) && !Number.isNaN(yourSlotN) && turnN === yourSlotN
  const youActFirst = yourSlotN === 0
  const you = gameState?.you
  const opp = gameState?.opponent
  const handIds = Array.isArray(you?.hand)
    ? you.hand.map((x) => (typeof x === 'string' ? x : x?.id)).filter(Boolean)
    : []
  const deckIds = Array.isArray(you?.deck) ? you.deck : []
  const discardIds = Array.isArray(you?.discard) ? you.discard : []
  const exhaustIds = Array.isArray(you?.exhaust) ? you.exhaust : []

  const cardMapResolved = useMemo(
    () =>
      mergeCardMapForIds(campaignCardMap, [
        ...handIds,
        ...deckIds,
        ...discardIds,
        ...exhaustIds,
      ]),
    [campaignCardMap, handIds, deckIds, discardIds, exhaustIds],
  )
  /** Server may only expose counts; prefer array length else numeric counts from clonePlayerPublic. */
  const drawPileCount = Math.max(deckIds.length, you?.deckCount ?? 0)
  const discardPileCount = Math.max(discardIds.length, you?.discardCount ?? 0)
  const exhaustPileCount = Math.max(exhaustIds.length, you?.exhaustCount ?? 0)

  const onEnemyDragHover = useCallback((v) => {
    setEnemyDropHighlight(Boolean(v))
  }, [])

  const handleCardSelect = useCallback((_cardId, handIndex) => {
    if (!isYourTurn || typeof handIndex !== 'number') return
    const card = cardMapResolved[_cardId]
    if (!card || (you?.energy ?? 0) < (card.energy_cost ?? 1)) return
    playSFX('card_play')
    sendPlayCard(handIndex)
  }, [isYourTurn, you?.energy, sendPlayCard, playSFX, cardMapResolved])

  const overlayDeck = openPile === 'draw' ? deckIds : openPile === 'discard' ? discardIds : openPile === 'exhaust' ? exhaustIds : []
  const overlayTitle =
    openPile === 'draw'
      ? t('combat.drawPile')
      : openPile === 'discard'
        ? t('combat.discardPile')
        : t('pvp.exhaustPile')

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-gray-100 flex flex-col items-center p-6 font-serif">
      <div className="w-full max-w-6xl flex justify-between items-center mb-4 shrink-0">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="text-amber-400/90 hover:text-amber-300 text-sm tracking-widest uppercase"
        >
          ← {t('common.back')}
        </button>
        <span className="text-[10px] text-gray-600 font-mono">
          {connected ? t('pvp.wsConnected') : wsConnecting ? t('pvp.wsConnecting') : t('pvp.wsDisconnected')}
        </span>
      </div>

      {!playing && !ended && (
        <>
          <h1 className="text-3xl text-amber-300 mb-2 shrink-0" style={{ fontFamily: "'Cinzel', serif" }}>
            {t('pvp.title')}
          </h1>
          <p className="text-sm text-gray-500 mb-4 max-w-xl text-center shrink-0">{t('pvp.hint')}</p>
          {registeredDeckSize != null && (
            <p className="text-xs text-emerald-400/90 mb-6 max-w-xl text-center shrink-0">
              {t('pvp.lobbyDeckReady', { count: registeredDeckSize })}
            </p>
          )}

          {lastError && (
            <div className="mb-4 text-red-400 text-sm font-mono">{t(`pvp.errors.${lastError}`, lastError)}</div>
          )}

          <div className="flex flex-col gap-4 w-full max-w-md border border-gray-800 rounded-lg p-6 bg-black/40">
            <button
              type="button"
              onClick={createRoom}
              className="py-3 rounded bg-amber-700/80 hover:bg-amber-600 text-white font-bold"
            >
              {t('pvp.createRoom')}
            </button>
            {roomCode && (
              <div className="text-center">
                <div className="text-xs text-gray-500 uppercase tracking-widest">{t('pvp.roomCode')}</div>
                <div className="text-2xl font-mono tracking-[0.3em] text-amber-200">{roomCode}</div>
                <div className="text-xs text-gray-600 mt-2">{t('pvp.playersInLobby', { count: lobbyCount })}</div>
              </div>
            )}
            <div className="flex gap-2">
              <input
                value={joinInput}
                onChange={(e) => setJoinInput(e.target.value)}
                placeholder={t('pvp.joinPlaceholder')}
                className="flex-1 bg-gray-900 border border-gray-700 rounded px-3 py-2 font-mono uppercase"
                maxLength={8}
              />
              <button type="button" onClick={joinRoom} className="px-4 rounded bg-gray-700 hover:bg-gray-600">
                {t('pvp.join')}
              </button>
            </div>
            <button
              type="button"
              onClick={startGame}
              disabled={lobbyCount < 2}
              className="py-3 rounded bg-emerald-800/90 hover:bg-emerald-700 disabled:opacity-40 font-bold"
            >
              {t('pvp.startBattle')}
            </button>
          </div>
        </>
      )}

      {(playing || ended) && gameState && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="relative w-full max-w-6xl flex-1 flex flex-col min-h-[70vh] overflow-hidden rounded-xl border border-gray-800"
        >
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

          <div className="flex-1 relative z-10">
            {/* Player (left) */}
            <div className="absolute left-[10%] bottom-[22%] flex flex-col items-center w-56">
              <div className="text-5xl mb-2 select-none" aria-hidden>🧙</div>
              {you?.block > 0 && (
                <div className="flex justify-start mb-1 w-full">
                  <div className="flex items-center gap-1 bg-gray-800/90 border border-cyan-700 rounded-full px-2 py-0.5">
                    <span className="text-cyan-400 text-sm">🛡️</span>
                    <span className="text-cyan-300 text-xs font-bold">{you.block}</span>
                  </div>
                </div>
              )}
              <div className="relative h-6 w-full bg-gray-900 rounded border border-gray-700 overflow-hidden shadow-inner">
                <motion.div
                  className={`absolute inset-y-0 left-0 rounded ${
                    you?.hp / you?.maxHp > 0.5 ? 'bg-red-600' : you?.hp / you?.maxHp > 0.25 ? 'bg-orange-600' : 'bg-red-800'
                  }`}
                  animate={{ width: `${Math.max(0, ((you?.hp ?? 0) / (you?.maxHp || 1)) * 100)}%` }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                />
                <span
                  className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white"
                  style={{ textShadow: '1px 1px 0 #000' }}
                >
                  {you?.hp} / {you?.maxHp}
                </span>
              </div>
              <div className="text-[10px] text-gray-400 mt-1">{t('pvp.you')}</div>
            </div>

            {/* Opponent drop zone (right) — same idea as CombatScreen enemy area */}
            <div
              ref={enemyDropZoneRef}
              className={`absolute right-[8%] bottom-[18%] flex flex-col items-center justify-end min-w-[200px] min-h-[220px] rounded-2xl px-4 py-6 transition-shadow duration-150 ${
                enemyDropHighlight ? 'ring-4 ring-amber-400/80 shadow-[0_0_28px_rgba(251,191,36,0.45)]' : ''
              }`}
            >
              <div className="text-6xl mb-2 select-none" aria-hidden>⚔️</div>
              <div className="relative h-6 w-48 bg-gray-900 rounded border border-gray-700 overflow-hidden shadow-inner mb-1">
                <motion.div
                  className="absolute inset-y-0 left-0 rounded bg-rose-700"
                  animate={{ width: `${Math.max(0, ((opp?.hp ?? 0) / (opp?.maxHp || 1)) * 100)}%` }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                />
                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white" style={{ textShadow: '1px 1px 0 #000' }}>
                  {opp?.hp} / {opp?.maxHp}
                </span>
              </div>
              <div className="text-[10px] text-gray-400 text-center">
                {t('pvp.opponent')} · {t('pvp.hand')} {opp?.handCount ?? 0}
                {opp?.poisonStacks ? ` · ☠${opp.poisonStacks}` : ''}
                {opp?.vulnerableTurns ? ` · V${opp.vulnerableTurns}` : ''}
                {opp?.weakTurns ? ` · W${opp.weakTurns}` : ''}
              </div>
            </div>

            <div className="absolute top-16 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1">
              <div
                className={`text-sm font-bold uppercase tracking-widest px-4 py-1 rounded border ${
                  isYourTurn ? 'text-amber-400 bg-amber-950/80 border-amber-800' : 'text-red-400 bg-red-950/80 border-red-800'
                }`}
              >
                {ended
                  ? Number(gameState.winner) === yourSlotN
                    ? t('pvp.youWin')
                    : t('pvp.youLose')
                  : isYourTurn
                    ? t('pvp.yourTurn')
                    : t('pvp.theirTurn')}
              </div>
              {!ended && (
                <p className="text-[10px] text-gray-500 text-center max-w-sm mt-1">
                  {t('pvp.orderHint', { role: youActFirst ? t('pvp.firstToAct') : t('pvp.secondToAct') })}
                </p>
              )}
            </div>
          </div>

          {/* Bottom HUD — mirrors CombatScreen */}
          <div className="relative z-30 h-[30vh] flex items-end justify-between px-6 pb-6 shrink-0">
            <div className="flex items-end gap-6 pb-2">
              <CardPile
                count={drawPileCount}
                type="draw"
                side="left"
                t={t}
                onClick={() => {
                  playSFX('button_click')
                  setOpenPile('draw')
                }}
              />
              <EnergyOrb energy={you?.energy ?? 0} maxEnergy={you?.maxEnergy ?? 3} />
            </div>

            <div className="absolute top-10 bottom-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-48 pointer-events-none" style={{ perspective: 1000 }}>
              <div className="relative w-full h-full flex justify-center pointer-events-auto">
                <CardHand
                  handIds={handIds}
                  cardMap={cardMapResolved}
                  currentEnergy={you?.energy ?? 0}
                  lockedCards={[]}
                  silencedTypes={[]}
                  retainedCards={[]}
                  retainGrowthStacks={{}}
                  selectedCardId={null}
                  lastPlayWasAttack={false}
                  disabled={!isYourTurn || ended}
                  onCardSelect={handleCardSelect}
                  enemyDropZoneRef={enemyDropZoneRef}
                  onDragHoverEnemy={onEnemyDragHover}
                />
              </div>
            </div>

            <div className="flex items-end gap-4 pb-2 relative z-40">
              <motion.button
                type="button"
                whileHover={isYourTurn && !ended ? { scale: 1.05 } : {}}
                whileTap={isYourTurn && !ended ? { scale: 0.95 } : {}}
                onClick={() => {
                  if (!isYourTurn || ended) return
                  playSFX('button_click')
                  sendEndTurn()
                }}
                disabled={!isYourTurn || ended}
                className={`px-6 py-4 rounded font-bold text-lg border-2 transition-colors ${
                  !isYourTurn || ended
                    ? 'bg-[#1a2228] text-gray-600 cursor-default border-gray-800'
                    : 'bg-gradient-to-b from-[#2a627a] to-[#163e52] text-white hover:brightness-110 cursor-pointer border-[#4a9ec0]'
                }`}
                style={{ fontFamily: "'Cinzel', serif" }}
              >
                {t('combat.endTurn')}
              </motion.button>

              <div className="flex flex-col gap-2 items-end">
                <CardPile
                  count={discardPileCount}
                  type="discard"
                  side="right"
                  t={t}
                  onClick={() => {
                    playSFX('button_click')
                    setOpenPile('discard')
                  }}
                />
                {(exhaustPileCount > 0 || ended) && (
                  <CardPile
                    count={exhaustPileCount}
                    type="exhaust"
                    side="right"
                    t={t}
                    onClick={() => {
                      playSFX('button_click')
                      setOpenPile('exhaust')
                    }}
                  />
                )}
              </div>
            </div>
          </div>

          <details className="relative z-20 px-4 pb-2 text-[10px] font-mono text-gray-600 max-h-20 overflow-y-auto shrink-0">
            <summary className="cursor-pointer text-gray-500">{t('pvp.eventLog')}</summary>
            {(gameState.logTail || []).map((e, i) => (
              <div key={i}>{JSON.stringify(e)}</div>
            ))}
          </details>
        </motion.div>
      )}

      <AnimatePresence>
        {openPile && (
          <DeckOverlay
            key={openPile}
            cardMapOverride={cardMapResolved}
            deck={overlayDeck}
            title={overlayTitle}
            onClose={() => setOpenPile(null)}
          />
        )}
      </AnimatePresence>

      {(playing || ended) && lastError && (
        <div className="mt-2 text-red-400 text-xs font-mono">{t(`pvp.errors.${lastError}`, lastError)}</div>
      )}
    </div>
  )
}
