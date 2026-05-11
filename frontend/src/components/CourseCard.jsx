import { useContext } from 'react'
import { CourseContext } from '../context/CourseContext'


const TAG_MAP = { CS: 'CSC', MATH: 'MTH', ENG: 'ENG', PHYS: 'PHY' }

export default function CourseCard({ course, onJoinWaitlist }) {
  const ctx = useContext(CourseContext)

  // Guard: context may be null if CourseProvider hasn't mounted yet
  const addToCart    = ctx?.addToCart    ?? (() => {})
  const removeFromCart = ctx?.removeFromCart ?? (() => {})
  const isInCart     = ctx?.isInCart     ?? (() => false)
  const isEnrolled   = ctx?.isEnrolled   ?? (() => false)

  const deptCode   = course?.department?.code || ''
  const tagKey     = TAG_MAP[deptCode] || 'default'
  const tagClass   = `course-card__tag course-card__tag--${tagKey}`
  const enrolled   = isEnrolled(course.id)
  const inCart     = isInCart(course.id)

  // available_spots and is_full may be missing if backend hasn't computed them yet
  const isFull       = course.is_full ?? false
  const available    = course.available_spots ?? 0
  const waitlisted   = course.waitlist_count  ?? 0

  const spotsClass = isFull
    ? 'course-card__spots course-card__spots--full'
    : available <= 5
    ? 'course-card__spots course-card__spots--low'
    : 'course-card__spots course-card__spots--open'

  const spotsLabel = isFull
    ? `Full — ${waitlisted} waitlisted`
    : `${available} spot${available !== 1 ? 's' : ''} open`

  if (!course) return null

  return (
    <div className="course-card">
      <span className={tagClass}>{deptCode} · level {course.level} </span>

      <p className="course-card__title">{course.code} — {course.title}</p>

      <p className="course-card__meta">
        {course.instructor_name} · {course.schedule} · {course.credits} credits
      </p>

      {course.prerequisites?.length > 0 && (
        <p className="course-card__prereq">
          Prereq: {course.prerequisites.map((p) => p.code).join(', ')}
        </p>
      )}

      <div className="course-card__footer">
        <span className={spotsClass}>{spotsLabel}</span>

        {enrolled ? (
          <span className="course-card__enrolled-label">✓ Enrolled</span>
        ) : isFull ? (
          <button
            className="course-card__btn course-card__btn--waitlist"
            onClick={() => onJoinWaitlist?.(course)}
          >
            Join waitlist
          </button>
        ) : inCart ? (
          <button
            className="course-card__btn course-card__btn--incart"
            onClick={() => removeFromCart(course.id)}
          >
            ✓ In cart
          </button>
        ) : (
          <button
            className="course-card__btn course-card__btn--add"
            onClick={() => addToCart(course)}
          >
            + Register
          </button>
        )}
      </div>
    </div>
  )
}