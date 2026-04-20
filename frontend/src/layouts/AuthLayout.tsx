import { Outlet } from 'react-router-dom'
import styles from './AuthLayout.module.css'

export function AuthLayout() {
  return (
    <div className={styles.container}>
      <div className={styles.brand}>
        <h1>GarminIA</h1>
        <p>Ton coach sportif personnel</p>
      </div>
      <div className={styles.card}>
        <Outlet />
      </div>
    </div>
  )
}
