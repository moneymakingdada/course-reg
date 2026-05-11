import { useEffect, useState, useCallback } from 'react'
import { getMyCourses } from '../../api/courses'
import {
  getCourseWaitlist, notifyNextStudent,
  removeFromWaitlist, enrollFromWaitlist,
} from '../../api/waitlist'
import StatCard from '../../components/StatCard'


function getInitials(name = '') {
  return name.split(' ').filter(Boolean).slice(0, 2).map(n => n[0].toUpperCase()).join('')
}

function statusClass(entry) {
  if (entry.accepted)  return 'wl-status wl-status--accepted'
  if (entry.notified)  return 'wl-status wl-status--notified'
  return 'wl-status wl-status--waiting'
}

function statusLabel(entry) {
  if (entry.accepted) return 'Accepted'
  if (entry.notified) return 'Notified'
  return 'Waiting'
}

// ── Remove reason modal ────────────────────────────────────────────────────────
function RemoveModal({ entry, onConfirm, onCancel }) {
  const [reason, setReason] = useState('')
  return (
    <div className="remove-modal-overlay">
      <div className="remove-modal">
        <p className="remove-modal__title">Remove from waitlist</p>
        <p className="remove-modal__sub">
          Remove <strong>{entry.student_name}</strong> from the waitlist?
          A notification will be sent to them.
        </p>
        <textarea
          className="remove-modal__textarea"
          placeholder="Optional reason for the student…"
          value={reason}
          onChange={e => setReason(e.target.value)}
        />
        <div className="remove-modal__actions">
          <button className="remove-modal__cancel" onClick={onCancel}>Cancel</button>
          <button className="remove-modal__confirm" onClick={() => onConfirm(reason)}>
            Remove student
          </button>
        </div>
      </div>
    </div>
  )
}

export default function InstructorWaitlist() {
  const [courses,       setCourses]       = useState([])
  const [selectedId,    setSelectedId]    = useState(null)
  const [entries,       setEntries]       = useState([])
  const [statusFilter,  setStatusFilter]  = useState('all')
  const [loading,       setLoading]       = useState(true)
  const [entriesLoading, setEntriesLoading] = useState(false)
  const [success,       setSuccess]       = useState('')
  const [error,         setError]         = useState('')
  const [removeTarget,  setRemoveTarget]  = useState(null)  // entry to remove

  // Load instructor's courses
  useEffect(() => {
    getMyCourses()
      .then(d => {
        const list = Array.isArray(d) ? d : d.results ?? []
        setCourses(list)
        if (list.length > 0) setSelectedId(list[0].id)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  // Load waitlist entries when selected course or filter changes
  const fetchEntries = useCallback(async (courseId, filter) => {
    if (!courseId) return
    setEntriesLoading(true)
    try {
      const params = filter !== 'all' ? { status: filter } : {}
      const data   = await getCourseWaitlist(courseId, params)
      setEntries(Array.isArray(data) ? data : data.results ?? [])
    } catch { setEntries([]) }
    finally { setEntriesLoading(false) }
  }, [])

  useEffect(() => {
    fetchEntries(selectedId, statusFilter)
  }, [selectedId, statusFilter, fetchEntries])

  const flash = (msg, isError = false) => {
    if (isError) { setError(msg); setTimeout(() => setError(''), 4000) }
    else         { setSuccess(msg); setTimeout(() => setSuccess(''), 4000) }
  }

  const handleNotifyNext = async () => {
    try {
      const res = await notifyNextStudent(selectedId)
      flash(res.detail)
      fetchEntries(selectedId, statusFilter)
    } catch (err) {
      flash(err.response?.data?.detail || 'Failed to notify.', true)
    }
  }

  const handleEnroll = async (entry) => {
    if (!window.confirm(`Directly enroll ${entry.student_name} in this course?`)) return
    try {
      const res = await enrollFromWaitlist(selectedId, entry.id)
      flash(res.detail)
      fetchEntries(selectedId, statusFilter)
    } catch (err) {
      flash(err.response?.data?.detail || 'Failed to enroll.', true)
    }
  }

  const handleRemoveConfirm = async (reason) => {
    try {
      const res = await removeFromWaitlist(selectedId, removeTarget.id, reason)
      flash(res.detail)
      setRemoveTarget(null)
      fetchEntries(selectedId, statusFilter)
    } catch (err) {
      flash(err.response?.data?.detail || 'Failed to remove.', true)
      setRemoveTarget(null)
    }
  }

  const selectedCourse = courses.find(c => c.id === selectedId)
  const waiting        = entries.filter(e => !e.notified).length
  const notified       = entries.filter(e => e.notified && !e.accepted).length

  return (
    <div className="instr-waitlist">
      <p className="page-title instr-waitlist__title">Waitlist management</p>
      <p className="page-subtitle instr-waitlist__subtitle">
        Manage student queues for your courses — notify, enroll or remove students
      </p>

      {/* KPIs */}
      <div className="kpi-grid" style={{ marginBottom: '1.25rem' }}>
        <StatCard label="My courses"        value={courses.length}           badge="active"    badgeColor="teal"  borderColor="#9FE1CB" />
        <StatCard label="Waitlisted total"  value={courses.reduce((s,c) => s + (c.waitlist_count ?? 0), 0)} badge="across all" badgeColor="amber" borderColor="#9FE1CB" />
        <StatCard label="Waiting"           value={waiting}                  badge="not yet notified" badgeColor="amber" borderColor="#9FE1CB" />
        <StatCard label="Spot offered"      value={notified}                 badge="pending accept"   badgeColor="teal"  borderColor="#9FE1CB" />
      </div>

      {/* Banners */}
      {success && <div className="info-banner" style={{ marginBottom: '1rem' }}><span>✓ {success}</span></div>}
      {error   && <div className="error-banner" style={{ marginBottom: '1rem' }}>{error}</div>}

      {/* Course selector tabs */}
      {loading ? (
        <p className="instr-waitlist__empty">Loading courses…</p>
      ) : courses.length === 0 ? (
        <p className="instr-waitlist__empty">No active courses found.</p>
      ) : (
        <>
          <div className="instr-waitlist__course-tabs">
            {courses.map(course => (
              <button
                key={course.id}
                className={`instr-waitlist__course-tab${selectedId === course.id ? ' active' : ''}`}
                onClick={() => setSelectedId(course.id)}
              >
                {course.code}
                {(course.waitlist_count ?? 0) > 0 && (
                  <span className="instr-waitlist__course-tab-badge">
                    {course.waitlist_count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Action bar */}
          <div className="instr-waitlist__action-bar">
            <div className="instr-waitlist__action-bar-left">
              <select
                className="instr-waitlist__filter-select"
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
              >
                <option value="all">All statuses</option>
                <option value="waiting">Waiting</option>
                <option value="notified">Spot offered</option>
              </select>
              <span style={{ fontSize: 12, color: '#888' }}>
                {selectedCourse?.code} · {selectedCourse?.enrolled_count ?? 0}/{selectedCourse?.capacity ?? 0} enrolled
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => fetchEntries(selectedId, statusFilter)}
              >
                Refresh
              </button>
              <button
                className="instr-wl-btn instr-wl-btn--notify"
                onClick={handleNotifyNext}
                disabled={waiting === 0}
              >
                🔔 Notify next student
              </button>
            </div>
          </div>

          {/* Waitlist table */}
          <div className="instr-waitlist__card">
            <div className="instr-waitlist__card-meta">
              <span>
                {entriesLoading ? 'Loading…' : `${entries.length} student${entries.length !== 1 ? 's' : ''} on waitlist`}
              </span>
              <span style={{ fontSize: 11, color: '#aaa' }}>
                {selectedCourse?.title}
              </span>
            </div>

            {!entriesLoading && entries.length === 0 ? (
              <p className="instr-waitlist__empty">No students on the waitlist for this course.</p>
            ) : (
              <table className="instr-waitlist__table">
                <thead>
                  <tr>
                    <th style={{ width: '28%' }}>Student</th>
                    <th style={{ width: '8%'  }}>Position</th>
                    <th style={{ width: '14%' }}>Status</th>
                    <th style={{ width: '14%' }}>Joined</th>
                    <th style={{ width: '14%' }}>Notified at</th>
                    <th style={{ width: '22%' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map(entry => (
                    <tr key={entry.id}>
                      <td>
                        <div className="instr-wl-student">
                          <div className="instr-wl-avatar">{getInitials(entry.student_name)}</div>
                          <div>
                            <p className="instr-wl-name">{entry.student_name}</p>
                            <p className="instr-wl-email">{entry.student?.email ?? ''}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="instr-wl-position">{entry.position}</span>
                      </td>
                      <td>
                        <span className={statusClass(entry)}>{statusLabel(entry)}</span>
                      </td>
                      <td style={{ fontSize: 12, color: '#888' }}>
                        {new Date(entry.joined_at).toLocaleDateString()}
                      </td>
                      <td style={{ fontSize: 12, color: '#888' }}>
                        {entry.notified_at
                          ? new Date(entry.notified_at).toLocaleDateString()
                          : '—'}
                      </td>
                      <td>
                        <button
                          className="instr-wl-btn instr-wl-btn--enroll"
                          onClick={() => handleEnroll(entry)}
                          title="Directly enroll this student"
                        >
                          Enroll
                        </button>
                        {!entry.notified && (
                          <button
                            className="instr-wl-btn instr-wl-btn--notify"
                            onClick={handleNotifyNext}
                            title="Notify this student a spot is available"
                          >
                            Notify
                          </button>
                        )}
                        <button
                          className="instr-wl-btn instr-wl-btn--remove"
                          onClick={() => setRemoveTarget(entry)}
                          title="Remove from waitlist"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* Remove modal */}
      {removeTarget && (
        <RemoveModal
          entry={removeTarget}
          onConfirm={handleRemoveConfirm}
          onCancel={() => setRemoveTarget(null)}
        />
      )}
    </div>
  )
}