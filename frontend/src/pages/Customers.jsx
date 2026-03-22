import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { customersApi } from '../api'

function DateBadge({ label, value }) {
  if (!value) return (
    <span className="badge bg-gray-100 text-gray-400">{label}: —</span>
  )
  const d = new Date(value + 'T00:00:00')
  const daysAgo = Math.floor((Date.now() - d.getTime()) / 86400000)
  const color = daysAgo > 90 ? 'bg-red-100 text-red-700' : daysAgo > 45 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
  return (
    <span className={`badge ${color}`}>
      {label}: {d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
    </span>
  )
}

export default function Customers() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    customersApi.list().then(({ data }) => setCustomers(data)).finally(() => setLoading(false))
  }, [])

  const filtered = customers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-sm text-gray-500">{customers.length} customers</p>
        </div>
        <input
          className="input w-56"
          placeholder="Search customers…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">
          <p className="text-sm">No customers found. Add them in <Link to="/admin" className="text-indigo-600 hover:underline">Admin</Link>.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c) => (
            <Link
              key={c.id}
              to={`/customers/${c.id}`}
              className="card p-5 hover:shadow-md transition-shadow block"
            >
              <div className="flex items-start justify-between mb-3">
                <h2 className="font-semibold text-gray-900 text-base">{c.name}</h2>
                {c.tam && (
                  <span className="badge bg-indigo-100 text-indigo-700 ml-2 flex-shrink-0">
                    {c.tam.name}
                  </span>
                )}
              </div>

              {/* Contacts summary */}
              {c.contacts && c.contacts.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-1">
                  {c.contacts.filter((x) => x.role === 'champion').map((x) => (
                    <span key={x.id} className="badge bg-purple-100 text-purple-700">👤 {x.name}</span>
                  ))}
                  {c.contacts.filter((x) => x.role === 'eb').map((x) => (
                    <span key={x.id} className="badge bg-blue-100 text-blue-700">⭐ {x.name}</span>
                  ))}
                </div>
              )}

              {/* Date trackers */}
              <div className="flex flex-wrap gap-1.5">
                <DateBadge label="Leadership" value={c.last_leadership_checkin} />
                <DateBadge label="QBR" value={c.last_qbr} />
                <DateBadge label="CAT" value={c.last_core_activity_update} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
