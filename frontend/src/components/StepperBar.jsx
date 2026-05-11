/**
 * <StepperBar steps={['Select', 'Review', 'Payment', 'Confirm']} currentStep={2} color="#534AB7" />
 * currentStep is 1-indexed.
 */
export default function StepperBar({ steps = [], currentStep = 1, color = '#534AB7' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '1rem 1.5rem', background: '#fff', borderBottom: '0.5px solid #eee' }}>
      {steps.map((label, i) => {
        const stepNum  = i + 1
        const isDone   = stepNum < currentStep
        const isActive = stepNum === currentStep

        return (
          <div key={label} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? 1 : 'none' }}>
            {/* Step circle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <div style={{
                width: 24, height: 24, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 500,
                background: isDone ? '#1D9E75' : isActive ? color : '#f0f0f0',
                color: isDone || isActive ? '#fff' : '#999',
              }}>
                {isDone ? '✓' : stepNum}
              </div>
              <span style={{
                fontSize: 12,
                color: isDone ? '#0F6E56' : isActive ? color : '#aaa',
                fontWeight: isActive ? 500 : 400,
              }}>
                {label}
              </span>
            </div>

            {/* Connector line */}
            {i < steps.length - 1 && (
              <div style={{
                flex: 1, height: 1, margin: '0 10px',
                background: isDone ? '#1D9E75' : '#e5e5e5',
              }} />
            )}
          </div>
        )
      })}
    </div>
  )
}