/**
 * <WaitlistBadge position={3} notified={false} />
 */
export default function WaitlistBadge({ position, notified = false }) {
  const style = notified
    ? { background: '#EEEDFE', color: '#3C3489', border: '0.5px solid #AFA9EC' }
    : { background: '#FAEEDA', color: '#633806', border: '0.5px solid #EF9F27' }

  return (
    <span style={{
      fontSize: 11, padding: '3px 9px', borderRadius: 99,
      fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 5,
      ...style,
    }}>
      {notified ? '🔔 Spot available' : `#${position} on waitlist`}
    </span>
  )
}