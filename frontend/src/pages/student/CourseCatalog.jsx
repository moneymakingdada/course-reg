import { useState } from 'react'
import { useCourses, useDepartments } from '../../hooks/useCourses'
import { joinWaitlist } from '../../api/waitlist'
import CourseCard from '../../components/CourseCard'

export default function CourseCatalog({ myCoursesOnly = false }) {
  const [search,  setSearch]  = useState('')
  const [filters, setFilters] = useState({
    department: '',
    level:      '',
    available:  '',
    // No hardcoded semester — show all active courses by default
  })

  const { departments } = useDepartments()
  // No initial params so ALL active courses load immediately
  const { courses, total, loading, error, setParams } = useCourses()

  const buildParams = (s, f) => {
    const p = {}
    if (s)           p.search     = s
    if (f.department) p.department = f.department
    if (f.level)      p.level      = Number(f.level)   // ensure integer
    if (f.available)  p.available  = f.available
    return p
  }

  const handleSearch = (e) => {
    e.preventDefault()
    setParams(buildParams(search, filters))
  }

  const handleFilterChange = (key, value) => {
    const next = { ...filters, [key]: value }
    setFilters(next)
    setParams(buildParams(search, next))
  }

  const handleJoinWaitlist = async (course) => {
    try {
      await joinWaitlist(course.id, course.semester || '')
      alert(`Added to waitlist for ${course.code}`)
    } catch (err) {
      alert(err.response?.data?.detail || 'Could not join waitlist.')
    }
  }

  return (
    <div className="catalog">

      {/* Search hero */}
      <div className="catalog__hero">
        <form className="catalog__search-row" onSubmit={handleSearch}>
          <input
            className="catalog__search-input"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by course code, title or description…"
          />
          <button type="submit" className="catalog__search-btn">Search</button>
        </form>

        <div className="catalog__filters">
          {/* Department dropdown */}
          <select
            className="catalog__filter-select"
            value={filters.department}
            onChange={e => handleFilterChange('department', e.target.value)}
          >
            <option value="">All departments</option>
            {departments.map(d => (
              <option key={d.id} value={d.code}>{d.code} — {d.name}</option>
            ))}
          </select>

          {/* Level chips */}
          {[100, 200, 300, 400].map(lvl => (
            <button
              key={lvl}
              type="button"
              className={`catalog__chip${Number(filters.level) === lvl ? ' active' : ''}`}
              onClick={() => handleFilterChange('level', Number(filters.level) === lvl ? '' : lvl)}
            >
              {lvl} level
            </button>
          ))}

          {/* Available only toggle */}
          <button
            type="button"
            className={`catalog__chip${filters.available ? ' active' : ''}`}
            onClick={() => handleFilterChange('available', filters.available ? '' : 'true')}
          >
            Available only
          </button>

          {/* Clear all filters */}
          {(search || filters.department || filters.level || filters.available) && (
            <button
              type="button"
              className="catalog__chip"
              style={{ opacity: 0.6 }}
              onClick={() => {
                setSearch('')
                setFilters({ department: '', level: '', available: '' })
                setParams({})
              }}
            >
              ✕ Clear
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="catalog__results">
        <p className="catalog__results-meta">
          {loading
            ? 'Loading courses…'
            : `${total} course${total !== 1 ? 's' : ''} found`}
        </p>

        {error && <p className="catalog__error">{error}</p>}

        <div className="catalog__grid">
          {courses.map(course => (
            <CourseCard
              key={course.id}
              course={course}
              onJoinWaitlist={handleJoinWaitlist}
            />
          ))}
        </div>

        {!loading && courses.length === 0 && !error && (
          <p className="catalog__empty">
            No courses match your filters.{' '}
            <button
              style={{ background: 'none', border: 'none', color: '#534AB7', cursor: 'pointer', fontSize: 13 }}
              onClick={() => { setFilters({ department: '', level: '', available: '' }); setSearch(''); setParams({}) }}
            >
              Clear filters
            </button>
          </p>
        )}
      </div>
    </div>
  )
}