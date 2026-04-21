import { Outlet, NavLink } from 'react-router-dom'
import styles from './AppLayout.module.css'

// SVG nav icons — monochromes, sport-pro
function IcoHome({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M3 9.5L11 3L19 9.5V19H14V14H8V19H3V9.5Z"
        stroke={active ? 'var(--accent)' : 'var(--text-muted)'}
        strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
        fill={active ? 'rgba(200,240,100,0.08)' : 'none'}
      />
    </svg>
  )
}
function IcoChat({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M4 4H18V14H12L8 18V14H4V4Z"
        stroke={active ? 'var(--accent)' : 'var(--text-muted)'}
        strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
        fill={active ? 'rgba(200,240,100,0.08)' : 'none'}
      />
      <path d="M7.5 9H14.5M7.5 11.5H11.5"
        stroke={active ? 'var(--accent)' : 'var(--text-muted)'}
        strokeWidth="1.5" strokeLinecap="round"
      />
    </svg>
  )
}
function IcoJournal({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect x="4" y="3" width="14" height="16" rx="2"
        stroke={active ? 'var(--accent)' : 'var(--text-muted)'}
        strokeWidth="1.5"
        fill={active ? 'rgba(200,240,100,0.08)' : 'none'}
      />
      <path d="M7.5 8H14.5M7.5 11H14.5M7.5 14H11"
        stroke={active ? 'var(--accent)' : 'var(--text-muted)'}
        strokeWidth="1.5" strokeLinecap="round"
      />
    </svg>
  )
}
function IcoStats({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M4 18V13M8.5 18V9M13 18V12M17.5 18V6"
        stroke={active ? 'var(--accent)' : 'var(--text-muted)'}
        strokeWidth="1.5" strokeLinecap="round"
      />
    </svg>
  )
}
function IcoSettings({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <circle cx="11" cy="11" r="2.5"
        stroke={active ? 'var(--accent)' : 'var(--text-muted)'}
        strokeWidth="1.5"
      />
      <path d="M11 3.5V2M11 20V18.5M3.5 11H2M20 11H18.5M5.636 5.636L4.575 4.575M17.425 17.425L16.364 16.364M5.636 16.364L4.575 17.425M17.425 4.575L16.364 5.636"
        stroke={active ? 'var(--accent)' : 'var(--text-muted)'}
        strokeWidth="1.5" strokeLinecap="round"
      />
    </svg>
  )
}

const navItems = [
  { to: '/', label: 'Accueil', Icon: IcoHome },
  { to: '/chat', label: 'Coach', Icon: IcoChat },
  { to: '/journal', label: 'Journal', Icon: IcoJournal },
  { to: '/stats', label: 'Stats', Icon: IcoStats },
  { to: '/settings', label: 'Réglages', Icon: IcoSettings },
]

export function AppLayout() {
  return (
    <div className={styles.layout}>
      <main className={styles.main}>
        <Outlet />
      </main>
      <nav className={styles.bottomNav}>
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `${styles.navItem} ${isActive ? styles.active : ''}`
            }
          >
            {({ isActive }) => (
              <>
                <item.Icon active={isActive} />
                <span className={styles.navLabel}>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
