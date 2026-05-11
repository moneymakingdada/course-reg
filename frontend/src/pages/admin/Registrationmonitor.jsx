import { useEffect, useState, useCallback } from 'react'
import { getAllRegistrations } from '../../api/registration'
import { getUsers } from '../../api/auth'
import StatCard from '../../components/StatCard'

const STATUS_OPTIONS = ['', 'enrolled', 'dropped', 'completed']

function getInitials(name = '') {
  return name.split(' ').filter(Boolean).slice(0, 2).map((n) => n[0].toUpperCase()).join('')
}

function statusClass(s) {
  if (s === 'enrolled')  return 'reg-status reg-status--enrolled'
  if (s === 'dropped')   return 'reg-status reg-status--dropped'
  if (s === 'completed') return 'reg-status reg-status--completed'
  return 'reg-status'
}

export default function RegistrationMonitor() {
  const [registrations, setRegistrations] = useState([])
  const [loading,       setLoading]       = useState(true)
  const [total,         setTotal]         = useState(0)
  const [filters,       setFilters]       = useState({ status: '', semester: '2025/2026 S2', search: '' })
  const [stats,         setStats]         = useState({ enrolled: 0, dropped: 0, completed: 0, total: 0 })

  const fetchAll = useCallback(async (params) => {
    setLoading(true)
    try {
      const clean = Object.fromEntries(
        Object.entries(params).filter(([, v]) => v !== '')
      )
      const data = await getAllRegistrations(clean)
      const list = Array.isArray(data) ? data : data.results ?? []
      setRegistrations(list)
      setTotal(Array.isArray(data) ? data.length : data.count ?? 0)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch summary stats on mount
  useEffect(() => {
    Promise.all([
      getAllRegistrations({ status: 'enrolled'  }).catch(() => ({ count: 0 })),
      getAllRegistrations({ status: 'dropped'   }).catch(() => ({ count: 0 })),
      getAllRegistrations({ status: 'completed' }).catch(() => ({ count: 0 })),
    ]).then(([enrolled, dropped, completed]) => {
      const e = enrolled?.count  ?? 0
      const d = dropped?.count   ?? 0
      const c = completed?.count ?? 0
      setStats({ enrolled: e, dropped: d, completed: c, total: e + d + c })
    })
    fetchAll(filters)
  }, [])

  const handleSearch = (e) => {
    e.preventDefault()
    fetchAll(filters)
  }

  const handleFilterChange = (key, value) => {
    const next = { ...filters, [key]: value }
    setFilters(next)
    fetchAll(next)
  }

  return (
    <div className="reg-monitor">
      <p className="page-title reg-monitor__title">Registration monitor</p>
      <p className="page-subtitle reg-monitor__subtitle">
        Live view of all student course registrations
      </p>

      {/* KPIs */}
      <div className="reg-monitor__kpis">
        <StatCard label="Total"     value={stats.total}     badge="all time"   badgeColor="amber"  borderColor="#FAC775" />
        <StatCard label="Enrolled"  value={stats.enrolled}  badge="active"     badgeColor="green"  borderColor="#FAC775" />
        <StatCard label="Dropped"   value={stats.dropped}   badge="this sem"   badgeColor="red"    borderColor="#FAC775" />
        <StatCard label="Completed" value={stats.completed} badge="past sems"  badgeColor="blue"   borderColor="#FAC775" />
      </div>

      {/* Filters */}
      <form className="reg-monitor__filters" onSubmit={handleSearch}>
        <input
          className="reg-monitor__filter-input"
          placeholder="Search student name or course…"
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
        />
        <select
          className="reg-monitor__filter-select"
          value={filters.status}
          onChange={(e) => handleFilterChange('status', e.target.value)}
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.filter(Boolean).map((s) => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
        <select
          className="reg-monitor__filter-select"
          value={filters.semester}
          onChange={(e) => handleFilterChange('semester', e.target.value)}
        >
          <option value="2025/2026 S2">2025/2026 S2</option>
          <option value="2025/2026 S1">2025/2026 S1</option>
          <option value="2024/2025 S2">2024/2025 S2</option>
        </select>
        <button type="submit" className="reg-monitor__filter-btn">Apply</button>
      </form>

      {/* Table */}
      <div className="reg-monitor__table-wrap">
        <div className="reg-monitor__meta">
          <span>{loading ? 'Loading…' : `${total} registration${total !== 1 ? 's' : ''}`}</span>
          <button className="reg-monitor__export-btn">Export CSV ↓</button>
        </div>

        <table className="reg-monitor__table">
          <thead>
            <tr>
              <th style={{ width: '22%' }}>Student</th>
              <th style={{ width: '18%' }}>Course</th>
              <th style={{ width: '16%' }}>Semester</th>
              <th style={{ width: '10%' }}>Credits</th>
              <th style={{ width: '12%' }}>Status</th>
              <th style={{ width: '14%' }}>Registered</th>
              <th style={{ width: '8%'  }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="reg-monitor__empty">Loading registrations…</td>
              </tr>
            ) : registrations.length === 0 ? (
              <tr>
                <td colSpan={7} className="reg-monitor__empty">No registrations match your filters.</td>
              </tr>
            ) : (
              registrations.map((reg) => (
                <tr key={reg.id}>
                  <td>
                    <div className="reg-monitor__student">
                      <div className="reg-monitor__avatar">
                        {getInitials(reg.student_name)}
                      </div>
                      <div>
                        <p className="reg-monitor__student-name">{reg.student_name}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <p style={{ fontWeight: 500, fontSize: 13, margin: '0 0 1px', color: 'var(--admin-deeper)' }}>
                      {reg.course_detail?.code}
                    </p>
                    <p style={{ fontSize: 11, color: '#888', margin: 0 }}>
                      {reg.course_detail?.title}
                    </p>
                  </td>
                  <td style={{ fontSize: 12, color: '#888' }}>{reg.semester}</td>
                  <td style={{ fontSize: 13, color: 'var(--admin-deeper)' }}>{reg.credits}</td>
                  <td><span className={statusClass(reg.status)}>{reg.status}</span></td>
                  <td style={{ fontSize: 12, color: '#888' }}>
                    {new Date(reg.registered_at).toLocaleDateString()}
                  </td>
                  <td>
                    {reg.status === 'enrolled' && (
                      <button className="pay-action-btn">Drop</button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}