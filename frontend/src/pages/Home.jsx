import { Link } from 'react-router-dom'
import baymax from '../assets/baymax.jpg'

const FEATURES = [
  { title: 'Report', text: 'Snap a photo, pin the spot, describe the issue.' },
  { title: 'Triage', text: 'Complaints are categorized, prioritized, and routed to the right department.' },
  { title: 'Resolve', text: 'Authorities fix issues in priority order — not first-come-first-serve.' },
  { title: 'Earn', text: 'Verified contributions earn Civic Points toward metro wallet credit.' },
  { title: 'Verify', text: 'Confirm the fix with an after-photo to release full rewards.' },
  { title: 'Ride', text: 'Redeem Civic Points as real metro rides on your connected card.' },
]

export default function Home() {
  return (
    <div className="space-y-14">
      <section className="relative overflow-hidden rounded-3xl border border-sakura-300/20 bg-plum-900/40 px-6 py-14 text-center backdrop-blur-sm">
        <p className="text-sm uppercase tracking-[0.3em] text-sakura-300/80">
          Civic Intelligence · Kochi
        </p>

        <div className="mx-auto mt-6 w-fit overflow-hidden rounded-2xl border border-sakura-300/30 shadow-xl shadow-sakura-500/20">
          <img
            src={baymax}
            alt="Baymax"
            className="h-56 w-auto object-cover sm:h-72"
          />
        </div>

        <h1 className="mt-6 text-5xl font-black text-white sm:text-6xl">
          Big Hero <span className="text-sakura-400">7</span>
        </h1>
        <p className="mt-3 text-lg font-medium text-sakura-200">
          Report civic problems. Track the fix. Earn metro rewards.
        </p>
        <p className="mx-auto mt-4 max-w-xl text-sakura-100/70">
          A citizen platform that turns everyday complaints into prioritized city
          action — and rewards the people who report and verify them.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            to="/report"
            className="rounded-xl bg-sakura-500 px-8 py-3 font-semibold text-white shadow-lg shadow-sakura-500/30 hover:bg-sakura-600"
          >
            Report an Issue
          </Link>
          <Link
            to="/wallet"
            className="rounded-xl border border-sakura-300/30 px-8 py-3 font-semibold text-sakura-100 hover:bg-white/5"
          >
            My Wallet
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f, i) => (
          <div
            key={f.title}
            className="rounded-2xl border border-sakura-300/15 bg-plum-900/40 p-6 backdrop-blur-sm transition-colors hover:border-sakura-400/40"
          >
            <div className="font-mono text-sm text-sakura-400">
              {String(i + 1).padStart(2, '0')}
            </div>
            <h3 className="mt-3 font-semibold text-white">{f.title}</h3>
            <p className="mt-1 text-sm text-sakura-100/60">{f.text}</p>
          </div>
        ))}
      </section>
    </div>
  )
}
