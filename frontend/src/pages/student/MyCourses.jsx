import { useEffect, useState, useCallback } from 'react'
import { getMyRegistrations, dropCourse } from '../../api/registration'
import StatCard from '../../components/StatCard'
import ProgressBar from '../../components/ProgressBar'

// ── Stripe colour by dept code ────────────────────────────────────────────────
const STRIPE_MAP = { CS: 'CSC', MATH: 'MTH', ENG: 'ENG', PHYS: 'PHY' }

function stripeClass(deptCode) {
  return `mc-card__stripe mc-card__stripe--${STRIPE_MAP[deptCode] || 'default'}`
}

function statusClass(status) {
  return `mc-status mc-status--${status}`
}

function getInitials(name = '') {
  return name.split(' ').filter(Boolean).slice(0, 2).map(n => n[0].toUpperCase()).join('')
}

// ── Drop confirmation modal ────────────────────────────────────────────────────
function DropModal({ registration, onConfirm, onCancel, dropping }) {
  const course = registration?.course_detail
  return (
    <div className="drop-modal-overlay" onClick={onCancel}>
      <div className="drop-modal" onClick={e => e.stopPropagation()}>
        <p className="drop-modal__icon">⚠️</p>
        <p className="drop-modal__title">Drop this course?</p>
        <p className="drop-modal__course">
          {course?.code} — {course?.title}
        </p>
        <div className="drop-modal__warning">
          Dropping a course removes your enrolment immediately.
          If the course is full, your spot will be offered to the next
          student on the waitlist. This action cannot be undone.
        </div>
        <div className="drop-modal__actions">
          <button className="drop-modal__cancel" onClick={onCancel}>
            Keep course
          </button>
          <button
            className="drop-modal__confirm"
            onClick={onConfirm}
            disabled={dropping}
          >
            {dropping ? 'Dropping…' : 'Yes, drop course'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Single course card ─────────────────────────────────────────────────────────
function CourseCard({ registration, onDropClick }) {
  const course   = registration.course_detail || {}
  const deptCode = course.department?.code || ''
  const status   = registration.status
  const progress = Math.floor(Math.random() * 55) + 20   // placeholder until grades API exists

  return (
    <div className="mc-card">
      {/* Coloured stripe */}
      <div className={stripeClass(deptCode)} />

      <div className="mc-card__body">
        {/* Header */}
        <div className="mc-card__header">
          <div style={{ flex: 1, minWidth: 0 }}>
            <p className="mc-card__code">{course.code}</p>
            <p className="mc-card__title">{course.title}</p>
          </div>
          <span className={statusClass(status)}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
        </div>

        {/* Meta details */}
        <div className="mc-card__meta">
          {course.instructor_name && (
            <div className="mc-card__meta-row">
              <span className="mc-card__meta-icon">👤</span>
              <span>{course.instructor_name}</span>
            </div>
          )}
          {course.schedule && (
            <div className="mc-card__meta-row">
              <span className="mc-card__meta-icon">🕐</span>
              <span>{course.schedule}</span>
            </div>
          )}
          {course.room && (
            <div className="mc-card__meta-row">
              <span className="mc-card__meta-icon">📍</span>
              <span>{course.room}</span>
            </div>
          )}
          <div className="mc-card__meta-row">
            <span className="mc-card__meta-icon">📅</span>
            <span>{registration.semester}</span>
          </div>
        </div>

        {/* Credits */}
        <span className="mc-card__credits">
          {course.credits} credit{course.credits !== 1 ? 's' : ''}
        </span>

        {/* Progress (shown only for enrolled) */}
        {status === 'enrolled' && (
          <div className="mc-card__progress">
            <div className="mc-card__progress-row">
              <span>Course progress</span>
              <span className="mc-card__progress-pct">{progress}%</span>
            </div>
            <ProgressBar value={progress} color="#534AB7" trackColor="#EEEDFE" height={5} />
          </div>
        )}

        {/* Registered date */}
        <div className="mc-card__meta-row" style={{ marginBottom: 12 }}>
          <span className="mc-card__meta-icon">✅</span>
          <span>Enrolled {new Date(registration.registered_at).toLocaleDateString()}</span>
        </div>

        {/* Footer actions */}
        <div className="mc-card__footer">
          <a
            href={`/student/catalog`}
            className="mc-card__btn mc-card__btn--view"
          >
            📖 View details
          </a>

          {status === 'enrolled' ? (
            <button
              className="mc-card__btn mc-card__btn--drop"
              onClick={() => onDropClick(registration)}
            >
              Drop course
            </button>
          ) : (
            <span className="mc-card__btn--dropped">
              {status === 'dropped' ? 'Dropped' : 'Completed'}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function MyCourses() {
  const [allRegistrations, setAllRegistrations] = useState([])
  const [loading,          setLoading]          = useState(true)
  const [semesters,        setSemesters]        = useState([])
  const [activeSemester,   setActiveSemester]   = useState('all')
  const [showHistory,      setShowHistory]      = useState(false)
  const [dropTarget,       setDropTarget]       = useState(null)
  const [dropping,         setDropping]         = useState(false)
  const [success,          setSuccess]          = useState('')
  const [error,            setError]            = useState('')

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getMyRegistrations()
      const list = Array.isArray(data) ? data : data.results ?? []
      setAllRegistrations(list)

      // Build sorted unique semesters, most recent first
      const semSet = [...new Set(list.map(r => r.semester).filter(Boolean))]
      setSemesters(semSet)

      // Default to the most common semester (current)
      if (semSet.length > 0 && activeSemester === 'all') {
        const freq = list.reduce((acc, r) => {
          acc[r.semester] = (acc[r.semester] || 0) + 1
          return acc
        }, {})
        const dominant = Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0]
        setActiveSemester(dominant || semSet[0])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  // ── Drop flow ────────────────────────────────────────────────────────────
  const handleDropConfirm = async () => {
    if (!dropTarget) return
    setDropping(true)
    setError('')
    try {
      await dropCourse(dropTarget.id)
      // Optimistically update local state
      setAllRegistrations(prev =>
        prev.map(r =>
          r.id === dropTarget.id
            ? { ...r, status: 'dropped', dropped_at: new Date().toISOString() }
            : r
        )
      )
      setSuccess(`Successfully dropped ${dropTarget.course_detail?.code}.`)
      setTimeout(() => setSuccess(''), 5000)
      setDropTarget(null)
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        'Failed to drop the course. Please try again.'
      )
    } finally {
      setDropping(false)
    }
  }

  // ── Derived state ────────────────────────────────────────────────────────
  const filtered = activeSemester === 'all'
    ? allRegistrations
    : allRegistrations.filter(r => r.semester === activeSemester)

  const enrolled   = filtered.filter(r => r.status === 'enrolled')
  const dropped    = filtered.filter(r => r.status === 'dropped')
  const completed  = filtered.filter(r => r.status === 'completed')

  // Current enrolled → shown by default; dropped/completed → shown in history
  const currentList = enrolled
  const historyList = [...dropped, ...completed]

  const totalCredits = enrolled.reduce((s, r) => s + (r.credits || 0), 0)

  return (
    <div className="my-courses">

      {/* Header */}
      <div className="my-courses__header">
        <div>
          <p className="page-title my-courses__title">My courses</p>
          <p className="page-subtitle my-courses__subtitle">
            Manage your enrolments and track your progress
          </p>
        </div>
        <a href="/student/catalog" className="btn btn-primary" style={{ fontSize: 13 }}>
          + Browse catalog
        </a>
      </div>

      {/* Banners */}
      {success && (
        <div className="info-banner" style={{ marginBottom: '1rem' }}>
          <span>✓ {success}</span>
        </div>
      )}
      {error && (
        <div className="error-banner" style={{ marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {/* Semester tabs */}
      {semesters.length > 1 && (
        <div className="my-courses__semester-tabs">
          {semesters.map(sem => (
            <button
              key={sem}
              className={`my-courses__semester-tab${activeSemester === sem ? ' active' : ''}`}
              onClick={() => setActiveSemester(sem)}
            >
              {sem}
            </button>
          ))}
        </div>
      )}

      {/* KPIs */}
      <div className="my-courses__kpis">
        <StatCard
          label="Enrolled"
          value={enrolled.length}
          badge="active courses"
          badgeColor="purple"
          borderColor="#CECBF6"
        />
        <StatCard
          label="Credits"
          value={totalCredits}
          badge="of 24 max"
          badgeColor="green"
          borderColor="#CECBF6"
        />
        <StatCard
          label="Dropped"
          value={dropped.length}
          badge="this semester"
          badgeColor="red"
          borderColor="#CECBF6"
        />
        <StatCard
          label="Completed"
          value={completed.length}
          badge="past semesters"
          badgeColor="blue"
          borderColor="#CECBF6"
        />
      </div>

      {/* Enrolled courses grid */}
      {loading ? (
        <div className="my-courses__grid">
          <div className="my-courses__empty">
            <p className="my-courses__empty-sub">Loading your courses…</p>
          </div>
        </div>
      ) : currentList.length === 0 ? (
        <div className="my-courses__grid">
          <div className="my-courses__empty">
            <p className="my-courses__empty-icon">📚</p>
            <p className="my-courses__empty-title">No active enrolments</p>
            <p className="my-courses__empty-sub">
              You haven't enrolled in any courses for {activeSemester} yet.
            </p>
            <a href="/student/catalog" className="my-courses__empty-link">
              Browse courses
            </a>
          </div>
        </div>
      ) : (
        <div className="my-courses__grid">
          {currentList.map(reg => (
            <CourseCard
              key={reg.id}
              registration={reg}
              onDropClick={setDropTarget}
            />
          ))}
        </div>
      )}

      {/* Dropped / Completed history */}
      {historyList.length > 0 && (
        <>
          <button
            className="my-courses__history-toggle"
            onClick={() => setShowHistory(h => !h)}
          >
            <span className="my-courses__history-label">
              Course history ({historyList.length})
            </span>
            <span className="my-courses__history-chevron">
              {showHistory ? '▲' : '▼'}
            </span>
          </button>

          {showHistory && (
            <div className="my-courses__grid">
              {historyList.map(reg => (
                <CourseCard
                  key={reg.id}
                  registration={reg}
                  onDropClick={setDropTarget}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Drop confirmation modal */}
      {dropTarget && (
        <DropModal
          registration={dropTarget}
          onConfirm={handleDropConfirm}
          onCancel={() => { setDropTarget(null); setError('') }}
          dropping={dropping}
        />
      )}
    </div>
  )
}