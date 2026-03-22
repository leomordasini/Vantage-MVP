import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { directReportsApi } from '../api'

function ageFromBirthday(birthday) {
  if (!birthday) return null
  const today = new Date()
  const bday = new Date(birthday + 'T00:00:00')
  const age = today.getFullYear() - bday.getFullYear()
  const m = today.getMonth() - bday.getMonth()
  return m < 0 || (m === 0 && today.getDate() < bday.getDate()) ? age - 1 : age
}

function upcomingBirthday(birthday) {
  if (!birthday) return null
  const today = new Date()
  const bday = new Date(birthday + 'T00:00:00')
  const next = new Date(today.getFullYear(), bday.getMonth(), bday.getDate())
  if (next < today) next.setFullYear(today.getFullYear() + 1)
  const days = Math.round((next - today) / 86400000)
  return days <= 14 ? days : null
}

export default function DirectReports() {
  const [drs, setDrs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    directReportsApi.list().then(({ data }) => setDrs(data)).finally(() => setLoading(false))
  }, [])

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Direct Reports</h1>
        <p className="text-sm text-gray-500">{drs.length} people · manage in <Link to="/admin" className="text-indigo-600 hover:underline">Admin</Link></p>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : drs.length === 0 ? (
        <div className="card p-12 text-center text-gray-400 text-sm">
          No direct reports yet. <Link to="/admin" className="text-indigo-600 hover:underline">Add them in Admin.</Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {drs.map((dr) => {
            const daysUntilBday = upcomingBirthday(dr.birthday)
            return (
              <Link
                key={dr.id}
                to={`/direct-reports/${dr.id}`}
                className="card p-5 hover:shadow-md transition-shadow block"
              >
                <div className="flex items-start justify-between mb-2">
                  <h2 className="font-semibold text-gray-900">{dr.name}</h2>
                  {dr.tam_level && (
                    <span className="badge bg-indigo-100 text-indigo-700">{dr.tam_level}</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {dr.birthday && (
                    <span className="badge bg-gray-100 text-gray-500 text-xs">
                      🎂 {new Date(dr.birthday + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      {' '}(age {ageFromBirthday(dr.birthday)})
                    </span>
                  )}
                  {daysUntilBday !== null && daysUntilBday <= 14 && (
                    <span className="badge bg-pink-100 text-pink-700">
                      {daysUntilBday === 0 ? '🎉 Today!' : `🎂 in ${daysUntilBday}d`}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-3">Click to view 1:1 notes & achievements →</p>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
