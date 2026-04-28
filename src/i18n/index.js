import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { STORAGE_KEYS } from '../utils/localStorage.js'

const resources = {
  en: {
    translation: {
      common: {
        close: 'Close',
        back: 'Back',
        settings: 'Settings',
      },
      menu: {
        play: 'Play',
        pantheon: 'The Pantheon',
        graveyard: 'Mistake Graveyard',
        settings: 'Settings',
        about: 'About',
        player: 'Player',
        clickToEdit: 'click to edit',
        continue: 'Continue',
        selectCampaign: 'Select Campaign',
        locked: 'Locked',
        subtitle: 'Fight with Language',
      },
      topbar: {
        floor: 'Floor {{floor}}',
        viewDeck: 'View Deck',
        viewMap: 'View Map',
        openJournal: 'Open Journal',
        openSettings: 'Settings',
        viewVault: 'View Vault',
      },
      overlays: {
        options: 'Options',
        abandonRun: 'Abandon Run',
        saveQuit: 'Save & Quit to Menu',
        returnGame: 'Return to Game',
        masterDeck: 'Master Deck',
        cardsCount: '{{count}} Cards',
        relics: 'Relics',
        equipped: 'Equipped ({{count}}/5)',
        noRelics: 'No relics equipped.',
        vault: 'Vault ({{count}} stored)',
      },
      language: {
        label: 'Language',
        en: 'English',
        zh: '中文',
      },
      map: {
        legend: 'Legend',
        selectRoom: 'Select a Starting Room',
      },
      combat: {
        playerTurn: 'Player Turn',
        enemyTurn: 'Enemy Turn',
        endTurn: 'End Turn',
        turnCount: 'Turn {{count}}',
        drawPile: 'Draw Pile',
        discardPile: 'Discard Pile',
        bagFull: 'Bag Full!',
        potionFound: 'Potion Found!',
        blocked: 'Blocked!',
      },
    },
  },
  zh: {
    translation: {
      common: {
        close: '关闭',
        back: '返回',
        settings: '设置',
      },
      menu: {
        play: '开始游戏',
        pantheon: '万神殿',
        graveyard: '错误墓园',
        settings: '设置',
        about: '关于',
        player: '玩家',
        clickToEdit: '点击编辑',
        continue: '继续游戏',
        selectCampaign: '选择战役',
        locked: '未解锁',
        subtitle: '以语言战斗',
      },
      topbar: {
        floor: '第 {{floor}} 层',
        viewDeck: '查看牌组',
        viewMap: '查看地图',
        openJournal: '打开图鉴',
        openSettings: '设置',
        viewVault: '查看仓库',
      },
      overlays: {
        options: '选项',
        abandonRun: '放弃本局',
        saveQuit: '保存并返回主菜单',
        returnGame: '返回游戏',
        masterDeck: '主牌组',
        cardsCount: '{{count}} 张卡牌',
        relics: '遗物',
        equipped: '已装备 ({{count}}/5)',
        noRelics: '暂无已装备遗物。',
        vault: '仓库 ({{count}} 件)',
      },
      language: {
        label: '语言',
        en: 'English',
        zh: '中文',
      },
      map: {
        legend: '图例',
        selectRoom: '请选择起始房间',
      },
      combat: {
        playerTurn: '玩家回合',
        enemyTurn: '敌方回合',
        endTurn: '结束回合',
        turnCount: '第 {{count}} 回合',
        drawPile: '抽牌堆',
        discardPile: '弃牌堆',
        bagFull: '背包已满！',
        potionFound: '获得药水！',
        blocked: '被格挡！',
      },
    },
  },
}

function getInitialLanguage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS)
    if (raw) {
      const parsed = JSON.parse(raw)
      const lang = parsed?.state?.uiLanguage
      if (lang === 'zh' || lang === 'en') return lang
    }
  } catch {
    // ignore malformed local storage
  }
  const nav = (navigator?.language || 'en').toLowerCase()
  return nav.startsWith('zh') ? 'zh' : 'en'
}

i18n.use(initReactI18next).init({
  resources,
  lng: getInitialLanguage(),
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
})

export default i18n
