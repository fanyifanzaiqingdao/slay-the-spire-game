// stores/runStore.js — v2
// Active run state — all combat, navigation, and deck data for the current run
// Per SKILL.md v2: includes lockedCards and combat debuffs

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { STORAGE_KEYS } from '../utils/localStorage.js'
import { CARDS } from '../constants/campaigns.js'
import { MAX_EQUIPPED_RELICS } from '../data/relics.js'
import {
  PINGBACK_PINS_RELIC_ID,
  PINGBACK_PINS_DAMAGE_PER_STACK,
  PR_TEMPLATE_FIRST_TYPE_BLOCK,
} from '../constants/relicCombat.js'
import { slotsFromEnemyDefs, legacyFromSlots, resetSlotsForNewFight } from '../utils/combatEnemies.js'
import { VULNERABLE_DAMAGE_MULT } from '../constants/enemyStatus.js'
import { isOverloadMechanicsActive, isOverloadLethal } from '../utils/overloadMechanics.js'

const useRunStore = create(
  persist(
    (set, get) => ({
      // Run identity
      runId: null,
      campaign: null,
      character: null,
      masteryLevel: 0,
      lastCardTypePlayed: null,  // e.g. potion "activate_chain" uses last type played

      // Potions (max 3 slots — array of potion IDs or null)
      potions: [],
      // Active combat potion effects (reset each fight)
      potionEffects: {
        clarityActive: false,      // next question shows 2 options
        memoryFlaskActive: false,  // next question timer frozen
        echoTonicActive: false,    // next card plays twice
        autoCorrectActive: false,  // next question auto-correct
        scholarsBloodActive: false, // rest of fight: correct = +3 HP
      },

      // Player state
      hp: 80,
      maxHp: 80,
      block: 0,
      gold: 0,
      energy: 3,
      maxEnergy: 3,
      /** Programmer route: persistent stress — lethal when overloadGlobal > maxHp */
      overloadGlobal: 0,
      /** Programmer route: energy denied at next player draw (borrowed from next turn) */
      energyDebtNextTurn: 0,

      // Navigation
      floor: 1,
      currentNodeId: null,
      mapNodes: [],
      mapPaths: [],

      // Deck
      deck: [],
      hand: [],
      discardPile: [],
      exhaustPile: [],
      /** sprint_icebox: up to 2 cards held out of deck between fights (order = slots). */
      iceboxCardIds: [],

      /**
       * Combat: playing a "return from discard" skill — hand already updated, choose one
       * instance from discard by index, then add that card to hand and route the skill to exhaust/discard.
       */
      pendingDiscardPick: null, // { skillCardId: string, exhaustSelf: boolean } | null

      /** Combat: played "exhaust hand for energy" skill — pick one remaining hand card by index. */
      pendingHandExhaustEnergyPick: false,

      // v2: Locked cards (wrong answer → locked for this turn)
      lockedCards: [],

      // v3: Retained cards (stay in hand next turn)
      retainedCards: [],
      // v3: Growth stacks per retained card ID (how many turns it has been retained)
      retainGrowthStacks: {},

      // Relics — max MAX_EQUIPPED_RELICS equipped, unlimited vault storage
      relics: [],        // equipped (active)
      vaultRelics: [],   // stored but inactive
      pendingRelicSwap: null, // { relicId } — set when a new relic is found with full slots

      // v2: Player debuffs applied by enemy (silence/drain/fog/bind/confusion)
      activePlayerDebuffs: [],

      // v2: Enemy buffs from wrong answers (consumed after enemy turn)
      activeEnemyBuffs: [],

      // Combat
      inCombat: false,
      /** Multi-enemy combat — when empty/legacy, fall back to currentEnemy + enemyHp. */
      combatEnemySlots: [],
      /** Which enemy slot is acting during enemy turn / resolving self-buffs (aligns with resolveEnemyAction). */
      activeEnemySlotIndex: 0,
      currentEnemy: null,
      enemyHp: 0,
      enemyMaxHp: 0,
      enemyArmor: 0,          // v2: flat damage reduction (armor_up move)
      enemyFuryStacks: 0,     // v2: fury accumulates via power_up, doubles dmg at 3
      enemyFocusType: null,   // v2: card type enemy is focused against (focus move)
      intentIndex: 0,
      turnNumber: 0,
      /** Last resolved card this turn was an attack (for consecutive attack bonus). */
      lastPlayWasAttack: false,
      /** Number of consecutive attack cards already resolved this turn (excludes current card until finalized). */
      consecutiveAttackPlays: 0,
      /** Resets each player draw; first card of the turn gets "first try" bonuses. */
      playsThisPlayerTurn: 0,
      /** Player explicitly clicked an enemy this turn — required before directed single-target attacks. */
      enemyAttackTargetConfirmed: false,
      /** Flat damage added to the next card that deals effect.damage; then cleared. */
      pendingNextDamageBonus: 0,
      blindCardId: null,
      /** Thorns: total reflect on HP hit = reflectStacks × reflectDamagePer (fight-scoped). */
      reflectStacks: 0,
      reflectDamagePer: 0,
      /** Fight-scoped — flat bonus per hit on attack cards (UI 「力量」). */
      playerStrength: 0,
      /** Power: poison stacks applied to ALL enemies at each player turn start (after opening hand). */
      playerPoisonAuraPerTurn: 0,

      // Card type tracking for self_buff_focus + relics (ink stone, PR template)
      cardTypesPlayedThisFight: {},
      /** Per player turn — reset in beginPlayerCardPhase */
      cardTypesPlayedThisTurn: {},
      /** Damage taken from enemy hits this fight (HP loss only) — scribes_seal */
      playerHpLossThisFight: 0,
      /** Extra draw on first hand of next combat after flawless fight */
      bonusDrawFirstHandNextFight: 0,

      // Combat accuracy tracking
      sessionCorrect: 0,
      sessionTotal: 0,
      fightCorrect: 0,
      fightTotal: 0,
      fightCorrectStreak: 0,

      // Journal
      journalWords: [],
      journalGrammar: [],

      /**
       * Merchant shop snapshot for the current map node — survives page refresh.
       * Regenerated when nodeKey (runId|floor|currentNodeId) changes.
       */
      merchantOffer: null,

      // ============================================================
      // ACTIONS
      // ============================================================

      // HP & Block
      setHp: (hp) => set({ hp: Math.max(0, hp) }),
      healHp: (amount) => set(s => ({ hp: Math.min(s.maxHp, s.hp + amount) })),
      addBlock: (amount) => set(s => ({ block: s.block + amount })),
      spendBlock: (amount) => set(s => ({ block: Math.max(0, s.block - amount) })),
      clearBlock: () => set({ block: 0 }),

      addReflectStacks: (n) => set(s => ({
        reflectStacks: Math.max(0, (s.reflectStacks || 0) + Math.max(0, Math.floor(Number(n) || 0))),
      })),
      addReflectDamagePer: (n) => set(s => ({
        reflectDamagePer: Math.max(0, (s.reflectDamagePer || 0) + Math.max(0, Math.floor(Number(n) || 0))),
      })),

      // Energy
      spendEnergy: (amount) => set(s => ({ energy: Math.max(0, s.energy - amount) })),
      resetEnergy: () => set(s => {
        const bonus = s.bonusEnergyNextTurn || 0
        return { 
          energy: s.maxEnergy + bonus,
          bonusEnergyNextTurn: 0
        }
      }),
      gainBonusEnergy: (amount) => set(s => ({ energy: s.energy + amount })),
      queueBonusEnergyNextTurn: (amount) => set(s => ({ bonusEnergyNextTurn: (s.bonusEnergyNextTurn || 0) + amount })),

      addEnergyDebtNextTurn: (amount) => set(s => {
        const add = Math.max(0, Math.floor(Number(amount) || 0))
        if (!add) return {}
        return { energyDebtNextTurn: (s.energyDebtNextTurn || 0) + add }
      }),

      applyOverloadGlobalDelta: (delta) => set(s => {
        if (!isOverloadMechanicsActive(s)) return {}
        const d = Math.floor(Number(delta) || 0)
        const next = Math.max(0, (s.overloadGlobal || 0) + d)
        const lethal = isOverloadLethal(next, s.maxHp)
        return {
          overloadGlobal: next,
          hp: lethal ? 0 : s.hp,
        }
      }),

      clearOverloadGlobal: () => set(s => {
        if (!isOverloadMechanicsActive(s)) return {}
        return { overloadGlobal: 0 }
      }),

      raiseMaxHpFromFitness: (hpGain, overloadGain) => set(s => {
        if (!isOverloadMechanicsActive(s)) return {}
        const hg = Math.max(0, Math.floor(Number(hpGain) || 0))
        const og = Math.max(0, Math.floor(Number(overloadGain) || 0))
        if (!hg && !og) return {}
        const newMax = s.maxHp + hg
        const newOverload = Math.max(0, (s.overloadGlobal || 0) + og)
        const nextHp = Math.min(newMax, s.hp + hg)
        const lethal = isOverloadLethal(newOverload, newMax)
        return {
          maxHp: newMax,
          overloadGlobal: newOverload,
          hp: lethal ? 0 : nextHp,
        }
      }),

      // Gold
      addGold: (amount) => set(s => ({ gold: s.gold + amount })),
      spendGold: (amount) => set(s => ({ gold: Math.max(0, s.gold - amount) })),

      // v2: Locked cards
      lockCard: (cardId) => set(s => ({
        lockedCards: s.lockedCards.includes(cardId) ? s.lockedCards : [...s.lockedCards, cardId]
      })),
      unlockAllCards: () => set({ lockedCards: [] }),

      // v3: Retained cards
      setRetainedCards: (cardIds) => set({ retainedCards: cardIds }),
      clearRetainedCards: () => set({ retainedCards: [], retainGrowthStacks: {} }),
      tickRetainGrowth: (cardId) => set(s => ({
        retainGrowthStacks: {
          ...s.retainGrowthStacks,
          [cardId]: (s.retainGrowthStacks[cardId] || 0) + 1,
        },
      })),
      clearRetainGrowth: (cardId) => set(s => {
        const newStacks = { ...s.retainGrowthStacks }
        delete newStacks[cardId]
        return { retainGrowthStacks: newStacks }
      }),

      // v2: Player debuffs
      addPlayerDebuff: (debuff) => set(s => ({
        activePlayerDebuffs: [...s.activePlayerDebuffs, { ...debuff, id: Date.now() + Math.random() }]
      })),
      tickPlayerDebuffs: () => set(s => ({
        activePlayerDebuffs: s.activePlayerDebuffs
          .map(d => ({ ...d, duration: d.duration - 1 }))
          .filter(d => d.duration > 0)
      })),
      clearPlayerDebuffs: () => set({ activePlayerDebuffs: [] }),
      consumeDebuff: (type) => set(s => ({
        activePlayerDebuffs: s.activePlayerDebuffs.filter(d => d.type !== type)
      })),

      // v2: Enemy buffs from wrong answers
      addEnemyBuff: (buff) => set(s => ({
        activeEnemyBuffs: [...s.activeEnemyBuffs, buff]
      })),
      clearEnemyBuffs: () => set({ activeEnemyBuffs: [] }),

      // v2: Card type tracking for focus move + relics (ink stone, PR template sticker)
      trackCardTypePlayed: (cardType) => {
        const s = get()
        const prevFight = s.cardTypesPlayedThisFight[cardType] || 0
        if (
          prevFight === 0 &&
          Array.isArray(s.relics) &&
          s.relics.includes('pr_template_sticker')
        ) {
          get().addBlock(PR_TEMPLATE_FIRST_TYPE_BLOCK)
        }
        set((st) => {
          const pf = st.cardTypesPlayedThisFight[cardType] || 0
          return {
            cardTypesPlayedThisFight: {
              ...st.cardTypesPlayedThisFight,
              [cardType]: pf + 1,
            },
            cardTypesPlayedThisTurn: {
              ...(st.cardTypesPlayedThisTurn || {}),
              [cardType]: ((st.cardTypesPlayedThisTurn || {})[cardType] || 0) + 1,
            },
          }
        })
      },

      registerPlayerHpLossThisFight: (amount) => set((s) => ({
        playerHpLossThisFight: (s.playerHpLossThisFight || 0) + Math.max(0, Math.floor(Number(amount) || 0)),
      })),

      // Attack chain + per-turn play index (first-try damage; resets each draw)
      recordAttackChainAfterPlay: (wasAttack) => set((s) => {
        if (wasAttack) {
          return {
            lastPlayWasAttack: true,
            consecutiveAttackPlays: (s.consecutiveAttackPlays || 0) + 1,
          }
        }
        return { lastPlayWasAttack: false, consecutiveAttackPlays: 0 }
      }),
      beginPlayerCardPhase: () => set({
        playsThisPlayerTurn: 0,
        lastPlayWasAttack: false,
        consecutiveAttackPlays: 0,
        enemyAttackTargetConfirmed: false,
        cardTypesPlayedThisTurn: {},
      }),
      incrementPlaysThisPlayerTurn: () => set(s => ({
        playsThisPlayerTurn: (s.playsThisPlayerTurn || 0) + 1,
      })),
      queueNextHitDamageBonus: (amount) => set(s => ({
        pendingNextDamageBonus: (s.pendingNextDamageBonus || 0) + Math.max(0, Math.floor(Number(amount) || 0)),
      })),
      addPlayerStrength: (amount) => set(s => ({
        playerStrength: (s.playerStrength || 0) + Math.max(0, Math.floor(Number(amount) || 0)),
      })),

      // Enemy state (supports combatEnemySlots[] + legacy fields synced from slot 0)
      setEnemy: (enemy) => set(() => {
        const slots = slotsFromEnemyDefs([enemy])
        return {
          combatEnemySlots: slots,
          activeEnemySlotIndex: 0,
          ...legacyFromSlots(slots),
          enemyFocusType: null,
          activeEnemyBuffs: [],
        }
      }),
      setEnemyPack: (enemyDefs) => set(() => {
        const slots = slotsFromEnemyDefs(enemyDefs)
        return {
          combatEnemySlots: slots,
          activeEnemySlotIndex: 0,
          ...legacyFromSlots(slots),
          enemyFocusType: null,
          activeEnemyBuffs: [],
        }
      }),
      syncActiveEnemySlot: (slotIndex) => set(s => {
        const slot = s.combatEnemySlots?.[slotIndex]
        if (!slot) return {}
        return {
          activeEnemySlotIndex: slotIndex,
          currentEnemy: slot.def,
          enemyHp: slot.hp,
          enemyMaxHp: slot.maxHp,
          enemyArmor: slot.armor ?? 0,
          enemyFuryStacks: slot.furyStacks ?? 0,
          intentIndex: slot.intentIndex ?? 0,
        }
      }),
      damageEnemy: (amount, targetIndex = null, opts = {}) => set(s => {
        let slots = [...(s.combatEnemySlots?.length ? s.combatEnemySlots : [])]
        if (!slots.length && s.currentEnemy) {
          slots = slotsFromEnemyDefs([s.currentEnemy]).map((sl, i) => ({
            ...sl,
            hp: s.enemyHp,
            maxHp: s.enemyMaxHp,
            armor: s.enemyArmor || 0,
            furyStacks: s.enemyFuryStacks || 0,
            intentIndex: s.intentIndex || 0,
          }))
        }
        if (!slots.length) return {}
        let idx = targetIndex != null ? targetIndex : slots.findIndex(sl => sl.hp > 0)
        if (idx === -1) idx = 0
        const slot = slots[idx]
        if (!slot || slot.hp <= 0) return {}
        let dmg = Math.max(0, Math.floor(Number(amount) || 0))
        if (!opts.skipVulnerable && (slot.vulnerableTurns ?? 0) > 0) {
          dmg = Math.floor(dmg * VULNERABLE_DAMAGE_MULT)
        }
        const absorbed = Math.min(slot.armor || 0, dmg)
        const remaining = dmg - absorbed
        const newHp = Math.max(0, slot.hp - remaining)
        const newArmor = Math.max(0, (slot.armor || 0) - absorbed)
        slots[idx] = { ...slot, hp: newHp, armor: newArmor }
        const alive = slots.filter(sl => sl.hp > 0)
        return {
          combatEnemySlots: alive,
          ...legacyFromSlots(alive),
        }
      }),
      damageAllEnemies: (amount, opts = {}) => set(s => {
        let slots = [...(s.combatEnemySlots?.length ? s.combatEnemySlots : [])]
        if (!slots.length && s.currentEnemy) {
          slots = slotsFromEnemyDefs([s.currentEnemy]).map((sl) => ({
            ...sl,
            hp: s.enemyHp,
            maxHp: s.enemyMaxHp,
            armor: s.enemyArmor || 0,
            furyStacks: s.enemyFuryStacks || 0,
            intentIndex: s.intentIndex || 0,
          }))
        }
        if (!slots.length) return {}
        const next = slots.map((slot) => {
          if (slot.hp <= 0) return slot
          let dmg = Math.max(0, Math.floor(Number(amount) || 0))
          if (!opts.skipVulnerable && (slot.vulnerableTurns ?? 0) > 0) {
            dmg = Math.floor(dmg * VULNERABLE_DAMAGE_MULT)
          }
          const absorbed = Math.min(slot.armor || 0, dmg)
          const remaining = dmg - absorbed
          const newHp = Math.max(0, slot.hp - remaining)
          const newArmor = Math.max(0, (slot.armor || 0) - absorbed)
          return { ...slot, hp: newHp, armor: newArmor }
        })
        const alive = next.filter(sl => sl.hp > 0)
        return {
          combatEnemySlots: alive,
          ...legacyFromSlots(alive),
        }
      }),

      /** Poison damage & −1 stack each player turn start (after turn 0). */
      tickEnemyPoisonAtPlayerTurnStart: () => set(s => {
        let slots = [...(s.combatEnemySlots?.length ? s.combatEnemySlots : [])]
        if (!slots.length && s.currentEnemy) {
          slots = slotsFromEnemyDefs([s.currentEnemy]).map((sl) => ({
            ...sl,
            hp: s.enemyHp,
            maxHp: s.enemyMaxHp,
            armor: s.enemyArmor || 0,
            furyStacks: s.enemyFuryStacks || 0,
            intentIndex: s.intentIndex || 0,
          }))
        }
        if (!slots.length) return {}
        const mapped = slots.map((slot) => {
          if (slot.hp <= 0) return slot
          let hp = slot.hp
          let armor = slot.armor || 0
          let poisonStacks = slot.poisonStacks || 0
          let vulnerableTurns = slot.vulnerableTurns || 0
          if (poisonStacks > 0) {
            const raw = poisonStacks
            const absorbed = Math.min(armor, raw)
            const remaining = raw - absorbed
            hp = Math.max(0, hp - remaining)
            armor = Math.max(0, armor - absorbed)
            poisonStacks = Math.max(0, poisonStacks - 1)
          }
          if (vulnerableTurns > 0) vulnerableTurns -= 1
          return { ...slot, hp, armor, poisonStacks, vulnerableTurns }
        })
        const alive = mapped.filter(sl => sl.hp > 0)
        return {
          combatEnemySlots: alive,
          ...legacyFromSlots(alive),
        }
      }),

      /** Decrement 易伤/虚弱 after player ends turn (so full player phase keeps bonuses). */
      /** Weak — one enemy attack cycle consumed per enemy phase end */
      tickEnemyWeakDecayAfterEnemyTurn: () => set(s => {
        let slots = [...(s.combatEnemySlots?.length ? s.combatEnemySlots : [])]
        if (!slots.length && s.currentEnemy) {
          slots = slotsFromEnemyDefs([s.currentEnemy]).map((sl) => ({
            ...sl,
            hp: s.enemyHp,
            maxHp: s.enemyMaxHp,
            armor: s.enemyArmor || 0,
            furyStacks: s.enemyFuryStacks || 0,
            intentIndex: s.intentIndex || 0,
          }))
        }
        if (!slots.length) return {}
        slots = slots.map((slot) => {
          if (slot.hp <= 0) return slot
          let weakTurns = slot.weakTurns || 0
          if (weakTurns > 0) weakTurns -= 1
          return { ...slot, weakTurns }
        })
        return { combatEnemySlots: slots, ...legacyFromSlots(slots) }
      }),

      addEnemyVulnerable: (slotIndex, turns) => set(s => {
        const add = Math.max(0, Math.floor(Number(turns) || 0))
        if (!add) return {}
        let slots = [...(s.combatEnemySlots?.length ? s.combatEnemySlots : [])]
        if (!slots.length && s.currentEnemy) {
          slots = slotsFromEnemyDefs([s.currentEnemy]).map((sl) => ({
            ...sl,
            hp: s.enemyHp,
            maxHp: s.enemyMaxHp,
            armor: s.enemyArmor || 0,
            furyStacks: s.enemyFuryStacks || 0,
            intentIndex: s.intentIndex || 0,
          }))
        }
        if (!slots[slotIndex] || slots[slotIndex].hp <= 0) return {}
        slots[slotIndex] = {
          ...slots[slotIndex],
          vulnerableTurns: (slots[slotIndex].vulnerableTurns || 0) + add,
        }
        return { combatEnemySlots: slots, ...legacyFromSlots(slots) }
      }),
      addEnemyWeak: (slotIndex, turns) => set(s => {
        const add = Math.max(0, Math.floor(Number(turns) || 0))
        if (!add) return {}
        let slots = [...(s.combatEnemySlots?.length ? s.combatEnemySlots : [])]
        if (!slots.length && s.currentEnemy) {
          slots = slotsFromEnemyDefs([s.currentEnemy]).map((sl) => ({
            ...sl,
            hp: s.enemyHp,
            maxHp: s.enemyMaxHp,
            armor: s.enemyArmor || 0,
            furyStacks: s.enemyFuryStacks || 0,
            intentIndex: s.intentIndex || 0,
          }))
        }
        if (!slots[slotIndex] || slots[slotIndex].hp <= 0) return {}
        slots[slotIndex] = {
          ...slots[slotIndex],
          weakTurns: (slots[slotIndex].weakTurns || 0) + add,
        }
        return { combatEnemySlots: slots, ...legacyFromSlots(slots) }
      }),
      addEnemyPoison: (slotIndex, stacks) => set(s => {
        const add = Math.max(0, Math.floor(Number(stacks) || 0))
        if (!add) return {}
        let slots = [...(s.combatEnemySlots?.length ? s.combatEnemySlots : [])]
        if (!slots.length && s.currentEnemy) {
          slots = slotsFromEnemyDefs([s.currentEnemy]).map((sl) => ({
            ...sl,
            hp: s.enemyHp,
            maxHp: s.enemyMaxHp,
            armor: s.enemyArmor || 0,
            furyStacks: s.enemyFuryStacks || 0,
            intentIndex: s.intentIndex || 0,
          }))
        }
        if (!slots[slotIndex] || slots[slotIndex].hp <= 0) return {}
        slots[slotIndex] = {
          ...slots[slotIndex],
          poisonStacks: (slots[slotIndex].poisonStacks || 0) + add,
        }
        return { combatEnemySlots: slots, ...legacyFromSlots(slots) }
      }),
      addEnemyVulnerableAll: (turns) => set(s => {
        const add = Math.max(0, Math.floor(Number(turns) || 0))
        if (!add) return {}
        let slots = [...(s.combatEnemySlots?.length ? s.combatEnemySlots : [])]
        if (!slots.length && s.currentEnemy) {
          slots = slotsFromEnemyDefs([s.currentEnemy]).map((sl) => ({
            ...sl,
            hp: s.enemyHp,
            maxHp: s.enemyMaxHp,
            armor: s.enemyArmor || 0,
            furyStacks: s.enemyFuryStacks || 0,
            intentIndex: s.intentIndex || 0,
          }))
        }
        if (!slots.length) return {}
        slots = slots.map(sl =>
          sl.hp > 0
            ? { ...sl, vulnerableTurns: (sl.vulnerableTurns || 0) + add }
            : sl,
        )
        return { combatEnemySlots: slots, ...legacyFromSlots(slots) }
      }),
      addEnemyWeakAll: (turns) => set(s => {
        const add = Math.max(0, Math.floor(Number(turns) || 0))
        if (!add) return {}
        let slots = [...(s.combatEnemySlots?.length ? s.combatEnemySlots : [])]
        if (!slots.length && s.currentEnemy) {
          slots = slotsFromEnemyDefs([s.currentEnemy]).map((sl) => ({
            ...sl,
            hp: s.enemyHp,
            maxHp: s.enemyMaxHp,
            armor: s.enemyArmor || 0,
            furyStacks: s.enemyFuryStacks || 0,
            intentIndex: s.intentIndex || 0,
          }))
        }
        if (!slots.length) return {}
        slots = slots.map(sl =>
          sl.hp > 0 ? { ...sl, weakTurns: (sl.weakTurns || 0) + add } : sl,
        )
        return { combatEnemySlots: slots, ...legacyFromSlots(slots) }
      }),
      addEnemyPoisonAll: (stacks) => set(s => {
        const add = Math.max(0, Math.floor(Number(stacks) || 0))
        if (!add) return {}
        let slots = [...(s.combatEnemySlots?.length ? s.combatEnemySlots : [])]
        if (!slots.length && s.currentEnemy) {
          slots = slotsFromEnemyDefs([s.currentEnemy]).map((sl) => ({
            ...sl,
            hp: s.enemyHp,
            maxHp: s.enemyMaxHp,
            armor: s.enemyArmor || 0,
            furyStacks: s.enemyFuryStacks || 0,
            intentIndex: s.intentIndex || 0,
          }))
        }
        if (!slots.length) return {}
        slots = slots.map(sl =>
          sl.hp > 0 ? { ...sl, poisonStacks: (sl.poisonStacks || 0) + add } : sl,
        )
        return { combatEnemySlots: slots, ...legacyFromSlots(slots) }
      }),
      healEnemy: (amount) => set(s => {
        const idx = s.activeEnemySlotIndex ?? 0
        const slots = [...(s.combatEnemySlots || [])]
        if (!slots[idx]) {
          return { enemyHp: Math.min(s.enemyMaxHp, s.enemyHp + amount) }
        }
        const slot = slots[idx]
        const nh = Math.min(slot.maxHp, slot.hp + amount)
        slots[idx] = { ...slot, hp: nh }
        return {
          combatEnemySlots: slots,
          ...legacyFromSlots(slots),
        }
      }),
      setEnemyHp: (hp) => set({ enemyHp: Math.max(0, hp) }),
      setEnemyArmor: (armor) => set({ enemyArmor: Math.max(0, armor) }),
      addEnemyArmor: (amount) => set(s => {
        const idx = s.activeEnemySlotIndex ?? 0
        const slots = [...(s.combatEnemySlots || [])]
        if (!slots[idx]) {
          return { enemyArmor: Math.max(0, (s.enemyArmor || 0) + amount) }
        }
        slots[idx] = { ...slots[idx], armor: (slots[idx].armor || 0) + amount }
        return {
          combatEnemySlots: slots,
          ...legacyFromSlots(slots),
        }
      }),
      addEnemyFury: () => set(s => {
        const idx = s.activeEnemySlotIndex ?? 0
        const slots = [...(s.combatEnemySlots || [])]
        if (!slots[idx]) {
          return { enemyFuryStacks: (s.enemyFuryStacks || 0) + 1 }
        }
        const nf = (slots[idx].furyStacks || 0) + 1
        slots[idx] = { ...slots[idx], furyStacks: nf }
        return {
          combatEnemySlots: slots,
          ...legacyFromSlots(slots),
          enemyFuryStacks: nf,
        }
      }),
      clearEnemyFury: () => set(s => {
        const idx = s.activeEnemySlotIndex ?? 0
        const slots = [...(s.combatEnemySlots || [])]
        if (!slots[idx]) return { enemyFuryStacks: 0 }
        slots[idx] = { ...slots[idx], furyStacks: 0 }
        return {
          combatEnemySlots: slots,
          ...legacyFromSlots(slots),
          enemyFuryStacks: 0,
        }
      }),
      setEnemyFocusType: (type) => set({ enemyFocusType: type }),
      setEnemyBuffs: (buffs) => set({ activeEnemyBuffs: buffs }),

      advanceIntentForSlot: (slotIndex) => set(s => {
        const slots = [...(s.combatEnemySlots || [])]
        if (!slots[slotIndex]?.def?.intent_pattern?.length) return {}
        const pat = slots[slotIndex].def.intent_pattern
        const ni = ((slots[slotIndex].intentIndex ?? 0) + 1) % pat.length
        slots[slotIndex] = { ...slots[slotIndex], intentIndex: ni }
        return {
          combatEnemySlots: slots,
          ...legacyFromSlots(slots),
        }
      }),
      advanceIntent: () => set((s) => {
        const slots = [...(s.combatEnemySlots || [])]
        if (!slots[0]?.def?.intent_pattern?.length) {
          if (!s.currentEnemy?.intent_pattern?.length) return {}
          return { intentIndex: (s.intentIndex + 1) % s.currentEnemy.intent_pattern.length }
        }
        const pat = slots[0].def.intent_pattern
        const ni = ((slots[0].intentIndex ?? 0) + 1) % pat.length
        slots[0] = { ...slots[0], intentIndex: ni }
        return { combatEnemySlots: slots, ...legacyFromSlots(slots) }
      }),

      // Hand & Deck
      setHand: (hand) => set({ hand }),
      setDeck: (deck) => set({ deck }),
      setDiscard: (discardPile) => set({ discardPile }),
      addToDiscard: (cardId) => set(s => ({ discardPile: [...s.discardPile, cardId] })),
      addToHand: (cardId) => set(s => ({ hand: [...s.hand, cardId] })),
      removeFromHand: (cardId) => set(s => {
        const idx = s.hand.indexOf(cardId)
        if (idx === -1) return {}
        return { hand: [...s.hand.slice(0, idx), ...s.hand.slice(idx + 1)] }
      }),

      // Relics
      addRelic: (relicId) => set(s => {
        if (s.relics.includes(relicId) || s.vaultRelics.includes(relicId)) return {} // already have it
        if (s.relics.length < MAX_EQUIPPED_RELICS) {
          // Slot available — equip directly
          return { relics: [...s.relics, relicId] }
        }
        // All equipped slots full — trigger swap screen
        return { pendingRelicSwap: relicId }
      }),
      clearPendingRelicSwap: () => set({ pendingRelicSwap: null }),

      // Swap equipped[slotIndex] out to vault, put newRelicId in its place
      swapRelic: (slotIndex, newRelicId) => set(s => {
        const outgoing = s.relics[slotIndex]
        if (!outgoing) return {}
        let deck = s.deck
        let iceboxCardIds = [...(s.iceboxCardIds || [])]
        if (outgoing === 'sprint_icebox' && iceboxCardIds.length > 0) {
          deck = [...deck, ...iceboxCardIds]
          iceboxCardIds = []
        }
        const newEquipped = [...s.relics]
        newEquipped[slotIndex] = newRelicId
        const newVault = s.vaultRelics.filter(id => id !== newRelicId)
        if (outgoing) newVault.push(outgoing)
        return { relics: newEquipped, vaultRelics: newVault, pendingRelicSwap: null, deck, iceboxCardIds }
      }),

      // Decline the new relic — put it in vault (or discard)
      skipRelicSwap: () => set(s => ({
        pendingRelicSwap: null,
        // Optionally discard: don't add to vault. Spec says "Skip = decline entirely".
      })),

      // Vault swapping at rest site — swap equipped[i] with vault[j]
      vaultSwap: (equippedIndex, vaultRelicId) => set(s => {
        const outgoing = s.relics[equippedIndex]
        if (!outgoing || !s.vaultRelics.includes(vaultRelicId)) return {}
        let deck = s.deck
        let iceboxCardIds = [...(s.iceboxCardIds || [])]
        if (outgoing === 'sprint_icebox' && iceboxCardIds.length > 0) {
          deck = [...deck, ...iceboxCardIds]
          iceboxCardIds = []
        }
        const newEquipped = [...s.relics]
        newEquipped[equippedIndex] = vaultRelicId
        const newVault = s.vaultRelics.filter(id => id !== vaultRelicId)
        if (outgoing) newVault.push(outgoing)
        return { relics: newEquipped, vaultRelics: newVault, deck, iceboxCardIds }
      }),

      // Add relic directly to vault (e.g. from events)
      addRelicToVault: (relicId) => set(s => ({
        vaultRelics: s.vaultRelics.includes(relicId) ? s.vaultRelics : [...s.vaultRelics, relicId]
      })),

      setLastCardTypePlayed: (type) => set({ lastCardTypePlayed: type }),

      // Potions
      addPotion: (potionId) => set(s => {
        if (s.potions.length >= 3) return {} // full, drop is lost (handled in UI)
        return { potions: [...s.potions, potionId] }
      }),
      removePotion: (potionId) => set(s => {
        const idx = s.potions.indexOf(potionId)
        if (idx === -1) return {}
        const next = [...s.potions]
        next.splice(idx, 1)
        return { potions: next }
      }),
      removePotionByIndex: (index) => set(s => {
        const next = [...s.potions]
        next.splice(index, 1)
        return { potions: next }
      }),
      setPotionEffect: (key, value) => set(s => ({
        potionEffects: { ...s.potionEffects, [key]: value }
      })),
      resetPotionEffects: () => set({
        potionEffects: {
          clarityActive: false,
          memoryFlaskActive: false,
          echoTonicActive: false,
          autoCorrectActive: false,
          scholarsBloodActive: false,
        }
      }),

      logCorrect: () => set(s => ({
        sessionCorrect: s.sessionCorrect + 1,
        fightCorrect: s.fightCorrect + 1,
        fightCorrectStreak: s.fightCorrectStreak + 1,
      })),
      resetFightAccuracy: () => set({ fightCorrect: 0, fightTotal: 0, fightCorrectStreak: 0 }),
      setWornDictionaryUsed: () => set({ wornDictionaryUsedThisFight: true }),
      incrementTurn: () => set(s => ({ turnNumber: s.turnNumber + 1 })),

      // Map navigation
      setMap: (nodes, paths) => set({ mapNodes: nodes, mapPaths: paths }),
      setMapNodes: (nodes) => set({ mapNodes: nodes }),
      setCurrentNode: (nodeId) => set({ currentNodeId: nodeId }),
      setFloor: (floor) => set({ floor }),

      // Journal
      addJournalWord: (entry) => set(s => ({
        journalWords: s.journalWords.some(w => w.questionId === entry.questionId)
          ? s.journalWords
          : [...s.journalWords, entry]
      })),
      addJournalGrammar: (entry) => set(s => ({
        journalGrammar: s.journalGrammar.some(g => g.questionId === entry.questionId)
          ? s.journalGrammar
          : [...s.journalGrammar, entry]
      })),

      // Deck management
      addCardToDeck: (cardId) => set(s => ({ deck: [...s.deck, cardId] })),
      /** Remove one copy of cardId from the first pile that contains it (deck → hand → discard → exhaust → icebox). */
      removeCardFromDeck: (cardId) => set(s => {
        const cut = (arr) => {
          const i = arr.indexOf(cardId)
          if (i === -1) return null
          return [...arr.slice(0, i), ...arr.slice(i + 1)]
        }
        const d = cut(s.deck)
        if (d) return { deck: d }
        const h = cut(s.hand)
        if (h) return { hand: h }
        const di = cut(s.discardPile)
        if (di) return { discardPile: di }
        const ex = cut(s.exhaustPile || [])
        if (ex) return { exhaustPile: ex }
        const ice = cut(s.iceboxCardIds || [])
        if (ice) return { iceboxCardIds: ice }
        return {}
      }),
      /**
       * Remove exactly one card at a known pile index (merchant / precise UI).
       * pile: 'deck' | 'hand' | 'discardPile' | 'exhaustPile' | 'icebox'
       */
      removeCardInstance: ({ pile, index }) => set(s => {
        const key = pile === 'icebox' ? 'iceboxCardIds' : pile
        if (!['deck', 'hand', 'discardPile', 'exhaustPile', 'iceboxCardIds'].includes(key)) return {}
        const arr = [...(s[key] || [])]
        if (index < 0 || index >= arr.length) return {}
        arr.splice(index, 1)
        return { [key]: arr }
      }),

      /** Rest site (upgrade) / smith: swap one deck slot to another card id (e.g. base → plus). */
      replaceDeckCardAtIndex: (index, newCardId) => set(s => {
        if (index < 0 || index >= s.deck.length) return {}
        const d = [...s.deck]
        d[index] = newCardId
        return { deck: d }
      }),

      /** Park one deck copy by index (non-combat + sprint_icebox only). Preserves duplicates. */
      parkDeckSlotAtIndex: (deckIndex) => set(s => {
        if (s.inCombat || !s.relics.includes('sprint_icebox')) return {}
        const ice = [...(s.iceboxCardIds || [])]
        if (ice.length >= 2) return {}
        if (deckIndex < 0 || deckIndex >= s.deck.length) return {}
        const id = s.deck[deckIndex]
        const newDeck = s.deck.filter((_, i) => i !== deckIndex)
        ice.push(id)
        return { deck: newDeck, iceboxCardIds: ice }
      }),
      /** Return one parked card from icebox slot index back to bottom of deck. */
      unparkIceboxSlot: (slotIndex) => set(s => {
        if (s.inCombat || !s.relics.includes('sprint_icebox')) return {}
        const ice = [...(s.iceboxCardIds || [])]
        if (slotIndex < 0 || slotIndex >= ice.length) return {}
        const [id] = ice.splice(slotIndex, 1)
        return { deck: [...s.deck, id], iceboxCardIds: ice }
      }),

      // Combat toggle
      setInCombat: (val) => set({ inCombat: val }),

      // v2: startFight — single action that resets all fight state atomically
      startFight: (enemy) => set(s => {
        let newBlindCardId = null
        if (s.masteryLevel >= 3 && s.deck.length > 0) {
          newBlindCardId = s.deck[Math.floor(Math.random() * s.deck.length)]
        }
        const rel = s.relics
        let startBlock = rel.includes('fox_mask') ? 10 : 0
        if (rel.includes('pager_rattle')) startBlock += 2
        const startGoldBonus = rel.includes('brief_rain') ? 3 : 0
        const startHeal = rel.includes('handoff_marker') ? 2 : 0
        const slotsForFight = (s.combatEnemySlots && s.combatEnemySlots.length > 0)
          ? resetSlotsForNewFight(s.combatEnemySlots)
          : slotsFromEnemyDefs([enemy])
        const legacyFight = legacyFromSlots(slotsForFight)
        return {
          inCombat: true,
          combatEnemySlots: slotsForFight,
          activeEnemySlotIndex: 0,
          currentEnemy: legacyFight.currentEnemy,
          enemyHp: legacyFight.enemyHp,
          enemyMaxHp: legacyFight.enemyMaxHp,
          enemyArmor: 0,
          enemyFuryStacks: 0,
          enemyFocusType: null,
          intentIndex: legacyFight.intentIndex,
          lockedCards: [],           // RULE: unlock all cards at fight start
          retainedCards: [],         // v3: clear retained cards at fight start
          retainGrowthStacks: {},    // v3: clear growth stacks at fight start
          activeEnemyBuffs: [],
          lastPlayWasAttack: false,
          consecutiveAttackPlays: 0,
          playsThisPlayerTurn: 0,
          enemyAttackTargetConfirmed: false,
          pendingNextDamageBonus: 0,
          cardTypesPlayedThisFight: {},
          wornDictionaryUsedThisFight: false,
          fightCorrect: 0,
          fightTotal: 0,
          fightCorrectStreak: 0,
          turnNumber: 0,
          block: startBlock,
          hp: Math.min(s.maxHp, s.hp + startHeal),
          gold: s.gold + startGoldBonus,
          energy: s.maxEnergy,
          bonusEnergyNextTurn: 0,
          blindCardId: newBlindCardId,
          lastCardTypePlayed: null,
          reflectStacks: rel.includes(PINGBACK_PINS_RELIC_ID) ? 1 : 0,
          reflectDamagePer: rel.includes(PINGBACK_PINS_RELIC_ID) ? PINGBACK_PINS_DAMAGE_PER_STACK : 0,
          playerStrength: rel.includes('corner_office_keycard') ? 2 : 0,
          playerPoisonAuraPerTurn: 0,
          playerHpLossThisFight: 0,
          pendingDiscardPick: null,
          pendingHandExhaustEnergyPick: false,
        }
      }),

      // v2: endFight — moves remaining hand to discard to prevent deck shrinkage
      endFight: () => set(s => ({
        inCombat: false,
        combatEnemySlots: [],
        activeEnemySlotIndex: 0,
        currentEnemy: null,
        lockedCards: [],
        retainedCards: [],         // v3: clear on fight end
        retainGrowthStacks: {},    // v3: clear on fight end
        activeEnemyBuffs: [],
        activePlayerDebuffs: [],
        lastPlayWasAttack: false,
        consecutiveAttackPlays: 0,
        pendingNextDamageBonus: 0,
        energyDebtNextTurn: 0,
        cardTypesPlayedThisFight: {},
        // CRITICAL: Merge all combat cards back into the master deck
        deck: [...s.deck, ...s.discardPile, ...s.hand],
        discardPile: [],
        hand: [],
        block: 0,
        blindCardId: null,
        reflectStacks: 0,
        reflectDamagePer: 0,
        playerStrength: 0,
        playerPoisonAuraPerTurn: 0,
        pendingDiscardPick: null,
        pendingHandExhaustEnergyPick: false,
      })),


      // Run lifecycle
      startRun: (campaign, character, masteryLevel, startingDeck, starterRelicId) => {
        const resolvedStarterRelic = starterRelicId || character?.starterRelic || null

        const startHp = 80
        const startMaxEnergy = 3
        const startGold = 0

        // Session backup for portrait path (some builds / rehydrate edge cases drop nested `character`)
        try {
          if (typeof sessionStorage !== 'undefined') {
            sessionStorage.setItem('lq_run_character_id', character?.id || '')
            sessionStorage.setItem('lq_run_campaign_id', campaign || '')
          }
        } catch {}

        set({
          runId: crypto.randomUUID(),
          campaign,
          character,
          masteryLevel,
          hp: startHp,
          maxHp: startHp,
          block: 0,
          gold: startGold,
          floor: 1,
          energy: startMaxEnergy,
          maxEnergy: startMaxEnergy,
          overloadGlobal: 0,
          energyDebtNextTurn: 0,
          deck: startingDeck || [],
          hand: [],
          discardPile: [],
          exhaustPile: [],
          iceboxCardIds: [],
          relics: resolvedStarterRelic ? [resolvedStarterRelic] : [],
          activeBuffs: [],
          lockedCards: [],
          activePlayerDebuffs: [],
          activeEnemyBuffs: [],
          lastPlayWasAttack: false,
          consecutiveAttackPlays: 0,
          pendingNextDamageBonus: 0,
          inCombat: false,
          currentEnemy: null,
          sessionCorrect: 0,
          sessionTotal: 0,
          fightCorrect: 0,
          fightTotal: 0,
          cardTypesPlayedThisFight: {},
          cardTypesPlayedThisTurn: {},
          playerHpLossThisFight: 0,
          bonusDrawFirstHandNextFight: 0,
          journalWords: [],
          journalGrammar: [],
          mapNodes: [],
          mapPaths: [],
          currentNodeId: null,
          wornDictionaryUsedThisFight: false,
          turnNumber: 0,
          intentIndex: 0,
          enemyArmor: 0,
          enemyFuryStacks: 0,
          enemyFocusType: null,
          blindCardId: null,
          reflectStacks: 0,
          reflectDamagePer: 0,
          merchantOffer: null,
          pendingDiscardPick: null,
          pendingHandExhaustEnergyPick: false,
          combatEnemySlots: [],
          activeEnemySlotIndex: 0,
          enemyAttackTargetConfirmed: false,
        })
      },

      endRun: () => {
        try {
          if (typeof sessionStorage !== 'undefined') {
            sessionStorage.removeItem('lq_run_character_id')
            sessionStorage.removeItem('lq_run_campaign_id')
          }
        } catch {}
        set({
          runId: null,
          inCombat: false,
          currentEnemy: null,
          combatEnemySlots: [],
          activeEnemySlotIndex: 0,
          hand: [],
          lockedCards: [],
          activePlayerDebuffs: [],
          activeEnemyBuffs: [],
          iceboxCardIds: [],
          merchantOffer: null,
          pendingDiscardPick: null,
          pendingHandExhaustEnergyPick: false,
          playerStrength: 0,
        })
      },
    }),
    {
      name: STORAGE_KEYS.ACTIVE_RUN,
      storage: createJSONStorage(() => localStorage),
      version: 2,
      migrate: (persistedState) => {
        if (!persistedState || typeof persistedState !== 'object') return persistedState
        const next = { ...persistedState }
        delete next.activeModifier
        delete next.lastStandUsed
        const ch = next.character
        if (
          next.campaign === 'japanese'
          && ch
          && (ch.id === 'hana' || ch.id === 'yuki')
        ) {
          const kenji = CARDS.japanese.characters.find((c) => c.id === 'kenji')
          if (kenji) next.character = { ...ch, ...kenji }
        }
        return next
      },
    }
  )
)

export default useRunStore
