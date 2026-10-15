import { useState } from 'react'
import {
  Calendar,
  Clock,
  MapPin,
  BookOpen,
  AlertCircle,
  CalendarDays
} from 'lucide-react'
import { useApiQuery } from '../hooks/useApiQuery'
import LecturerSidebar from '../components/LecturerSidebar'
import './AdminDashboard.css'
import './LecturerDashboard.css'

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export default function LecturerTimetable() {
  const infoStr = localStorage.getItem('lecturerInfo')
  const lecturer = infoStr ? JSON.parse(infoStr) : null
  const token = localStorage.getItem('lecturerToken')

  const { data, isLoading, error: queryError } = useApiQuery(
    lecturer?.id ? `/timetable/schedules?lecturerId=${lecturer.id}` : null,
    ['lecturerTimetable', lecturer?.id],
    { axiosOptions: { headers: { Authorization: `Bearer ${token}` } } }
  )

  const schedules = data?.schedules || []
  const error = queryError ? 'Failed to load teaching timetable. Please verify connection.' : ''

  // Group schedules by day
  const groupedSchedules = DAYS_OF_WEEK.reduce((acc, day) => {
    acc[day] = schedules
      .filter(s => s.day_of_week === day)
      .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''))
    return acc
  }, {})

  const formatTime = (timeStr) => {
    if (!timeStr) return ''
    const [h, m] = timeStr.split(':')
    const date = new Date()
    date.setHours(parseInt(h, 10), parseInt(m, 10))
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const activeDaysCount = DAYS_OF_WEEK.filter(day => groupedSchedules[day].length > 0).length

  return (
    <div className="scope-lecturertimetable scope-admindashboard admin-layout fade-in-section is-visible">
      <LecturerSidebar />

      <main className="admin-content">
        <header className="dashboard-hero fade-in-item">
          <div className="hero-content">
            <h1>Teaching Timetable</h1>
            <p>Your weekly lecture allocations, designated lecture rooms, and schedule timings.</p>
          </div>
          <div className="hero-decoration"></div>
        </header>

        {isLoading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading scheduled sessions...</p>
          </div>
        ) : error ? (
          <div className="empty-state" style={{ padding: '3rem', textAlign: 'center' }}>
            <AlertCircle size={44} style={{ color: '#ef4444', marginBottom: '1rem' }} />
            <h3 style={{ margin: '0 0 0.5rem', color: '#1e293b' }}>Timetable Unavailable</h3>
            <p style={{ color: '#64748b' }}>{error}</p>
          </div>
        ) : (
          <>
            {/* Quick summary stats */}
            <div className="stats-grid fade-in-section is-visible" style={{ marginBottom: '2rem' }}>
              <div className="stat-card fade-in-item">
                <div className="stat-icon-wrapper bg-blue">
                  <CalendarDays size={24} className="text-blue" />
                </div>
                <div className="stat-content">
                  <h3>Weekly Sessions</h3>
                  <div className="stat-value-row">
                    <p className="stat-number">{schedules.length}</p>
                    <span className="trend positive">Total Classes</span>
                  </div>
                </div>
              </div>

              <div className="stat-card fade-in-item">
                <div className="stat-icon-wrapper bg-indigo">
                  <Clock size={24} className="text-indigo" />
                </div>
                <div className="stat-content">
                  <h3>Active Days</h3>
                  <div className="stat-value-row">
                    <p className="stat-number">{activeDaysCount}</p>
                    <span className="trend neutral">Days per week</span>
                  </div>
                </div>
              </div>
            </div>

            {schedules.length === 0 ? (
              <div className="empty-state" style={{ padding: '3.5rem', textAlign: 'center', background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                <Calendar size={48} strokeWidth={1.5} style={{ color: '#94a3b8', marginBottom: '1rem' }} />
                <h3 style={{ margin: '0 0 0.5rem', color: '#1e293b' }}>No Scheduled Classes</h3>
                <p style={{ color: '#64748b', maxWidth: '420px', margin: '0 auto' }}>
                  There are no scheduled lectures found for your profile in the current academic semester.
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '1.5rem' }}>
                {DAYS_OF_WEEK.map(day => {
                  const daySchedules = groupedSchedules[day]
                  if (daySchedules.length === 0) return null

                  return (
                    <div
                      key={day}
                      style={{
                        background: '#ffffff',
                        borderRadius: '14px',
                        padding: '1.5rem',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingBottom: '0.85rem',
                        marginBottom: '1rem',
                        borderBottom: '2px solid #f1f5f9'
                      }}>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-secondary, #1e293b)' }}>
                          {day}
                        </h3>
                        <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                          {daySchedules.length} session{daySchedules.length !== 1 ? 's' : ''}
                        </span>
                      </div>

                      <div style={{ display: 'grid', gap: '10px' }}>
                        {daySchedules.map(s => (
                          <div
                            key={s.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '1rem 1.25rem',
                              borderRadius: '10px',
                              background: '#f8fafc',
                              border: '1px solid #e2e8f0',
                              flexWrap: 'wrap',
                              gap: '12px'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                              <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                background: 'rgba(0, 82, 204, 0.08)',
                                color: 'var(--color-primary, #0052cc)',
                                padding: '6px 12px',
                                borderRadius: '6px',
                                fontWeight: 600,
                                fontSize: '0.85rem'
                              }}>
                                <Clock size={14} />
                                <span>{formatTime(s.start_time)} &ndash; {formatTime(s.end_time)}</span>
                              </div>

                              <div>
                                <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.95rem' }}>
                                  <span style={{ color: 'var(--color-primary, #0052cc)', marginRight: '6px' }}>{s.course_code}</span>
                                  {s.course_name}
                                </div>
                                {s.term_name && (
                                  <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                                    Term: {s.term_name}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: '#475569', background: '#ffffff', padding: '6px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                              <MapPin size={14} style={{ color: 'var(--color-primary, #0052cc)' }} />
                              <span>{s.room_name}{s.building ? `, ${s.building}` : ''}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
