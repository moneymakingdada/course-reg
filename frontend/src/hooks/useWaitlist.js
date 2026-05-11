import { useState, useEffect, useCallback, useRef } from 'react'
import { getMyWaitlist, getNotifications, markNotificationRead, leaveWaitlist, acceptSpot } from '../api/waitlist'

/**
 * useWaitlist()
 * Manages the student's waitlist entries and polls for new spot notifications.
 *
 * Usage:
 *   const { entries, notifications, unreadCount, leave, accept, loading } = useWaitlist()
 */
export function useWaitlist(pollInterval = 30_000) {
  const [entries,       setEntries]       = useState([])
  const [notifications, setNotifications] = useState([])
  const [loading,       setLoading]       = useState(false)
  const [error,         setError]         = useState(null)
  const intervalRef = useRef(null)

  // ── Fetch waitlist entries ──────────────────────────────────────────────
  const fetchEntries = useCallback(async () => {
    try {
      const data = await getMyWaitlist()
      setEntries(Array.isArray(data) ? data : data.results || [])
    } catch (err) {
      setError('Failed to load waitlist.')
    }
  }, [])

  // ── Fetch notifications ─────────────────────────────────────────────────
  const fetchNotifications = useCallback(async () => {
    try {
      const data = await getNotifications()
      setNotifications(Array.isArray(data) ? data : data.results || [])
    } catch (err) {
      // Silently fail — notifications are non-critical
    }
  }, [])

  // ── Initial load + polling ──────────────────────────────────────────────
  useEffect(() => {
    setLoading(true)
    Promise.all([fetchEntries(), fetchNotifications()]).finally(() => setLoading(false))

    // Poll every 30s to check if a spot opened up
    intervalRef.current = setInterval(() => {
      fetchEntries()
      fetchNotifications()
    }, pollInterval)

    return () => clearInterval(intervalRef.current)
  }, [fetchEntries, fetchNotifications, pollInterval])

  // ── Leave waitlist ──────────────────────────────────────────────────────
  const leave = useCallback(async (entryId) => {
    await leaveWaitlist(entryId)
    setEntries((prev) => prev.filter((e) => e.id !== entryId))
  }, [])

  // ── Accept spot ─────────────────────────────────────────────────────────
  const accept = useCallback(async (entryId) => {
    const result = await acceptSpot(entryId)
    setEntries((prev) => prev.filter((e) => e.id !== entryId))
    return result
  }, [])

  // ── Mark notification read ──────────────────────────────────────────────
  const markRead = useCallback(async (notifId) => {
    await markNotificationRead(notifId)
    setNotifications((prev) =>
      prev.map((n) => (n.id === notifId ? { ...n, is_read: true } : n))
    )
  }, [])

  // ── Derived state ───────────────────────────────────────────────────────
  const unreadCount       = notifications.filter((n) => !n.is_read).length
  const pendingSpots      = entries.filter((e) => e.notified && !e.accepted)

  return {
    entries,
    notifications,
    unreadCount,
    pendingSpots,
    loading,
    error,
    leave,
    accept,
    markRead,
    refetch: fetchEntries,
  }
}