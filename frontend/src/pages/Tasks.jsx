import { useState, useEffect } from 'react'
import { tasksApi, customersApi, directReportsApi, projectsApi } from '../api'
import Modal from '../components/Modal'

const STATUS_OPTIONS = [
  { value: 'todo', label: 'To Do', color: 'bg-gray-100 text-gray-600' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-blue-100 text-blue-700' },
  { value: 'done', label: 'Done', color: 'bg-green-100 text-green-700' },
]

function statusInfo(s) {
  return STATUS_OPTIONS.find((x) => x.value === s) || STATUS_OPTIONS[0]
}

function formatDueDate(d) {
  if (!d) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(d + 'T00:00:00')
  const days = Math.round((due - today) / 86400000)
  if (days < 0) return { label: `${Math.abs(days)}d overdue`, color: 'text-red-600' }
  if (days === 0) return { label: 'Due today', color: 'text-orange-500' }
  if (days === 1) return { label: 'Due tomorrow', color: 'text-yellow-600' }
  if (days <= 7) return { label: `Due in ${days}d`, color: 'text-blue-600' }
  return { label: due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), color: 'text-gray-400' }
}

const emptyForm = {
  title: '', description: '', status: 'todo', due_date: '',
  customer_id: '', direct_report_id: '', project_id: '',
}

export default function Tasks() {
  const [tasks, setTasks] = useState([])
  const [customers, setCustomers] = useState([])
  const [drs, setDrs] = useState([])
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // null | 'add' | task
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [filterStatus, setFilterStatus] = useState('all')
  const [search, setSearch] = useState('')

  const loadAll = async () => {
    const [{ data: t }, { data: c }, { data: d }, { data: p }] = await Promise.all([
      tasksApi.list(),
      customersApi.list(),
      directReportsApi.list(),
      projectsApi.list(),
    ])
    setTasks(t)
    setCustomers(c)
    setDrs(d)
    setProjects(p)
  }

  useEffect(() => { loadAll().finally(() => setLoading(false)) }, [])

  const openAdd = () => { setForm(emptyForm); setModal('add') }
  const openEdit = (task) => {
    setForm({
      title: task.title,
      description: task.description || '',
      status: task.status,
      due_date: task.due_date || '',
      customer_id: task.customer_id || '',
      direct_report_id: task.direct_report_id || '',
      project_id: task.project_id || '',
    })
    setModal(task)
  }

  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const buildPayload = () => ({
    title: form.title,
    description: form.description || null,
    status: form.status,
    due_date: form.due_date || null,
    customer_id: form.customer_id ? parseInt(form.customer_id) : null,
    direct_report_id: form.direct_report_id ? parseInt(form.direct_report_id) : null,
    project_id: form.project_id ? parseInt(form.project_id) : null,
  })

  const save = async () => {
    if (!form.title.trim()) return
    setSaving(true)
    try {
      if (modal === 'add') {
        await tasksApi.create(buildPayload())
      } else {
        await tasksApi.update(modal.id, buildPayload())
      }
      await loadAll()
      setModal(null)
    } finally { setSaving(false) }
  }

  const deleteTask = async (taskId) => {
    if (!window.confirm('Delete this task?')) return
    await tasksApi.delete(taskId)
    await loadAll()
  }

  const cycleStatus = async (task) => {
    const order = ['todo', 'in_progress', 'done']
    const next = order[(order.indexOf(task.status) + 1) % order.length]
    await tasksApi.update(task.id, { status: next })
    await loadAll()
  }

  const filtered = tasks.filter((t) => {
    if (filterStatus !== 'all' && t.status !== filterStatus) return false
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const grouped = filterStatus === 'all'
    ? {
        todo: filtered.filter((t) => t.status === 'todo'),
        in_progress: filtered.filter((t) => t.status === 'in_progress'),
        done: filtered.filter((t) => t.status === 'done'),
      }
    : { [filterStatus]: filtered }

  const renderTask = (task) => {
    const due = formatDueDate(task.due_date)
    const tags = [
      task.customer && { label: task.customer.name, color: 'bg-orange-100 text-orange-700' },
      task.direct_report && { label: task.direct_report.name, color: 'bg-purple-100 text-purple-700' },
      task.project && { label: task.project.name, color: 'bg-teal-100 text-teal-700' },
    ].filter(Boolean)

    return (
      <div key={task.id} className="card p-4 group flex items-start gap-3">
        {/* Status dot / click to cycle */}
        <button
          title="Click to cycle status"
          onClick={() => cycleStatus(task)}
          className={`mt-0.5 w-4 h-4 rounded-full flex-shrink-0 border-2 transition-colors ${
            task.status === 'done'
              ? 'bg-green-500 border-green-500'
              : task.status === 'in_progress'
              ? 'bg-blue-500 border-blue-500'
              : 'border-gray-300 bg-white hover:border-gray-400'
          }`}
        />

        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${task.status === 'done' ? 'line-through text-gray-400' : 'text-gray-800'}`}>
            {task.title}
          </p>
          {task.description && (
            <p className="text-xs text-gray-500 mt-0.5 truncate">{task.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            {due && <span className={`text-xs font-medium ${due.color}`}>{due.label}</span>}
            {tags.map((tag, i) => (
              <span key={i} className={`badge text-xs ${tag.color}`}>{tag.label}</span>
            ))}
          </div>
        </div>

        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button className="text-xs text-indigo-500 hover:underline" onClick={() => openEdit(task)}>Edit</button>
          <button className="text-xs text-red-400 hover:underline" onClick={() => deleteTask(task.id)}>✕</button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
        <button className="btn-primary" onClick={openAdd}>+ New Task</button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {[{ value: 'all', label: 'All' }, ...STATUS_OPTIONS].map((s) => (
            <button
              key={s.value}
              onClick={() => setFilterStatus(s.value)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                filterStatus === s.value ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <input
          className="input flex-1"
          placeholder="Search tasks…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([status, items]) => {
            if (items.length === 0 && filterStatus === 'all') return null
            const info = status === 'all' ? { label: 'Tasks' } : statusInfo(status)
            return (
              <div key={status}>
                {filterStatus === 'all' && (
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
                    {info.label} ({items.length})
                  </h2>
                )}
                {items.length === 0 ? (
                  <p className="text-sm text-gray-400 pl-1">None</p>
                ) : (
                  <div className="space-y-2">
                    {items.map(renderTask)}
                  </div>
                )}
              </div>
            )
          })}
          {filtered.length === 0 && (
            <div className="card p-12 text-center text-sm text-gray-400">No tasks found.</div>
          )}
        </div>
      )}

      {/* Modal */}
      {modal !== null && (
        <Modal
          title={modal === 'add' ? 'New Task' : 'Edit Task'}
          onClose={() => setModal(null)}
          wide
        >
          <div className="space-y-4">
            <div>
              <label className="label">Title *</label>
              <input className="input" value={form.title} onChange={(e) => setF('title', e.target.value)} autoFocus />
            </div>
            <div>
              <label className="label">Description</label>
              <textarea className="input min-h-[60px]" value={form.description} onChange={(e) => setF('description', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Status</label>
                <select className="input" value={form.status} onChange={(e) => setF('status', e.target.value)}>
                  {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Due Date</label>
                <input type="date" className="input" value={form.due_date} onChange={(e) => setF('due_date', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="label">Customer</label>
                <select className="input" value={form.customer_id} onChange={(e) => setF('customer_id', e.target.value)}>
                  <option value="">—</option>
                  {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Direct Report</label>
                <select className="input" value={form.direct_report_id} onChange={(e) => setF('direct_report_id', e.target.value)}>
                  <option value="">—</option>
                  {drs.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Project</label>
                <select className="input" value={form.project_id} onChange={(e) => setF('project_id', e.target.value)}>
                  <option value="">—</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn-primary" onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save Task'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
