import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { dashboardApi } from '../api'

// ─── Health badge ─────────────────────────────────────────────────────────────
const HEALTH = {
  healthy:  { label: 'Healthy',  color: 'bg-green-100 text-green-700' },
  neutral:  { label: 'Neutral',  color: 'bg-gray-100 text-gray-500'  },
  at_risk:  { label: 'At Risk',  color: 'bg-yellow-100 text-yellow-700' },
  critical: { label: 'Critical', color: 'bg-red-100 text-red-700'    },
}

function HealthBadge({ value }) {
  const h = HEALTH[value] || HEALTH.neutral
  return <span className={`badge ${h.color}`}>{h.label}</span>
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color = 'text-gray-900' }) {
  return (
    <div className="card p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({ title, children, empty, emptyMsg }) {
  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
        <h2 className="text-sm font-semibold text-gray-700">{title}</h2>
      </div>
      {empty ? (
        <p className="px-5 py-6 text-sm text-gray-400">{emptyMsg || 'Nothing here.'}</p>
      ) : (
        children
      )}
    </div>
  )
}

// ─── DR update type styles ────────────────────────────────────────────────────
const DR_TYPES = {
  win:          { label: 'Win',          color: 'bg-green-100 text-green-700' },
  miss:         { label: 'Miss',         color: 'bg-red-100 text-red-700'     },
  feedback:     { label: 'Feedback',     color: 'bg-blue-100 text-blue-700'   },
  growth_signal:{ label: 'Growth',       color: 'bg-purple-100 text-purple-700'},
  career:       { label: 'Career',       color: 'bg-indigo-100 text-indigo-700'},
  general:      { label: 'Note',         color: 'bg-gray-100 text-gray-500'   },
}

function drType(t) { return DR_TYPES[t] || DR_TYPES.general }

function relativeTime(iso) {
  const now = Date.now()
  const then = new Date(iso).getTime()
  const diff = Math.floor((now - then) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatDue(dateStr) {
  if (!dateStr) return null
  const today = new Date(); today.setHours(0,0,0,0)
  const due = new Date(dateStr + 'T00:00:00')
  const days = Math.round((due - today) / 86400000)
  if (days < 0) return { label: `${Math.abs(days)}d overdue`, color: 'text-red-600 font-semibold' }
  if (days === 0) return { label: 'Due today', color: 'text-orange-500 font-semibold' }
  return { label: `Due ${due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`, color: 'text-gray-400' }
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    dashboardApi.get()
      .then(({ data }) => setData(data))
      .catch(() => setError('Failed to load dashboard'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="p-8 flex items-center justify-center h-full">
      <p className="text-sm text-gray-400">Loading dashboard…</p>
    </div>
  )

  if (error) return (
    <div className="p-8">
      <p className="text-sm text-red-500">{error}</p>
    </div>
  )

  const { stats, customers_needing_attention, checkin_due, tasks_overdue,
          tasks_due_today, tasks_due_this_week, upcoming_birthdays, recent_dr_activity } = data

  const today = new Date()
  const greeting = today.getHours() < 12 ? 'Good morning' : today.getHours() < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{greeting}, Leonardo 👋</h1>
        <p className="text-sm text-gray-400 mt-1">
          {today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <StatCard label="Customers" value={stats.total_customers} />
        <StatCard label="Direct Reports" value={stats.total_direct_reports} />
        <StatCard label="Open Tasks" value={stats.open_tasks} />
        <StatCard
          label="Overdue"
          value={stats.overdue_tasks}
          color={stats.overdue_tasks > 0 ? 'text-red-600' : 'text-gray-900'}
        />
        <StatCard label="In Progress" value={stats.tasks_in_progress} color="text-blue-600" />
        <StatCard
          label="At-Risk Customers"
          value={stats.at_risk_customers}
          color={stats.at_risk_customers > 0 ? 'text-yellow-600' : 'text-gray-900'}
        />
      </div>

      {/* Main grid */}
      <div className="grid lg:grid-cols-2 gap-6 mb-6">

        {/* Customers needing attention */}
        <Section
          title="⚠️ Customers Needing Attention"
          empty={customers_needing_attention.length === 0}
          emptyMsg="All customers look healthy."
        >
          <ul className="divide-y divide-gray-100">
            {customers_needing_attention.map((c) => (
              <li key={c.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50">
                <div>
                  <Link to={`/customers/${c.id}`} className="text-sm font-medium text-gray-800 hover:text-indigo-600">
                    {c.name}
                  </Link>
                  {c.tam && <span className="text-xs text-gray-400 ml-2">TAM: {c.tam.name}</span>}
                </div>
                <HealthBadge value={c.overall_health} />
              </li>
            ))}
          </ul>
        </Section>

        {/* Check-in due */}
        <Section
          title="📅 Leadership Check-in Due (5+ months)"
          empty={checkin_due.length === 0}
          emptyMsg="All check-ins are up to date."
        >
          <ul className="divide-y divide-gray-100">
            {checkin_due.map((c) => (
              <li key={c.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50">
                <Link to={`/customers/${c.id}`} className="text-sm font-medium text-gray-800 hover:text-indigo-600">
                  {c.name}
                </Link>
                <span className={`text-xs font-medium ${
                  c.days_since_checkin === null ? 'text-red-500' :
                  c.days_since_checkin >= 180 ? 'text-red-500' : 'text-yellow-600'
                }`}>
                  {c.days_since_checkin === null
                    ? 'Never checked in'
                    : `${c.days_since_checkin}d ago (${Math.floor(c.days_since_checkin / 30)}mo)`}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">

        {/* Tasks */}
        <div className="space-y-4">
          {/* Overdue */}
          <Section
            title="🔴 Overdue Tasks"
            empty={tasks_overdue.length === 0}
            emptyMsg="No overdue tasks."
          >
            <ul className="divide-y divide-gray-100">
              {tasks_overdue.map((t) => {
                const due = formatDue(t.due_date)
                return (
                  <li key={t.id} className="flex items-start justify-between px-5 py-3 gap-4 hover:bg-gray-50">
                    <Link to="/tasks" className="text-sm text-gray-800 flex-1 hover:text-indigo-600">{t.title}</Link>
                    {due && <span className={`text-xs flex-shrink-0 ${due.color}`}>{due.label}</span>}
                  </li>
                )
              })}
            </ul>
          </Section>

          {/* Due today */}
          <Section
            title="🟡 Due Today"
            empty={tasks_due_today.length === 0}
            emptyMsg="Nothing due today."
          >
            <ul className="divide-y divide-gray-100">
              {tasks_due_today.map((t) => (
                <li key={t.id} className="px-5 py-3 hover:bg-gray-50">
                  <Link to="/tasks" className="text-sm text-gray-800 hover:text-indigo-600">{t.title}</Link>
                  {(t.customer || t.project) && (
                    <div className="flex gap-1 mt-1">
                      {t.customer && <span className="badge bg-orange-100 text-orange-700 text-xs">{t.customer.name}</span>}
                      {t.project && <span className="badge bg-teal-100 text-teal-700 text-xs">{t.project.name}</span>}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </Section>

          {/* Due this week */}
          {tasks_due_this_week.length > 0 && (
            <Section title="🔵 Due This Week">
              <ul className="divide-y divide-gray-100">
                {tasks_due_this_week.map((t) => {
                  const due = formatDue(t.due_date)
                  return (
                    <li key={t.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50">
                      <Link to="/tasks" className="text-sm text-gray-800 hover:text-indigo-600">{t.title}</Link>
                      {due && <span className={`text-xs ${due.color}`}>{due.label}</span>}
                    </li>
                  )
                })}
              </ul>
            </Section>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Upcoming birthdays */}
          {upcoming_birthdays.length > 0 && (
            <Section title="🎂 Upcoming Birthdays">
              <ul className="divide-y divide-gray-100">
                {upcoming_birthdays.map((b) => (
                  <li key={b.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50">
                    <Link to={`/direct-reports/${b.id}`} className="text-sm font-medium text-gray-800 hover:text-indigo-600">
                      {b.name}
                    </Link>
                    <span className={`text-xs font-medium ${b.days_until === 0 ? 'text-pink-600' : 'text-gray-500'}`}>
                      {b.days_until === 0 ? '🎉 Today!' : `in ${b.days_until} day${b.days_until === 1 ? '' : 's'}`}
                    </span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* Recent DR activity */}
          <Section
            title="📋 Recent Direct Report Activity"
            empty={recent_dr_activity.length === 0}
            emptyMsg="No recent activity logged."
          >
            <ul className="divide-y divide-gray-100">
              {recent_dr_activity.map((u, i) => {
                const type = drType(u.update_type)
                return (
                  <li key={i} className="px-5 py-3 hover:bg-gray-50">
                    <div className="flex items-center gap-2 mb-1">
                      <Link
                        to={`/direct-reports/${u.dr_id}`}
                        className="text-xs font-semibold text-gray-700 hover:text-indigo-600"
                      >
                        {u.dr_name}
                      </Link>
                      <span className={`badge text-xs ${type.color}`}>{type.label}</span>
                      <span className="text-xs text-gray-400 ml-auto">{relativeTime(u.created_at)}</span>
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-2">{u.content}</p>
                  </li>
                )
              })}
            </ul>
          </Section>
        </div>
      </div>
    </div>
  )
}
