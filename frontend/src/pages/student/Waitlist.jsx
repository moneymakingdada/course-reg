import { useWaitlist } from '../../hooks/useWaitlist'
import WaitlistBadge from '../../components/WaitlistBadge'


export default function Waitlist() {
  const { entries, pendingSpots, loading, error, leave, accept } = useWaitlist()

  const handleAccept = async (entry) => {
    if (!window.confirm(`Accept the spot in ${entry.course_detail?.code}?`)) return
    try {
      await accept(entry.id)
      alert('Enrolled successfully!')
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to accept spot.')
    }
  }

  const handleLeave = async (entry) => {
    if (!window.confirm(`Leave the waitlist for ${entry.course_detail?.code}?`)) return
    try {
      await leave(entry.id)
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to leave waitlist.')
    }
  }

  return (
    <div className="waitlist">
      <p className="waitlist__title">My waitlist</p>
      <p className="waitlist__subtitle">
        You'll be notified when a spot opens. Accept within 48 hrs to secure your place.
      </p>

      {/* Alerts */}
      {pendingSpots.map((entry) => (
        <div key={entry.id} className="waitlist__alert">
          <span>
            🔔 A spot opened in <strong>{entry.course_detail?.code}</strong>. Accept now!
          </span>
          <button
            onClick={() => handleAccept(entry)}
            className="waitlist__btn waitlist__btn--primary"
          >
            Enroll now
          </button>
        </div>
      ))}

      {loading && <p className="waitlist__loading">Loading…</p>}
      {error && <p className="waitlist__error">{error}</p>}

      {!loading && entries.length === 0 && (
        <div className="waitlist__empty">
          <p>You're not on any waitlists.</p>
        </div>
      )}

      {entries.length > 0 && (
        <div className="waitlist__table-wrap">
          <table className="waitlist__table">
            <thead>
              <tr>
                {['Course', 'Position', 'Capacity', 'Status', 'Action'].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>

            <tbody>
              {entries.map((entry) => {
                const course = entry.course_detail || {}
                const fill =
                  course.capacity > 0
                    ? Math.round((course.enrolled_count / course.capacity) * 100)
                    : 100

                return (
                  <tr key={entry.id}>
                    <td>
                      <p className="waitlist__course-title">
                        {course.code} — {course.title}
                      </p>
                      <p className="waitlist__course-sub">
                        {course.schedule}
                      </p>
                    </td>

                    <td>
                      <span className="waitlist__position">
                        {entry.position}
                      </span>
                    </td>

                    <td>
                      <div className="waitlist__capacity">
                        <div className="waitlist__capacity-bar">
                          <div
                            className={`waitlist__capacity-fill ${
                              fill >= 100
                                ? 'full'
                                : fill > 80
                                ? 'high'
                                : 'normal'
                            }`}
                            style={{ width: `${fill}%` }}
                          />
                        </div>
                        <span>
                          {course.enrolled_count}/{course.capacity}
                        </span>
                      </div>
                    </td>

                    <td>
                      <WaitlistBadge
                        position={entry.position}
                        notified={entry.notified}
                      />
                    </td>

                    <td>
                      {entry.notified ? (
                        <button
                          onClick={() => handleAccept(entry)}
                          className="waitlist__btn waitlist__btn--primary"
                        >
                          Enroll
                        </button>
                      ) : (
                        <button
                          onClick={() => handleLeave(entry)}
                          className="waitlist__btn waitlist__btn--secondary"
                        >
                          Drop
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}