# 卡牌参考（自动生成）

> 生成时间：2026-05-08T13:06:29.200Z
> 机器可读完整数据：**[cards-catalog-export.json](./cards-catalog-export.json)**

## 总览

| 指标 | 数量 |
|------|------|
| 卡牌总数 | 143 |
| japanese | 122 |
| korean | 10 |
| spanish | 11 |

### 全体：类型 / 稀有度 / 费用

**类型** {"vocabulary":63,"grammar":50,"reading":29,"curse":1}

**稀有度** {"common":75,"uncommon":48,"rare":19,"curse":1}

**费用** {"0":18,"1":77,"2":43,"3":4,"4":1}

## JSON 字段说明


| 字段 | 含义 |
|------|------|
| `id` | 卡牌唯一 ID |
| `campaign` | 战役（语言包） |
| `name_target` / `name_native` | 目标语名称 / 本地化名（多为英文） |
| `type` | `vocabulary` / `grammar` / `reading` / `curse` |
| `rarity` | `common` / `uncommon` / `rare` / … |
| `energy_cost` | 能量消耗 |
| `effect` | 原始技能对象（与战斗逻辑一致） |
| `effect_summary_zh` / `effect_summary_en` | 与卡牌界面草稿描述一致的效果摘要 |
| `flavor_target` / `flavor_native` | 风味文本 |
| `upgradeable` / `upgraded_id` | 是否可升级 / 升级后 ID |
| `question_tags` | 题库标签（若有） |
| `keywords` | 关键词（如「奇巧」） |

## 清单（按战役）

### japanese（122）

| id | 名称（目标语） | 类型 | 稀有 | 费 | 中文效果摘要 |
|----|----------------|------|------|-----|----------------|
| `common_printf_debug` | 打印调试 | vocabulary | common | 0 | 造成 3 点伤害 抽 1 张牌 |
| `common_printf_debug_plus` | 打印调试+ | vocabulary | common | 0 | 造成 5 点伤害 抽 1 张牌 |
| `dev_act1_api_spam` | 接口狂刷 | vocabulary | common | 1 | 造成 8 点伤害 |
| `dev_act1_arch_diagram` | 架构图 | reading | uncommon | 2 | 造成 7 点伤害 获得 6 点格挡 抽 1 张牌 |
| `dev_act1_backlog_triage` | Backlog 梳理 | grammar | uncommon | 1 | 造成 6 点伤害，首打 +2 获得 6 点格挡 本场下一张伤害牌 +4。 |
| `dev_act1_backlog_triage_plus` | Backlog 梳理+ | grammar | uncommon | 1 | 造成 8 点伤害，首打 +3 获得 8 点格挡 本场下一张伤害牌 +6。 |
| `dev_act1_benchmark` | 基准一击 | vocabulary | uncommon | 2 | 造成 15 点伤害 |
| `dev_act1_breaker_shell` | 熔断护壳 | grammar | common | 2 | 获得 10 点格挡 本场战斗反伤次数 +2 |
| `dev_act1_cherry_pick` | 挑拣提交 | vocabulary | common | 1 | 造成 8 点伤害 连携：+4 |
| `dev_act1_code_review` | 代码评审 | grammar | common | 1 | 获得 8 点格挡 |
| `dev_act1_container_escape` | 容器逃逸 | vocabulary | rare | 3 | 造成 17 点伤害 |
| `dev_act1_curse_echo_invoice` | 回声工单 | curse | curse | 0 | 未被消耗并进入弃牌堆时：复制一张加入弃牌堆。 |
| `dev_act1_deadlock` | 死锁终结 | vocabulary | rare | 3 | 造成 18 点伤害 有格挡时额外 +6。 本场战斗反伤次数 +1 |
| `dev_act1_diff_expectations` | 对齐差异 | reading | rare | 3 | 造成 10 点伤害 抽 2 张牌 |
| `dev_act1_feature_flag` | 特性开关 | grammar | uncommon | 1 | 获得 9 点格挡 保留：每多保留一回合，格挡 +4。 |
| `dev_act1_git_blame` | 甩锅追踪 | vocabulary | common | 1 | 造成 5 点伤害 抽 1 张牌 |
| `dev_act1_guard_clause` | 卫语句 | grammar | common | 1 | 获得 6 点格挡 |
| `dev_act1_hotfix` | 热修复 | vocabulary | common | 1 | 造成 6 点伤害，首打 +3 |
| `dev_act1_incident_triage` | 事故分流 | grammar | rare | 2 | 获得 16 点格挡 |
| `dev_act1_lambda_jab` | 匿名刺拳 | vocabulary | common | 1 | 造成 7 点伤害 |
| `dev_act1_memory_leak` | 内存泄漏 | vocabulary | uncommon | 2 | 造成 14 点伤害 本场战斗每层反伤伤害 +1 |
| `dev_act1_merge_conflict` | 合并冲突 | vocabulary | uncommon | 2 | 造成 10 点伤害（2 段） |
| `dev_act1_metrics_dashboard` | 指标盘 | reading | uncommon | 1 | 抽 2 张牌 |
| `dev_act1_oncall_wisdom` | 值班智慧 | reading | rare | 2 | 获得 4 点格挡 恢复 8 点生命 |
| `dev_act1_pair_session` | 结对缓冲 | grammar | common | 1 | 获得 5 点格挡 抽 1 张牌 |
| `dev_act1_patch_tuesday` | 补丁星期二 | vocabulary | uncommon | 2 | 造成 12 点伤害，首打 +3 |
| `dev_act1_postmortem` | 复盘治疗 | grammar | uncommon | 2 | 获得 10 点格挡 恢复 3 点生命 |
| `dev_act1_printf_debug` | 打印调试 | vocabulary | common | 0 | 造成 4 点伤害 |
| `dev_act1_race_condition` | 竞态一击 | vocabulary | uncommon | 1 | 造成 9 点伤害，首打 +2 |
| `dev_act1_readme` | 读我 | reading | common | 1 | 造成 4 点伤害 获得 4 点格挡 |
| `dev_act1_refactor_spree` | 重构狂欢 | vocabulary | rare | 2 | 造成 11 点伤害 连携：+8 |
| `dev_act1_rfc_skim` | 扫规范 | reading | common | 2 | 造成 6 点伤害 抽 1 张牌 |
| `dev_act1_rollback` | 回滚 | grammar | uncommon | 2 | 获得 14 点格挡 |
| `dev_act1_runbook` | 手册格挡 | grammar | common | 2 | 获得 12 点格挡 |
| `dev_act1_ship_it` | 上线按钮 | vocabulary | common | 1 | 造成 6 点伤害 抽 1 张牌 |
| `dev_act1_skill_energy_scavenge` | 能量回收 | grammar | uncommon | 1 | 消耗 1 张手牌。获得等同于该牌消耗能量的能量。 |
| `dev_act1_skill_return_lane` | 回路收回 | grammar | uncommon | 1 | 获得 3 点格挡 从弃牌堆将 1 张牌收回手牌。消耗。 |
| `dev_act1_skill_return_lane_plus` | 回路收回+ | grammar | uncommon | 1 | 获得 5 点格挡 从弃牌堆将 1 张牌收回手牌。 |
| `dev_act1_skill_scope_trim` | 范围修剪 | grammar | uncommon | 1 | 抽 3 张；将 1 张手牌置入弃牌堆。 |
| `dev_act1_skill_scope_trim_plus` | 范围修剪+ | grammar | uncommon | 1 | 抽 4 张；将 1 张手牌置入弃牌堆。 |
| `dev_act1_slack_dnd` | 免打扰盾 | grammar | common | 1 | 获得 7 点格挡 |
| `dev_act1_slo_barrier` | SLO 屏障 | grammar | uncommon | 2 | 获得 11 点格挡 抽 1 张牌 |
| `dev_act1_stack_overflow` | 栈溢出打击 | vocabulary | common | 2 | 造成 12 点伤害 本场战斗反伤次数 +2 |
| `dev_act1_stakeholder_ping` | 干系人点名 | reading | common | 1 | 造成 5 点伤害 获得 3 点格挡 |
| `dev_act1_standup_block` | 站会格挡 | grammar | common | 1 | 获得 6 点格挡 |
| `dev_act1_sticky_feature` | 粘性需求 | vocabulary | common | 1 | 造成 6 点伤害 保留：每多保留一回合，格挡 +4。 |
| `dev_act1_tech_spec` | 技术规格 | reading | uncommon | 2 | 造成 8 点伤害，首打 +4 |
| `dev_act1_type_safety` | 类型安全 | vocabulary | uncommon | 2 | 造成 13 点伤害，首打 +5 |
| `dev_act1_unit_nudge` | 单测轻推 | vocabulary | common | 1 | 造成 7 点伤害 |
| `dev_act1_vocab_ingenious_ping` | 奇巧回显 | vocabulary | uncommon | 1 | 造成 5 点伤害，首打 +2 |
| `dev_act1_zero_day` | 零日直拳 | vocabulary | rare | 4 | 造成 22 点伤害 |
| `dev_act1_zero_trust` | 零信任壳 | grammar | rare | 3 | 获得 20 点格挡 |
| `jp_gram_iron_vow` | SLA 护符 | grammar | uncommon | 2 | 获得 12 点格挡 |
| `jp_gram_meditate` | 技术债冥想 | grammar | uncommon | 1 | 获得 6 点格挡 保留：每多保留一回合，格挡 +4。 |
| `jp_gram_particle_shield` | 卫语句 | grammar | common | 1 | 获得 7 点格挡 连携：+2 |
| `jp_gram_steady_stance` | 零停机站姿 | grammar | common | 0 | 获得 4 点格挡 保留：每多保留一回合，格挡 +4。 |
| `jp_gram_stone_skin` | 不可变壳 | grammar | rare | 2 | 获得 16 点格挡 |
| `jp_gram_ward` | Code Review | grammar | common | 1 | 获得 5 点格挡 |
| `jp_gram_ward_plus` | Code Review+ | grammar | common | 1 | 获得 8 点格挡 |
| `jp_grammar_gen_105` | 规范·4 | grammar | uncommon | 0 | 造成 13 点伤害 获得 5 点格挡 |
| `jp_grammar_gen_107` | 规范·6 | grammar | common | 0 | 造成 9 点伤害 获得 5 点格挡 |
| `jp_grammar_gen_108` | 规范·1 | grammar | common | 2 | 造成 13 点伤害 获得 1 点格挡 |
| `jp_grammar_gen_112` | 规范·5 | grammar | uncommon | 1 | 造成 6 点伤害 获得 2 点格挡 |
| `jp_grammar_gen_118` | 规范·5 | grammar | rare | 1 | 造成 11 点伤害 获得 4 点格挡 |
| `jp_grammar_gen_126` | 规范·1 | grammar | uncommon | 1 | 造成 14 点伤害 获得 1 点格挡 |
| `jp_grammar_gen_129` | 规范·4 | grammar | uncommon | 0 | 造成 12 点伤害 获得 5 点格挡 |
| `jp_grammar_gen_130` | 规范·5 | grammar | common | 0 | 造成 8 点伤害 获得 2 点格挡 |
| `jp_job_dev_rubber_duck` | 小黄鸭调试 | grammar | common | 1 | 获得 8 点格挡 |
| `jp_job_dev_stack_push` | 进栈重击 | vocabulary | common | 1 | 造成 7 点伤害，首打 +2 连携：+3 |
| `jp_job_qa_flaky_run` | 偶发复现 | vocabulary | common | 1 | 对随机一名敌人造成 5 点伤害 虚弱 2 回合（造成的攻击伤害降低）— 单体 |
| `jp_job_qa_triage_barrier` | 定级屏障 | grammar | common | 1 | 获得 9 点格挡 虚弱 2 回合（造成的攻击伤害降低）— 单体 |
| `jp_read_newcomers_luck` | 新人手册 | reading | rare | 0 | 造成 0 点伤害 获得 12 点格挡 抽 1 张牌 |
| `jp_read_returnees_insight` | 回流指南 | reading | rare | 1 | 造成 10 点伤害 消耗：获得 1 点能量。 |
| `jp_read_spirit_scroll` | 读 README | reading | common | 2 | 恢复 6 点生命 抽 1 张牌 |
| `jp_read_travelers_wisdom` | 架构白皮书 | reading | uncommon | 2 | 抽 2 张牌 |
| `jp_read_void_surge` | RFC 深潜 | reading | rare | 2 | 恢复 3 点生命 消耗：获得 2 点能量。 |
| `jp_reading_gen_103` | 洞察·2 | reading | common | 0 | 造成 11 点伤害 获得 2 点格挡 |
| `jp_reading_gen_109` | 洞察·2 | reading | uncommon | 0 | 造成 6 点伤害 |
| `jp_reading_gen_110` | 洞察·3 | reading | uncommon | 0 | 造成 10 点伤害 获得 6 点格挡 |
| `jp_reading_gen_111` | 洞察·4 | reading | uncommon | 2 | 造成 14 点伤害 获得 3 点格挡 |
| `jp_reading_gen_113` | 洞察·6 | reading | common | 1 | 造成 12 点伤害 获得 1 点格挡 |
| `jp_reading_gen_119` | 洞察·6 | reading | uncommon | 1 | 造成 8 点伤害 获得 7 点格挡 |
| `jp_reading_gen_124` | 洞察·5 | reading | rare | 2 | 造成 7 点伤害 获得 7 点格挡 |
| `jp_reading_gen_125` | 洞察·6 | reading | uncommon | 2 | 造成 7 点伤害 获得 7 点格挡 |
| `jp_reading_gen_127` | 洞察·2 | reading | uncommon | 2 | 造成 12 点伤害 获得 3 点格挡 |
| `jp_reading_gen_128` | 洞察·3 | reading | uncommon | 2 | 造成 11 点伤害 获得 2 点格挡 |
| `jp_reading_gen_131` | 洞察·6 | reading | common | 1 | 造成 7 点伤害 获得 6 点格挡 |
| `jp_status_code_review` | 代码评审曝光 | grammar | common | 1 | 易伤 2 回合（受到的伤害 +50%）— 单体 中毒 +2（每回合开始时受伤，再 −1 层）— 单体 |
| `jp_status_deprecation_notice` | 废弃接口通告 | reading | common | 1 | 易伤 1 回合（受到的伤害 +50%）— 单体 中毒 +2（每回合开始时受伤，再 −1 层）— 单体 |
| `jp_status_incident_all_hands` | 全员事故复盘 | grammar | uncommon | 2 | 全体易伤 1 回合 全体中毒 +2 层 |
| `jp_status_memory_leak` | 内存泄漏 | vocabulary | common | 1 | 易伤 1 回合（受到的伤害 +50%）— 单体 中毒 +3（每回合开始时受伤，再 −1 层）— 单体 |
| `jp_status_minimal_repro` | 最小复现包 | grammar | common | 1 | 获得 5 点格挡 虚弱 2 回合（造成的攻击伤害降低）— 单体 |
| `jp_status_regression_mold` | 回归发霉 | vocabulary | common | 1 | 消耗：获得 2 点能量。 虚弱 3 回合（造成的攻击伤害降低）— 单体 |
| `jp_vocab_branch_prune` | 分支修剪 | vocabulary | uncommon | 2 | 对所有敌人造成 5 点伤害，首打 +3 |
| `jp_vocab_branch_prune_plus` | 分支修剪+ | vocabulary | uncommon | 2 | 对所有敌人造成 8 点伤害，首打 +4 |
| `jp_vocab_kanji_blade` | 严格模式 | vocabulary | rare | 2 | 造成 16 点伤害 有格挡时额外 +6。 |
| `jp_vocab_lucky_fork` | 幸运分叉 | vocabulary | common | 1 | 对随机一名敌人造成 7 点伤害，首打 +3 |
| `jp_vocab_mountain_echo` | 日志回声 | vocabulary | uncommon | 2 | 造成 12 点伤害 连携：+6 |
| `jp_vocab_spirit_surge` | 内存尖峰 | vocabulary | uncommon | 2 | 造成 14 点伤害，首打 +6 |
| `jp_vocab_strike` | 热修复 | vocabulary | common | 1 | 造成 6 点伤害，首打 +4 |
| `jp_vocab_strike_plus` | 热修复+ | vocabulary | common | 1 | 造成 9 点伤害，首打 +5 |
| `jp_vocab_swift_strike` | CI 连击 | vocabulary | common | 1 | 造成 7 点伤害，首打 +2 抽 1 张牌 |
| `jp_vocab_tactical_retreat` | git stash | vocabulary | uncommon | 1 | 弃 1 张，抽 2 张。 |
| `jp_vocab_twin_fang` | 双机热备 | vocabulary | uncommon | 2 | 造成 5 点伤害，首打 +2（2 段） |
| `jp_vocab_wild_slash` | 重构乱斩 | vocabulary | common | 1 | 造成 9 点伤害，首打 +3 连携：+4 |
| `jp_vocabulary_gen_100` | 交付·5 | vocabulary | rare | 1 | 造成 11 点伤害 获得 5 点格挡 |
| `jp_vocabulary_gen_101` | 交付·6 | vocabulary | uncommon | 1 | 造成 14 点伤害 获得 7 点格挡 |
| `jp_vocabulary_gen_102` | 交付·1 | vocabulary | common | 2 | 造成 12 点伤害 获得 2 点格挡 |
| `jp_vocabulary_gen_104` | 交付·3 | vocabulary | uncommon | 0 | 造成 9 点伤害 获得 2 点格挡 |
| `jp_vocabulary_gen_106` | 交付·5 | vocabulary | rare | 2 | 造成 8 点伤害 获得 1 点格挡 |
| `jp_vocabulary_gen_114` | 交付·1 | vocabulary | uncommon | 1 | 造成 14 点伤害 获得 3 点格挡 |
| `jp_vocabulary_gen_115` | 交付·2 | vocabulary | rare | 0 | 造成 8 点伤害 获得 5 点格挡 |
| `jp_vocabulary_gen_116` | 交付·3 | vocabulary | uncommon | 2 | 造成 14 点伤害 获得 5 点格挡 |
| `jp_vocabulary_gen_117` | 交付·4 | vocabulary | rare | 1 | 造成 10 点伤害 获得 7 点格挡 |
| `jp_vocabulary_gen_120` | 交付·1 | vocabulary | common | 1 | 造成 10 点伤害 获得 5 点格挡 |
| `jp_vocabulary_gen_121` | 交付·2 | vocabulary | uncommon | 2 | 造成 11 点伤害 获得 4 点格挡 |
| `jp_vocabulary_gen_122` | 交付·3 | vocabulary | uncommon | 0 | 造成 6 点伤害 获得 1 点格挡 |
| `jp_vocabulary_gen_123` | 交付·4 | vocabulary | common | 2 | 造成 8 点伤害 获得 3 点格挡 |
| `starter_code_strike` | 敲代码 | vocabulary | common | 1 | 造成 6 点伤害 |
| `starter_code_strike_plus` | 敲代码+ | vocabulary | common | 1 | 造成 9 点伤害 |
| `starter_defensive_logic` | 写防御逻辑 | grammar | common | 1 | 获得 5 点格挡 |
| `starter_defensive_logic_plus` | 写防御逻辑+ | grammar | common | 1 | 获得 8 点格挡 |

### korean（10）

| id | 名称（目标语） | 类型 | 稀有 | 费 | 中文效果摘要 |
|----|----------------|------|------|-----|----------------|
| `kr_gram_particle_shield` | Token 护壳 | grammar | common | 2 | 获得 10 点格挡 |
| `kr_gram_ward` | 栅格护盾 | grammar | common | 1 | 获得 5 点格挡 |
| `kr_job_ui_handoff_spec` | 标注交付 | reading | common | 1 | 造成 5 点伤害 获得 5 点格挡 |
| `kr_job_ui_snap_lines` | 吸附辅助线 | grammar | common | 1 | 获得 6 点格挡 |
| `kr_read_spirit_scroll` | 用户旅程卷轴 | reading | common | 1 | 造成 5 点伤害 获得 5 点格挡 |
| `kr_status_alignment_police` | 对齐警察 | grammar | common | 1 | 获得 5 点格挡 获得 2 点力量（本场战斗中攻击牌每段伤害 +2） |
| `kr_status_hex_poison` | 动效曲线刺拳 | vocabulary | common | 1 | 造成 5 点伤害（2 段） |
| `kr_vocab_strike` | 像素斩 | vocabulary | common | 1 | 造成 6 点伤害，首打 +2 |
| `kr_vocab_swift_strike` | 自动布局刺拳 | vocabulary | common | 0 | 造成 5 点伤害 |
| `kr_vocab_wild_slash` | 笔刷暴走 | vocabulary | common | 1 | 造成 9 点伤害 |

### spanish（11）

| id | 名称（目标语） | 类型 | 稀有 | 费 | 中文效果摘要 |
|----|----------------|------|------|-----|----------------|
| `es_gram_particle_shield` | 风险登记盾 | grammar | common | 2 | 获得 10 点格挡 |
| `es_gram_ward` | RACI 护符 | grammar | common | 1 | 获得 5 点格挡 |
| `es_job_pm_priority_axis` | 优先级立轴 | vocabulary | common | 1 | 造成 5 点伤害 弃 2 张，抽 3 张。 |
| `es_job_pm_scope_creep_armor` | 需求膨胀墙 | grammar | common | 2 | 获得 8 点格挡 弃 2 张，抽 3 张。 |
| `es_read_spirit_scroll` | 需求羊皮纸 | reading | common | 1 | 造成 5 点伤害 获得 5 点格挡 |
| `es_status_exec_ping` | 高管已读 | vocabulary | common | 1 | 弃 2 张，抽 3 张。 |
| `es_status_meeting_miasma` | 会议瘴气 | reading | common | 1 | 弃 3 张，抽 4 张。 |
| `es_status_scope_fence` | 范围围栏 | grammar | common | 1 | 弃 2 张，抽 3 张。 |
| `es_vocab_strike` | 范围斩 | vocabulary | common | 1 | 造成 6 点伤害，首打 +2 |
| `es_vocab_swift_strike` | 站会冷枪 | vocabulary | common | 0 | 造成 5 点伤害 |
| `es_vocab_wild_slash` | 优先级重击 | vocabulary | common | 1 | 造成 9 点伤害 |
