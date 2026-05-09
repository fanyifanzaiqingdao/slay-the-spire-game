// Localized display strings for relics (UI language zh). Game data stays English in relics.js.
import i18n from '../i18n/index.js'

/** @type {Record<string, { name: string, description: string, flavor: string }>} */
export const RELIC_STRINGS_ZH = {
  cracked_hourglass: {
    name: '破裂沙漏',
    description: '因出牌被锁定时，额外增加 1 层锁定计数。每回合开始时获得 1 点能量。',
    flavor: 'IDE 里没有倒计时——只有你看不见的地方，表仍在走。',
  },
  fox_mask: {
    name: '降噪壳',
    description: '每场战斗开始时获得 10 点格挡。',
    flavor: '开放式工位的第一道防线。',
  },
  lucky_coin: {
    name: '幸运币',
    description: '每场战斗结束后获得 +15 金币。',
    flavor: '有人把最后一个代币花在了咖啡上，你捡到了找的零钱。',
  },
  travelers_compass: {
    name: '站会罗盘',
    description: '本回合打出第 3 张牌时，下回合开始时额外获得 1 点能量。',
    flavor: '第三个进度点对齐下一个里程碑。',
  },
  pager_rattle: {
    name: '寻呼振动器',
    description: '每场战斗开始时获得 +2 格挡。',
    flavor: '消息未到，振动先到——你已经绷紧了。',
  },
  brief_rain: {
    name: '简报雨',
    description: '每场战斗开始时获得 3 金币。',
    flavor: '范围不大，照样打湿路线图。',
  },
  grid_snap_ruler: {
    name: '网格对齐尺',
    description: '每场战斗中，第一手牌额外抽 1 张。',
    flavor: '一切对齐到基线——就这一次。',
  },
  syntax_stapler: {
    name: '语法订书机',
    description: '每场战斗中，你的第一个回合获得 +1 能量。',
    flavor: '把松的那一行订住，让整个块能编译过去。',
  },
  handoff_marker: {
    name: '交接记号笔',
    description: '每场战斗开始时恢复 2 点生命。',
    flavor: '有人用绿色圈出了验收标准。',
  },
  chain_bracelet: {
    name: '工作流手链',
    description: '每回合你打出的第 2 张牌结算时获得 6 点格挡（与卡牌类型无关）。',
    flavor: '闭环之后再接下一棒。',
  },
  pingback_pins: {
    name: '回执钉',
    description: '每场战斗开始时拥有 1 层反伤与每层 3 点反伤伤害。敌方攻击造成生命损失时，对其造成（层数×每层伤害）的反伤（迅击每段单独结算）。卡牌可增加层数或每层伤害。',
    flavor: '每一次打击都有已读回执。',
  },
  merchants_scale: {
    name: '供应商记分牌',
    description: '商店卡牌售价降低 20%。',
    flavor: '精选货架，懂行的买家才看得到。',
  },
  sample_tray: {
    name: '试用样品台',
    description: '每次进入商店：前 3 次「刷新卡牌」不消耗金币。',
    flavor: '先尝再买迭代。',
  },
  newcomers_phrasebook: {
    name: '入职速查表',
    description: '每场战斗的首次失误改为免费简报，而非锁定该牌。',
    flavor: '谁的第一版不是崩的呢。',
  },
  returnees_old_notes: {
    name: '手册页边注',
    description: '流程牌被选中时自动显示出牌提示。',
    flavor: '上次事故时你记在页边的。',
  },
  worn_dictionary: {
    name: '内部维基标签',
    description: '每场战斗一次，揭示一张出货（Ship）牌判定的最优选项。',
    flavor: '翻卷了，但还能搜。',
  },
  incident_buffer: {
    name: '事故缓冲',
    description: '每回合开始时获得 3 点格挡。',
    flavor: '站会还没结束，寻呼就响了——先垫一层。',
  },
  scope_creep_lapel: {
    name: '范围蔓延领针',
    description: '敌方的普通打击伤害减少 1 点（在格挡之前结算）。',
    flavor: '每页多一条要点，每条要点多一场会。',
  },
  pr_template_sticker: {
    name: 'PR 模板贴',
    description: '每场战斗中，第一次打出进攻、防守与功能牌时，各获得 3 点格挡。',
    flavor: '三栏三勾，一场战斗贴一次版本。',
  },
  water_cooler_charm: {
    name: '饮水机护符',
    description: '每场战斗胜利时恢复 1 点生命。',
    flavor: '在茶水间对完线，算小型康复。',
  },
  ink_stone: {
    name: '小黄鸭石',
    description: '同一回合内打出 3 张同类型牌后，抽 1 张牌。',
    flavor: '重复填满上下文窗口，手就知道怎么敲了。',
  },
  bamboo_fan: {
    name: '专注折扇',
    description: '格挡不会在回合开始时清除（持续至被击中）。',
    flavor: '深度工作时挡掉弹窗。',
  },
  red_envelope: {
    name: '现场红包',
    description: '每场战斗开始时获得 5 金币。',
    flavor: '开战前的一点彩头。',
  },
  sprint_icebox: {
    name: '冲刺冰柜',
    description: '非战斗时打开牌组，最多将 2 张牌暂存冰柜；暂存的牌不参与抽牌，直到你点击将其放回。',
    flavor: '冲刺冰柜：本迭代先不上桌的两张票，解冻时再捞。',
  },
  blitz_clipboard: {
    name: '闪电剪贴板',
    description: '若在 5 个玩家回合内获胜，额外获得一次选牌奖励（与首张奖励相同规则）。',
    flavor: '站会前就合并——还能再塞一张票。',
  },
  standup_applause: {
    name: '站会掌声',
    description: '本回合打出第 4 张牌时，抽 1 张牌。',
    flavor: '第四个进度在频道里收获一排 emoji——再摸一张牌。',
  },
  pantheon_sigil: {
    name: '高管背书印记',
    description: '开局获得一次免费祝福（无需配套诅咒）。',
    flavor: '领导欠你空中掩护。',
  },
  scribes_seal: {
    name: '零事故印章',
    description: '无伤赢得战斗后，下一场战斗首回合多抽 2 张牌。',
    flavor: '干净的复盘值得奖励。',
  },
  corner_office_keycard: {
    name: '独立办公室门卡',
    description: '每场战斗开始时拥有 +2 力量。',
    flavor: '头衔刷卡进门，数字替你推门。',
  },
  resonance_stone: {
    name: '跨职能宝石',
    description: '若已装备的遗物覆盖出货（Ship）、流程与洞察，则所有遗物效果增幅 20%。',
    flavor: '不同工种之间和鸣。',
  },
  the_empty_throne: {
    name: '编制冻结',
    description: '若一整层故意留空一个遗物槽，该层结束时 +5 最大生命。',
    flavor: '克制本身就是一种力量。',
  },
  scholars_left_hand: {
    name: '流程负责人（左）',
    description: '流程牌能量消耗减少 1。（与「流程负责人（右）」成对效果更佳。）',
    flavor: '左手握着清单。',
  },
  scholars_right_hand: {
    name: '流程负责人（右）',
    description: '流程牌造成等同于其格挡值的额外伤害。（与「流程负责人（左）」成对效果更佳。）',
    flavor: '右手落实 SLA。',
  },
  ancient_lexicon: {
    name: '巨石术语表',
    description: '所有出货（Ship）类牌额外造成 +3 伤害。',
    flavor: '老服务名依然锋利。',
  },
  memory_palace: {
    name: '复盘殿堂',
    description: '首次尝试即成功的出牌恢复 1 生命。',
    flavor: '你的大脑就是手册。',
  },
}

function isZh() {
  return (i18n.language || 'en') === 'zh'
}

export function relicLocalizedName(relicId, englishName) {
  if (isZh() && RELIC_STRINGS_ZH[relicId]?.name) return RELIC_STRINGS_ZH[relicId].name
  return englishName
}

export function relicLocalizedDescription(relicId, englishDescription) {
  if (isZh() && RELIC_STRINGS_ZH[relicId]?.description) return RELIC_STRINGS_ZH[relicId].description
  return englishDescription
}

export function relicLocalizedFlavor(relicId, englishFlavor) {
  if (isZh() && RELIC_STRINGS_ZH[relicId]?.flavor) return RELIC_STRINGS_ZH[relicId].flavor
  return englishFlavor
}
