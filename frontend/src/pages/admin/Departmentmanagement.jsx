import { useEffect, useState, useMemo } from 'react'
import { getDepartments, createCourse } from '../../api/courses'
import axiosInstance from '../../api/axiosInstance'
import StatCard from '../../components/StatCard'


const EMPTY_FORM = { name: '', code: '' }

/* Helper — POST/PATCH/DELETE departments via axiosInstance directly */
const deptAPI = {
  create: (payload)     => axiosInstance.post('/courses/departments/', payload),
  update: (id, payload) => axiosInstance.patch(`/courses/departments/${id}/`, payload),
  delete: (id)          => axiosInstance.delete(`/courses/departments/${id}/`),
}

export default function DepartmentManagement() {
  const [departments, setDepartments] = useState([])
  const [loading,     setLoading]     = useState(true)
  const [form,        setForm]        = useState(EMPTY_FORM)
  const [editId,      setEditId]      = useState(null)   // null = add mode
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState('')
  const [success,     setSuccess]     = useState('')
  const [search,      setSearch]      = useState('')

  useEffect(() => { fetchDepartments() }, [])

  const fetchDepartments = () => {
    setLoading(true)
    getDepartments()
      .then((d) => setDepartments(Array.isArray(d) ? d : d.results ?? []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  const openEdit = (dept) => {
    setEditId(dept.id)
    setForm({ name: dept.name, code: dept.code })
    setError('')
  }

  const resetForm = () => {
    setEditId(null)
    setForm(EMPTY_FORM)
    setError('')
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    // Auto-uppercase the code field
    setForm((prev) => ({ ...prev, [name]: name === 'code' ? value.toUpperCase() : value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!form.name.trim() || !form.code.trim()) {
      setError('Both name and code are required.')
      return
    }

    setSaving(true)
    try {
      if (editId) {
        await deptAPI.update(editId, form)
        setSuccess(`"${form.name}" updated successfully.`)
      } else {
        await deptAPI.create(form)
        setSuccess(`"${form.name}" created successfully.`)
      }
      resetForm()
      fetchDepartments()
      setTimeout(() => setSuccess(''), 4000)
    } catch (err) {
      const d = err.response?.data
      setError(
        typeof d === 'object'
          ? Object.entries(d).map(([k, v]) => `${k}: ${[v].flat().join(' ')}`).join(' · ')
          : 'Failed to save department.'
      )
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (dept) => {
    if (!window.confirm(
      `Delete "${dept.name}"?\n\nThis will affect all courses linked to this department.`
    )) return
    try {
      await deptAPI.delete(dept.id)
      setSuccess(`"${dept.name}" deleted.`)
      if (editId === dept.id) resetForm()
      fetchDepartments()
      setTimeout(() => setSuccess(''), 4000)
    } catch (err) {
      const d = err.response?.data
      setError(
        d?.detail || 'Cannot delete — courses may still be linked to this department.'
      )
    }
  }

  // Client-side search filter
  const filtered = useMemo(() => {
    if (!search.trim()) return departments
    const q = search.toLowerCase()
    return departments.filter(
      (d) => d.name.toLowerCase().includes(q) || d.code.toLowerCase().includes(q)
    )
  }, [departments, search])

  return (
    <div className="dept-page">

      {/* Header */}
      <div className="dept-page__header">
        <div>
          <p className="page-title dept-page__title">Departments</p>
          <p className="page-subtitle dept-page__subtitle">
            Create and manage academic departments — instructors pick from this list when adding courses
          </p>
        </div>
      </div>

      {/* Banners */}
      {success && <div className="info-banner" style={{ marginBottom: '1rem' }}><span>✓ {success}</span></div>}

      {/* KPIs */}
      <div className="dept-kpi-grid">
        <StatCard label="Departments"    value={departments.length}                                               badge="total"           badgeColor="amber" borderColor="#FAC775" />
        <StatCard label="With courses"   value={departments.filter((d) => (d.course_count ?? 0) > 0).length}     badge="active"          badgeColor="green" borderColor="#FAC775" />
        <StatCard label="Without courses" value={departments.filter((d) => (d.course_count ?? 0) === 0).length}  badge="no courses yet"  badgeColor="blue"  borderColor="#FAC775" />
      </div>

      {/* Body — form + list side by side */}
      <div className="dept-page__body">

        {/* ── Add / Edit form ── */}
        <div className="dept-form-card">
          <p className="dept-form-card__title">
            {editId ? 'Edit department' : 'Add new department'}
          </p>

          {error && <div className="error-banner" style={{ marginBottom: 12 }}>{error}</div>}

          <form onSubmit={handleSubmit}>
            <div>
              <label className="dept-form__label">Department name</label>
              <input
                className="dept-form__input"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="e.g. Computer Science"
                required
              />
            </div>

            <div>
              <label className="dept-form__label">Department code</label>
              <input
                className="dept-form__input"
                name="code"
                value={form.code}
                onChange={handleChange}
                placeholder="e.g. CS"
                maxLength={10}
                required
              />
              <p className="dept-form__hint">Short code shown on course tags — automatically uppercased</p>
            </div>

            <div className="dept-form__actions">
              {editId && (
                <button type="button" className="dept-form__btn-cancel" onClick={resetForm}>
                  Cancel
                </button>
              )}
              <button type="submit" className="dept-form__btn-submit" disabled={saving}>
                {saving
                  ? 'Saving…'
                  : editId
                  ? 'Save changes'
                  : '+ Create department'}
              </button>
            </div>
          </form>
        </div>

        {/* ── Department list ── */}
        <div className="dept-list-card">
          <div className="dept-list-card__meta">
            <span>
              {loading ? 'Loading…' : `${filtered.length} department${filtered.length !== 1 ? 's' : ''}`}
            </span>
            <input
              className="dept-list-card__search"
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {loading ? (
            <p className="dept-empty">Loading departments…</p>
          ) : filtered.length === 0 ? (
            <p className="dept-empty">
              {search ? 'No departments match your search.' : 'No departments yet. Add one using the form.'}
            </p>
          ) : (
            filtered.map((dept) => (
              <div
                key={dept.id}
                className="dept-row"
                style={{ background: editId === dept.id ? 'var(--admin-light)' : undefined }}
              >
                <div className="dept-row__left">
                  {/* Code badge */}
                  <div className="dept-row__code">{dept.code}</div>
                  <div>
                    <p className="dept-row__name">{dept.name}</p>
                    <p className="dept-row__sub">
                      {dept.course_count != null
                        ? `${dept.course_count} course${dept.course_count !== 1 ? 's' : ''}`
                        : 'ID: ' + dept.id}
                    </p>
                  </div>
                </div>

                <div className="dept-row__actions">
                  <button
                    className="dept-row__btn"
                    onClick={() => openEdit(dept)}
                  >
                    Edit
                  </button>
                  <button
                    className="dept-row__btn dept-row__btn--delete"
                    onClick={() => handleDelete(dept)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}