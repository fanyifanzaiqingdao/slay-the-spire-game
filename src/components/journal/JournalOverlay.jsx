// components/journal/JournalOverlay.jsx
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { WordsTab } from './WordsTab.jsx'
import { GrammarTab } from './GrammarTab.jsx'

export function JournalOverlay({ words = [], grammar = [], onClose }) {
  const { t } = useTranslation()
  const [tab, setTab] = useState('words')

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="w-full max-w-xl bg-gray-950 border-t border-gray-700 rounded-t-2xl overflow-hidden"
        style={{ maxHeight: '65vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-800">
          <h2 className="text-base font-bold text-amber-200">{t('combat.journal.title')}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-2xl leading-none">×</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-800">
          {[
            { id: 'words', label: t('combat.journal.tabPrimary', { count: words.length }) },
            { id: 'grammar', label: t('combat.journal.tabSecondary', { count: grammar.length }) },
          ].map((tb) => (
            <button
              key={tb.id}
              onClick={() => setTab(tb.id)}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors
                ${tab === tb.id ? 'text-amber-300 border-b-2 border-amber-400' : 'text-gray-500 hover:text-gray-300'}`}
            >
              {tb.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(65vh - 100px)' }}>
          <AnimatePresence mode="wait">
            {tab === 'words' ? (
              <motion.div key="words" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <WordsTab words={words} />
              </motion.div>
            ) : (
              <motion.div key="grammar" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <GrammarTab grammar={grammar} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  )
}
