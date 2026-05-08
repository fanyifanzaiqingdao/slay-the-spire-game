# 第一幕 · 程序员路线 — 设计规格（对齐当前工程）

本文与仓库内 **`useCombat` / `useEnemyTurn` / `runStore` / `enemies.json` / `cards.json`** 的结构一致，可直接作为数据与策划单。

---

## 1. 现有代码对你有帮助吗？

**有。** 你已经有：

- 敌人 **`intent_pattern`**：每回合一组 `enemyMoves`（`strike`、`debuff_silence`、`self_buff_armor_up` 等）。
- 卡牌 **`type`**：`vocabulary` / `grammar` / `reading`（建议对玩家显示为 **Ship / Process / Insight**）。
- **`wrong_answer_buffs`**：按卡类型给敌人上短期 buff（若战斗里仍走「失误」逻辑）。
- 遗物注册表 **`src/data/relics.js`**、商店/事件入口骨架。

你要做的主要是：**换皮 + 控制 Act1 数值曲线 + 填满程序员主题卡池**。

---

## 2. 核心创意（可长期保留）

1. **三角张力**：Ship（落地改代码）↔ Process（规范、评审、挡伤害）↔ Insight（读文档、对齐需求、抽滤牌）。与现有 **连携链**（Vocab→Gram→Read）天然一致。
2. **敌人 = 工作阻力**：小怪是「噪音与打断」，精英是「流程与债务」，Boss 是「里程碑/发布窗口」。
3. **第一幕主题**：「从本地能跑 → 上预发 → 第一次线上事故边缘」——数值中等、机制少、教连携与 Block。
4. **UI/PM 梗放在事件与遗物**：卡面保持可读；怪物名字可以很梗。
5. **商店三类货**：卡牌移除/升级（若已实现）、遗物、药水（你已有 `potions.js` 可扩展）。
6. **奖励节奏**：普通战 1 选卡；精英战 遗物或稀有卡二选一 + 金币；Boss 固定金 + 稀有三选一。

---

## 3. 第一幕敌人设计（程序员线）

**约定**：`tier`: `regular` | `elite` | `boss`；`silence_type` 填 `vocabulary` | `grammar` | `reading`（与引擎一致）。

### 3.1 小怪（Regular，Floor 1–2）

| id | 名称（中） | 名称（英） | HP | ATK | silence | 意图循环（简写） | 设定 |
|----|------------|------------|-----|-----|---------|------------------|------|
| `dev_r_legacy_log` | 遗留日志怪 | Legacy Log Gremlin | 38 | 6 | vocabulary | strike → strike → debuff_fog | 永远刷不完的老日志，糊你一脸优先级 |
| `dev_r_dependency_imp` | 依赖小鬼 | Dependency Imp | 42 | 6 | grammar | strike → self_buff_armor_up → strike | `node_modules` 成精，越打越硬 |
| `dev_r_flaky_test` |  flaky 测试灵 | Flaky Test Wisp | 36 | 7 | reading | strike_swift → debuff_confusion → strike_swift | 随机失败，搞你心态 |
| `dev_r_meeting_slime` | 会议史莱姆 | Meeting Slime | 44 | 5 | grammar | debuff_drain → strike → debuff_bind | 会吸干你的「精力」（Drain）还拖你抽牌 |

意图简写展开示例（`legacy_log`）：

```json
"intent_pattern": [
  ["strike"],
  ["strike"],
  ["debuff_fog"]
]
```

### 3.2 精英（Elite，Floor 2–3）

| id | 名称 | HP | ATK | silence | 意图特点 | 设定 |
|----|------|-----|-----|---------|----------|------|
| `dev_e_code_freeze` | 需求冻结骑士 | 78 | 10 | reading | 多回合护甲 + Silence Insight | PM 口头需求冻结，你只能读旧文档 |
| `dev_e_ci_golem` | CI 石像鬼 | 85 | 9 | vocabulary | strike_heavy + enrage 叠层 | 红构建叠怒，一击超重 |

示例意图（CI Golem）：

```json
"intent_pattern": [
  ["self_buff_power_up"],
  ["strike", "strike"],
  ["strike_heavy"],
  ["debuff_silence"]
]
```

### 3.3 Boss（Act1 关底）

| id | 名称 | HP | ATK | 阶段 | 设定 |
|----|------|-----|-----|------|------|
| `dev_b_release_train` | 发布列车长 | 140–180（按难度调） | 11 | 2 阶段 | 第一幕终点：「全团队上火车」 |

- **P1（>60% HP）**：节奏型 — strike / drain / armor，教玩家留 Process 牌挡刀。
- **P2（≤60% HP）**：在 `phases`（若你沿用 Boss JSON 结构）加入 `debuff_curse` 或连续 `strike_heavy`，象征「封窗发布」。

---

## 4. 遗物（Act1 池建议）

与现有 `RELICS` **同 id 可复用**；下列为 **程序员主题新增命名建议**（实现时写入 `relics.js` + 池子权重）。

| 层级 | 遗物概念 | 效果方向（与现引擎对齐） |
|------|-----------|---------------------------|
| Starter | Onboarding Cheat Sheet | 首误不锁牌 / 给 brief（你已有 phrasebook 变体） |
| Common | Lint Bracelet | 强化连携或改 silence 权重 |
| Common | Sticky Note of +1 | 每场战斗开始多 1 临时 Block |
| Uncommon | Rubber Duck | 每回合首次 Ship 牌减费或加伤 |
| Rare | Monolith Contract | 开局多能量 / 多牌（需配诅咒平衡） |

商店：**金币价 = 基础价 × Act 系数**；稀有遗物出现率 Act1 应低（约 5–8%）。

---

## 5. 商店与其它奖励

| 类型 | 内容 |
|------|------|
| 卡牌 | 从 Act1 程序员池抽 3–4 张 + 1 张略高稀有度 |
| 遗物 | 从 Common/Uncommon 权重池 roll |
| 药水 | 澄清（看意图）、能量、免锁一次等（对齐 `potionEffects`） |
| 移除服务 | 删一张「技术债」牌（curse 或弱牌） |
| 升级 | 若未实现可先占位金币购买「+数值」 |

---

## 6. 战斗状态结构（与当前工程映射）

### 6.1 回合阶段（`CombatScreen` 已有）

`PLAYER_DRAW` → `PLAYER_TURN` → `ENEMY_TURN` →（Boss 特殊）→ `FIGHT_END`

### 6.2 建议记在策划文档里的「逻辑状态」（多数已在 `runStore`）

| 状态块 | 字段（参考） | 说明 |
|--------|----------------|------|
| 玩家 | `hp`, `maxHp`, `block`, `energy`, `maxEnergy` | |
| 牌堆 | `deck`, `hand`, `discardPile`, `exhaustPile` | |
| 敌人 | `currentEnemy`, `enemyHp`, `enemyMaxHp`, `enemyArmor`, `intentIndex`, `enemyFuryStacks` | |
| 减益 | `activePlayerDebuffs`, `activeEnemyBuffs` | Silence / Drain / Fog 等 |
| 连携 | `chainActive`, `chainType`, `lastCardTypePlayed` | |
| 遗物 | `relics[]`, `vaultRelics[]` | 最多 5 装备位 |

---

## 7. 卡牌 JSON Schema（与 `cards.json` 对齐）

以下为 **单卡对象** 推荐字段；未列字段可省略（引擎未用则无效）。

```json
{
  "id": "string",
  "campaign": "japanese",
  "name_native": "string",
  "name_target": "string",
  "type": "vocabulary | grammar | reading | curse",
  "rarity": "common | uncommon | rare | story_rare | curse",
  "energy_cost": 0,
  "effect": {
    "damage": 0,
    "bonus_correct_first_try": 0,
    "bonus_if_block_active": 0,
    "hits": 1,
    "chain_bonus": 0,
    "block": 0,
    "heal": 0,
    "draw": 0,
    "discard_draw": 0,
    "exhaust_self_gain_energy": 0,
    "retain": false
  },
  "question_tags": ["string"],
  "flavor_native": "string",
  "flavor_target": "string",
  "upgradeable": true,
  "upgraded_id": "string | null",
  "illustration": "string"
}
```

**当前 `useCombat` 已处理的效果键**：`damage`（含 `hits`、`bonus_correct_first_try`、`bonus_if_block_active`）、`block`、`heal`、`draw`、`chain_bonus`（在连携倍率>1 时追加伤害）、`discard_draw`、`exhaust_self_gain_energy`、`effect.retain`（卡牌保留在手上，见 `drawHand`）。

**未在片段中确认的全局效果**（若加新键需同步改 `applyCardEffect`）：如 `damage_all`、`type` 伤害转换等——Act1 建议先用上表子集。

---

## 8. 第一幕程序员卡池 — 40 张完整表

**用途**：Act1 奖励 / 商店 / 掉落共用池（可再分子池按楼层过滤）。

**类型列**：V = vocabulary（Ship），G = grammar（Process），R = reading（Insight）

| # | id | 类型 | 稀有 | 费 | 效果（引擎字段语义） | name_native | name_target |
|---|-----|------|------|-----|------------------------|---------------|---------------|
|1|dev_c_hotfix|V|common|1|damage 6, bonus_first 3|Hotfix|热修复|
|2|dev_c_unit_nudge|V|common|1|damage 7|Unit Test Nudge|单测轻推|
|3|dev_c_git_blame|V|common|1|damage 5, draw 1|Git Blame|甩锅追踪|
|4|dev_c_printf_debug|V|common|0|damage 4|Printf Debug|打印调试|
|5|dev_c_stack_overflow|V|common|2|damage 12|Stack Overflow|栈溢出打击|
|6|dev_c_cherry_pick|V|common|1|damage 8, chain_bonus 4|Cherry-Pick|挑拣提交|
|7|dev_c_merge_conflict|V|uncommon|2|damage 10, hits 2|Merge Conflict|合并冲突|
|8|dev_c_race_condition|V|uncommon|1|damage 9, bonus_first 2|Race Condition|竞态一击|
|9|dev_c_memory_leak|V|uncommon|2|damage 14|Memory Leak|内存泄漏|
|10|dev_c_deadlock|V|rare|3|damage 18, bonus_if_block 6|Deadlock|死锁终结|
|11|dev_c_refactor_spree|V|rare|2|damage 11, chain_bonus 8|Refactor Spree|重构狂欢|
|12|dev_c_zero_day|V|rare|4|damage 22|Zero-Day Punch|零日直拳|
|13|dev_c_sticky_feature|V|common|1|damage 6, retain|Sticky Feature|粘性需求|
|14|dev_c_api_spam|V|common|1|damage 8|API Spam|接口狂刷|
|15|dev_c_lambda_jab|V|common|1|damage 7|Lambda Jab|匿名刺拳|
|16|dev_c_type_safety|V|uncommon|2|damage 13, bonus_first 5|Type Safety|类型安全|
|17|dev_c_benchmark|V|uncommon|2|damage 15|Benchmark Strike|基准一击|
|18|dev_c_ship_it|V|common|1|damage 6, draw 1|Ship It|上线按钮|
|19|dev_c_patch_tuesday|V|uncommon|2|damage 12, bonus_first 3|Patch Tuesday|补丁星期二|
|20|dev_c_container_escape|V|rare|3|damage 17|Container Escape|容器逃逸|

**Process（格挡 / 流程）12 张**

| # | id | 类型 | 稀有 | 费 | 效果 | name_native | name_target |
|---|-----|------|------|-----|------|-------------|-------------|
|21|dev_g_code_review|G|common|1|block 8|Code Review|代码评审|
|22|dev_g_guard_clause|G|common|1|block 6, bonus_first 2|Guard Clause|卫语句|
|23|dev_g_slack_dnd|G|common|1|block 7|Slack DnD|免打扰盾|
|24|dev_g_runbook|G|common|2|block 12|Runbook|手册格挡|
|25|dev_g_feature_flag|G|uncommon|1|block 9, retain|Feature Flag|特性开关|
|26|dev_g_rollback|G|uncommon|2|block 14|Rollback|回滚|
|27|dev_g_slo_barrier|G|uncommon|2|block 11, draw 1|SLO Barrier|SLO 屏障|
|28|dev_g_incident_triage|G|rare|2|block 16|Incident Triage|事故分流|
|29|dev_g_zero_trust|G|rare|3|block 20|Zero Trust Shell|零信任壳|
|30|dev_g_pair_session|G|common|1|block 5, draw 1|Pair Session|结对缓冲|
|31|dev_g_standup_block|G|common|1|block 6|Standup Block|站会格挡|
|32|dev_g_postmortem|G|uncommon|2|block 10, heal 3|Postmortem|复盘治疗|

**Insight（读条 / 滤抽 / 爆发）8 张**

| # | id | 类型 | 稀有 | 费 | 效果 | name_native | name_target |
|---|-----|------|------|-----|------|-------------|-------------|
|33|dev_r_readme|R|common|1|damage 4, block 4|README|读我|
|34|dev_r_rfc_skim|R|common|2|damage 6, draw 1|RFC Skim|扫规范|
|35|dev_r_arch_diagram|R|uncommon|2|damage 7, block 6, draw 1|Architecture Diagram|架构图|
|36|dev_r_metrics_dashboard|R|uncommon|1|draw 2|Metrics Dashboard|指标盘|
|37|dev_r_oncall_wisdom|R|rare|2|heal 8, block 4|Oncall Wisdom|值班智慧|
|38|dev_r_diff_expectations|R|rare|3|damage 10, draw 2|Diff Expectations|对齐差异|
|39|dev_r_stakeholder_ping|R|common|1|damage 5, block 3|Stakeholder Ping|干系人点名|
|40|dev_r_tech_spec|R|uncommon|2|damage 8, bonus_first 4|Tech Spec|技术规格|

**稀有度计数**：Common 19、Uncommon 13、Rare 8（合计 40）。若要凑整 20/12/8，可把一张 Ship Uncommon 降为 Common。

---

## 9. 实现提示（落库时）

1. **id 前缀**：上表 `dev_*` 可整体替换为你当前的 `jp_*` 或保留 `dev_*` 并改 `campaign` 为未来的 `engineer`。
2. **升级**：每张 common/uncommon 可配 `upgraded_id` 与 `+` 版（数值 +2~4 或费用 −1）。
3. **Boss phases**：参考现有 `enemies.json` 中带 `phases` 的 Boss 条目复制结构。
4. **平衡**：Act1 普通怪总伤害/回合建议低于玩家 Process 牌均 block；精英引入 multi-hit 或 debuff 叠层。

---

## 10. 版本

- 文档版本：v1  
- 对齐仓库：Ascendant / slay-the-spire-game（职业主题改版后）

---

## 11. 已实现：Act1 池挂接（数据 + 地图）

- **卡牌**：`src/data/japanese/cards.json` 中 40 张程序员 Act1 卡带 `"pool": "act1"`。  
- **敌人**：同目录 `enemies.json` 追加 7 条（4 普通 + 2 精英 + 1 Boss），带 `"pool": "act1"`。  
- **逻辑**：`src/constants/act1Pool.js` — `campaign === 'japanese'` 且 `floor <= 4` 时，抽卡奖励 / 商人 / 遇敌优先使用 `pool === 'act1'`；非 Boss 胜利后 `floor` 递增至 4 封顶，Boss 胜利后 `floor+1` 离开 Act1 全卡池。  
- **合并脚本**（可重复执行）：`scripts/merge-act1-data.mjs`
