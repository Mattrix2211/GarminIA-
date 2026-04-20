import { useAuthStore } from '@/stores/authStore'

export function ProfilePage() {
  const { user, signOut } = useAuthStore()
  return (
    <div style={{ padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <h1>Profil</h1>
      <p style={{ color: 'var(--text-secondary)' }}>{user?.email}</p>
      <button
        onClick={signOut}
        style={{
          padding: '14px', borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border)', color: 'var(--danger)',
          fontSize: '1rem', marginTop: 8,
        }}
      >
        Se déconnecter
      </button>
    </div>
  )
}
