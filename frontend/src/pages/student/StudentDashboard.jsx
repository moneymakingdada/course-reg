import { useEffect, useState, useContext } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { CourseContext } from '../../context/CourseContext'
import { getMyRegistrations } from '../../api/registration'
import StatCard from '../../components/StatCard'
import ProgressBar from '../../components/ProgressBar'


const DEADLINES = [
  { day: 12, month: 'May', title: 'CSC 301 — Assignment 3',   sub: 'Linked lists & trees' },
  { day: 15, month: 'May', title: 'MTH 201 — Midterm exam', sub: 'Hall B, 9:00am' },
  { day: 18, month: 'May', title: 'ENG 102 — Essay draft',   sub: 'Submit via portal' },
  { day: 20, month: 'May', title: 'Registration deadline',   sub: 'Add/drop period ends' },
]

export default function StudentDashboard() {
  const { user }                          = useAuth()
  const { fetchEnrollments, setSemester } = useContext(CourseContext)

  const [registrations, setRegistrations] = useState([])
  const [activeSemester, setActiveSemester] = useState('')
  const [loading,       setLoading]       = useState(true)

  useEffect(() => {
    // Fetch ALL enrolled registrations — no semester filter
    // The most-recent semester is derived from the data itself
    getMyRegistrations({ status: 'enrolled' })
      .then((d) => {
        const list = Array.isArray(d) ? d : d.results || []
        setRegistrations(list)

        // Derive the active semester from the most recent registration
        if (list.length > 0) {
          // Pick the semester that appears most frequently
          const freq = list.reduce((acc, r) => {
            acc[r.semester] = (acc[r.semester] || 0) + 1
            return acc
          }, {})
          const dominant = Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] || ''
          setActiveSemester(dominant)
          setSemester(dominant)           // share with CourseContext
          fetchEnrollments(dominant)      // sync context enrollments
        } else {
          fetchEnrollments()              // no filter — returns empty gracefully
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const totalCredits = registrations.reduce((s, r) => s + (r.credits || 0), 0)

  // Split into current-semester and other enrollments
  const currentRegs = activeSemester
    ? registrations.filter(r => r.semester === activeSemester)
    : registrations

  return (
    <div className="student-dash">
      <p className="page-title student-dash__title">
        Welcome Back, {user?.first_name}
      </p>
      <p className="page-subtitle student-dash__subtitle">
        {activeSemester
          ? `${activeSemester} · Active semester`
          : 'No active enrollments yet'}
      </p>

      {/* KPIs */}
      <div className="kpi-grid">
        <StatCard
          label="Enrolled"
          value={currentRegs.length}
          badge="courses"
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
          label="Waitlisted"
          value={2}
          badge="pending"
          badgeColor="amber"
          borderColor="#CECBF6"
        />
        <StatCard
          label="GPA"
          value={user?.student_profile?.gpa || '—'}
          badge="good standing"
          badgeColor="green"
          borderColor="#CECBF6"
        />
      </div>

      <div className="two-col">
        {/* Enrolled courses */}
        <div className="student-card">
          <p className="student-card__label">Enrolled courses</p>

          {loading ? (
            <p className="student-empty">Loading…</p>
          ) : currentRegs.length === 0 ? (
            <p className="student-empty">
              No enrollments yet.{' '}
              <a href="/student/catalog" className="student-link">
                Browse courses
              </a>
            </p>
          ) : (
            currentRegs.map((reg) => (
              <div key={reg.id} className="enrolled-item">
                <div className="enrolled-item__info">
                  <p className="enrolled-item__name">
                    {reg.course_detail?.code} — {reg.course_detail?.title}
                  </p>
                  <p className="enrolled-item__meta">
                    {reg.course_detail?.instructor_name}
                    {reg.course_detail?.schedule ? ` · ${reg.course_detail.schedule}` : ''}
                  </p>
                  <ProgressBar
                    value={Math.floor(Math.random() * 60) + 20}
                    color="#534AB7"
                    trackColor="#EEEDFE"
                  />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Deadlines */}
        <div className="student-card">
          <p className="student-card__label">Upcoming deadlines</p>

          {DEADLINES.map((d, i) => (
            <div key={i} className="deadline-item">
              <div className="deadline-item__date">
                <span className="deadline-item__day">{d.day}</span>
                <span className="deadline-item__month">{d.month}</span>
              </div>
              <div>
                <p className="deadline-item__title">{d.title}</p>
                <p className="deadline-item__sub">{d.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}