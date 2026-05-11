import { useEffect, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { getMyCourses, createCourse, updateCourse, deleteCourse, getDepartments } from '../../api/courses'
import { getCourseRoster } from '../../api/registration'
import StatCard from '../../components/StatCard'
import ProgressBar from '../../components/ProgressBar'


const EMPTY_FORM = {
  code: '', title: '', description: '', credits: 3, level: 300,
  department: '', capacity: 40, schedule: '', room: '', semester: '2025/2026 S2',
}

const LEVELS   = [100, 200, 300, 400, 500]
const CREDITS  = [1, 2, 3, 4, 6]

export default function CourseManagement() {
  const { user }                           = useAuth()
  const [courses,      setCourses]         = useState([])
  const [loading,      setLoading]         = useState(true)
  const [showForm,     setShowForm]        = useState(false)
  const [editCourse,   setEditCourse]      = useState(null)   // null = add mode
  const [form,         setForm]            = useState(EMPTY_FORM)
  const [saving,       setSaving]          = useState(false)
  const [error,        setError]           = useState('')
  const [success,      setSuccess]         = useState('')
  const [rosterView,   setRosterView]      = useState(null)   // course object
  const [roster,       setRoster]          = useState([])
  const [rosterLoad,   setRosterLoad]      = useState(false)

  // ── NEW: department list for the dropdown ──────────────────────────────────
  const [departments,     setDepartments]  = useState([])
  const [deptLoading,     setDeptLoading]  = useState(false)
  // ──────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    fetchCourses()
    fetchDepartments()   // load once on mount
  }, [])

  const fetchCourses = () => {
    setLoading(true)
    getMyCourses()
      .then((d) => setCourses(Array.isArray(d) ? d : d.results ?? []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  // ── NEW ───────────────────────────────────────────────────────────────────
  const fetchDepartments = () => {
    setDeptLoading(true)
    getDepartments()
      .then((d) => setDepartments(Array.isArray(d) ? d : d.results ?? []))
      .catch(console.error)
      .finally(() => setDeptLoading(false))
  }
  // ──────────────────────────────────────────────────────────────────────────

  const openAdd = () => {
    setEditCourse(null)
    setForm(EMPTY_FORM)
    setError('')
    setShowForm(true)
    setRosterView(null)
  }

  const openEdit = (course) => {
    setEditCourse(course)
    setForm({
      code:        course.code,
      title:       course.title,
      description: course.description || '',
      credits:     course.credits,
      level:       course.level,
      department:  course.department?.id || '',   // store the PK
      capacity:    course.capacity,
      schedule:    course.schedule || '',
      room:        course.room || '',
      semester:    course.semester,
    })
    setError('')
    setShowForm(true)
    setRosterView(null)
  }

  const openRoster = (course) => {
    setRosterView(course)
    setShowForm(false)
    setRosterLoad(true)
    getCourseRoster(course.id)
      .then((d) => setRoster(Array.isArray(d) ? d : d.results ?? []))
      .catch(console.error)
      .finally(() => setRosterLoad(false))
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const payload = {
        ...form,
        instructor: user.id,
        department: form.department ? Number(form.department) : null,
        credits:    Number(form.credits || 0),
        level:      Number(form.level || 0),
        capacity:   Number(form.capacity || 0),
      }
      if (editCourse) {
        await updateCourse(editCourse.id, payload)
        setSuccess(`${form.code} updated successfully.`)
      } else {
        await createCourse(payload)
        setSuccess(`${form.code} created successfully.`)
      }
      setShowForm(false)
      fetchCourses()
      setTimeout(() => setSuccess(''), 4000)
    } catch (err) {
      const d = err.response?.data
      setError(
        typeof d === 'object'
          ? Object.entries(d).map(([k, v]) => `${k}: ${[v].flat().join(' ')}`).join(' · ')
          : 'Failed to save course.'
      )
    } finally {
      setSaving(false)
    }
  }

  const handleDeactivate = async (course) => {
    if (!window.confirm(`Deactivate ${course.code}? Students will no longer see it.`)) return
    try {
      await deleteCourse(course.id)
      setSuccess(`${course.code} deactivated.`)
      fetchCourses()
      setTimeout(() => setSuccess(''), 4000)
    } catch {
      setError('Failed to deactivate course.')
    }
  }

  const totalStudents = courses.reduce((s, c) => s + (c.enrolled_count ?? 0), 0)
  const totalWaitlist = courses.reduce((s, c) => s + (c.waitlist_count ?? 0), 0)
  const avgFill = courses.length
    ? Math.round(courses.reduce((s, c) => s + ((c.enrolled_count ?? 0) / (c.capacity || 1)) * 100, 0) / courses.length)
    : 0

  return (
    <div className="course-mgmt">

      {/* Header */}
      <div className="course-mgmt__header">
        <div>
          <p className="page-title course-mgmt__title">Course management</p>
          <p className="page-subtitle course-mgmt__subtitle">
            Manage your courses, rosters and schedules
          </p>
        </div>
        <button className="btn btn-teal" onClick={openAdd}>+ Add new course</button>
      </div>

      {/* Success / error banners */}
      {success && <div className="info-banner"><span>{success}</span></div>}
      {error   && !showForm && <div className="error-banner">{error}</div>}

      {/* KPIs */}
      <div className="kpi-grid" style={{ marginBottom: '1.25rem' }}>
        <StatCard label="My courses"     value={courses.length} badge="active"            badgeColor="teal"  borderColor="#9FE1CB" />
        <StatCard label="Total enrolled" value={totalStudents}  badge="across all courses" badgeColor="teal"  borderColor="#9FE1CB" />
        <StatCard label="Waitlisted"     value={totalWaitlist}  badge="pending"            badgeColor="amber" borderColor="#9FE1CB" />
        <StatCard label="Avg. fill rate" value={`${avgFill}%`} badge="this semester"      badgeColor="green" borderColor="#9FE1CB" />
      </div>

      {/* ── Add / Edit form ── */}
      {showForm && (
        <div className="course-form-panel">
          <p className="course-form-panel__title">
            {editCourse ? `Edit — ${editCourse.code}` : 'Add new course'}
          </p>

          {error && <div className="error-banner">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="course-form__grid">
              <div>
                <label className="course-form__label">Course code</label>
                <input className="course-form__input" name="code" value={form.code} onChange={handleChange} placeholder="e.g. CSC301" required />
              </div>
              <div>
                <label className="course-form__label">Course title</label>
                <input className="course-form__input" name="title" value={form.title} onChange={handleChange} placeholder="e.g. Data Structures" required />
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label className="course-form__label">Description</label>
              <textarea className="course-form__textarea" name="description" value={form.description} onChange={handleChange} placeholder="Brief course description…" />
            </div>

            <div className="course-form__grid-3">
              <div>
                <label className="course-form__label">Level</label>
                <select className="course-form__select" name="level" value={form.level} onChange={handleChange}>
                  {LEVELS.map((l) => <option key={l} value={l}>{l} level</option>)}
                </select>
              </div>
              <div>
                <label className="course-form__label">Credits</label>
                <select className="course-form__select" name="credits" value={form.credits} onChange={handleChange}>
                  {CREDITS.map((c) => <option key={c} value={c}>{c} credit{c !== 1 ? 's' : ''}</option>)}
                </select>
              </div>
              <div>
                <label className="course-form__label">Capacity</label>
                <input className="course-form__input" name="capacity" type="number" min="1" max="200" value={form.capacity} onChange={handleChange} required />
              </div>
            </div>

            <div className="course-form__grid">
              <div>
                <label className="course-form__label">Schedule</label>
                <input className="course-form__input" name="schedule" value={form.schedule} onChange={handleChange} placeholder="e.g. MWF 8:00–9:00am" />
              </div>
              <div>
                <label className="course-form__label">Room</label>
                <input className="course-form__input" name="room" value={form.room} onChange={handleChange} placeholder="e.g. Lecture Hall A" />
              </div>
            </div>

            <div className="course-form__grid">
              <div>
                <label className="course-form__label">Semester</label>
                <input className="course-form__input" name="semester" value={form.semester} onChange={handleChange} placeholder="e.g. 2025/2026 S2" required />
              </div>

              {/* ── CHANGED: free-text input → populated select ── */}
              <div>
                <label className="course-form__label">Department</label>
                {deptLoading ? (
                  <p style={{ fontSize: 12, color: '#aaa', marginTop: 6 }}>Loading departments…</p>
                ) : (
                  <select
                    className="course-form__select"
                    name="department"
                    value={form.department}
                    onChange={handleChange}
                  >
                    <option value="">— No department —</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}{dept.code ? ` (${dept.code})` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              {/* ─────────────────────────────────────────────── */}
            </div>

            <div className="course-form__actions">
              <button type="button" className="course-form__btn-cancel" onClick={() => setShowForm(false)}>
                Cancel
              </button>
              <button type="submit" className="course-form__btn-submit" disabled={saving}>
                {saving ? 'Saving…' : editCourse ? 'Save changes' : 'Create course'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Courses grid ── */}
      {loading ? (
        <p className="student-empty">Loading courses…</p>
      ) : courses.length === 0 ? (
        <div className="student-card" style={{ textAlign: 'center', padding: '2rem' }}>
          <p className="student-empty">No courses yet. Click <strong>Add new course</strong> to get started.</p>
        </div>
      ) : (
        <div className="course-mgmt__grid">
          {courses.map((course) => {
            const fill    = course.capacity > 0 ? Math.round(((course.enrolled_count ?? 0) / course.capacity) * 100) : 0
            const isFull  = (course.enrolled_count ?? 0) >= course.capacity
            const isNear  = fill >= 80 && !isFull
            const barClass = isFull ? 'course-mgmt-card__bar-fill course-mgmt-card__bar-fill--full'
              : isNear ? 'course-mgmt-card__bar-fill course-mgmt-card__bar-fill--near'
              : 'course-mgmt-card__bar-fill'

            return (
              <div key={course.id} className="course-mgmt-card">
                <div className="course-mgmt-card__header">
                  <div>
                    <p className="course-mgmt-card__code">{course.code}</p>
                    <p className="course-mgmt-card__title">{course.title}</p>
                  </div>
                  <span className={`course-status ${isFull ? 'course-status--full' : course.is_active ? 'course-status--active' : 'course-status--inactive'}`}>
                    {isFull ? 'Full' : course.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <p className="course-mgmt-card__meta">
                  {course.schedule} · {course.room || 'No room'} · {course.credits} credits
                </p>

                <div className="course-mgmt-card__fill">
                  <div className="course-mgmt-card__fill-row">
                    <span>{course.enrolled_count ?? 0} / {course.capacity} enrolled</span>
                    <span>{fill}%</span>
                  </div>
                  <div className="course-mgmt-card__bar-track">
                    <div className={barClass} style={{ width: `${fill}%` }} />
                  </div>
                </div>

                {(course.waitlist_count ?? 0) > 0 && (
                  <p className="course-mgmt-card__meta" style={{ color: 'var(--color-warning-text)' }}>
                    {course.waitlist_count} on waitlist
                  </p>
                )}

                <div className="course-mgmt-card__actions">
                  <button className="instructor-roster__btn" onClick={() => openRoster(course)}>
                    View roster
                  </button>
                  <button className="instructor-roster__btn" onClick={() => openEdit(course)}>
                    Edit
                  </button>
                  <button
                    className="instructor-roster__btn"
                    style={{ color: 'var(--color-danger-text)', borderColor: 'var(--color-danger)' }}
                    onClick={() => handleDeactivate(course)}
                  >
                    Deactivate
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Roster panel ── */}
      {rosterView && (
        <div className="instructor-roster" style={{ marginTop: '1rem' }}>
          <div className="instructor-roster__header">
            <div>
              <p className="instructor-roster__title">
                {rosterView.code} — {rosterView.title} · Roster
              </p>
              <p className="instructor-roster__subtitle">
                {rosterView.enrolled_count ?? 0} enrolled · {rosterView.waitlist_count ?? 0} waitlisted
              </p>
            </div>
            <div className="instructor-roster__actions">
              <button className="instructor-roster__btn">Export CSV</button>
              <button className="instructor-roster__btn">Email all</button>
              <button className="instructor-roster__btn" onClick={() => setRosterView(null)}>
                Close ✕
              </button>
            </div>
          </div>

          {rosterLoad ? (
            <p style={{ padding: 20, color: '#aaa', fontSize: 13 }}>Loading roster…</p>
          ) : (
            <table className="instructor-table">
              <thead>
                <tr>
                  {['Student', 'Status', 'Registered', 'Credits', 'Actions'].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {roster.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="instructor-table__empty">No students enrolled yet.</td>
                  </tr>
                ) : roster.map((reg) => (
                  <tr key={reg.id}>
                    <td>
                      <div className="instructor-table__student">
                        <div className="instructor-table__avatar">
                          {reg.student_name?.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                        </div>
                        <p className="instructor-table__name">{reg.student_name}</p>
                      </div>
                    </td>
                    <td className="instructor-table__status">{reg.status}</td>
                    <td style={{ fontSize: 12, color: '#888' }}>
                      {new Date(reg.registered_at).toLocaleDateString()}
                    </td>
                    <td style={{ fontSize: 12 }}>{reg.credits}</td>
                    <td>
                      <button className="instructor-table__btn">Email</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}