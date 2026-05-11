import { useEffect, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { getMyCourses } from '../../api/courses'
import { getCourseRoster } from '../../api/registration'
import StatCard from '../../components/StatCard'


export default function InstructorDashboard() {
  const { user } = useAuth()

  const [courses, setCourses] = useState([])
  const [selected, setSelected] = useState(null)
  const [roster, setRoster] = useState([])
  const [loading, setLoading] = useState(true)
  const [rosterLoading, setRosterLoading] = useState(false)

  useEffect(() => {
    getMyCourses()
      .then((d) => {
        const list = Array.isArray(d) ? d : d.results || []
        setCourses(list)
        if (list.length > 0) setSelected(list[0])
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selected) return
    setRosterLoading(true)
    getCourseRoster(selected.id)
      .then((d) => setRoster(Array.isArray(d) ? d : d.results || []))
      .catch(console.error)
      .finally(() => setRosterLoading(false))
  }, [selected])

  const totalStudents = courses.reduce(
    (s, c) => s + (c.enrolled_count || 0),
    0
  )

  const gradeClass = (g) => {
    if (!g || g === '—') return 'grade-pill--none'
    if (g.startsWith('A')) return 'grade-pill--A'
    if (g.startsWith('B')) return 'grade-pill--B'
    if (g.startsWith('C')) return 'grade-pill--C'
    return 'grade-pill--F'
  }

  return (
    <div
      className="instructor-dash"
      style={{
        '--bg': '#F0FBF7',
        '--sidebar': '#085041',
        '--sidebar-text': '#5DCAA5',
        '--sidebar-light': '#E1F5EE',
        '--accent': '#9FE1CB',
        '--title': '#04342C',
        '--subtitle': '#0F6E56',
        '--border': '#9FE1CB',
        '--row': '#E1F5EE',
      }}
    >
      {/* Sidebar */}
      <aside className="instructor-dash__sidebar">
        <p className="instructor-dash__sidebar-label">My courses</p>

        {courses.map((c) => (
          <div
            key={c.id}
            onClick={() => setSelected(c)}
            className={`instructor-dash__sidebar-item ${
              selected?.id === c.id ? 'active' : ''
            }`}
          >
            <p className="instructor-dash__course-code">{c.code}</p>
            <p className="instructor-dash__course-sub">
              {c.title?.substring(0, 22)}…
            </p>
          </div>
        ))}
      </aside>

      {/* Main */}
      <main className="instructor-dash__main">
        {/* Header */}
        <p className="instructor-dash__title">
          Welcome back, {user?.instructor_profile?.title || 'Dr.'}{' '}
          {user?.last_name}
        </p>

        <p className="instructor-dash__subtitle">
          2025/2026 S2 · {courses.length} active course
          {courses.length !== 1 ? 's' : ''} · Grades due in 12 days
        </p>

        {/* KPI Cards */}
        <div className="instructor-dash__stats">
          <StatCard
            label="Total students"
            value={totalStudents}
            badge={`across ${courses.length} courses`}
            badgeColor="teal"
            borderColor="#9FE1CB"
          />
          <StatCard
            label="Waitlisted"
            value={14}
            badge="pending"
            badgeColor="amber"
            borderColor="#9FE1CB"
          />
          <StatCard
            label="Avg. attendance"
            value="84%"
            badge="this week"
            badgeColor="teal"
            borderColor="#9FE1CB"
          />
          <StatCard
            label="Avg. grade"
            value="B+"
            badge="semester avg"
            badgeColor="green"
            borderColor="#9FE1CB"
          />
        </div>

        {/* Roster */}
        {selected && (
          <div className="instructor-roster">
            {/* Header */}
            <div className="instructor-roster__header">
              <div>
                <p className="instructor-roster__title">
                  {selected.code} — {selected.title}
                </p>
                <p className="instructor-roster__subtitle">
                  {selected.schedule} · {selected.room} ·{' '}
                  {selected.credits} credits
                </p>
              </div>

              <div className="instructor-roster__actions">
                <button className="instructor-btn">Export</button>
                <button className="instructor-btn">Email all</button>
                <button className="instructor-btn instructor-btn--primary">
                  Post grades
                </button>
              </div>
            </div>

            {/* Loading */}
            {rosterLoading ? (
              <p className="instructor-empty">Loading roster…</p>
            ) : (
              <table className="instructor-table">
                <thead>
                  <tr>
                    {[
                      'Student',
                      'Status',
                      'Attendance',
                      'Midterm',
                      'Grade',
                      'Action',
                    ].map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {roster.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="instructor-empty">
                        No students enrolled yet.
                      </td>
                    </tr>
                  ) : (
                    roster.map((reg) => (
                      <tr key={reg.id}>
                        {/* Student */}
                        <td>
                          <div className="instructor-student">
                            <div className="instructor-avatar">
                              {reg.student_name
                                ?.split(' ')
                                .map((n) => n[0])
                                .join('')
                                .slice(0, 2)}
                            </div>
                            <p className="instructor-name">
                              {reg.student_name}
                            </p>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="instructor-status">
                          Enrolled
                        </td>

                        {/* Attendance */}
                        <td>
                          <div className="instructor-att">
                            <div className="instructor-att-track">
                              <div
                                className="instructor-att-fill"
                                style={{ width: '85%' }}
                              />
                            </div>
                            <span className="instructor-att-val">
                              85%
                            </span>
                          </div>
                        </td>

                        {/* Midterm */}
                        <td>—</td>

                        {/* Grade */}
                        <td>
                          <span
                            className={`grade-pill ${gradeClass('B+')}`}
                          >
                            B+
                          </span>
                        </td>

                        {/* Actions */}
                        <td>
                          <button className="instructor-btn">
                            Email
                          </button>
                          <button className="instructor-btn">
                            Grade
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        )}
      </main>
    </div>
  )
}