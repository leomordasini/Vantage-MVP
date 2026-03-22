import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { meetingsApi, customersApi, directReportsApi } from '../api'
import Modal from '../components/Modal'

const TYPE_COLORS = {
  customer:      'bg-orange-100 text-orange-700 border-orange-200',
  direct_report: 'bg-purple-100 text-purple-700 border-purple-200',
  other:         'bg-slate-100 text-slate-600 border-slate-200',
}
const TYPE_LABELS = {
  customer:      'Customer',
  direct_report: 'Direct Report',
  other:         'Other',
}

function formatDate(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })
}

function toInputDate(dt) {
  if (!dt) return ''
  const d = new Date(dt)
  return d.toISOString().slice(0, 10)
}

function toInputTime(dt) {
  if (!dt) return ''
  const d = new Date(dt)
  return d.toTimeString().slice(0, 5)
}

export default function MeetingDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  const [meeting, setMeeting]             = useState(null)
  const [customers, setCustomers]         = useState([])
  const [directReports, setDirectReports] = useState([])
  const [loading, setLoading]             = useState(true)
  const [saving, setSaving]               = useState(false)

  // Edit state
  const [editField, setEditField]   = useState(null)
  const [editValue, setEditValue]   = useState('')

  // Transcript
  const [showPasteModal, setShowPasteModal]   = useState(false)
  const [pasteContent, setPasteContent]       = useState('')
  const [uploadingFile, setUploadingFile]     = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const [mRes, cRes, drRes] = await Promise.all([
          meetingsApi.get(id),
          customersApi.list(),
          directReportsApi.list(),
        ])
        setMeeting(mRes.data)
        setCustomers(cRes.data)
        setDirectReports(drRes.data)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  async function patch(data) {
    setSaving(true)
    try {
      const res = await meetingsApi.update(id, data)
      setMeeting(res.data)
    } finally {
      setSaving(false)
    }
  }

  function startEdit(field, value) {
    setEditField(field)
    setEditValue(value ?? '')
  }

  async function commitEdit(field) {
    if (editField !== field) return
    let value = editValue

    if (field === 'date') {
      const d = new Date(`${editValue}T${toInputTime(meeting.date) || '09:00'}`)
      value = d.toISOString()
    }
    if (field === 'duration_minutes') {
      value = editValue ? parseInt(editValue) : null
    }
    if (field === 'customer_id' || field === 'direct_report_id') {
      value = editValue ? parseInt(editValue) : null
    }

    await patch({ [field]: value })
    setEditField(null)
  }

  // Paste transcript
  async function handlePasteSubmit(e) {
    e.preventDefault()
    await patch({ transcript: pasteContent, transcript_source: 'paste' })
    setPasteContent('')
    setShowPasteModal(false)
  }

  // Upload transcript
  async function handleFileUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploadingFile(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await meetingsApi.uploadTranscript(id, formData)
      setMeeting(res.data)
    } finally {
      setUploadingFile(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // Delete meeting
  async function handleDelete() {
    await meetingsApi.delete(id)
    navigate('/meetings')
  }

  if (loading) return <div className="p-8 text-slate-500">Loading…</div>
  if (!meeting) return <div className="p-8 text-slate-500">Meeting not found.</div>

  const linkedName = meeting.customer_name || meeting.direct_report_name

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Back link */}
      <Link
        to="/meetings"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 mb-5 transition-colors"
      >
        <ArrowLeftIcon className="w-4 h-4" />
        Back to Meetings
      </Link>

      {/* ── Header ── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1">
            {/* Title */}
            {editField === 'title' ? (
              <input
                autoFocus
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                onBlur={() => commitEdit('title')}
                onKeyDown={e => e.key === 'Enter' && commitEdit('title')}
                className="text-2xl font-bold text-slate-900 w-full border-b-2 border-indigo-500 focus:outline-none bg-transparent"
              />
            ) : (
              <h1
                className="text-2xl font-bold text-slate-900 cursor-pointer hover:text-indigo-700 transition-colors"
                onClick={() => startEdit('title', meeting.title)}
                title="Click to edit"
              >
                {meeting.title}
              </h1>
            )}
            <p className="text-sm text-slate-500 mt-1">{formatDate(meeting.date)}</p>
          </div>

          {/* Type badge */}
          <div className="flex items-center gap-2">
            {editField === 'meeting_type' ? (
              <select
                autoFocus
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                onBlur={() => commitEdit('meeting_type')}
                className="text-sm border border-slate-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="other">Other</option>
                <option value="customer">Customer</option>
                <option value="direct_report">Direct Report</option>
              </select>
            ) : (
              <span
                className={`px-3 py-1 text-xs font-semibold rounded-full border cursor-pointer ${TYPE_COLORS[meeting.meeting_type]}`}
                onClick={() => startEdit('meeting_type', meeting.meeting_type)}
                title="Click to change type"
              >
                {TYPE_LABELS[meeting.meeting_type]}
              </span>
            )}
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
              title="Delete meeting"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Meeting meta */}
        <div className="grid grid-cols-2 gap-4">
          {/* Date */}
          <MetaField label="Date">
            {editField === 'date' ? (
              <input
                autoFocus
                type="date"
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                onBlur={() => commitEdit('date')}
                className="text-sm border-b border-indigo-400 focus:outline-none bg-transparent w-full"
              />
            ) : (
              <span
                className="text-sm text-slate-800 cursor-pointer hover:text-indigo-600"
                onClick={() => startEdit('date', toInputDate(meeting.date))}
              >
                {new Date(meeting.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                {' · '}
                {new Date(meeting.date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
              </span>
            )}
          </MetaField>

          {/* Duration */}
          <MetaField label="Duration">
            {editField === 'duration_minutes' ? (
              <input
                autoFocus
                type="number"
                min="1"
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                onBlur={() => commitEdit('duration_minutes')}
                onKeyDown={e => e.key === 'Enter' && commitEdit('duration_minutes')}
                className="text-sm border-b border-indigo-400 focus:outline-none bg-transparent w-24"
                placeholder="minutes"
              />
            ) : (
              <span
                className="text-sm text-slate-800 cursor-pointer hover:text-indigo-600"
                onClick={() => startEdit('duration_minutes', meeting.duration_minutes || '')}
              >
                {meeting.duration_minutes ? `${meeting.duration_minutes} min` : <span className="text-slate-400 italic">not set</span>}
              </span>
            )}
          </MetaField>

          {/* Attendees */}
          <MetaField label="Attendees" wide>
            {editField === 'attendees' ? (
              <input
                autoFocus
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                onBlur={() => commitEdit('attendees')}
                onKeyDown={e => e.key === 'Enter' && commitEdit('attendees')}
                className="text-sm border-b border-indigo-400 focus:outline-none bg-transparent w-full"
                placeholder="John Doe, jane@example.com"
              />
            ) : (
              <span
                className="text-sm text-slate-800 cursor-pointer hover:text-indigo-600"
                onClick={() => startEdit('attendees', meeting.attendees || '')}
              >
                {meeting.attendees || <span className="text-slate-400 italic">not set</span>}
              </span>
            )}
          </MetaField>

          {/* Linked entity */}
          {meeting.meeting_type === 'customer' && (
            <MetaField label="Customer">
              {editField === 'customer_id' ? (
                <select
                  autoFocus
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  onBlur={() => commitEdit('customer_id')}
                  className="text-sm border border-slate-300 rounded px-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">— none —</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              ) : (
                <span
                  className="text-sm text-slate-800 cursor-pointer hover:text-indigo-600"
                  onClick={() => startEdit('customer_id', meeting.customer_id || '')}
                >
                  {meeting.customer_name
                    ? <Link to={`/customers/${meeting.customer_id}`} className="text-indigo-600 hover:underline" onClick={e => e.stopPropagation()}>{meeting.customer_name}</Link>
                    : <span className="text-slate-400 italic">not linked</span>}
                </span>
              )}
            </MetaField>
          )}
          {meeting.meeting_type === 'direct_report' && (
            <MetaField label="Direct Report">
              {editField === 'direct_report_id' ? (
                <select
                  autoFocus
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  onBlur={() => commitEdit('direct_report_id')}
                  className="text-sm border border-slate-300 rounded px-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">— none —</option>
                  {directReports.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              ) : (
                <span
                  className="text-sm text-slate-800 cursor-pointer hover:text-indigo-600"
                  onClick={() => startEdit('direct_report_id', meeting.direct_report_id || '')}
                >
                  {meeting.direct_report_name
                    ? <Link to={`/direct-reports/${meeting.direct_report_id}`} className="text-indigo-600 hover:underline" onClick={e => e.stopPropagation()}>{meeting.direct_report_name}</Link>
                    : <span className="text-slate-400 italic">not linked</span>}
                </span>
              )}
            </MetaField>
          )}
        </div>

        {saving && <p className="text-xs text-indigo-500 mt-3 animate-pulse">Saving…</p>}
      </div>

      {/* ── Transcript ── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-900">Transcript</h2>
          <div className="flex gap-2">
            <button
              onClick={() => { setPasteContent(meeting.transcript || ''); setShowPasteModal(true) }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <PencilIcon className="w-3.5 h-3.5" />
              {meeting.transcript ? 'Edit' : 'Paste'}
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingFile}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              <UploadIcon className="w-3.5 h-3.5" />
              {uploadingFile ? 'Uploading…' : 'Upload file'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.docx"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>
        </div>

        {meeting.transcript ? (
          <div>
            <div className="flex items-center gap-2 mb-3">
              {meeting.transcript_source && (
                <span className="text-xs text-slate-400">
                  Source: {meeting.transcript_source === 'upload' ? 'uploaded file' : 'pasted'}
                </span>
              )}
            </div>
            <pre className="whitespace-pre-wrap text-sm text-slate-700 font-mono bg-slate-50 rounded-xl p-4 max-h-[500px] overflow-y-auto leading-relaxed border border-slate-200">
              {meeting.transcript}
            </pre>
          </div>
        ) : (
          <div className="text-center py-12 text-slate-400">
            <DocIcon className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No transcript yet.</p>
            <p className="text-xs mt-1">Paste your Plaud Note or upload a .txt / .docx file.</p>
          </div>
        )}
      </div>

      {/* ── Paste Modal ── */}
      {showPasteModal && (
        <Modal onClose={() => setShowPasteModal(false)} title="Paste Transcript" wide>
          <form onSubmit={handlePasteSubmit} className="space-y-4">
            <textarea
              autoFocus
              value={pasteContent}
              onChange={e => setPasteContent(e.target.value)}
              rows={16}
              className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              placeholder="Paste your meeting transcript here…"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowPasteModal(false)}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700"
              >
                Save Transcript
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Delete Confirm Modal ── */}
      {showDeleteConfirm && (
        <Modal onClose={() => setShowDeleteConfirm(false)} title="Delete Meeting">
          <p className="text-sm text-slate-600 mb-6">
            Are you sure you want to delete <strong>{meeting.title}</strong>? This will also remove the transcript and cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function MetaField({ label, children, wide }) {
  return (
    <div className={wide ? 'col-span-2' : ''}>
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">{label}</p>
      {children}
    </div>
  )
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function ArrowLeftIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  )
}

function TrashIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  )
}

function PencilIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
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
