import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { directReportsApi } from '../api'
import Modal from '../components/Modal'

// ─── Tabs ─────────────────────────────────────────────────────────────────────
function Tabs({ active, onChange, counts }) {
  const tabs = [
    { key: 'updates',      label: `Updates (${counts.updates})` },
    { key: 'notes',        label: `1:1 Notes (${counts.notes})` },
    { key: 'achievements', label: `Achievements (${counts.achievements})` },
  ]
  return (
    <div className="flex gap-1 border-b border-gray-200 mb-6">
      {tabs.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            active === key
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

// ─── DR Update type config ────────────────────────────────────────────────────
const UPDATE_TYPES = [
  { value: 'win',           label: '🏆 Win',           color: 'bg-green-100 text-green-700'   },
  { value: 'miss',          label: '❌ Miss',           color: 'bg-red-100 text-red-700'       },
  { value: 'feedback',      label: '💬 Feedback',      color: 'bg-blue-100 text-blue-700'     },
  { value: 'growth_signal', label: '📈 Growth Signal', color: 'bg-purple-100 text-purple-700' },
  { value: 'career',        label: '🎯 Career',        color: 'bg-indigo-100 text-indigo-700' },
  { value: 'general',       label: '📝 Note',          color: 'bg-gray-100 text-gray-600'     },
]

function updateTypeInfo(t) {
  return UPDATE_TYPES.find((x) => x.value === t) || UPDATE_TYPES[UPDATE_TYPES.length - 1]
}

// ─── Updates tab ──────────────────────────────────────────────────────────────
function UpdatesTab({ drId, updates, onRefresh }) {
  const [content, setContent]   = useState('')
  const [type, setType]         = useState('general')
  const [saving, setSaving]     = useState(false)
  const [expanded, setExpanded] = useState(null)
  const [filter, setFilter]     = useState('all')

  const add = async () => {
    if (!content.trim()) return
    setSaving(true)
    try {
      await directReportsApi.addDrUpdate(drId, { content, update_type: type })
      setContent('')
      await onRefresh()
    } finally { setSaving(false) }
  }

  const del = async (updateId) => {
    if (!window.confirm('Delete this entry?')) return
    await directReportsApi.deleteDrUpdate(drId, updateId)
    await onRefresh()
  }

  const filtered = filter === 'all' ? updates : updates.filter((u) => u.update_type === filter)

  return (
    <div>
      {/* Compose */}
      <div className="card p-4 mb-5">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Log an event</p>
        <div className="flex gap-1.5 flex-wrap mb-3">
          {UPDATE_TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => setType(t.value)}
              className={`badge cursor-pointer transition-all ${t.color} ${type === t.value ? 'ring-2 ring-offset-1 ring-current' : 'opacity-50 hover:opacity-100'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <textarea
          className="input min-h-[90px]"
          placeholder="Describe a win, miss, growth moment, feedback session, or career conversation…"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <div className="mt-2 flex justify-end">
          <button className="btn-primary" onClick={add} disabled={saving || !content.trim()}>
            {saving ? 'Saving…' : 'Log Entry'}
          </button>
        </div>
      </div>

      {/* Filter */}
      {updates.length > 0 && (
        <div className="flex gap-1 flex-wrap mb-4">
          <button
            onClick={() => setFilter('all')}
            className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${filter === 'all' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
          >
            All ({updates.length})
          </button>
          {UPDATE_TYPES.map((t) => {
            const count = updates.filter((u) => u.update_type === t.value).length
            if (count === 0) return null
            return (
              <button
                key={t.value}
                onClick={() => setFilter(t.value)}
                className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${filter === t.value ? `${t.color} ring-1 ring-current` : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
              >
                {t.label} ({count})
              </button>
            )
          })}
        </div>
      )}

      {/* Log */}
      {filtered.length === 0 ? (
        <div className="card p-10 text-center text-sm text-gray-400">
          {filter === 'all' ? 'No entries yet. Log the first event above.' : 'No entries for this type.'}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((u) => {
            const ti = updateTypeInfo(u.update_type)
            const isOpen = expanded === u.id
            return (
              <div key={u.id} className="card overflow-hidden group">
                <div
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50"
                  onClick={() => setExpanded(isOpen ? null : u.id)}
                >
                  <span className={`badge text-xs flex-shrink-0 ${ti.color}`}>{ti.label}</span>
                  <p className={`text-sm text-gray-700 flex-1 min-w-0 ${!isOpen ? 'truncate' : ''}`}>{u.content}</p>
                  <span className="text-xs text-gray-400 flex-shrink-0 ml-auto">
                    {new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                  <button
                    className="opacity-0 group-hover:opacity-100 text-xs text-red-400 hover:text-red-600 flex-shrink-0 transition-opacity"
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

// ─── 1:1 Notes tab ───────────────────────────────────────────────────────────
function NotesTab({ drId, notes, onRefresh }) {
  const [modal, setModal]       = useState(null)
  const [form, setForm]         = useState({ date: new Date().toISOString().slice(0, 10), content: '' })
  const [uploadDate, setUploadDate] = useState(new Date().toISOString().slice(0, 10))
  const [file, setFile]         = useState(null)
  const [saving, setSaving]     = useState(false)
  const [expanded, setExpanded] = useState(null)

  const saveNote = async () => {
    if (!form.content.trim()) return
    setSaving(true)
    try {
      await directReportsApi.addNote(drId, { date: form.date, content: form.content, source: 'paste' })
      await onRefresh()
      setModal(null)
    } finally { setSaving(false) }
  }

  const uploadNote = async () => {
    if (!file) return
    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('note_date', uploadDate)
      fd.append('file', file)
      await directReportsApi.uploadNote(drId, fd)
      await onRefresh()
      setModal(null)
      setFile(null)
    } finally { setSaving(false) }
  }

  const deleteNote = async (noteId) => {
    if (!window.confirm('Delete this note?')) return
    await directReportsApi.deleteNote(drId, noteId)
    await onRefresh()
  }

  return (
    <div>
      <div className="flex gap-2 mb-5">
        <button className="btn-primary" onClick={() => { setForm({ date: new Date().toISOString().slice(0, 10), content: '' }); setModal('paste') }}>
          + Paste / Write Note
        </button>
        <button className="btn-secondary" onClick={() => { setUploadDate(new Date().toISOString().slice(0, 10)); setFile(null); setModal('upload') }}>
          ↑ Upload Transcript
        </button>
      </div>

      {notes.length === 0 ? (
        <div className="card p-10 text-center text-sm text-gray-400">No 1:1 notes yet.</div>
      ) : (
        <div className="space-y-2">
          {notes.map((note) => (
            <div key={note.id} className="card overflow-hidden">
              <div
                className="flex items-center justify-between px-5 py-3 cursor-pointer hover:bg-gray-50"
                onClick={() => setExpanded(expanded === note.id ? null : note.id)}
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-gray-800">
                    {new Date(note.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </span>
                  <span className={`badge text-xs ${note.source === 'upload' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                    {note.source === 'upload' ? '↑ uploaded' : '✏ manual'}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <button className="text-xs text-red-500 hover:underline" onClick={(e) => { e.stopPropagation(); deleteNote(note.id) }}>Delete</button>
                  <svg className={`w-4 h-4 text-gray-400 transition-transform ${expanded === note.id ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              {expanded === note.id && (
                <div className="px-5 pb-5 border-t border-gray-100">
                  <pre className="mt-3 text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed max-h-96 overflow-y-auto">{note.content}</pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {modal === 'paste' && (
        <Modal title="Write / Paste 1:1 Note" onClose={() => setModal(null)} wide>
          <div className="space-y-4">
            <div>
              <label className="label">Date</label>
              <input type="date" className="input" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
            </div>
            <div>
              <label className="label">Notes</label>
              <textarea className="input min-h-[280px] font-mono text-sm" placeholder="Paste transcript or write notes…"
                value={form.content} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))} autoFocus />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn-primary" onClick={saveNote} disabled={saving}>{saving ? 'Saving…' : 'Save Note'}</button>
          </div>
        </Modal>
      )}

      {modal === 'upload' && (
        <Modal title="Upload Transcript (.txt or .docx)" onClose={() => setModal(null)}>
          <div className="space-y-4">
            <div>
              <label className="label">Meeting Date</label>
              <input type="date" className="input" value={uploadDate} onChange={(e) => setUploadDate(e.target.value)} />
            </div>
            <div>
              <label className="label">File</label>
              <input type="file" accept=".txt,.docx"
                className="block w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:text-indigo-700 file:font-medium hover:file:bg-indigo-100"
                onChange={(e) => setFile(e.target.files[0] || null)} />
              <p className="text-xs text-gray-400 mt-1">Supports .txt and .docx (Plaud export)</p>
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn-primary" onClick={uploadNote} disabled={saving || !file}>
              {saving ? 'Uploading…' : 'Upload & Save'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ─── Achievements tab ─────────────────────────────────────────────────────────
function AchievementsTab({ drId, achievements, onRefresh }) {
  const [modal, setModal]     = useState(false)
  const [form, setForm]       = useState({ title: '', description: '', date: new Date().toISOString().slice(0, 10) })
  const [imageFile, setImage] = useState(null)
  const [saving, setSaving]   = useState(false)

  const save = async () => {
    if (!form.title.trim()) return
    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('title', form.title)
      fd.append('achievement_date', form.date)
      if (form.description) fd.append('description', form.description)
      if (imageFile) fd.append('image', imageFile)
      await directReportsApi.addAchievement(drId, fd)
      await onRefresh()
      setModal(false)
      setImage(null)
    } finally { setSaving(false) }
  }

  const del = async (achId) => {
    if (!window.confirm('Delete this achievement?')) return
    await directReportsApi.deleteAchievement(drId, achId)
    await onRefresh()
  }

  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  return (
    <div>
      <button className="btn-primary mb-5"
        onClick={() => { setForm({ title: '', description: '', date: new Date().toISOString().slice(0, 10) }); setModal(true) }}>
        + Add Achievement
      </button>

      {achievements.length === 0 ? (
        <div className="card p-10 text-center text-sm text-gray-400">No achievements logged yet.</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {achievements.map((ach) => (
            <div key={ach.id} className="card p-4 group">
              {ach.image_url && (
                <img src={ach.image_url} alt={ach.title} className="w-full h-40 object-cover rounded-lg mb-3" />
              )}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-gray-800 text-sm">{ach.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(ach.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                  {ach.description && <p className="text-sm text-gray-600 mt-2">{ach.description}</p>}
                </div>
                <button className="opacity-0 group-hover:opacity-100 btn-danger text-xs transition-opacity flex-shrink-0" onClick={() => del(ach.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <Modal title="Add Achievement" onClose={() => setModal(false)} wide>
          <div className="space-y-4">
            <div>
              <label className="label">Title *</label>
              <input className="input" value={form.title} onChange={(e) => setF('title', e.target.value)} autoFocus />
            </div>
            <div>
              <label className="label">Date</label>
              <input type="date" className="input" value={form.date} onChange={(e) => setF('date', e.target.value)} />
            </div>
            <div>
              <label className="label">Description</label>
              <textarea className="input min-h-[80px]" value={form.description} onChange={(e) => setF('description', e.target.value)} />
            </div>
            <div>
              <label className="label">Image / Screenshot (optional — requires Cloudinary)</label>
              <input type="file" accept="image/*"
                className="block w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:text-indigo-700 file:font-medium hover:file:bg-indigo-100"
                onChange={(e) => setImage(e.target.files[0] || null)} />
            </div>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => setModal(false)}>Cancel</button>
            <button className="btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DirectReportDetail() {
  const { id }   = useParams()
  const [dr, setDr]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab]     = useState('updates')

  const load = async () => {
    const { data } = await directReportsApi.get(id)
    setDr(data)
  }

  useEffect(() => { load().finally(() => setLoading(false)) }, [id])

  if (loading) return <div className="p-8 text-sm text-gray-400">Loading…</div>
  if (!dr)     return <div className="p-8 text-sm text-red-500">Direct report not found</div>

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <Link to="/direct-reports" className="text-sm text-gray-400 hover:text-gray-600">← Direct Reports</Link>

      <div className="flex items-center gap-3 mt-2 mb-6 flex-wrap">
        <h1 className="text-2xl font-bold text-gray-900">{dr.name}</h1>
        {dr.tam_level && <span className="badge bg-indigo-100 text-indigo-700">{dr.tam_level}</span>}
        {dr.birthday && (
          <span className="badge bg-gray-100 text-gray-500 text-xs">
            🎂 {new Date(dr.birthday + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        )}
      </div>

      <Tabs
        active={tab}
        onChange={setTab}
        counts={{
          updates:      (dr.updates || []).length,
          notes:        (dr.notes || []).length,
          achievements: (dr.achievements || []).length,
        }}
      />

      {tab === 'updates'      && <UpdatesTab      drId={id} updates={dr.updates || []}      onRefresh={load} />}
      {tab === 'notes'        && <NotesTab        drId={id} notes={dr.notes || []}           onRefresh={load} />}
      {tab === 'achievements' && <AchievementsTab drId={id} achievements={dr.achievements || []} onRefresh={load} />}
    </div>
  )
}
