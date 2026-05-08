// Process debt — grammar / rule reminders logged during the run
export function GrammarTab({ grammar = [] }) {
  if (!grammar.length) {
    return (
      <div className="px-5 py-8 text-center text-sm text-gray-500">
        No process debt recorded — your pipelines are clean.
      </div>
    )
  }

  return (
    <ul className="divide-y divide-gray-800">
      {grammar.map((g) => (
        <li key={g.questionId || g.concept} className="px-5 py-3">
          <p className="text-sm text-blue-200 leading-snug">{g.concept ?? '—'}</p>
        </li>
      ))}
    </ul>
  )
}
