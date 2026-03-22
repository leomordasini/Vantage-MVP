import { useState, useEffect } from 'react'
import { adminApi } from '../api'
import Modal from '../components/Modal'

// ─── Reusable row component ─────────────────────────────────────────────────
function EntityRow({ name, onEdit, onDelete }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 group">
      <span className="text-sm text-gray-800">{name}</span>
      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={onEdit} className="text-xs text-indigo-600 hover:underline">Edit</button>
        <button onClick={onDelete} className="text-xs text-red-500 hover:underline">Delete</button>
      </div>
    </div>
  )
}

// ─── Customers panel ────────────────────────────────────────────────────────
function CustomersPanel() {
  const [items, setItems] = useState([])
  const [modal, setModal] = useState(null) // null | 'add' | {id, name}
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  const load = async () => {
    const { data } = await adminApi.listCustomers()
    setItems(data)
  }
  useEffect(() => { load() }, [])

  const openAdd = () => { setName(''); setModal('add') }
  const openEdit = (item) => { setName(item.name); setModal(item) }

  const save = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      if (modal === 'add') {
        await adminApi.createCustomer({ name })
      } else {
        await adminApi.updateCustomer(modal.id, { name })
      }
      await load()
      setModal(null)
    } finally { setSaving(false) }
  }

  const remove = async (id) => {
    if (!window.confirm('Delete this customer?')) return
    await adminApi.deleteCustomer(id)
    await load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-700">Customers</h3>
        <button className="btn-primary" onClick={openAdd}>+ Add</button>
      </div>
      <div className="card divide-y divide-gray-100">
        {items.length === 0 && (
          <p className="px-4 py-6 text-sm text-gray-400 text-center">No customers yet</p>
        )}
        {items.map((c) => (
          <EntityRow key={c.id} name={c.name} onEdit={() => openEdit(c)} onDelete={() => remove(c.id)} />
        ))}
      </div>

      {modal !== null && (
        <Modal title={modal === 'add' ? 'Add Customer' : 'Edit Customer'} onClose={() => setModal(null)}>
          <label className="label">Name</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && save()} autoFocus />
          <div className="mt-4 flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn-primary" onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ─── Direct Reports panel ────────────────────────────────────────────────────
const TAM_LEVELS = ['IC1','IC2','IC3','IC4','IC5','IC6','M1','M2','M3','M4','M5']

function DirectReportsPanel() {
  const [items, setItems] = useState([])
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({ name: '', birthday: '', tam_level: '' })
  const [saving, setSaving] = useState(false)

  const load = async () => {
    const { data } = await adminApi.listDirectReports()
    setItems(data)
  }
  useEffect(() => { load() }, [])

  const openAdd = () => { setForm({ name: '', birthday: '', tam_level: '' }); setModal('add') }
  const openEdit = (item) => {
    setForm({ name: item.name, birthday: item.birthday || '', tam_level: item.tam_level || '' })
    setModal(item)
  }

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const save = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const payload = {
        name: form.name,
        birthday: form.birthday || null,
        tam_level: form.tam_level || null,
      }
      if (modal === 'add') {
        await adminApi.createDirectReport(payload)
      } else {
        await adminApi.updateDirectReport(modal.id, payload)
      }
      await load()
      setModal(null)
    } finally { setSaving(false) }
  }

  const remove = async (id) => {
    if (!window.confirm('Delete this direct report? All their notes and achievements will also be deleted.')) return
    await adminApi.deleteDirectReport(id)
    await load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-700">Direct Reports</h3>
        <button className="btn-primary" onClick={openAdd}>+ Add</button>
      </div>
      <div className="card divide-y divide-gray-100">
        {items.length === 0 && (
          <p className="px-4 py-6 text-sm text-gray-400 text-center">No direct reports yet</p>
        )}
        {items.map((dr) => (
          <EntityRow
            key={dr.id}
            name={`${dr.name}${dr.tam_level ? ` — ${dr.tam_level}` : ''}${dr.birthday ? ` 🎂 ${dr.birthday}` : ''}`}
            onEdit={() => openEdit(dr)}
            onDelete={() => remove(dr.id)}
          />
        ))}
      </div>

      {modal !== null && (
        <Modal title={modal === 'add' ? 'Add Direct Report' : 'Edit Direct Report'} onClose={() => setModal(null)}>
          <div className="space-y-4">
            <div>
              <label className="label">Name *</label>
              <input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} autoFocus />
            </div>
            <div>
              <label className="label">Birthday</label>
              <input type="date" className="input" value={form.birthday} onChange={(e) => set('birthday', e.target.value)} />
            </div>
            <div>
              <label className="label">TAM Level</label>
              <select className="input" value={form.tam_level} onChange={(e) => set('tam_level', e.target.value)}>
                <option value="">— select —</option>
                {TAM_LEVELS.map((l) => <option key={l}>{l}</option>)}
              </select>
            </div>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn-primary" onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ─── Projects panel ──────────────────────────────────────────────────────────
function ProjectsPanel() {
  const [items, setItems] = useState([])
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({ name: '', description: '', length: '' })
  const [saving, setSaving] = useState(false)

  const load = async () => {
    const { data } = await adminApi.listProjects()
    setItems(data)
  }
  useEffect(() => { load() }, [])

  const openAdd = () => { setForm({ name: '', description: '', length: '' }); setModal('add') }
  const openEdit = (item) => {
    setForm({ name: item.name, description: item.description || '', length: item.length || '' })
    setModal(item)
  }

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const save = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const payload = { name: form.name, description: form.description || null, length: form.length || null }
      if (modal === 'add') {
        await adminApi.createProject(payload)
      } else {
        await adminApi.updateProject(modal.id, payload)
      }
      await load()
      setModal(null)
    } finally { setSaving(false) }
  }

  const remove = async (id) => {
    if (!window.confirm('Delete this project? All updates will also be deleted.')) return
    await adminApi.deleteProject(id)
    await load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-700">Projects / Initiatives</h3>
        <button className="btn-primary" onClick={openAdd}>+ Add</button>
      </div>
      <div className="card divide-y divide-gray-100">
        {items.length === 0 && (
          <p className="px-4 py-6 text-sm text-gray-400 text-center">No projects yet</p>
        )}
        {items.map((p) => (
          <EntityRow
            key={p.id}
            name={`${p.name}${p.length ? ` (${p.length})` : ''}`}
            onEdit={() => openEdit(p)}
            onDelete={() => remove(p.id)}
          />
        ))}
      </div>

      {modal !== null && (
        <Modal title={modal === 'add' ? 'Add Project' : 'Edit Project'} onClose={() => setModal(null)} wide>
          <div className="space-y-4">
            <div>
              <label className="label">Name *</label>
              <input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} autoFocus />
            </div>
            <div>
              <label className="label">Description</label>
              <textarea className="input min-h-[80px]" value={form.description} onChange={(e) => set('description', e.target.value)} />
            </div>
            <div>
              <label className="label">Length / Timeline</label>
              <input className="input" placeholder="e.g. Q3 2025, 3 months" value={form.length} onChange={(e) => set('length', e.target.value)} />
            </div>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn-primary" onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function Admin() {
  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Admin</h1>
      <p className="text-sm text-gray-500 mb-8">Manage the core entities used across Vantage.</p>

      <div className="space-y-10">
        <CustomersPanel />
        <DirectReportsPanel />
        <ProjectsPanel />
      </div>
    </div>
  )
}
