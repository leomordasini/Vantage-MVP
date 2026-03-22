import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { customersApi } from '../api'

const HEALTH = {
  healthy:  { label: 'Healthy',  color: 'bg-green-100 text-green-700'   },
  neutral:  { label: 'Neutral',  color: 'bg-gray-100 text-gray-500'     },
  at_risk:  { label: 'At Risk',  color: 'bg-yellow-100 text-yellow-700' },
  critical: { label: 'Critical', color: 'bg-red-100 text-red-700'       },
}

function DateBadge({ label, value }) {
  if (!value) return <span className="badge bg-gray-100 text-gray-400">{label}: —</span>
  const d = new Date(value + 'T00:00:00')
  const daysAgo = Math.floor((Date.now() - d.getTime()) / 86400000)
  const color = daysAgo > 180 ? 'bg-red-100 text-red-700'
    : daysAgo > 90 ? 'bg-yellow-100 text-yellow-700'
    : 'bg-green-100 text-green-700'
  return (
    <span className={`badge ${color}`}>
      {label}: {d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
    </span>
  )
}

export default function Customers() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [healthFilter, setHealthFilter] = useState('all')

  useEffect(() => {
    customersApi.list().then(({ data }) => setCustomers(data)).finally(() => setLoading(false))
  }, [])

  const filtered = customers.filter((c) => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase())
    const matchHealth = healthFilter === 'all' || c.overall_health === healthFilter
    return matchSearch && matchHealth
  })

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-sm text-gray-500">{customers.length} total</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <input
            className="input w-48"
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {[
              { value: 'all',      label: 'All'      },
              { value: 'critical', label: 'Critical' },
              { value: 'at_risk',  label: 'At Risk'  },
              { value: 'neutral',  label: 'Neutral'  },
              { value: 'healthy',  label: 'Healthy'  },
            ].map((f) => (
              <button
                key={f.value}
                onClick={() => setHealthFilter(f.value)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  healthFilter === f.value ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">
          <p className="text-sm">No customers found. Add them in <Link to="/admin" className="text-indigo-600 hover:underline">Admin</Link>.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c) => {
            const health = HEALTH[c.overall_health] || HEALTH.neutral
            const latestUpdate = c.updates?.[0]
            return (
              <Link key={c.id} to={`/customers/${c.id}`}
                className="card p-5 hover:shadow-md transition-shadow block">
                {/* Name + health */}
                <div className="flex items-start justify-between mb-3 gap-2">
                  <h2 className="font-semibold text-gray-900 text-base leading-tight">{c.name}</h2>
                  <span className={`badge flex-shrink-0 ${health.color}`}>{health.label}</span>
                </div>

                {/* TAM */}
                {c.tam && (
                  <p className="text-xs text-gray-500 mb-2">TAM: {c.tam.name}</p>
                )}

                {/* Champion / EB */}
                {c.contacts && c.contacts.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {c.contacts.filter((x) => x.role === 'champion').map((x) => (
                      <span key={x.id} className="badge bg-purple-100 text-purple-700 text-xs">👤 {x.name}</span>
                    ))}
                    {c.contacts.filter((x) => x.role === 'eb').map((x) => (
                      <span key={x.id} className="badge bg-blue-100 text-blue-700 text-xs">⭐ {x.name}</span>
                    ))}
                  </div>
                )}

                {/* Latest update preview */}
                {latestUpdate && (
                  <p className="text-xs text-gray-400 italic truncate mb-2">
                    "{latestUpdate.content}"
                  </p>
                )}

                {/* Date trackers */}
                <div className="flex flex-wrap gap-1">
                  <DateBadge label="Leadership" value={c.last_leadership_checkin} />
                  <DateBadge label="QBR" value={c.last_qbr} />
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
