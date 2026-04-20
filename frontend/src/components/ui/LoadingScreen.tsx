import styles from './LoadingScreen.module.css'

interface Props {
  message?: string
}

export function LoadingScreen({ message }: Props) {
  return (
    <div className={styles.screen}>
      <div className={styles.spinner} />
      {message && <p className={styles.message}>{message}</p>}
    </div>
  )
}
