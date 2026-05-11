import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { getNotifications, markNotificationRead } from '../api/waitlist'
import axiosInstance from '../api/axiosInstance'


const ICON_MAP = {
  spot_available: { emoji: '🔔', cls: 'notif-item__icon--spot'     },
  spot_enrolled:  { emoji: '✅', cls: 'notif-item__icon--enrolled'  },
  removed:        { emoji: '❌', cls: 'notif-item__icon--removed'   },
  general:        { emoji: '📣', cls: 'notif-item__icon--general'   },
}

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000)
  if (diff < 60)   return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default function NotificationBell() {
  const [open,          setOpen]          = useState(false)
  const [notifications, setNotifications] = useState([])
  const [loading,       setLoading]       = useState(false)
  const dropdownRef = useRef(null)

  const unreadCount = notifications.filter((n) => !n.is_read).length

  // Fetch notifications
  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getNotifications()
      setNotifications(Array.isArray(data) ? data : data.results ?? [])
    } catch { /* silently fail */ }
    finally { setLoading(false) }
  }, [])

  // Poll every 30 seconds for new notifications
  useEffect(() => {
    fetch()
    const interval = setInterval(fetch, 30_000)
    return () => clearInterval(interval)
  }, [fetch])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleOpen = () => {
    setOpen((prev) => !prev)
    if (!open) fetch()  // refresh on open
  }

  const handleRead = async (notif) => {
    if (!notif.is_read) {
      await markNotificationRead(notif.id)
      setNotifications((prev) =>
        prev.map((n) => n.id === notif.id ? { ...n, is_read: true } : n)
      )
    }
  }

  const handleReadAll = async () => {
    try {
      await axiosInstance.patch('/waitlist/notifications/read-all/')
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    } catch { /* silently fail */ }
  }

  return (
    <div className="notif-bell" ref={dropdownRef}>
      {/* Bell button */}
      <button className="notif-bell__btn" onClick={handleOpen} aria-label="Notifications">
        🔔
        {unreadCount > 0 && (
          <span className="notif-bell__badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="notif-dropdown">
          <div className="notif-dropdown__header">
            <p className="notif-dropdown__title">
              Notifications {unreadCount > 0 && `(${unreadCount} new)`}
            </p>
            {unreadCount > 0 && (
              <button className="notif-dropdown__read-all" onClick={handleReadAll}>
                Mark all read
              </button>
            )}
          </div>

          {loading && notifications.length === 0 ? (
            <p className="notif-dropdown__empty">Loading…</p>
          ) : notifications.length === 0 ? (
            <p className="notif-dropdown__empty">No notifications yet</p>
          ) : (
            notifications.slice(0, 8).map((notif) => {
              const icon = ICON_MAP[notif.type] || ICON_MAP.general
              return (
                <div
                  key={notif.id}
                  className={`notif-item${!notif.is_read ? ' notif-item--unread' : ''}`}
                  onClick={() => handleRead(notif)}
                >
                  <div className={`notif-item__icon ${icon.cls}`}>{icon.emoji}</div>
                  <div className="notif-item__body">
                    <p className="notif-item__title">{notif.title}</p>
                    <p className="notif-item__msg">{notif.message}</p>
                    <p className="notif-item__time">{timeAgo(notif.created_at)}</p>
                  </div>
                  {!notif.is_read && <div className="notif-item__unread-dot" />}
                </div>
              )
            })
          )}

          <div className="notif-dropdown__footer">
            <Link to="/student/waitlist" onClick={() => setOpen(false)}>
              View all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}