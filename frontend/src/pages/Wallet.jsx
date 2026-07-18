import { useEffect, useState } from 'react'
import { convertPoints, getLeaderboard, getWallet, redeemRide } from '../lib/api.js'

export default function Wallet() {
  const [wallet, setWallet] = useState(null)
  const [leaders, setLeaders] = useState([])
  const [convertAmount, setConvertAmount] = useState(100)
  const [message, setMessage] = useState(null)

  function refresh() {
    getWallet().then(setWallet)
    getLeaderboard().then(setLeaders)
  }

  useEffect(refresh, [])

  async function onConvert(e) {
    e.preventDefault()
    setMessage(null)
    try {
      await convertPoints(convertAmount)
      setMessage({ ok: true, text: `Converted ${convertAmount} points to metro credit.` })
      refresh()
    } catch (err) {
      setMessage({ ok: false, text: err.response?.data?.detail ?? 'Conversion failed' })
    }
  }

  if (!wallet) return <p className="text-sakura-100/60">Loading…</p>

  const progress =
    wallet.level.next_at != null
      ? Math.min((wallet.points / wallet.level.next_at) * 100, 100)
      : 100
  const rideCost = wallet.ride_cost ?? 25
  const pointsPerRide = Math.ceil(rideCost / wallet.conversion_rate)
  const ticketsAvailable = Math.floor(wallet.metro_balance / rideCost)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-2xl font-bold">Civic Metro Pass</h1><p className="mt-1 text-sm text-sakura-100/60">Every verified civic action can power your next journey.</p></div>
        <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">● KMRL Connected</span>
      </div>

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-sky-400 via-blue-600 to-indigo-950 p-6 shadow-xl shadow-sky-900/30 sm:p-8">
        <div className="absolute -right-10 -top-16 h-56 w-56 rounded-full border-[28px] border-white/10" />
        <div className="relative grid gap-6 sm:grid-cols-[1.4fr_.8fr] sm:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.25em] text-white/70">Big Hero 7 · Civic rewards</p>
            <p className="mt-7 text-3xl font-black tracking-tight text-white sm:text-4xl">KOCHI METRO PASS</p>
            <p className="mt-1 font-mono text-sm tracking-[.18em] text-white/75">{wallet.id} · {wallet.name.toUpperCase()}</p>
            <div className="mt-8 flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-full border border-white/40 bg-white/20 text-lg">◉</span><span className="text-sm font-medium text-white/85">Civic points become real ride value</span></div>
          </div>
          <div className="rounded-2xl border border-white/25 bg-plum-950/25 p-4 text-right backdrop-blur-sm">
            <p className="text-xs uppercase tracking-wider text-white/65">Metro balance</p>
            <p className="mt-1 text-4xl font-black text-white">₹{wallet.metro_balance.toFixed(2)}</p>
            <p className="mt-3 text-sm text-white/80">{ticketsAvailable} ride {ticketsAvailable === 1 ? 'ticket' : 'tickets'} ready</p>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-emerald-400/25 bg-emerald-400/10 p-4"><p className="text-2xl font-black text-emerald-300">{wallet.points}</p><p className="text-sm text-sakura-100/70">Civic Points earned</p></div>
        <div className="rounded-2xl border border-sky-400/25 bg-sky-400/10 p-4"><p className="text-2xl font-black text-sky-200">{pointsPerRide}</p><p className="text-sm text-sakura-100/70">points unlock one ride</p></div>
        <div className="rounded-2xl border border-sakura-300/25 bg-sakura-500/10 p-4"><p className="text-2xl font-black text-sakura-200">{Math.max(0, pointsPerRide - wallet.points)}</p><p className="text-sm text-sakura-100/70">points to next ride</p></div>
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-sakura-300/15 bg-plum-900/40 p-6 lg:col-span-2">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-sakura-100/60">Citizen ID</p>
              <p className="font-mono text-xl font-bold text-sakura-300">{wallet.id}</p>
              <p className="mt-1 text-sm text-sakura-100/80">{wallet.name}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-sakura-100/60">Level</p>
              <p className="text-xl font-bold text-sakura-200">{wallet.level.name}</p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-3xl font-bold text-emerald-400">{wallet.points}</p>
              <p className="text-xs text-sakura-100/60">Civic Points</p>
            </div>
            <div>
              <p className="text-3xl font-bold">{wallet.trust_score}%</p>
              <p className="text-xs text-sakura-100/60">Trust Score</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-sky-400">
                ₹{wallet.metro_balance.toFixed(0)}
              </p>
              <p className="text-xs text-sakura-100/60">Metro Wallet</p>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-4 rounded-2xl border border-sakura-300/15 bg-white/5 p-4">
            <div className="grid h-14 w-14 place-items-center rounded-full" style={{ background: `conic-gradient(#ff7fae ${progress}%, rgba(255,255,255,.12) 0)` }}>
              <div className="grid h-10 w-10 place-items-center rounded-full bg-plum-900 text-xs font-bold">{Math.round(progress)}%</div>
            </div>
            <div><p className="font-semibold text-sakura-100">Next civic reward</p><p className="text-sm text-sakura-100/60">Keep verifying fixes to reach {wallet.level.next_at ?? wallet.points} points.</p></div>
          </div>

          {wallet.level.next_at != null && (
            <div className="mt-6">
              <div className="flex justify-between text-xs text-sakura-100/40">
                <span>{wallet.points} pts</span>
                <span>next level at {wallet.level.next_at} pts</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded bg-white/10">
                <div
                  className="h-full rounded bg-sakura-400"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {wallet.badges.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {wallet.badges.map((b) => (
                <span
                  key={b.name}
                  className="rounded-full border border-sakura-300/20 bg-white/10 px-3 py-1 text-sm"
                >
                  {b.name}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-sky-500/30 bg-sky-500/10 p-6">
            <div className="flex items-center justify-between">
              <p className="font-semibold">Turn points into tickets</p>
              <span className="text-sm text-emerald-400">
                {wallet.metro_connected ? 'Connected' : 'Not connected'}
              </span>
            </div>
            <p className="mt-3 text-3xl font-bold">₹{wallet.metro_balance.toFixed(2)}</p>
            <form onSubmit={onConvert} className="mt-4 space-y-2">
              <label className="block text-xs text-sakura-100/60">
                Convert points (min {wallet.min_convert_points}, rate ₹
                {wallet.conversion_rate}/pt)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min={wallet.min_convert_points}
                  step={50}
                  value={convertAmount}
                  onChange={(e) => setConvertAmount(Number(e.target.value))}
                  className="w-full rounded-lg border border-sakura-300/20 bg-plum-900/40 px-3 py-2 text-sm"
                />
                <button
                  type="submit"
                  className="shrink-0 rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium hover:bg-sky-600"
                >
                  Add to pass
                </button>
              </div>
            </form>
            {message && (
              <p
                className={`mt-2 text-sm ${message.ok ? 'text-emerald-400' : 'text-amber-400'}`}
              >
                {message.text}
              </p>
            )}
            <button
              onClick={async () => {
                setMessage(null)
                try {
                  await redeemRide()
                  setMessage({ ok: true, text: 'Metro ride ticket redeemed.' })
                  refresh()
                } catch (err) {
                  setMessage({
                    ok: false,
                    text: err.response?.data?.detail ?? 'Redeem failed',
                  })
                }
              }}
              className="mt-3 w-full rounded-lg border border-sky-500/40 py-2 text-sm font-medium text-sky-300 hover:bg-sky-500/20"
            >
              Redeem metro ride (₹{(wallet.ride_cost ?? 25).toFixed(0)})
            </button>
          </div>

          <div className="rounded-2xl border border-sakura-300/15 bg-plum-900/40 p-6">
            <h2 className="mb-3 font-semibold">Leaderboard</h2>
            <ol className="space-y-2 text-sm">
              {leaders.map((u, i) => (
                <li key={u.id} className="flex items-center gap-3">
                  <span className="w-5 text-sakura-100/40">{i + 1}.</span>
                  <span className={`flex-1 ${u.id === wallet.id ? 'font-bold text-sakura-300' : 'text-sakura-100/80'}`}>
                    {u.name}
                  </span>
                  <span className="font-mono text-emerald-400">{u.points}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-sakura-300/15 bg-plum-900/40 p-6">
        <h2 className="mb-3 font-semibold">Recent activity</h2>
        {wallet.transactions.length === 0 ? (
          <p className="text-sm text-sakura-100/60">No activity yet — report an issue to earn points.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {wallet.transactions.map((t, i) => (
              <li key={i} className="flex items-center justify-between border-b border-sakura-300/15/50 pb-2">
                <span className="text-sakura-100/80">{t.reason}</span>
                <span
                  className={`font-mono ${t.points >= 0 ? 'text-emerald-400' : 'text-sky-400'}`}
                >
                  {t.points >= 0 ? '+' : ''}
                  {t.points}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
