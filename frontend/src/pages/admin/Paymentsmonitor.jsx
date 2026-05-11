import { useEffect, useState, useCallback } from 'react'
import axiosInstance from '../../api/axiosInstance'
import StatCard from '../../components/StatCard'
import { formatCurrency } from '../../utils/roleRedirect'

const TABS    = ['All', 'Pending', 'Confirmed', 'Failed']
const METHODS = ['', 'bank', 'mobile_money', 'card']

const METHOD_LABELS = {
  bank:         'Bank Transfer',
  mobile_money: 'Mobile Money',
  card:         'Card',
}

const CHART_DATA = [
  { month: 'Jan', amount: 12400, pct: 45 },
  { month: 'Feb', amount: 18700, pct: 68 },
  { month: 'Mar', amount: 27300, pct: 100, highlight: true },
  { month: 'Apr', amount: 22100, pct: 81 },
  { month: 'May', amount: 15900, pct: 58 },
]

const METHOD_BREAKDOWN = [
  { label: 'Bank Transfer',  pct: 52, amount: 'GHS 42,300' },
  { label: 'Mobile Money',   pct: 33, amount: 'GHS 26,900' },
  { label: 'Card',           pct: 15, amount: 'GHS 12,200' },
]

function statusClass(s) {
  if (s === 'confirmed') return 'pay-status pay-status--confirmed'
  if (s === 'pending')   return 'pay-status pay-status--pending'
  if (s === 'failed')    return 'pay-status pay-status--failed'
  return 'pay-status pay-status--pending'
}

export default function PaymentsMonitor() {
  const [payments,  setPayments]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [total,     setTotal]     = useState(0)
  const [tab,       setTab]       = useState('All')
  const [method,    setMethod]    = useState('')
  const [search,    setSearch]    = useState('')
  const [stats,     setStats]     = useState({
    totalRevenue: 0, confirmed: 0, pending: 0, failed: 0,
  })

  const fetchPayments = useCallback(async (params = {}) => {
    setLoading(true)
    try {
      const { data } = await axiosInstance.get('/registration/payments/all/', { params })
      const list = Array.isArray(data) ? data : data.results ?? []
      setPayments(list)
      setTotal(Array.isArray(data) ? data.length : data.count ?? 0)
    } catch (err) {
      // Endpoint may not exist yet — use mock data for demo
      setPayments(MOCK_PAYMENTS)
      setTotal(MOCK_PAYMENTS.length)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Fetch summary counts
    Promise.allSettled([
      axiosInstance.get('/registration/payments/all/', { params: { status: 'confirmed' } }),
      axiosInstance.get('/registration/payments/all/', { params: { status: 'pending'   } }),
      axiosInstance.get('/registration/payments/all/', { params: { status: 'failed'    } }),
    ]).then(([c, p, f]) => {
      const confirmed = c.status === 'fulfilled' ? (c.value.data?.count ?? 0) : 3
      const pending   = p.status === 'fulfilled' ? (p.value.data?.count ?? 0) : 2
      const failed    = f.status === 'fulfilled' ? (f.value.data?.count ?? 0) : 1
      setStats({ confirmed, pending, failed, totalRevenue: 81400 })
    })
    fetchPayments()
  }, [])

  const handleTabChange = (t) => {
    setTab(t)
    const statusParam = t === 'All' ? '' : t.toLowerCase()
    fetchPayments({ status: statusParam, method })
  }

  const handleMethodChange = (m) => {
    setMethod(m)
    const statusParam = tab === 'All' ? '' : tab.toLowerCase()
    fetchPayments({ status: statusParam, method: m })
  }

  const handleConfirm = async (paymentId) => {
    try {
      await axiosInstance.patch(`/registration/payments/${paymentId}/confirm/`)
      fetchPayments()
    } catch {
      alert('Could not confirm payment. Try again.')
    }
  }

  return (
    <div className="payments-page">
      <p className="page-title payments-page__title">Payments</p>
      <p className="page-subtitle payments-page__subtitle">
        Revenue overview and payment verification
      </p>

      {/* KPIs */}
      <div className="payments-page__kpis">
        <StatCard label="Total revenue"  value={formatCurrency(stats.totalRevenue)} badge="this semester"  badgeColor="green"  borderColor="#FAC775" />
        <StatCard label="Confirmed"      value={stats.confirmed}                    badge="payments"       badgeColor="green"  borderColor="#FAC775" />
        <StatCard label="Pending"        value={stats.pending}                      badge="awaiting check" badgeColor="amber"  borderColor="#FAC775" />
        <StatCard label="Failed"         value={stats.failed}                       badge="need follow-up" badgeColor="red"    borderColor="#FAC775" />
      </div>

      {/* Charts row */}
      <div className="payments-chart-row">
        <div className="payments-chart-card">
          <p className="payments-chart-card__title">Revenue by month</p>
          <div className="payments-bar-chart">
            {CHART_DATA.map((d) => (
              <div key={d.month} className="payments-bar-col">
                <span className="payments-bar-col__val">
                  GHS {(d.amount / 1000).toFixed(0)}k
                </span>
                <div
                  className={`payments-bar${d.highlight ? ' payments-bar--highlight' : ''}`}
                  style={{ height: `${d.pct}px` }}
                />
                <span className="payments-bar-col__label">{d.month}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="payments-chart-card">
          <p className="payments-chart-card__title">By payment method</p>
          <div className="payments-methods-list">
            {METHOD_BREAKDOWN.map((m) => (
              <div key={m.label} className="payments-method-item">
                <div className="payments-method-item__row">
                  <span>{m.label}</span>
                  <span className="payments-method-item__pct">{m.amount} ({m.pct}%)</span>
                </div>
                <div className="payments-method-track">
                  <div className="payments-method-fill" style={{ width: `${m.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tab bar + method filter */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <div className="payments-page__tabs">
          {TABS.map((t) => (
            <button
              key={t}
              className={`payments-tab${tab === t ? ' active' : ''}`}
              onClick={() => handleTabChange(t)}
            >
              {t}
            </button>
          ))}
        </div>
        <select
          className="payments-page__filter-select"
          value={method}
          onChange={(e) => handleMethodChange(e.target.value)}
        >
          <option value="">All methods</option>
          {METHODS.filter(Boolean).map((m) => (
            <option key={m} value={m}>{METHOD_LABELS[m]}</option>
          ))}
        </select>
      </div>

      {/* Payments table */}
      <div className="payments-table-wrap">
        <div className="payments-table-meta">
          <span>{loading ? 'Loading…' : `${total} payment${total !== 1 ? 's' : ''}`}</span>
          <button className="reg-monitor__export-btn">Export CSV ↓</button>
        </div>

        <table className="payments-table">
          <thead>
            <tr>
              <th style={{ width: '20%' }}>Student</th>
              <th style={{ width: '12%' }}>Amount</th>
              <th style={{ width: '14%' }}>Method</th>
              <th style={{ width: '16%' }}>Reference</th>
              <th style={{ width: '12%' }}>Semester</th>
              <th style={{ width: '12%' }}>Date</th>
              <th style={{ width: '10%' }}>Status</th>
              <th style={{ width: '8%'  }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="reg-monitor__empty">Loading payments…</td>
              </tr>
            ) : payments.length === 0 ? (
              <tr>
                <td colSpan={8} className="reg-monitor__empty">No payments found.</td>
              </tr>
            ) : (
              payments.map((pay) => (
                <tr key={pay.id}>
                  <td>
                    <div className="reg-monitor__student">
                      <div className="reg-monitor__avatar">
                        {pay.student_name?.split(' ').map((n) => n[0]).join('').slice(0, 2) ?? '??'}
                      </div>
                      <p className="reg-monitor__student-name">{pay.student_name ?? 'Unknown'}</p>
                    </div>
                  </td>
                  <td><span className="pay-amount">{formatCurrency(pay.amount)}</span></td>
                  <td>
                    <span className="pay-method-pill">
                      {METHOD_LABELS[pay.method] ?? pay.method}
                    </span>
                  </td>
                  <td><span className="pay-reference">{pay.reference}</span></td>
                  <td style={{ fontSize: 12, color: '#888' }}>{pay.semester}</td>
                  <td style={{ fontSize: 12, color: '#888' }}>
                    {pay.created_at ? new Date(pay.created_at).toLocaleDateString() : '—'}
                  </td>
                  <td><span className={statusClass(pay.status)}>{pay.status}</span></td>
                  <td>
                    {pay.status === 'pending' && (
                      <button
                        className="pay-action-btn pay-action-btn--confirm"
                        onClick={() => handleConfirm(pay.id)}
                      >
                        Confirm
                      </button>
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

/* ── Mock data — used when backend payment admin endpoint isn't wired yet ── */
const MOCK_PAYMENTS = [
  { id: 1, student_name: 'Kwame Asante',   amount: '1225.00', method: 'bank',         reference: 'REF-20241034-S2', semester: '2025/2026 S2', status: 'confirmed', created_at: '2026-01-15' },
  { id: 2, student_name: 'Abena Boateng',  amount: '975.00',  method: 'mobile_money', reference: 'MOMO-20240987',   semester: '2025/2026 S2', status: 'confirmed', created_at: '2026-01-16' },
  { id: 3, student_name: 'Efia Owusu',     amount: '600.00',  method: 'card',         reference: 'CARD-20241102',   semester: '2025/2026 S2', status: 'pending',   created_at: '2026-01-17' },
  { id: 4, student_name: 'Kofi Mensah',    amount: '450.00',  method: 'bank',         reference: 'REF-20240855-S2', semester: '2025/2026 S2', status: 'pending',   created_at: '2026-01-17' },
  { id: 5, student_name: 'Ama Darko',      amount: '1500.00', method: 'mobile_money', reference: 'MOMO-20241200',   semester: '2025/2026 S2', status: 'confirmed', created_at: '2026-01-18' },
  { id: 6, student_name: 'Yaw Frimpong',   amount: '750.00',  method: 'bank',         reference: 'REF-20241301-S2', semester: '2025/2026 S2', status: 'failed',    created_at: '2026-01-19' },
]