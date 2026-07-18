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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Smart Civic Wallet</h1>

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
              <p className="font-semibold">Metro Card</p>
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
                  Convert
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
