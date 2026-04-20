import { Outlet, NavLink } from 'react-router-dom'
import styles from './AppLayout.module.css'

const navItems = [
  { to: '/', label: 'Accueil', icon: '⚡' },
  { to: '/chat', label: 'Coach', icon: '💬' },
  { to: '/journal', label: 'Journal', icon: '📋' },
  { to: '/stats', label: 'Stats', icon: '📈' },
  { to: '/profile', label: 'Profil', icon: '👤' },
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
            <span className={styles.navIcon}>{item.icon}</span>
            <span className={styles.navLabel}>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
