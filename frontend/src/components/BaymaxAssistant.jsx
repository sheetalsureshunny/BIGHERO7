import { Link, useLocation } from 'react-router-dom'

const TIPS = {
  '/': 'I am Baymax. Start by reporting an issue or exploring the city pulse.',
  '/report': 'Describe what you see, add a photo, then pin the exact location.',
  '/map': 'Larger markers mean more citizens reported the same issue.',
  '/wallet': 'Verified fixes earn points you can turn into metro credit.',
  '/admin': 'Critical items rise to the top so teams can act on urgency.',
}

export default function BaymaxAssistant() {
  const { pathname } = useLocation()
  return (
    <aside className="fixed bottom-5 right-5 z-[1100] flex max-w-xs items-end gap-3">
      <div className="rounded-2xl border border-sakura-300/25 bg-plum-950/90 px-4 py-3 text-sm text-sakura-100/85 shadow-2xl backdrop-blur-md">
        <p>{TIPS[pathname] ?? TIPS['/']}</p>
        {pathname === '/' && <Link to="/report" className="mt-2 inline-block font-semibold text-sakura-300 hover:text-white">Report an issue →</Link>}
      </div>
      <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full border-4 border-white bg-sakura-100 shadow-lg shadow-sakura-500/40" aria-label="Baymax assistant">
        <span className="relative h-5 w-8 before:absolute before:left-0 before:top-1/2 before:h-2.5 before:w-2.5 before:-translate-y-1/2 before:rounded-full before:bg-plum-950 after:absolute after:right-0 after:top-1/2 after:h-2.5 after:w-2.5 after:-translate-y-1/2 after:rounded-full after:bg-plum-950"><i className="absolute left-2 top-1/2 h-px w-4 -translate-y-1/2 bg-plum-950" /></span>
      </div>
    </aside>
  )
}
