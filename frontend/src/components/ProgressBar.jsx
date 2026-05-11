export default function ProgressBar({
  value = 0,
  color = '#534AB7',
  trackColor = '#EEEDFE',
  height = 4,
}) {
  const clamped = Math.min(100, Math.max(0, value))

  return (
    <div
      className="progress-bar"
      style={{
        '--height': `${height}px`,
        '--track-color': trackColor,
      }}
    >
      <div
        className="progress-bar-fill"
        style={{
          '--width': `${clamped}%`,
          '--color': color,
        }}
      />
    </div>
  )
}