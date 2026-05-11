/**
 * <StatCard label="Enrolled" value={4} badge="courses" badgeColor="purple" />
 *
 * badgeColor: 'purple' | 'green' | 'amber' | 'red' | 'blue'
 */

const BADGE_STYLES = {
  purple: { background: '#EEEDFE', color: '#3C3489' },
  green:  { background: '#EAF3DE', color: '#27500A' },
  amber:  { background: '#FAEEDA', color: '#633806' },
  red:    { background: '#FCEBEB', color: '#791F1F' },
  blue:   { background: '#E6F1FB', color: '#0C447C' },
  teal:   { background: '#E1F5EE', color: '#085041' },
}

export default function StatCard({ label, value, badge, badgeColor = 'purple', borderColor }) {
  const badgeStyle = BADGE_STYLES[badgeColor] || BADGE_STYLES.purple

  return (
    <div style={{
      background: '#fff',
      border: `0.5px solid ${borderColor || '#E0DEF7'}`,
      borderRadius: 10,
      padding: '12px 14px',
    }}>
      <p style={{
        fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em',
        color: '#888', margin: '0 0 4px',
      }}>
        {label}
      </p>
      <p style={{ fontSize: 22, fontWeight: 500, color: '#1a1a2e', margin: '0 0 4px' }}>
        {value}
      </p>
      {badge && (
        <span style={{
          fontSize: 11, padding: '2px 8px', borderRadius: 99,
          display: 'inline-block', ...badgeStyle,
        }}>
          {badge}
        </span>
      )}
    </div>
  )
}