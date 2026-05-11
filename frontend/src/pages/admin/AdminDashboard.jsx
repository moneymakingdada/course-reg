import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { getAllRegistrations } from '../../api/registration'
import { getAllWaitlists } from '../../api/waitlist'
import { getCourses, getDepartments } from '../../api/courses'
import { getUsers } from '../../api/auth'
import StatCard from '../../components/StatCard'

const SEMESTERS = ['2025/2026 S2', '2025/2026 S1', '2024/2025 S2']

const ACTIVITY = [
  { icon: '+', cls: 'admin-activity__icon--reg',  text: 'Kwame Asante enrolled',    sub: 'CS 301 — Data Structures',  time: '2 min ago' },
  { icon: 'W', cls: 'admin-activity__icon--wait', text: 'Kofi Mensah joined waitlist', sub: 'CS 320 — Operating Systems', time: '8 min ago' },
  { icon: '₵', cls: 'admin-activity__icon--pay',  text: 'Payment confirmed',         sub: 'GHS 1,225 — Abena Boateng', time: '12 min ago' },
  { icon: '−', cls: 'admin-activity__icon--drop', text: 'Efia Owusu dropped course', sub: 'PHYS 101 — Mechanics',       time: '18 min ago' },
  { icon: '+', cls: 'admin-activity__icon--reg',  text: 'Yaw Frimpong enrolled',     sub: 'ENG 102 — Academic Writing', time: '25 min ago' },
]

const WEEK_DATA = [
  { label: 'Wk 1', val: 210 },
  { label: 'Wk 2', val: 580 },
  { label: 'Wk 3', val: 920 },
  { label: 'Wk 4', val: 740 },
  { label: 'Wk 5', val: 391 },
]
const MAX_WEEK = Math.max(...WEEK_DATA.map(w => w.val))

export default function AdminDashboard() {
  const [semester,     setSemester]     = useState(SEMESTERS[0])
  const [stats,        setStats]        = useState({ enrolled: 0, waitlisted: 0, courses: 0, students: 0, dropped: 0 })
  const [courses,      setCourses]      = useState([])
  const [departments,  setDepartments]  = useState([])
  const [loading,      setLoading]      = useState(true)
  const [alerts,       setAlerts]       = useState([])

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [enrolled, dropped, waitlisted, courseData, deptData, userData] = await Promise.all([
        getAllRegistrations({ status: 'enrolled',  semester }).catch(() => ({ count: 0, results: [] })),
        getAllRegistrations({ status: 'dropped',   semester }).catch(() => ({ count: 0 })),
        getAllWaitlists({ semester }).catch(() => ({ count: 0 })),
        getCourses({ semester }).catch(() => ({ count: 0, results: [] })),
        getDepartments().catch(() => []),
        getUsers({ role: 'student' }).catch(() => ({ count: 0 })),
      ])

      const enrolledCount   = enrolled?.count  ?? 0
      const droppedCount    = dropped?.count   ?? 0
      const waitlistedCount = waitlisted?.count ?? 0
      const coursesCount    = courseData?.count ?? 0
      const studentsCount   = userData?.count   ?? 0

      setStats({
        enrolled:   enrolledCount,
        dropped:    droppedCount,
        waitlisted: waitlistedCount,
        courses:    coursesCount,
        students:   studentsCount,
      })

      // Top courses by fill rate
      const courseList = Array.isArray(courseData) ? courseData : courseData?.results ?? []
      const sorted = [...courseList]
        .filter(c => c.capacity > 0)
        .sort((a, b) => {
          const pctA = (a.enrolled_count ?? 0) / a.capacity
          const pctB = (b.enrolled_count ?? 0) / b.capacity
          return pctB - pctA
        })
        .slice(0, 5)
      setCourses(sorted)

      // Departments
      const deptList = Array.isArray(deptData) ? deptData : deptData?.results ?? []
      setDepartments(deptList)

      // Auto-generate alerts
      const newAlerts = []
      const fullCourses = courseList.filter(c => c.is_full).length
      if (fullCourses > 0) {
        newAlerts.push({ type: 'warn', text: `${fullCourses} course${fullCourses > 1 ? 's are' : ' is'} at full capacity with students on the waitlist.`, link: '/admin/waitlists', linkText: 'View waitlists' })
      }
      if (waitlistedCount > 20) {
        newAlerts.push({ type: 'warn', text: `${waitlistedCount} students are currently waitlisted. Consider adding course sections.`, link: '/admin/waitlists', linkText: 'Manage' })
      }
      if (deptList.length === 0) {
        newAlerts.push({ type: 'info', text: 'No departments created yet. Instructors need departments to add courses.', link: '/admin/departments', linkText: 'Add departments' })
      }
      setAlerts(newAlerts)

    } catch (err) {
      console.error('Dashboard fetch error', err)
    } finally {
      setLoading(false)
    }
  }, [semester])

  useEffect(() => { fetchAll() }, [fetchAll])

  // Compute department enrollment breakdown
  const deptBreakdown = departments.map(d => ({
    ...d,
    enrolled: courses.reduce((s, c) => c.department?.code === d.code ? s + (c.enrolled_count ?? 0) : s, 0),
  })).filter(d => d.enrolled > 0).slice(0, 5)

  const maxDeptEnrolled = Math.max(...deptBreakdown.map(d => d.enrolled), 1)

  // Donut slices for departments
  const DONUT_COLORS = ['#BA7517', '#D85A30', '#EF9F27', '#FAC775', '#E8C07A']
  const totalEnrolled = deptBreakdown.reduce((s, d) => s + d.enrolled, 0) || 1

  // SVG donut math
  let offset = 0
  const circumference = 2 * Math.PI * 30  // r=30
  const donutSlices = deptBreakdown.map((d, i) => {
    const pct  = d.enrolled / totalEnrolled
    const dash = pct * circumference
    const slice = { ...d, dash, gap: circumference - dash, offset: -offset * circumference / circumference, color: DONUT_COLORS[i % DONUT_COLORS.length], pct: Math.round(pct * 100) }
    offset += pct * circumference
    return slice
  })

  const avgFillRate = courses.length
    ? Math.round(courses.reduce((s, c) => s + ((c.enrolled_count ?? 0) / (c.capacity || 1)) * 100, 0) / courses.length)
    : 0

  return (
    <div className="admin-dash">

      {/* Header */}
      <div className="admin-dash__header">
        <div>
          <p className="page-title admin-dash__title">Admin dashboard</p>
          <p className="page-subtitle admin-dash__subtitle">
            {loading ? 'Loading…' : `${stats.enrolled} enrolled · ${stats.waitlisted} waitlisted · ${stats.courses} courses`}
          </p>
        </div>
        <div className="admin-dash__controls">
          <select
            className="admin-dash__semester-select"
            value={semester}
            onChange={e => setSemester(e.target.value)}
          >
            {SEMESTERS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button className="admin-dash__refresh-btn" onClick={fetchAll}>↻ Refresh</button>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="admin-alerts">
          {alerts.map((a, i) => (
            <div key={i} className={`admin-alert admin-alert--${a.type}`}>
              <span>{a.type === 'warn' ? '⚠️' : 'ℹ️'}</span>
              <span style={{ flex: 1 }}>{a.text}</span>
              <Link to={a.link} className="admin-alert__link">{a.linkText} →</Link>
            </div>
          ))}
        </div>
      )}

      {/* Quick actions */}
      <div className="admin-section-header">
        <p className="admin-section-title">Quick actions</p>
      </div>
      <div className="admin-quick-actions">
        {[
          { icon: '🎓', label: 'Students',    sub: `${stats.students} total`,        to: '/admin/students' },
          { icon: '📋', label: 'Registrations', sub: `${stats.enrolled} enrolled`,   to: '/admin/registrations' },
          { icon: '⏳', label: 'Waitlists',   sub: `${stats.waitlisted} waiting`,    to: '/admin/waitlists' },
          { icon: '💳', label: 'Payments',    sub: 'View all payments',              to: '/admin/payments' },
        ].map(a => (
          <Link key={a.to} to={a.to} className="admin-quick-card">
            <span className="admin-quick-card__icon">{a.icon}</span>
            <p className="admin-quick-card__label">{a.label}</p>
            <p className="admin-quick-card__sub">{a.sub}</p>
          </Link>
        ))}
      </div>

      {/* KPIs */}
      <div className="admin-section-header">
        <p className="admin-section-title">Key metrics — {semester}</p>
      </div>
      <div className="admin-kpi-grid">
        <StatCard label="Total enrolled"  value={loading ? '…' : stats.enrolled}   badge="students"        badgeColor="green"  borderColor="#FAC775" />
        <StatCard label="Courses offered" value={loading ? '…' : stats.courses}    badge="active"          badgeColor="amber"  borderColor="#FAC775" />
        <StatCard label="Waitlisted"      value={loading ? '…' : stats.waitlisted} badge="need spots"      badgeColor="red"    borderColor="#FAC775" />
        <StatCard label="Avg. fill rate"  value={loading ? '…' : `${avgFillRate}%`} badge="of capacity"   badgeColor="green"  borderColor="#FAC775" />
        <StatCard label="Drops"           value={loading ? '…' : stats.dropped}    badge="this semester"   badgeColor="red"    borderColor="#FAC775" />
      </div>

      {/* Charts */}
      <div className="admin-chart-grid">

        {/* Weekly registration bar chart */}
        <div className="admin-card">
          <p className="admin-card__title">Registrations by week (mock trend)</p>
          <div className="admin-bar-chart">
            {WEEK_DATA.map((w, i) => {
              const pct = Math.round((w.val / MAX_WEEK) * 100)
              const isHighest = w.val === MAX_WEEK
              return (
                <div key={w.label} className="admin-bar-col">
                  <span className="admin-bar-col__val">{w.val}</span>
                  <div
                    className={`admin-bar${isHighest ? ' admin-bar--highlight' : ''}`}
                    style={{ height: `${pct}px` }}
                  />
                  <span className="admin-bar-col__label">{w.label}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Enrollment by dept donut */}
        <div className="admin-card">
          <p className="admin-card__title">Enrollment by department</p>
          {deptBreakdown.length === 0 ? (
            <p style={{ fontSize: 12, color: '#aaa', textAlign: 'center', paddingTop: 20 }}>
              {loading ? 'Loading…' : 'No enrollment data yet'}
            </p>
          ) : (
            <div className="admin-donut-row">
              <svg width="90" height="90" viewBox="0 0 80 80" style={{ flexShrink: 0 }}>
                <circle cx="40" cy="40" r="30" fill="none" stroke="#FAEEDA" strokeWidth="16"/>
                {donutSlices.map((s, i) => (
                  <circle
                    key={i}
                    cx="40" cy="40" r="30"
                    fill="none"
                    stroke={s.color}
                    strokeWidth="16"
                    strokeDasharray={`${s.dash} ${s.gap}`}
                    strokeDashoffset={-s.offset}
                    transform="rotate(-90 40 40)"
                  />
                ))}
                <text x="40" y="43" textAnchor="middle" fontSize="10" fontWeight="500" fill="#412402">
                  {stats.enrolled}
                </text>
                <text x="40" y="53" textAnchor="middle" fontSize="8" fill="#888">total</text>
              </svg>
              <div className="admin-legend">
                {donutSlices.map((s, i) => (
                  <div key={i} className="admin-legend__item">
                    <div className="admin-legend__left">
                      <div className="admin-legend__dot" style={{ background: s.color }} />
                      <span>{s.code}</span>
                    </div>
                    <span className="admin-legend__pct">{s.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom 3-col */}
      <div className="admin-bottom-grid">

        {/* Top courses by fill rate */}
        <div className="admin-card">
          <div className="admin-section-header">
            <p className="admin-card__title" style={{ margin: 0 }}>Top courses by fill</p>
            <Link to="/admin/registrations" className="admin-section-link">View all</Link>
          </div>
          {courses.length === 0 ? (
            <p className="admin-empty" style={{ padding: '20px 0' }}>No courses found.</p>
          ) : (
            <table className="admin-table" style={{ marginTop: 10 }}>
              <thead>
                <tr>
                  <th style={{ width: '40%' }}>Course</th>
                  <th style={{ width: '25%' }}>Enrolled</th>
                  <th style={{ width: '35%' }}>Fill</th>
                </tr>
              </thead>
              <tbody>
                {courses.map(c => {
                  const pct  = c.capacity > 0 ? Math.round(((c.enrolled_count ?? 0) / c.capacity) * 100) : 0
                  const full = pct >= 100
                  const near = pct >= 80 && !full
                  return (
                    <tr key={c.id}>
                      <td>
                        <span style={{ fontWeight: 500 }}>{c.code}</span>
                        <br/>
                        <span style={{ fontSize: 10, color: '#aaa' }}>{c.title?.substring(0, 18)}</span>
                      </td>
                      <td style={{ color: 'var(--admin-dark)' }}>{c.enrolled_count ?? 0}/{c.capacity}</td>
                      <td>
                        <div className="admin-fill-bar">
                          <div className="admin-fill-track">
                            <div
                              className={`admin-fill-fill${full ? ' admin-fill-fill--full' : near ? ' admin-fill-fill--near' : ''}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="admin-fill-pct">{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Dept breakdown */}
        <div className="admin-card">
          <div className="admin-section-header">
            <p className="admin-card__title" style={{ margin: 0 }}>Dept. breakdown</p>
            <Link to="/admin/departments" className="admin-section-link">Manage</Link>
          </div>
          <div style={{ marginTop: 10 }}>
            {deptBreakdown.length === 0 ? (
              <p className="admin-empty" style={{ padding: '20px 0' }}>No data yet</p>
            ) : deptBreakdown.map(d => (
              <div key={d.id} className="dept-mini-bar-row">
                <span className="dept-mini-label">{d.name}</span>
                <div className="dept-mini-track">
                  <div
                    className="dept-mini-fill"
                    style={{ width: `${Math.round((d.enrolled / maxDeptEnrolled) * 100)}%` }}
                  />
                </div>
                <span className="dept-mini-count">{d.enrolled}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Activity feed */}
        <div className="admin-card">
          <div className="admin-section-header">
            <p className="admin-card__title" style={{ margin: 0 }}>Recent activity</p>
            <Link to="/admin/registrations" className="admin-section-link">View all</Link>
          </div>
          <div style={{ marginTop: 10 }}>
            {ACTIVITY.map((a, i) => (
              <div key={i} className="admin-activity__item">
                <div className={`admin-activity__icon ${a.cls}`}>{a.icon}</div>
                <div>
                  <p className="admin-activity__text">{a.text}</p>
                  <p className="admin-activity__sub">{a.sub}</p>
                  <p className="admin-activity__time">{a.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}