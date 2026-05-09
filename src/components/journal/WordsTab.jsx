import { useTranslation } from 'react-i18next'

/** Primary journal tab — highlights gathered during the run */
export function WordsTab({ words = [] }) {
  const { t } = useTranslation()
  if (!words.length) {
    return (
      <div className="px-5 py-8 text-center text-sm text-gray-500">
        {t('combat.journal.primaryEmpty')}
      </div>
    )
  }

  return (
    <ul className="divide-y divide-gray-800">
      {words.map((w) => (
        <li key={w.questionId || `${w.word}-${w.translation}`} className="px-5 py-3">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="font-semibold text-red-200">{w.word ?? '—'}</span>
            <span className="text-gray-500 text-xs">→</span>
            <span className="text-gray-300">{w.translation ?? ''}</span>
          </div>
        </li>
      ))}
    </ul>
  )
}
