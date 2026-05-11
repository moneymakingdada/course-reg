import { useState, useContext } from 'react'
import { CourseContext } from '../../context/CourseContext'
import { enroll, submitPayment } from '../../api/registration'
import StepperBar from '../../components/StepperBar'
import { formatCurrency } from '../../utils/roleRedirect'
import '../../styles/Registration.css'

const STEPS    = ['Select', 'Review', 'Payment', 'Confirm']
const FEE      = 25

const PAYMENT_METHODS = [
  { value: 'bank',         label: 'Bank Transfer' },
  { value: 'mobile_money', label: 'Mobile Money' },
  { value: 'card',         label: 'Card' },
]

export default function Registration() {
  const { cart, cartCredits, clearCart, removeFromCart } = useContext(CourseContext)

  const [step,          setStep]          = useState(1)
  const [payment,       setPayment]       = useState({ method: 'bank', reference: '' })
  const [registrations, setRegistrations] = useState([])
  const [loading,       setLoading]       = useState(false)
  const [error,         setError]         = useState('')

  // Derive semester from the first cart item, fall back to current semester
  const semester = cart[0]?.semester || '2025/2026 S2'
  const subtotal = cart.reduce((s, c) => s + c.credits * 150, 0)
  const total    = subtotal + FEE

  // ─── Step navigation ────────────────────────────────────────────────────────
  // Going back is always safe — no API calls happen until handleConfirmAndPay
  const goBack = () => {
    setError('')
    setStep(prev => prev - 1)
  }

  // ─── Step 3: enroll + pay in one atomic step ─────────────────────────────
  // This is the ONLY place an API call is made.
  // Combining enroll + pay into one button means:
  //   - Going back from payment never re-triggers enrollment
  //   - No orphaned Registration records without a payment
  const handleConfirmAndPay = async () => {
    setError('')
    setLoading(true)
    try {
      // 1. Enroll
      const result = await enroll(cart.map(c => c.id), semester)
      const regs   = Array.isArray(result) ? result : [result]
      setRegistrations(regs)

      // 2. Submit payment immediately after successful enrollment
      await submitPayment({
        registration_ids: regs.map(r => r.id),
        amount:    total,
        method:    payment.method,
        reference: payment.reference || `REF-${Date.now()}`,
        semester,
      })

      clearCart()
      setStep(4)

    } catch (err) {
      const d = err.response?.data
      // Show a clear message whether enrollment or payment failed
      setError(
        typeof d === 'object'
          ? Object.entries(d).map(([k, v]) => `${k}: ${[v].flat().join(' ')}`).join(' · ')
          : err.message || 'Something went wrong. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="registration">
      <StepperBar steps={STEPS} currentStep={step} color="#534AB7" />

      <div className="registration__body">

        {error && <div className="error-banner">{error}</div>}

        {/* ── Step 1: Cart ─────────────────────────────────────────────── */}
        {step === 1 && (
          <div className="student-card">
            <p className="student-card__label">Your registration cart</p>

            {cart.length === 0 ? (
              <p className="student-empty">
                No courses in cart.{' '}
                <a href="/student/catalog">Browse the catalog</a>.
              </p>
            ) : (
              <>
                {cart.map(c => (
                  <div key={c.id} className="reg-cart__item">
                    <div>
                      <p className="reg-cart__name">{c.code} — {c.title}</p>
                      <p className="reg-cart__meta">
                        {c.schedule} · {c.credits} credit{c.credits !== 1 ? 's' : ''} · {c.semester}
                      </p>
                    </div>
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => removeFromCart(c.id)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <div className="reg-cart__footer">
                  <span className="reg-cart__credits">{cartCredits} credits selected</span>
                  <button
                    className="btn btn-primary"
                    onClick={() => { setError(''); setStep(2) }}
                  >
                    Review →
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Step 2: Review (read-only, no API call) ───────────────────── */}
        {step === 2 && (
          <>
            <div className="reg-review">
              <div className="student-card">
                <p className="student-card__label">Review your selection</p>
                {cart.map(c => (
                  <div key={c.id} className="reg-cart__item">
                    <div>
                      <p className="reg-cart__name">{c.code} — {c.title}</p>
                      <p className="reg-cart__meta">
                        {c.schedule} · {c.department?.name || c.department?.code || ''} · {c.credits} cr.
                      </p>
                    </div>
                  </div>
                ))}

                {/* Prerequisite reminder */}
                <div style={{ marginTop: 12, padding: '10px 12px', background: '#EEEDFE', borderRadius: 8 }}>
                  <p style={{ fontSize: 12, color: '#3C3489', margin: 0 }}>
                    ✅ By proceeding you confirm you meet all prerequisites for the courses above.
                  </p>
                </div>
              </div>

              <div className="student-card">
                <p className="student-card__label">Summary</p>
                {cart.map(c => (
                  <div key={c.id} className="reg-summary__row">
                    <span>{c.code}</span>
                    <span>{formatCurrency(c.credits * 150)}</span>
                  </div>
                ))}
                <div className="reg-summary__row reg-summary__row--fee">
                  <span>Processing fee</span>
                  <span>{formatCurrency(FEE)}</span>
                </div>
                <div className="reg-summary__row reg-summary__row--total">
                  <span>Total</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              </div>
            </div>

            {/* Back just changes step — NO enrollment happens here */}
            <div className="reg-action-row">
              <button className="reg-btn-back" onClick={goBack}>← Back to cart</button>
              <button
                className="reg-btn-next"
                onClick={() => { setError(''); setStep(3) }}
              >
                Proceed to payment →
              </button>
            </div>
          </>
        )}

        {/* ── Step 3: Payment details + final confirmation ──────────────── */}
        {step === 3 && (
          <div className="student-card">
            <p className="student-card__label">Payment details</p>

            <div className="reg-payment__methods">
              {PAYMENT_METHODS.map(({ value, label }) => (
                <div
                  key={value}
                  className={`reg-payment__method${payment.method === value ? ' selected' : ''}`}
                  onClick={() => setPayment(prev => ({ ...prev, method: value }))}
                >
                  <p className="reg-payment__method-label">{label}</p>
                </div>
              ))}
            </div>

            <div style={{ marginBottom: 14 }}>
              <label className="auth-field-label">Payment reference</label>
              <input
                className="auth-input"
                value={payment.reference}
                onChange={e => setPayment(prev => ({ ...prev, reference: e.target.value }))}
                placeholder="e.g. TXN123456 (optional — auto-generated if blank)"
              />
            </div>

            {/* Order summary recap */}
            <div style={{ background: '#F5F4FE', borderRadius: 8, padding: '12px 14px', marginBottom: 16 }}>
              <p style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#7F77DD', margin: '0 0 8px' }}>
                Order summary
              </p>
              {cart.map(c => (
                <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#534AB7', marginBottom: 3 }}>
                  <span>{c.code} — {c.title}</span>
                  <span>{formatCurrency(c.credits * 150)}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#888', marginBottom: 8 }}>
                <span>Processing fee</span>
                <span>{formatCurrency(FEE)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 500, color: '#26215C', borderTop: '0.5px solid #CECBF6', paddingTop: 8 }}>
                <span>Total due</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>

            {/* Warning — clicking confirms BOTH enrollment + payment */}
            <p style={{ fontSize: 12, color: '#888', marginBottom: 14, lineHeight: 1.5 }}>
              By clicking <strong>Confirm enrolment & pay</strong> your course registrations
              will be created and payment submitted simultaneously.
            </p>

            {/* Back is safe — no API was called yet */}
            <div className="reg-action-row">
              <button className="reg-btn-back" onClick={goBack} disabled={loading}>
                ← Back to review
              </button>
              <button
                className="reg-btn-next"
                onClick={handleConfirmAndPay}
                disabled={loading || cart.length === 0}
              >
                {loading ? 'Processing…' : `Confirm enrolment & pay ${formatCurrency(total)}`}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 4: Success ───────────────────────────────────────────── */}
        {step === 4 && (
          <div className="reg-confirm">
            <div className="reg-confirm__icon">✅</div>
            <p className="reg-confirm__title">Enrolment confirmed!</p>
            <p className="reg-confirm__sub">
              You've been successfully enrolled in {registrations.length} course{registrations.length !== 1 ? 's' : ''}.
              A confirmation has been sent to your email.
            </p>

            {/* Enrolled courses list */}
            <div style={{ marginBottom: 20, textAlign: 'left', maxWidth: 320, margin: '0 auto 20px' }}>
              {registrations.map(r => (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', fontSize: 13, color: '#085041' }}>
                  <span>✓</span>
                  <span>{r.course_detail?.code} — {r.course_detail?.title}</span>
                </div>
              ))}
            </div>

            <a href="/student/dashboard" className="reg-confirm__link">
              Go to dashboard
            </a>
          </div>
        )}

      </div>
    </div>
  )
}