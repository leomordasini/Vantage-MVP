import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { meetingsApi, customersApi, directReportsApi } from '../api'
import Modal from '../components/Modal'

const TYPE_COLORS = {
  customer:       'bg-orange-100 text-orange-700',
  direct_report:  'bg-purple-100 text-purple-700',
  other:          'bg-slate-100 text-slate-600',
}
const TYPE_LABELS = {
  customer:      'Customer',
  direct_report: 'Direct Report',
  other:         'Other',
}

function formatDate(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

function formatTime(dt) {
  if (!dt) return ''
  return new Date(dt).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit',
  })
}

export default function Meetings() {
  const navigate = useNavigate()
  const [meetings, setMeetings]               = useState([])
  const [customers, setCustomers]             = useState([])
  const [directReports, setDirectReports]     = useState([])
  const [loading, setLoading]                 = useState(true)
  const [filter, setFilter]                   = useState('all')
  const [search, setSearch]                   = useState('')
  const [showNewModal, setShowNewModal]       = useState(false)
  const [showCalendarModal, setShowCalendarModal] = useState(false)
  const [calendarEvents, setCalendarEvents]   = useState([])
  const [calendarLoading, setCalendarLoading] = useState(false)
  const [selectedEvents, setSelectedEvents]   = useState(new Set())
  const [importing, setImporting]             = useState(false)
  const [googleClientId, setGoogleClientId]   = useState('')
  const [icsImporting, setIcsImporting]       = useState(false)
  const [icsResult, setIcsResult]             = useState(null)
  const icsInputRef                           = useRef(null)

  // New meeting form state
  const [form, setForm] = useState({
    title: '', date: '', time: '', duration_minutes: '',
    attendees: '', meeting_type: 'other',
    customer_id: '', direct_report_id: '',
  })

  const load = useCallback(async () => {
    try {
      const [mRes, cRes, drRes, cfgRes] = await Promise.all([
        meetingsApi.list(),
        customersApi.list(),
        directReportsApi.list(),
        fetch('/api/config/').then(r => r.json()).catch(() => ({})),
      ])
      setMeetings(mRes.data)
      setCustomers(cRes.data)
      setDirectReports(drRes.data)
      setGoogleClientId(cfgRes.google_client_id || '')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // ── Filter + Search ──────────────────────────────────────────────────────
  const visible = meetings.filter(m => {
    if (filter !== 'all' && m.meeting_type !== filter) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        m.title.toLowerCase().includes(q) ||
        (m.attendees || '').toLowerCase().includes(q) ||
        (m.customer_name || '').toLowerCase().includes(q) ||
        (m.direct_report_name || '').toLowerCase().includes(q)
      )
    }
    return true
  })

  // ── Create meeting ───────────────────────────────────────────────────────
  async function handleCreate(e) {
    e.preventDefault()
    const dateTime = form.date && form.time
      ? new Date(`${form.date}T${form.time}`).toISOString()
      : form.date
        ? new Date(`${form.date}T09:00`).toISOString()
        : null
    if (!dateTime) return

    const payload = {
      title: form.title,
      date: dateTime,
      duration_minutes: form.duration_minutes ? parseInt(form.duration_minutes) : null,
      attendees: form.attendees || null,
      meeting_type: form.meeting_type,
      customer_id: form.customer_id ? parseInt(form.customer_id) : null,
      direct_report_id: form.direct_report_id ? parseInt(form.direct_report_id) : null,
    }
    const res = await meetingsApi.create(payload)
    setShowNewModal(false)
    setForm({ title: '', date: '', time: '', duration_minutes: '', attendees: '', meeting_type: 'other', customer_id: '', direct_report_id: '' })
    navigate(`/meetings/${res.data.id}`)
  }

  // ── ICS file import ──────────────────────────────────────────────────────
  async function handleIcsUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    setIcsImporting(true)
    setIcsResult(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/meetings/import/ics/', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      setIcsResult(data)
      load()
    } catch {
      setIcsResult({ error: 'Upload failed. Please try again.' })
    } finally {
      setIcsImporting(false)
      if (icsInputRef.current) icsInputRef.current.value = ''
    }
  }

  // ── Google Calendar sync ─────────────────────────────────────────────────
  function syncFromCalendar() {
    const clientId = googleClientId
    if (!clientId) {
      alert('Google Calendar is not configured.\n\nTo enable it:\n1. Create a Google Cloud project\n2. Enable the Google Calendar API\n3. Create OAuth 2.0 credentials (Web Application)\n4. Add GOOGLE_CLIENT_ID to your Render environment variables')
      return
    }
    if (!window.google) {
      alert('Google Identity Services script is still loading. Please wait a moment and try again.')
      return
    }
    setCalendarLoading(true)
    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/calendar.readonly',
      callback: async (response) => {
        if (response.error) {
          setCalendarLoading(false)
          return
        }
        try {
          const now = new Date()
          const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          const twoWeeksAhead = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
          const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events')
          url.searchParams.set('maxResults', '50')
          url.searchParams.set('orderBy', 'startTime')
          url.searchParams.set('singleEvents', 'true')
          url.searchParams.set('timeMin', oneMonthAgo.toISOString())
          url.searchParams.set('timeMax', twoWeeksAhead.toISOString())

          const res = await fetch(url.toString(), {
            headers: { Authorization: `Bearer ${response.access_token}` },
          })
          const data = await res.json()
          const events = (data.items || []).filter(e => e.start?.dateTime || e.start?.date)
          setCalendarEvents(events)
          setSelectedEvents(new Set())
          setShowCalendarModal(true)
        } finally {
          setCalendarLoading(false)
        }
      },
    })
    tokenClient.requestAccessToken()
  }

  async function importSelectedEvents() {
    setImporting(true)
    const toImport = calendarEvents.filter(e => selectedEvents.has(e.id))
    await Promise.all(
      toImport.map(event => {
        const startRaw = event.start?.dateTime || event.start?.date
        const endRaw   = event.end?.dateTime   || event.end?.date
        let durationMins = null
        if (event.start?.dateTime && event.end?.dateTime) {
          durationMins = Math.round(
            (new Date(endRaw) - new Date(startRaw)) / 60000
          )
        }
        const attendees = (event.attendees || [])
          .filter(a => !a.self)
          .map(a => a.displayName || a.email)
          .join(', ')

        return meetingsApi.create({
          title: event.summary || 'Untitled Meeting',
          date: new Date(startRaw).toISOString(),
          duration_minutes: durationMins,
          attendees: attendees || null,
          meeting_type: 'other',
          google_event_id: event.id,
        })
      })
    )
    setImporting(false)
    setShowCalendarModal(false)
    load()
  }

  function toggleEvent(id) {
    setSelectedEvents(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  if (loading) {
    return <div className="p-8 text-slate-500">Loading meetings…</div>
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Meetings</h1>
          <p className="text-sm text-slate-500 mt-0.5">{meetings.length} total</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => icsInputRef.current?.click()}
            disabled={icsImporting}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
            title="Import meetings from a .ics file exported from Google Calendar"
          >
            <UploadIcon className="w-4 h-4" />
            {icsImporting ? 'Importing…' : 'Import .ics'}
          </button>
          <input
            ref={icsInputRef}
            type="file"
            accept=".ics"
            className="hidden"
            onChange={handleIcsUpload}
          />
          <button
            onClick={syncFromCalendar}
            disabled={calendarLoading}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <CalendarIcon className="w-4 h-4" />
            {calendarLoading ? 'Loading…' : 'Sync from Calendar'}
          </button>
          <button
            onClick={() => setShowNewModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <PlusIcon className="w-4 h-4" />
            New Meeting
          </button>
        </div>
      </div>

      {/* ICS import result banner */}
      {icsResult && (
        <div className={`mb-4 px-4 py-3 rounded-lg text-sm flex items-center justify-between ${
          icsResult.error ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
        }`}>
          <span>
            {icsResult.error
              ? icsResult.error
              : `Import complete — ${icsResult.created} meeting${icsResult.created !== 1 ? 's' : ''} added, ${icsResult.skipped} already existed`}
          </span>
          <button onClick={() => setIcsResult(null)} className="ml-4 opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Filter bar */}
      <div className="flex items-center gap-3 mb-5">
        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
          {['all', 'customer', 'direct_report', 'other'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                filter === f ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {f === 'all' ? 'All' : TYPE_LABELS[f]}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Search meetings…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 max-w-xs px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Meeting cards */}
      {visible.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <CalendarIcon className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No meetings yet. Create one or sync from Google Calendar.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map(m => (
            <MeetingCard
              key={m.id}
              meeting={m}
              onClick={() => navigate(`/meetings/${m.id}`)}
            />
          ))}
        </div>
      )}

      {/* ── New Meeting Modal ── */}
      {showNewModal && (
        <Modal onClose={() => setShowNewModal(false)} title="New Meeting">
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Title *</label>
              <input
                required
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Meeting title"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Date *</label>
                <input
                  required
                  type="date"
                  value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Time</label>
                <input
                  type="time"
                  value={form.time}
                  onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Duration (minutes)</label>
              <input
                type="number"
                min="1"
                value={form.duration_minutes}
                onChange={e => setForm(f => ({ ...f, duration_minutes: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g. 30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Attendees</label>
              <input
                value={form.attendees}
                onChange={e => setForm(f => ({ ...f, attendees: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="John Doe, jane@example.com"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Type</label>
              <select
                value={form.meeting_type}
                onChange={e => setForm(f => ({ ...f, meeting_type: e.target.value, customer_id: '', direct_report_id: '' }))}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="other">Other</option>
                <option value="customer">Customer</option>
                <option value="direct_report">Direct Report</option>
              </select>
            </div>
            {form.meeting_type === 'customer' && (
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Link to Customer</label>
                <select
                  value={form.customer_id}
                  onChange={e => setForm(f => ({ ...f, customer_id: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">— select —</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}
            {form.meeting_type === 'direct_report' && (
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Link to Direct Report</label>
                <select
                  value={form.direct_report_id}
                  onChange={e => setForm(f => ({ ...f, direct_report_id: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">— select —</option>
                  {directReports.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700"
              >
                Create Meeting
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Google Calendar Import Modal ── */}
      {showCalendarModal && (
        <Modal onClose={() => setShowCalendarModal(false)} title="Import from Google Calendar" wide>
          <p className="text-sm text-slate-500 mb-4">
            Showing your meetings from the last 30 days and next 2 weeks.
            Select the ones you want to add to LIL.
          </p>
          {calendarEvents.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No events found in this time range.</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {calendarEvents.map(event => {
                const startRaw = event.start?.dateTime || event.start?.date
                const alreadyImported = meetings.some(m => m.google_event_id === event.id)
                return (
                  <label
                    key={event.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      alreadyImported
                        ? 'border-slate-200 bg-slate-50 opacity-50 cursor-not-allowed'
                        : selectedEvents.has(event.id)
                          ? 'border-indigo-300 bg-indigo-50'
                          : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      disabled={alreadyImported}
                      checked={selectedEvents.has(event.id)}
                      onChange={() => toggleEvent(event.id)}
                      className="mt-0.5 accent-indigo-600"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{event.summary || 'Untitled'}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {startRaw ? formatDate(startRaw) : ''}
                        {event.start?.dateTime ? ` · ${formatTime(event.start.dateTime)}` : ''}
                      </p>
                      {event.attendees?.filter(a => !a.self).length > 0 && (
                        <p className="text-xs text-slate-400 mt-0.5 truncate">
                          With: {event.attendees.filter(a => !a.self).map(a => a.displayName || a.email).join(', ')}
                        </p>
                      )}
                    </div>
                    {alreadyImported && (
                      <span className="text-xs text-slate-400 whitespace-nowrap">Already added</span>
                    )}
                  </label>
                )
              })}
            </div>
          )}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-4">
            <p className="text-xs text-slate-500">
              {selectedEvents.size} event{selectedEvents.size !== 1 ? 's' : ''} selected
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowCalendarModal(false)}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                onClick={importSelectedEvents}
                disabled={selectedEvents.size === 0 || importing}
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {importing ? 'Importing…' : `Import ${selectedEvents.size > 0 ? selectedEvents.size : ''}`}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

function MeetingCard({ meeting: m, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white border border-slate-200 rounded-xl px-5 py-4 hover:border-indigo-300 hover:shadow-sm transition-all group"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${TYPE_COLORS[m.meeting_type]}`}>
              {TYPE_LABELS[m.meeting_type]}
            </span>
            {(m.customer_name || m.direct_report_name) && (
              <span className="text-xs text-slate-400">
                {m.customer_name || m.direct_report_name}
              </span>
            )}
            {m.google_event_id && (
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <CalendarIcon className="w-3 h-3" /> synced
              </span>
            )}
          </div>
          <p className="text-sm font-semibold text-slate-900 truncate group-hover:text-indigo-700 transition-colors">
            {m.title}
          </p>
          {m.attendees && (
            <p className="text-xs text-slate-500 mt-0.5 truncate">With: {m.attendees}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <p className="text-xs font-medium text-slate-700">{formatDate(m.date)}</p>
          {m.duration_minutes && (
            <p className="text-xs text-slate-400">{m.duration_minutes} min</p>
          )}
          {m.transcript && (
            <span className="flex items-center gap-1 text-xs text-emerald-600">
              <DocIcon className="w-3 h-3" /> transcript
            </span>
          )}
        </div>
      </div>
    </button>
  )
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function PlusIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  )
}

function CalendarIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  )
}

function UploadIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
  )
}

function DocIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  )
}
