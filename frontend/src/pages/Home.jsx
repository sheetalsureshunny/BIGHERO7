import { Link } from 'react-router-dom'
import baymax from '../assets/baymax.jpg'

const PULSE = [
  ['12', 'reported today'],
  ['4', 'fixed this week'],
  ['1', 'critical zone'],
  ['48', 'citizens at Aluva'],
]

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
      <section className="grid grid-cols-2 overflow-hidden rounded-2xl border border-sakura-300/20 bg-plum-950/60 sm:grid-cols-4">
        {PULSE.map(([value, label]) => (
          <div key={label} className="border-b border-r border-sakura-300/15 px-5 py-4 last:border-r-0 sm:border-b-0">
            <p className="text-2xl font-black text-sakura-300">{value}</p>
            <p className="text-xs uppercase tracking-wider text-sakura-100/55">{label}</p>
          </div>
        ))}
      </section>
      <section className="relative min-h-[650px] overflow-hidden rounded-3xl border border-sakura-300/20 bg-sakura-500 px-6 py-14 sm:min-h-[720px] sm:px-12">
        <p className="relative z-10 text-sm uppercase tracking-[0.3em] text-sakura-100/85">
          Civic Intelligence · Kochi
        </p>

        <img
          src={baymax}
          alt=""
          className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center opacity-70 mix-blend-multiply"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-plum-950/80 via-plum-950/45 to-sakura-500/25" />

        <div className="relative z-10 mt-6 max-w-xl rounded-2xl border border-white/15 bg-plum-950/35 p-6 text-center backdrop-blur-md sm:text-left sm:p-8">
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

        <div className="mt-8 flex flex-wrap justify-center gap-3 sm:justify-start">
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
        </div>
        <div className="relative z-10 mt-8 grid max-w-xl grid-cols-3 gap-3 text-center">
          <div className="rounded-xl bg-white/10 p-3 backdrop-blur-sm"><p className="text-xl font-bold text-white">1,240</p><p className="text-xs text-sakura-100/75">commuters helped</p></div>
          <div className="rounded-xl bg-white/10 p-3 backdrop-blur-sm"><p className="text-xl font-bold text-white">61</p><p className="text-xs text-sakura-100/75">reports triaged</p></div>
          <div className="rounded-xl bg-white/10 p-3 backdrop-blur-sm"><p className="text-xl font-bold text-white">13</p><p className="text-xs text-sakura-100/75">issues resolved</p></div>
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
