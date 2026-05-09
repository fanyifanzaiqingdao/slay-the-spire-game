#!/usr/bin/env node
/**
 * Minimal authoritative PvP server (1v1).
 * Run: npm run server:pvp
 * Env: PORT (default 3334)
 */
import { WebSocketServer } from 'ws'
import {
  createInitialGame,
  buildPublicState,
  playCard,
  endTurn,
  normalizePvpDeckIds,
} from './pvp/gameEngine.mjs'

const PORT = Number(process.env.PORT) || 3334

/** @type {Map<string, { code: string, clients: Map<WebSocket, { slot: number }>, game: ReturnType<typeof createInitialGame> | null, decks: (string[] | null)[] }>} */
const rooms = new Map()

function genRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let s = ''
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return s
}

function broadcastRoom(room, msg) {
  const payload = JSON.stringify(msg)
  for (const ws of room.clients.keys()) {
    if (ws.readyState === 1) ws.send(payload)
  }
}

function send(ws, msg) {
  if (ws.readyState === 1) ws.send(JSON.stringify(msg))
}

function safePublic(room, slot) {
  if (!room.game) return { phase: 'lobby', playersReady: room.clients.size }
  return buildPublicState(room.game, slot)
}

const wss = new WebSocketServer({ port: PORT })

wss.on('connection', (ws) => {
  /** @type {{ roomCode: string | null, slot: number }} */
  let ctx = { roomCode: null, slot: 0 }

  ws.on('message', (raw) => {
    let data
    try {
      data = JSON.parse(String(raw))
    } catch {
      send(ws, { type: 'error', error: 'invalid_json' })
      return
    }

    const type = data?.type

    if (type === 'create_room') {
      let code = genRoomCode()
      while (rooms.has(code)) code = genRoomCode()
      rooms.set(code, { code, clients: new Map(), game: null, decks: [null, null] })
      ctx.roomCode = code
      ctx.slot = 0
      const room = rooms.get(code)
      room.clients.set(ws, { slot: 0 })
      send(ws, { type: 'room_created', roomCode: code, slot: 0 })
      return
    }

    if (type === 'join_room') {
      const code = String(data.roomCode || '').toUpperCase().trim()
      const room = rooms.get(code)
      if (!room) {
        send(ws, { type: 'error', error: 'room_not_found' })
        return
      }
      if (room.clients.size >= 2) {
        send(ws, { type: 'error', error: 'room_full' })
        return
      }
      ctx.roomCode = code
      ctx.slot = room.clients.size
      room.clients.set(ws, { slot: ctx.slot })
      send(ws, { type: 'joined', roomCode: code, slot: ctx.slot })
      broadcastRoom(room, {
        type: 'lobby_update',
        roomCode: code,
        playerCount: room.clients.size,
      })
      return
    }

    if (type === 'set_pvp_deck') {
      const code = ctx.roomCode
      if (!code) {
        send(ws, { type: 'error', error: 'not_in_room' })
        return
      }
      const room = rooms.get(code)
      if (!room) return
      const meta = room.clients.get(ws)
      if (meta == null) return
      const norm = normalizePvpDeckIds(data.deck)
      room.decks[meta.slot] = norm
      send(ws, { type: 'pvp_deck_ack', slot: meta.slot, size: norm.length })
      return
    }

    if (type === 'start_game') {
      const code = ctx.roomCode
      if (!code) {
        send(ws, { type: 'error', error: 'not_in_room' })
        return
      }
      const room = rooms.get(code)
      if (!room || room.clients.size < 2) {
        send(ws, { type: 'error', error: 'need_two_players' })
        return
      }
      const d0 = room.decks[0]
      const d1 = room.decks[1]
      room.game = createInitialGame(d0, d1)
      for (const [c, meta] of room.clients) {
        send(c, { type: 'state', ...safePublic(room, meta.slot) })
      }
      return
    }

    if (type === 'play_card') {
      const code = ctx.roomCode
      const room = code ? rooms.get(code) : null
      if (!room?.game) {
        send(ws, { type: 'error', error: 'no_game' })
        return
      }
      const meta = room.clients.get(ws)
      if (meta == null) return

      const res = playCard(room.game, meta.slot, Number(data.handIndex))
      if (!res.ok) {
        send(ws, { type: 'error', error: res.error })
        return
      }
      for (const [c, m] of room.clients) {
        send(c, { type: 'state', ...safePublic(room, m.slot) })
      }
      return
    }

    if (type === 'end_turn') {
      const code = ctx.roomCode
      const room = code ? rooms.get(code) : null
      if (!room?.game) {
        send(ws, { type: 'error', error: 'no_game' })
        return
      }
      const meta = room.clients.get(ws)
      if (meta == null) return

      const res = endTurn(room.game, meta.slot)
      if (!res.ok) {
        send(ws, { type: 'error', error: res.error })
        return
      }
      for (const [c, m] of room.clients) {
        send(c, { type: 'state', ...safePublic(room, m.slot) })
      }
      return
    }

    send(ws, { type: 'error', error: 'unknown_type' })
  })

  ws.on('close', () => {
    const code = ctx.roomCode
    if (!code) return
    const room = rooms.get(code)
    if (!room) return
    room.clients.delete(ws)
    if (room.clients.size === 0) rooms.delete(code)
    else {
      broadcastRoom(room, { type: 'peer_left', playerCount: room.clients.size })
    }
  })
})

console.log(`[pvp] WebSocket listening on ws://localhost:${PORT}`)
