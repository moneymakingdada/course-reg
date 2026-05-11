import { useEffect, useState, useCallback } from 'react'
import {
  getAllWaitlists, getCourseWaitlist,
  notifyNextStudent, notifyAllStudents,
  removeFromWaitlist, enrollFromWaitlist,
  clearCourseWaitlist,
} from '../../api/waitlist'
import { getCourses } from '../../api/courses'
import StatCard from '../../components/StatCard'

function getInitials(name = '') {
  return name.split(' ').filter(Boolean).slice(0, 2).map(n => n[0].toUpperCase()).join('')
}

function statusClass(entry) {
  if (entry.accepted) return 'wl-status wl-status--accepted'
  if (entry.notified) return 'wl-status wl-status--notified'
  return 'wl-status wl-status--waiting'
}

function statusLabel(entry) {
  if (entry.accepted) return 'Accepted'
  if (entry.notified) return 'Spot offered'
  return 'Waiting'
}

// ── Modals ────────────────────────────────────────────────────────────────────

function RemoveModal({ entry, onConfirm, onCancel }) {
  const [reason, setReason] = useState('')
  return (
    <div className="remove-modal-overlay">
      <div className="remove-modal">
        <p className="remove-modal__title">Remove from waitlist</p>
        <p className="remove-modal__sub">
          Remove <strong>{entry.student_name}</strong> from{' '}
          <strong>{entry.course_detail?.code}</strong>? A notification will be sent.
        </p>
        <textarea
          className="remove-modal__textarea"
          placeholder="Optional reason (sent to student)…"
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

function ClearModal({ course, onConfirm, onCancel }) {
  const [reason, setReason] = useState('')
  return (
    <div className="remove-modal-overlay">
      <div className="remove-modal">
        <p className="remove-modal__title">Clear entire waitlist</p>
        <p className="remove-modal__sub">
          This will remove <strong>all students</strong> from the{' '}
          <strong>{course?.code}</strong> waitlist and notify each of them.
          This cannot be undone.
        </p>
        <textarea
          className="remove-modal__textarea"
          placeholder="Reason (sent to all removed students)…"
          value={reason}
          onChange={e => setReason(e.target.value)}
        />
        <div className="remove-modal__actions">
          <button className="remove-modal__cancel" onClick={onCancel}>Cancel</button>
          <button
            className="remove-modal__confirm"
            style={{ background: 'var(--color-danger-text)' }}
            onClick={() => onConfirm(reason)}
          >
            Clear waitlist
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminWaitlist() {
  const [allEntries,    setAllEntries]    = useState([])
  const [courses,       setCourses]       = useState([])
  const [selectedId,    setSelectedId]    = useState(null)
  const [entries,       setEntries]       = useState([])
  const [statusFilter,  setStatusFilter]  = useState('all')
  const [semesterFilter, setSemesterFilter] = useState('')
  const [loading,       setLoading]       = useState(true)
  const [entriesLoad,   setEntriesLoad]   = useState(false)
  const [success,       setSuccess]       = useState('')
  const [error,         setError]         = useState('')
  const [removeTarget,  setRemoveTarget]  = useState(null)
  const [clearTarget,   setClearTarget]   = useState(null)

  // ── Load all waitlist entries + unique courses on mount ──────────────────
  useEffect(() => {
    setLoading(true)
    getAllWaitlists()
      .then(data => {
        const list = Array.isArray(data) ? data : data.results ?? []
        setAllEntries(list)

        // Build unique course list from entries
        const seen = new Map()
        list.forEach(e => {
          const c = e.course_detail
          if (c && !seen.has(c.id)) seen.set(c.id, c)
        })
        const courseList = [...seen.values()]
        setCourses(courseList)
        if (courseList.length > 0) setSelectedId(courseList[0].id)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  // ── Load per-course waitlist when selection changes ──────────────────────
  const fetchCourseEntries = useCallback(async (courseId, filter) => {
    if (!courseId) return
    setEntriesLoad(true)
    try {
      const params = filter !== 'all' ? { status: filter } : {}
      const data   = await getCourseWaitlist(courseId, params)
      setEntries(Array.isArray(data) ? data : data.results ?? [])
    } catch { setEntries([]) }
    finally { setEntriesLoad(false) }
  }, [])

  useEffect(() => {
    fetchCourseEntries(selectedId, statusFilter)
  }, [selectedId, statusFilter, fetchCourseEntries])

  // ── Flash helpers ────────────────────────────────────────────────────────
  const flash = (msg, isError = false) => {
    if (isError) { setError(msg);   setTimeout(() => setError(''),   4000) }
    else         { setSuccess(msg); setTimeout(() => setSuccess(''), 4000) }
  }

  // ── Actions ──────────────────────────────────────────────────────────────
  const handleNotifyNext = async () => {
    try {
      const res = await notifyNextStudent(selectedId)
      flash(res.detail || 'Next student notified.')
      fetchCourseEntries(selectedId, statusFilter)
    } catch (err) {
      flash(err.response?.data?.detail || 'Failed to notify.', true)
    }
  }

  const handleNotifyAll = async () => {
    if (!window.confirm('Notify all waiting students simultaneously? This bypasses the normal queue.')) return
    try {
      const res = await notifyAllStudents(selectedId)
      flash(res.detail || 'All students notified.')
      fetchCourseEntries(selectedId, statusFilter)
    } catch (err) {
      flash(err.response?.data?.detail || 'Failed.', true)
    }
  }

  const handleEnroll = async (entry) => {
    if (!window.confirm(`Directly enroll ${entry.student_name}? This skips the accept flow.`)) return
    try {
      const res = await enrollFromWaitlist(selectedId, entry.id)
      flash(res.detail || 'Student enrolled.')
      fetchCourseEntries(selectedId, statusFilter)
    } catch (err) {
      flash(err.response?.data?.detail || 'Failed to enroll.', true)
    }
  }

  const handleRemoveConfirm = async (reason) => {
    try {
      const res = await removeFromWaitlist(selectedId, removeTarget.id, reason)
      flash(res.detail || 'Student removed.')
      setRemoveTarget(null)
      fetchCourseEntries(selectedId, statusFilter)
    } catch (err) {
      flash(err.response?.data?.detail || 'Failed to remove.', true)
      setRemoveTarget(null)
    }
  }

  const handleClearConfirm = async (reason) => {
    try {
      const res = await clearCourseWaitlist(selectedId, reason)
      flash(res.detail || 'Waitlist cleared.')
      setClearTarget(null)
      setEntries([])
      fetchCourseEntries(selectedId, statusFilter)
    } catch (err) {
      flash(err.response?.data?.detail || 'Failed to clear.', true)
      setClearTarget(null)
    }
  }

  // ── Derived stats ────────────────────────────────────────────────────────
  const totalWaiting  = allEntries.filter(e => !e.notified).length
  const totalNotified = allEntries.filter(e => e.notified && !e.accepted).length
  const totalAccepted = allEntries.filter(e => e.accepted).length
  const selectedCourse = courses.find(c => c.id === selectedId)

  // Unique semesters for filter
  const semesters = [...new Set(allEntries.map(e => e.semester).filter(Boolean))]

  const filteredBySemester = semesterFilter
    ? entries.filter(e => e.semester === semesterFilter)
    : entries

  return (
    <div className="admin-waitlist">
      <div className="admin-waitlist__header">
        <div>
          <p className="page-title admin-waitlist__title">Waitlist management</p>
          <p className="page-subtitle admin-waitlist__subtitle">
            Monitor and manage student waitlists across all courses
          </p>
        </div>
      </div>

      {/* Banners */}
      {success && <div className="info-banner" style={{ marginBottom: '1rem' }}><span>✓ {success}</span></div>}
      {error   && <div className="error-banner" style={{ marginBottom: '1rem' }}>{error}</div>}

      {/* KPIs */}
      <div className="kpi-grid" style={{ marginBottom: '1.25rem' }}>
        <StatCard label="Total waitlisted" value={allEntries.length} badge="all courses"    badgeColor="amber" borderColor="#FAC775" />
        <StatCard label="Waiting"          value={totalWaiting}      badge="not yet notified" badgeColor="amber" borderColor="#FAC775" />
        <StatCard label="Spot offered"     value={totalNotified}     badge="pending accept" badgeColor="teal"  borderColor="#FAC775" />
        <StatCard label="Accepted"         value={totalAccepted}     badge="enrolled"       badgeColor="green" borderColor="#FAC775" />
      </div>

      {loading ? (
        <p className="instr-waitlist__empty">Loading waitlists…</p>
      ) : courses.length === 0 ? (
        <div className="instr-waitlist__card">
          <p className="instr-waitlist__empty">No waitlisted students across any course.</p>
        </div>
      ) : (
        <>
          {/* Course tabs */}
          <div className="instr-waitlist__course-tabs">
            {courses.map(course => {
              const count = allEntries.filter(
                e => e.course_detail?.id === course.id && e.is_active
              ).length
              return (
                <button
                  key={course.id}
                  className={`instr-waitlist__course-tab${selectedId === course.id ? ' active' : ''}`}
                  onClick={() => setSelectedId(course.id)}
                >
                  {course.code}
                  {count > 0 && (
                    <span className="instr-waitlist__course-tab-badge">{count}</span>
                  )}
                </button>
              )
            })}
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
              {semesters.length > 1 && (
                <select
                  className="instr-waitlist__filter-select"
                  value={semesterFilter}
                  onChange={e => setSemesterFilter(e.target.value)}
                >
                  <option value="">All semesters</option>
                  {semesters.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              )}
              <span className="instr-waitlist__course-info">
                {selectedCourse?.code} · {selectedCourse?.enrolled_count ?? 0}/{selectedCourse?.capacity ?? 0} enrolled
              </span>
            </div>

            <div className="instr-waitlist__action-bar-right">
              <button
                className="btn btn-outline btn-sm"
                onClick={() => fetchCourseEntries(selectedId, statusFilter)}
              >
                Refresh
              </button>
              <button
                className="instr-wl-btn instr-wl-btn--notify"
                onClick={handleNotifyNext}
                disabled={filteredBySemester.filter(e => !e.notified).length === 0}
              >
                🔔 Notify next
              </button>
              <button
                className="instr-wl-btn instr-wl-btn--notify-all"
                onClick={handleNotifyAll}
                disabled={filteredBySemester.filter(e => !e.notified).length === 0}
              >
                📣 Notify all
              </button>
              <button
                className="instr-wl-btn instr-wl-btn--clear"
                onClick={() => setClearTarget(selectedCourse)}
                disabled={filteredBySemester.length === 0}
              >
                🗑 Clear list
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="instr-waitlist__card">
            <div className="instr-waitlist__card-meta">
              <span>
                {entriesLoad
                  ? 'Loading…'
                  : `${filteredBySemester.length} student${filteredBySemester.length !== 1 ? 's' : ''}`}
              </span>
              <span className="instr-waitlist__card-course">{selectedCourse?.title}</span>
            </div>

            {!entriesLoad && filteredBySemester.length === 0 ? (
              <p className="instr-waitlist__empty">No students match the current filter.</p>
            ) : (
              <table className="instr-waitlist__table">
                <thead>
                  <tr>
                    <th style={{ width: '22%' }}>Student</th>
                    <th style={{ width: '7%'  }}>Pos.</th>
                    <th style={{ width: '13%' }}>Status</th>
                    <th style={{ width: '13%' }}>Semester</th>
                    <th style={{ width: '12%' }}>Joined</th>
                    <th style={{ width: '13%' }}>Notified</th>
                    <th style={{ width: '20%' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBySemester.map(entry => (
                    <tr key={entry.id}>
                      <td>
                        <div className="instr-wl-student">
                          <div className="instr-wl-avatar">
                            {getInitials(entry.student_name)}
                          </div>
                          <div>
                            <p className="instr-wl-name">{entry.student_name}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="instr-wl-position">{entry.position}</span>
                      </td>
                      <td>
                        <span className={statusClass(entry)}>{statusLabel(entry)}</span>
                      </td>
                      <td style={{ fontSize: 12, color: '#888' }}>{entry.semester}</td>
                      <td style={{ fontSize: 12, color: '#888' }}>
                        {new Date(entry.joined_at).toLocaleDateString()}
                      </td>
                      <td style={{ fontSize: 12, color: '#888' }}>
                        {entry.notified_at
                          ? new Date(entry.notified_at).toLocaleDateString()
                          : '—'}
                      </td>
                      <td>
                        {!entry.accepted && (
                          <button
                            className="instr-wl-btn instr-wl-btn--enroll"
                            onClick={() => handleEnroll(entry)}
                          >
                            Enroll
                          </button>
                        )}
                        {!entry.notified && !entry.accepted && (
                          <button
                            className="instr-wl-btn instr-wl-btn--notify"
                            onClick={handleNotifyNext}
                          >
                            Notify
                          </button>
                        )}
                        <button
                          className="instr-wl-btn instr-wl-btn--remove"
                          onClick={() => setRemoveTarget(entry)}
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

      {removeTarget && (
        <RemoveModal
          entry={removeTarget}
          onConfirm={handleRemoveConfirm}
          onCancel={() => setRemoveTarget(null)}
        />
      )}
      {clearTarget && (
        <ClearModal
          course={clearTarget}
          onConfirm={handleClearConfirm}
          onCancel={() => setClearTarget(null)}
        />
      )}
    </div>
  )
}