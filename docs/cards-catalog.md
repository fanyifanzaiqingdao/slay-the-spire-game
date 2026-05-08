# 卡牌清单（当前版本）

> 数据来源：`src/data/*/cards.json`  
> 统计时间：当前仓库状态（含已存在的 generated 卡）

## 总览

- 总卡牌数：`65`
- 按战役：
  - `japanese`：`53`
  - `korean`：`6`
  - `spanish`：`6`

## 类型 / 功能 / 费用 汇总

### 全战役总计（65张）

- 类型：
  - `vocabulary`：28
  - `grammar`：19
  - `reading`：18
- 费用分布：
  - `0费`：14
  - `1费`：29
  - `2费`：22
- 功能标签统计（同一张卡可计入多个功能）：
  - `damage`：49
  - `block`：45
  - `heal`：2
  - `draw`：3
  - `retain`：2
  - `discard_draw`：1
  - `exhaust_energy`：2
  - `chain_bonus`：3
  - `conditional_bonus`：1

### Japanese（53张）结构化统计

- 类型：`vocabulary 22` / `grammar 15` / `reading 16`
- 费用：`0费 12` / `1费 21` / `2费 20`
- 功能（可重叠）：
  - `damage 41`、`block 39`
  - `draw 3`、`heal 2`
  - `retain 2`、`discard_draw 1`
  - `exhaust_energy 2`
  - `chain_bonus 3`、`conditional_bonus 1`

### Korean（6张）结构化统计

- 类型：`vocabulary 3` / `grammar 2` / `reading 1`
- 费用：`0费 1` / `1费 4` / `2费 1`
- 功能（可重叠）：`damage 4` / `block 3`

### Spanish（6张）结构化统计

- 类型：`vocabulary 3` / `grammar 2` / `reading 1`
- 费用：`0费 1` / `1费 4` / `2费 1`
- 功能（可重叠）：`damage 4` / `block 3`

## Japanese（53张）

### 结构统计

- 类型分布：`vocabulary 22` / `grammar 15` / `reading 16`
- 稀有度分布：`common 18` / `uncommon 24` / `rare 11`
- 其中 generated 卡：`32`（`vocabulary 13` / `grammar 8` / `reading 11`）

### 主要命名卡（21张）

- `jp_vocab_strike` | Strike | vocabulary | common | 1费 | 造成8伤害；若本次判定为首次高质量触发可额外+4伤害
- `jp_vocab_strike_plus` | Strike+ | vocabulary | common | 1费 | 造成11伤害；额外加成+5
- `jp_vocab_wild_slash` | Wild Slash | vocabulary | common | 1费 | 造成7伤害；带有连锁追加伤害能力
- `jp_vocab_spirit_surge` | Spirit Surge | vocabulary | uncommon | 2费 | 高额单体伤害（14）
- `jp_vocab_swift_strike` | Swift Strike | vocabulary | common | 1费 | 造成6伤害并抽1张牌
- `jp_vocab_twin_fang` | Twin Fang | vocabulary | uncommon | 2费 | 双段伤害（8x2）
- `jp_vocab_kanji_blade` | Kanji Blade | vocabulary | rare | 2费 | 造成18伤害；若你当前有格挡可获得额外伤害
- `jp_vocab_mountain_echo` | Mountain Echo | vocabulary | uncommon | 2费 | 造成10伤害；连锁时有额外增伤
- `jp_gram_ward` | Ward | grammar | common | 1费 | 获得8格挡
- `jp_gram_ward_plus` | Ward+ | grammar | common | 1费 | 获得11格挡
- `jp_gram_iron_vow` | Iron Vow | grammar | uncommon | 2费 | 获得16格挡
- `jp_gram_particle_shield` | Particle Shield | grammar | common | 1费 | 获得6格挡；连锁可再加成
- `jp_gram_stone_skin` | Stone Skin | grammar | rare | 2费 | 获得20格挡（偏防御核心）
- `jp_read_spirit_scroll` | Spirit Sight | reading | common | 2费 | 回复8生命
- `jp_read_travelers_wisdom` | Traveler's Wisdom | reading | uncommon | 2费 | 抽2张牌（资源回转）
- `jp_vocab_tactical_retreat` | Tactical Retreat | vocabulary | uncommon | 1费 | 弃1抽2（位移手牌节奏）
- `jp_gram_meditate` | Meditate | grammar | uncommon | 1费 | 获得6格挡；该卡具备保留（retain）特性
- `jp_read_void_surge` | Void Surge | reading | rare | 2费 | 回复4生命；并可通过自我放逐换取能量
- `jp_gram_steady_stance` | Steady Stance | grammar | common | 0费 | 获得3格挡；可保留
- `jp_read_newcomers_luck` | Newcomer's Luck | reading | rare | 0费 | 获得15格挡并抽2张牌（高性价比防守启动）
- `jp_read_returnees_insight` | Returnee's Insight | reading | rare | 1费 | 造成12伤害；可通过放逐自身返还能量

### Generated 卡（32张）

- ID范围：`jp_*_gen_100` 到 `jp_*_gen_131`
- 命名规则：`Phantom Tech 101` ~ `Phantom Tech 132`（`name_native`）
- 特征：
  - 多数为 `damage + block` 组合
  - 能量分布覆盖 `0/1/2`
  - 稀有度以 `uncommon` 为主（17张）
  - 中文说明可按模板理解：**“造成X伤害并获得Y格挡”**

## Korean（6张）

### 结构统计

- 类型分布：`vocabulary 3` / `grammar 2` / `reading 1`
- 稀有度分布：全部 `common`

### 清单

- `kr_vocab_strike` | 스트라이크 | vocabulary | common | 1费 | 造成6伤害，并带额外加成
- `kr_vocab_wild_slash` | 와일드 슬래시 | vocabulary | common | 1费 | 造成8伤害
- `kr_vocab_swift_strike` | 신속한 공격 | vocabulary | common | 0费 | 造成4伤害
- `kr_gram_ward` | 방어 | grammar | common | 1费 | 获得5格挡，并带额外加成
- `kr_gram_particle_shield` | 파티클 실드 | grammar | common | 2费 | 获得12格挡
- `kr_read_spirit_scroll` | 정신 스크롤 | reading | common | 1费 | 造成4伤害并获得4格挡

## Spanish（6张）

### 结构统计

- 类型分布：`vocabulary 3` / `grammar 2` / `reading 1`
- 稀有度分布：全部 `common`

### 清单

- `es_vocab_strike` | Golpe | vocabulary | common | 1费 | 造成6伤害，并带额外加成
- `es_vocab_wild_slash` | Corte Salvaje | vocabulary | common | 1费 | 造成8伤害
- `es_vocab_swift_strike` | Golpe Rápido | vocabulary | common | 0费 | 造成4伤害
- `es_gram_ward` | Guardia | grammar | common | 1费 | 获得5格挡，并带额外加成
- `es_gram_particle_shield` | Escudo de Partículas | grammar | common | 2费 | 获得12格挡
- `es_read_spirit_scroll` | Pergamino Espiritual | reading | common | 1费 | 造成4伤害并获得4格挡

## 备注

- 你刚问的 `jp_vocab_strike` 本质上是**1费基础输出卡**，定位是开局稳定打伤害的“通用攻击牌”。
- 如果你希望，我可以继续把 `jp_*_gen_100~131` 这32张也逐张展开成“每张一行中文描述”（目前是按模板归类）。
