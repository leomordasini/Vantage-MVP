import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { customersApi, adminApi } from '../api'
import Modal from '../components/Modal'

// ─── Health config ────────────────────────────────────────────────────────────
const HEALTH = {
  healthy:  { label: 'Healthy',  color: 'bg-green-100 text-green-700',   ring: 'ring-green-400'  },
  neutral:  { label: 'Neutral',  color: 'bg-gray-100 text-gray-500',     ring: 'ring-gray-300'   },
  at_risk:  { label: 'At Risk',  color: 'bg-yellow-100 text-yellow-700', ring: 'ring-yellow-400' },
  critical: { label: 'Critical', color: 'bg-red-100 text-red-700',       ring: 'ring-red-400'    },
}

// Sentiment maps to health value
const SENTIMENT_TO_HEALTH = {
  positive: 'healthy',
  neutral: 'neutral',
  at_risk: 'at_risk',
  critical: 'critical',
}

const SENTIMENT_OPTIONS = [
  { value: 'positive', label: '✅ Positive', color: 'bg-green-100 text-green-700' },
  { value: 'neutral',  label: '➖ Neutral',  color: 'bg-gray-100 text-gray-600'  },
  { value: 'at_risk',  label: '⚠️ At Risk',  color: 'bg-yellow-100 text-yellow-700'},
  { value: 'critical', label: '🔴 Critical', color: 'bg-red-100 text-red-700'    },
]

function sentimentInfo(s) {
  return SENTIMENT_OPTIONS.find((x) => x.value === s) || SENTIMENT_OPTIONS[1]
}

const ROLE_LABELS  = { champion: 'Champion', eb: 'Exec Sponsor', other: 'Other' }
const ROLE_COLORS  = {
  champion: 'bg-purple-100 text-purple-700',
  eb:       'bg-blue-100 text-blue-700',
  other:    'bg-gray-100 text-gray-600',
}

// ─── Inline date editor ───────────────────────────────────────────────────────
function DateField({ label, value, fieldKey, onSave }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal]         = useState(value || '')

  const save = async () => {
    await onSave(fieldKey, val || null)
    setEditing(false)
  }

  const display = value
    ? new Date(value + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—'

  // Age in days for color coding
  const daysAgo = value ? Math.floor((Date.now() - new Date(value + 'T00:00:00').getTime()) / 86400000) : null
  const ageColor = daysAgo === null ? 'text-gray-400'
    : daysAgo > 180 ? 'text-red-500'
    : daysAgo > 90  ? 'text-yellow-600'
    : 'text-green-600'

  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <span className="text-sm font-medium text-gray-500 w-52 flex-shrink-0">{label}</span>
      {editing ? (
        <div className="flex items-center gap-2">
          <input type="date" className="input w-40" value={val} onChange={(e) => setVal(e.target.value)} autoFocus />
          <button className="btn-primary text-xs py-1" onClick={save}>Save</button>
          <button className="btn-secondary text-xs py-1" onClick={() => setEditing(false)}>Cancel</button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${ageColor}`}>{display}</span>
          {daysAgo !== null && <span className="text-xs text-gray-400">({daysAgo}d ago)</span>}
          <button onClick={() => { setVal(value || ''); setEditing(true) }}
            className="text-xs text-indigo-500 hover:underline">Edit</button>
        </div>
      )}
    </div>
  )
}

// ─── Update log section ───────────────────────────────────────────────────────
function UpdateLog({ customerId, updates, onRefresh }) {
  const [content, setContent]   = useState('')
  const [sentiment, setSentiment] = useState('neutral')
  const [saving, setSaving]     = useState(false)
  const [expanded, setExpanded] = useState(null)

  const add = async () => {
    if (!content.trim()) return
    setSaving(true)
    try {
      await customersApi.addUpdate(customerId, { content, sentiment })
      setContent('')
      setSentiment('neutral')
      await onRefresh()
    } finally { setSaving(false) }
  }

  const del = async (updateId) => {
    if (!window.confirm('Delete this entry?')) return
    await customersApi.deleteUpdate(customerId, updateId)
    await onRefresh()
  }

  return (
    <div>
      {/* Compose */}
      <div className="mb-4">
        <div className="flex gap-2 flex-wrap mb-2">
          {SENTIMENT_OPTIONS.map((s) => (
            <button
              key={s.value}
              onClick={() => setSentiment(s.value)}
              className={`badge cursor-pointer transition-all ${s.color} ${sentiment === s.value ? 'ring-2 ring-offset-1 ring-current' : 'opacity-60 hover:opacity-100'}`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <textarea
          className="input min-h-[90px]"
          placeholder="Log a significant event, win, risk, or update…"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <div className="mt-2 flex justify-end">
          <button className="btn-primary" onClick={add} disabled={saving || !content.trim()}>
            {saving ? 'Saving…' : 'Add Entry'}
          </button>
        </div>
      </div>

      {/* Log */}
      {updates.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">No updates yet. Log the first significant event above.</p>
      ) : (
        <div className="space-y-2">
          {updates.map((u) => {
            const si = sentimentInfo(u.sentiment)
            const isOpen = expanded === u.id
            return (
              <div key={u.id} className="rounded-lg border border-gray-100 bg-white overflow-hidden group">
                <div
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50"
                  onClick={() => setExpanded(isOpen ? null : u.id)}
                >
                  <span className={`badge text-xs flex-shrink-0 ${si.color}`}>{si.label}</span>
                  <p className={`text-sm text-gray-700 flex-1 ${!isOpen ? 'truncate' : ''}`}>{u.content}</p>
                  <span className="text-xs text-gray-400 flex-shrink-0 ml-auto">
                    {new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                  <button
                    className="opacity-0 group-hover:opacity-100 text-xs text-red-400 hover:text-red-600 flex-shrink-0 transition-opacity ml-1"
                    onClick={(e) => { e.stopPropagation(); del(u.id) }}
                  >✕</button>
                  <svg className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                {isOpen && (
                  <div className="px-4 pb-4 border-t border-gray-100">
                    <p className="text-sm text-gray-700 mt-3 whitespace-pre-wrap">{u.content}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function CustomerDetail() {
  const { id } = useParams()
  const [customer, setCustomer]     = useState(null)
  const [directReports, setDRs]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [tab, setTab]               = useState('updates')
  const [contactModal, setContactModal] = useState(null)
  const [contactForm, setContactForm]   = useState({ name: '', role: 'other', email: '', title: '' })
  const [saving, setSaving]         = useState(false)
  const [editingHealth, setEditingHealth] = useState(false)

  const load = async () => {
    const [{ data: c }, { data: drs }] = await Promise.all([
      customersApi.get(id),
      adminApi.listDirectReports(),
    ])
    setCustomer(c)
    setDRs(drs)
  }

  useEffect(() => { load().finally(() => setLoading(false)) }, [id])

  const updateField = async (field, value) => {
    await customersApi.update(id, { [field]: value })
    await load()
  }

  const setHealth = async (val) => {
    await customersApi.update(id, { overall_health: val })
    setEditingHealth(false)
    await load()
  }

  const openAddContact = () => {
    setContactForm({ name: '', role: 'other', email: '', title: '' })
    setContactModal('add')
  }
  const openEditContact = (c) => {
    setContactForm({ name: c.name, role: c.role, email: c.email || '', title: c.title || '' })
    setContactModal(c)
  }

  const saveContact = async () => {
    setSaving(true)
    try {
      const payload = {
        name: contactForm.name,
        role: contactForm.role,
        email: contactForm.email || null,
        title: contactForm.title || null,
      }
      if (contactModal === 'add') {
        await customersApi.addContact(id, payload)
      } else {
        await customersApi.updateContact(id, contactModal.id, payload)
      }
      await load()
      setContactModal(null)
    } finally { setSaving(false) }
  }

  const deleteContact = async (cId) => {
    if (!window.confirm('Remove this contact?')) return
    await customersApi.deleteContact(id, cId)
    await load()
  }

  if (loading) return <div className="p-8 text-sm text-gray-400">Loading…</div>
  if (!customer) return <div className="p-8 text-sm text-red-500">Customer not found</div>

  const health = HEALTH[customer.overall_health] || HEALTH.neutral
  const setF = (k, v) => setContactForm((f) => ({ ...f, [k]: v }))

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <Link to="/customers" className="text-sm text-gray-400 hover:text-gray-600">← Customers</Link>

      {/* Header */}
      <div className="flex items-center gap-3 mt-2 mb-6 flex-wrap">
        <h1 className="text-2xl font-bold text-gray-900">{customer.name}</h1>

        {/* Health badge — click to change */}
        <div className="relative">
          <button
            onClick={() => setEditingHealth(!editingHealth)}
            className={`badge ${health.color} cursor-pointer hover:opacity-80 transition-opacity`}
            title="Click to change health status"
          >
            {health.label}
          </button>
          {editingHealth && (
            <div className="absolute top-8 left-0 z-10 bg-white rounded-xl shadow-xl border border-gray-200 p-2 flex flex-col gap-1 min-w-[140px]">
              {Object.entries(HEALTH).map(([val, h]) => (
                <button
                  key={val}
                  onClick={() => setHealth(val)}
                  className={`badge ${h.color} cursor-pointer hover:opacity-80 text-left w-full justify-start`}
                >
                  {h.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {customer.tam && (
          <span className="badge bg-indigo-100 text-indigo-700">TAM: {customer.tam.name}</span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {[
          { key: 'updates',  label: `Updates (${customer.updates?.length || 0})` },
          { key: 'contacts', label: `Contacts (${customer.contacts?.length || 0})` },
          { key: 'dates',    label: 'Activity Dates' },
          { key: 'tam',      label: 'TAM Assignment' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === key
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Updates tab ──────────────────────────────────────── */}
      {tab === 'updates' && (
        <UpdateLog customerId={id} updates={customer.updates || []} onRefresh={load} />
      )}

      {/* ── Contacts tab ─────────────────────────────────────── */}
      {tab === 'contacts' && (
        <div>
          <div className="flex justify-end mb-4">
            <button className="btn-primary" onClick={openAddContact}>+ Add Contact</button>
          </div>
          {customer.contacts.length === 0 ? (
            <p className="text-sm text-gray-400">No contacts yet.</p>
          ) : (
            <div className="card divide-y divide-gray-100">
              {customer.contacts.map((c) => (
                <div key={c.id} className="flex items-center justify-between px-5 py-4 group">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-800">{c.name}</span>
                      <span className={`badge ${ROLE_COLORS[c.role]}`}>{ROLE_LABELS[c.role]}</span>
                    </div>
                    {(c.title || c.email) && (
                      <p className="text-xs text-gray-400 mt-0.5">{[c.title, c.email].filter(Boolean).join(' · ')}</p>
                    )}
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="text-xs text-indigo-600 hover:underline" onClick={() => openEditContact(c)}>Edit</button>
                    <button className="text-xs text-red-500 hover:underline" onClick={() => deleteContact(c.id)}>Remove</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Activity dates tab ───────────────────────────────── */}
      {tab === 'dates' && (
        <div className="card p-5">
          <p className="text-xs text-gray-400 mb-4">Color-coded: green &lt;90d, yellow &lt;180d, red 180+ days ago.</p>
          <DateField label="Last Leadership Check-in" value={customer.last_leadership_checkin} fieldKey="last_leadership_checkin" onSave={updateField} />
          <DateField label="Last QBR" value={customer.last_qbr} fieldKey="last_qbr" onSave={updateField} />
          <DateField label="Last Core Activity Tracker Update" value={customer.last_core_activity_update} fieldKey="last_core_activity_update" onSave={updateField} />
        </div>
      )}

      {/* ── TAM assignment tab ───────────────────────────────── */}
      {tab === 'tam' && (
        <div className="card p-5">
          <h2 className="font-semibold text-gray-700 mb-3">Assigned TAM</h2>
          <select
            className="input w-64"
            value={customer.tam_id || ''}
            onChange={(e) => updateField('tam_id', e.target.value ? parseInt(e.target.value) : null)}
          >
            <option value="">— Unassigned —</option>
            {directReports.map((dr) => (
              <option key={dr.id} value={dr.id}>
                {dr.name}{dr.tam_level ? ` (${dr.tam_level})` : ''}
              </option>
            ))}
          </select>
          {customer.tam && (
            <p className="text-sm text-gray-500 mt-3">Currently assigned: <strong>{customer.tam.name}</strong></p>
          )}
        </div>
      )}

      {/* Contact modal */}
      {contactModal !== null && (
        <Modal title={contactModal === 'add' ? 'Add Contact' : 'Edit Contact'} onClose={() => setContactModal(null)}>
          <div className="space-y-4">
            <div>
              <label className="label">Name *</label>
              <input className="input" value={contactForm.name} onChange={(e) => setF('name', e.target.value)} autoFocus />
            </div>
            <div>
              <label className="label">Role</label>
              <select className="input" value={contactForm.role} onChange={(e) => setF('role', e.target.value)}>
                <option value="champion">Champion</option>
                <option value="eb">Exec Sponsor</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="label">Title</label>
              <input className="input" value={contactForm.title} onChange={(e) => setF('title', e.target.value)} placeholder="e.g. VP Engineering" />
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" value={contactForm.email} onChange={(e) => setF('email', e.target.value)} />
            </div>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => setContactModal(null)}>Cancel</button>
            <button className="btn-primary" onClick={saveContact} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
