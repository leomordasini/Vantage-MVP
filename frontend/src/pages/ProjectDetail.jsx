import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { projectsApi } from '../api'

const STATUS_COLORS = {
  active: 'bg-green-100 text-green-700',
  completed: 'bg-gray-100 text-gray-500',
  on_hold: 'bg-yellow-100 text-yellow-700',
}
const STATUS_LABELS = { active: 'Active', completed: 'Completed', on_hold: 'On Hold' }

const UPDATE_TYPES = [
  { value: 'update', label: 'Update', color: 'bg-blue-100 text-blue-700', dot: '🔵' },
  { value: 'next_step', label: 'Next Step', color: 'bg-indigo-100 text-indigo-700', dot: '▶' },
  { value: 'milestone', label: 'Milestone', color: 'bg-green-100 text-green-700', dot: '🏁' },
  { value: 'blocker', label: 'Blocker', color: 'bg-red-100 text-red-700', dot: '🚫' },
]

function typeInfo(t) {
  return UPDATE_TYPES.find((x) => x.value === t) || UPDATE_TYPES[0]
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export default function ProjectDetail() {
  const { id } = useParams()
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [content, setContent] = useState('')
  const [updateType, setUpdateType] = useState('update')
  const [saving, setSaving] = useState(false)
  const [filterType, setFilterType] = useState('all')
  const [editingStatus, setEditingStatus] = useState(false)

  const load = async () => {
    const { data } = await projectsApi.get(id)
    setProject(data)
  }

  useEffect(() => { load().finally(() => setLoading(false)) }, [id])

  const addUpdate = async () => {
    if (!content.trim()) return
    setSaving(true)
    try {
      await projectsApi.addUpdate(id, { content, update_type: updateType })
      setContent('')
      await load()
    } finally { setSaving(false) }
  }

  const deleteUpdate = async (updateId) => {
    if (!window.confirm('Delete this entry?')) return
    await projectsApi.deleteUpdate(id, updateId)
    await load()
  }

  const setStatus = async (status) => {
    await projectsApi.update(id, { status })
    setEditingStatus(false)
    await load()
  }

  if (loading) return <div className="p-8 text-sm text-gray-400">Loading…</div>
  if (!project) return <div className="p-8 text-sm text-red-500">Project not found</div>

  const filtered = filterType === 'all'
    ? (project.updates || [])
    : (project.updates || []).filter((u) => u.update_type === filterType)

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <Link to="/projects" className="text-sm text-gray-400 hover:text-gray-600">← Projects</Link>

      {/* Header */}
      <div className="flex items-start justify-between mt-2 mb-1 gap-4">
        <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
        <div className="flex items-center gap-2 flex-shrink-0">
          {editingStatus ? (
            <div className="flex gap-1">
              {Object.entries(STATUS_LABELS).map(([val, label]) => (
                <button key={val} onClick={() => setStatus(val)}
                  className={`badge cursor-pointer ${STATUS_COLORS[val]} hover:opacity-80 transition-opacity`}>
                  {label}
                </button>
              ))}
            </div>
          ) : (
            <span
              className={`badge ${STATUS_COLORS[project.status]} cursor-pointer hover:opacity-80`}
              onClick={() => setEditingStatus(true)}
              title="Click to change status"
            >
              {STATUS_LABELS[project.status]}
            </span>
          )}
        </div>
      </div>

      {project.description && (
        <p className="text-sm text-gray-500 mb-1">{project.description}</p>
      )}
      {project.length && (
        <p className="text-xs text-gray-400 mb-6">📅 {project.length}</p>
      )}
      {!project.description && !project.length && <div className="mb-6" />}

      {/* Add update */}
      <div className="card p-5 mb-6">
        <h2 className="font-semibold text-gray-700 mb-3">Add Entry</h2>
        <div className="flex gap-2 mb-3 flex-wrap">
          {UPDATE_TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => setUpdateType(t.value)}
              className={`badge cursor-pointer transition-opacity ${t.color} ${updateType === t.value ? 'opacity-100 ring-2 ring-offset-1 ring-current' : 'opacity-70 hover:opacity-100'}`}
            >
              {t.dot} {t.label}
            </button>
          ))}
        </div>
        <textarea
          className="input min-h-[100px]"
          placeholder={`Add a ${typeInfo(updateType).label.toLowerCase()}…`}
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <div className="mt-3 flex justify-end">
          <button className="btn-primary" onClick={addUpdate} disabled={saving || !content.trim()}>
            {saving ? 'Saving…' : 'Save Entry'}
          </button>
        </div>
      </div>

      {/* Log */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-700">Update Log ({project.updates?.length || 0})</h2>
          <div className="flex gap-1">
            <button
              onClick={() => setFilterType('all')}
              className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${filterType === 'all' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
            >
              All
            </button>
            {UPDATE_TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => setFilterType(t.value)}
                className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${filterType === t.value ? `${t.color} ring-1 ring-current` : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="card p-10 text-center text-sm text-gray-400">No entries yet.</div>
        ) : (
          <div className="space-y-2">
            {filtered.map((u) => {
              const info = typeInfo(u.update_type)
              return (
                <div key={u.id} className="card p-4 group flex items-start gap-3">
                  <span className={`badge ${info.color} flex-shrink-0 mt-0.5`}>{info.label}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{u.content}</p>
                    <p className="text-xs text-gray-400 mt-1.5">{formatDate(u.created_at)}</p>
                  </div>
                  <button
                    className="opacity-0 group-hover:opacity-100 text-xs text-red-400 hover:text-red-600 transition-opacity flex-shrink-0"
                    onClick={() => deleteUpdate(u.id)}
                  >
                    ✕
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
