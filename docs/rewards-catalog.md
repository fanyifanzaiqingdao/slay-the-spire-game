# 奖励总览（当前实现）

本文档整理当前代码里已经接入的奖励系统（以 `main` 现状为准），用于策划对齐和联调排查。

## 1) 战斗结算奖励（已实现）

普通/精英/Boss 战斗结束后，进入 `Loot` 流程，当前可出现 3 类奖励：

- 金币（固定出现）
- 药水（概率出现）
- 选卡（固定出现）

### 1.1 金币奖励

- 基础公式：`floor(10 + 准确率 * 20)`
- Boss 选择若是金币奖励，会叠加额外金币（例如 +25）
- 若持有 `Lucky Coin`，每场额外 +15 金币

### 1.2 药水奖励

- 掉落率：
  - 普通敌人：25%
  - 精英敌人：35%
  - Boss：100%（当前实现按 `isBoss` 保底）
- 药水池按楼层加权：
  - 1-2 层：Common 70% / Uncommon 25% / Rare 5%
  - 3-4 层：Common 50% / Uncommon 35% / Rare 15%
  - 5+ 层：Common 35% / Uncommon 40% / Rare 25%
- 背包上限 3 瓶；满背包时新药水会“碎掉”并丢失

当前药水共 15 种（4 Common / 5 Uncommon / 6 Rare）：

- Common：`Healing Draught`、`Focus Tonic`、`Guard Brew`、`Clarity Potion`
- Uncommon：`Chain Elixir`、`Memory Flask`、`Purge Vial`、`Echo Tonic`、`Scribe's Ink`
- Rare：`Ancestral Draught`、`The Answer`、`Overclock`、`Scholar's Blood`、`Graveyard Dust`

### 1.3 选卡奖励

- 非 Boss：默认给 Draft 池（基础 3 选 1）
- 稀有卡开放条件：战斗准确率 `>= 0.8`
- Mastery 规则 `smaller_draft` 生效时，Draft 数量 -1（最低 1）
- Boss 选项若指定 `reward.type = card` + `rarity`，则该稀有度固定 3 选 1
- 可跳过不拿卡

---

## 2) Boss 击败选项奖励（已实现）

Boss 击败界面的选项奖励已接入：

- `gold`：按配置增加金币
- `card`：按配置稀有度进入定向 Draft

注：当前数据里日文 Boss 常见为“`uncommon card` 或 `+25 gold`”。

---

## 3) 房间奖励（已实现）

### 3.1 商店（Merchant）

可获得/操作：

- 购买卡牌（1 张 common + 1 张 uncommon + 1 张 rare 的商店池）
- 花费金币移除卡牌（当前价格 75）
- `merchant_tax` 诅咒会提高价格
- 持有 `Merchant's Scale` 时，卡牌价格按 0.8 计算

### 3.2 休息点（Rest）

可获得/操作：

- 休息回血：回复 `maxHp * 25%`
- 复习（当前只是流程入口，实际“升级卡牌”尚未接入）
- Vault 换装：在已装备遗物和仓库遗物间互换

### 3.3 事件（Event）

当前事件奖励类型里，已真正生效的有：

- `heal`
- `gold`
- `hp_loss`

---

## 4) 元进度奖励（Pantheon）

Pantheon 是跨局奖励系统：

- XP 来源：
  - 每次答对：+2 XP
  - 每层通关：+20 XP
  - 通关胜利：+100 XP
- XP 达标后可领取 `PANTHEON_UNLOCKS`（含卡牌/遗物解锁项）

---

## 5) 已配置但未落地（重要）

以下奖励在数据/文案里出现，但逻辑里仍是占位或未接入：

- 事件奖励 `card_upgrade`（代码里是 `break // Phase 2`）
- 事件奖励 `relic_random`（代码里是 `break // Phase 2`）
- Boss 选择文案里存在 `reward.type = relic` 的显示分支，但战斗结算逻辑未处理 relic 发放
- 药水商店池与药水价格常量已定义，但商店 UI 目前未售卖药水
- 遗物注册表完整存在，但当前运行流程里缺少明确的“战后/事件随机遗物发放”调用链

---

## 6) 建议补齐顺序

建议按下面优先级补齐，收益最高：

- 先补 `EventRoom` 的 `card_upgrade` 与 `relic_random`
- 再补 Boss `relic` 奖励在 `handleVictory` 的发放分支
- 然后决定商店是否上架药水（已有数据结构可直接复用）
- 最后把“遗物获得来源”统一成一套池子/权重配置，方便平衡
