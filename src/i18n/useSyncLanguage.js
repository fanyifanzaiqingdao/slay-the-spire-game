import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import useSettingsStore from '../stores/settingsStore.js'

export function useSyncLanguage() {
  const { i18n } = useTranslation()
  const uiLanguage = useSettingsStore(s => s.uiLanguage)

  useEffect(() => {
    if (uiLanguage && i18n.language !== uiLanguage) {
      i18n.changeLanguage(uiLanguage)
    }
  }, [uiLanguage, i18n])
}
