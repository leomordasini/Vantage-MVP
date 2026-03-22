import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { projectsApi } from '../api'

const STATUS_COLORS = {
  active: 'bg-green-100 text-green-700',
  completed: 'bg-gray-100 text-gray-500',
  on_hold: 'bg-yellow-100 text-yellow-700',
}
const STATUS_LABELS = { active: 'Active', completed: 'Completed', on_hold: 'On Hold' }

export default function Projects() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('active')

  useEffect(() => {
    projectsApi.list().then(({ data }) => setProjects(data)).finally(() => setLoading(false))
  }, [])

  const filtered = filter === 'all' ? projects : projects.filter((p) => p.status === filter)

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects & Initiatives</h1>
          <p className="text-sm text-gray-500">Manage in <Link to="/admin" className="text-indigo-600 hover:underline">Admin</Link></p>
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {['active', 'on_hold', 'completed', 'all'].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                filter === s ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {s === 'all' ? 'All' : STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center text-sm text-gray-400">No projects found.</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p) => (
            <Link
              key={p.id}
              to={`/projects/${p.id}`}
              className="card p-5 hover:shadow-md transition-shadow block"
            >
              <div className="flex items-start justify-between mb-2 gap-2">
                <h2 className="font-semibold text-gray-900">{p.name}</h2>
                <span className={`badge ${STATUS_COLORS[p.status]} flex-shrink-0`}>
                  {STATUS_LABELS[p.status]}
                </span>
              </div>
              {p.description && (
                <p className="text-sm text-gray-500 line-clamp-2 mb-2">{p.description}</p>
              )}
              {p.length && (
                <span className="text-xs text-gray-400">📅 {p.length}</span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
