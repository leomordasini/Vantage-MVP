import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { customersApi, adminApi } from '../api'
import Modal from '../components/Modal'

const ROLE_LABELS = { champion: 'Champion', eb: 'Exec Sponsor', other: 'Other' }
const ROLE_COLORS = {
  champion: 'bg-purple-100 text-purple-700',
  eb: 'bg-blue-100 text-blue-700',
  other: 'bg-gray-100 text-gray-600',
}

function DateField({ label, value, fieldKey, onSave }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value || '')

  const save = async () => {
    await onSave(fieldKey, val || null)
    setEditing(false)
  }

  const display = value
    ? new Date(value + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—'

  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <span className="text-sm font-medium text-gray-500 w-48">{label}</span>
      {editing ? (
        <div className="flex items-center gap-2">
          <input type="date" className="input w-40" value={val} onChange={(e) => setVal(e.target.value)} autoFocus />
          <button className="btn-primary text-xs py-1" onClick={save}>Save</button>
          <button className="btn-secondary text-xs py-1" onClick={() => setEditing(false)}>Cancel</button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-800">{display}</span>
          <button onClick={() => { setVal(value || ''); setEditing(true) }}
            className="text-xs text-indigo-500 hover:underline">Edit</button>
        </div>
      )}
    </div>
  )
}

export default function CustomerDetail() {
  const { id } = useParams()
  const [customer, setCustomer] = useState(null)
  const [directReports, setDirectReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [contactModal, setContactModal] = useState(null) // null | 'add' | contact
  const [contactForm, setContactForm] = useState({ name: '', role: 'other', email: '', title: '' })
  const [saving, setSaving] = useState(false)

  const load = async () => {
    const [{ data: c }, { data: drs }] = await Promise.all([
      customersApi.get(id),
      adminApi.listDirectReports(),
    ])
    setCustomer(c)
    setDirectReports(drs)
  }

  useEffect(() => { load().finally(() => setLoading(false)) }, [id])

  const updateField = async (field, value) => {
    await customersApi.update(id, { [field]: value })
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

  const deleteContact = async (contactId) => {
    if (!window.confirm('Remove this contact?')) return
    await customersApi.deleteContact(id, contactId)
    await load()
  }

  if (loading) return <div className="p-8 text-sm text-gray-400">Loading…</div>
  if (!customer) return <div className="p-8 text-sm text-red-500">Customer not found</div>

  const setF = (k, v) => setContactForm((f) => ({ ...f, [k]: v }))

  return (
    <div className="p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-1">
        <Link to="/customers" className="text-sm text-gray-400 hover:text-gray-600">← Customers</Link>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{customer.name}</h1>

      {/* TAM Assignment */}
      <div className="card p-5 mb-5">
        <h2 className="font-semibold text-gray-700 mb-3">TAM Assignment</h2>
        <div className="flex items-center gap-3">
          <select
            className="input w-56"
            value={customer.tam_id || ''}
            onChange={(e) => updateField('tam_id', e.target.value ? parseInt(e.target.value) : null)}
          >
            <option value="">— Unassigned —</option>
            {directReports.map((dr) => (
              <option key={dr.id} value={dr.id}>{dr.name}{dr.tam_level ? ` (${dr.tam_level})` : ''}</option>
            ))}
          </select>
          {customer.tam && (
            <span className="badge bg-indigo-100 text-indigo-700">Assigned: {customer.tam.name}</span>
          )}
        </div>
      </div>

      {/* Contacts */}
      <div className="card p-5 mb-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-700">Contacts</h2>
          <button className="btn-primary" onClick={openAddContact}>+ Add Contact</button>
        </div>
        {customer.contacts.length === 0 ? (
          <p className="text-sm text-gray-400">No contacts yet.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {customer.contacts.map((c) => (
              <div key={c.id} className="flex items-center justify-between py-3 group">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-800">{c.name}</span>
                    <span className={`badge ${ROLE_COLORS[c.role]}`}>{ROLE_LABELS[c.role]}</span>
                  </div>
                  {(c.title || c.email) && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {[c.title, c.email].filter(Boolean).join(' · ')}
                    </p>
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

      {/* Date Trackers */}
      <div className="card p-5">
        <h2 className="font-semibold text-gray-700 mb-1">Activity Dates</h2>
        <p className="text-xs text-gray-400 mb-3">Dates are color-coded: green &lt;45 days, yellow &lt;90 days, red 90+ days ago.</p>
        <DateField label="Last Leadership Check-in" value={customer.last_leadership_checkin} fieldKey="last_leadership_checkin" onSave={updateField} />
        <DateField label="Last QBR" value={customer.last_qbr} fieldKey="last_qbr" onSave={updateField} />
        <DateField label="Last Core Activity Tracker Update" value={customer.last_core_activity_update} fieldKey="last_core_activity_update" onSave={updateField} />
      </div>

      {/* Contact Modal */}
      {contactModal !== null && (
        <Modal
          title={contactModal === 'add' ? 'Add Contact' : 'Edit Contact'}
          onClose={() => setContactModal(null)}
        >
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
              <input className="input" type="email" value={contactForm.email} onChange={(e) => setF('email', e.target.value)} />
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
