import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useProfileStore } from '@/stores/profileStore'
import { useGarminSync } from '@/hooks/useGarminSync'
import { AuthLayout } from '@/layouts/AuthLayout'
import { AppLayout } from '@/layouts/AppLayout'
import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { OnboardingPage } from '@/pages/onboarding/OnboardingPage'
import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { SessionPage } from '@/pages/session/SessionPage'
import { ChatPage } from '@/pages/chat/ChatPage'
import { StatsPage } from '@/pages/stats/StatsPage'
import { JournalPage } from '@/pages/journal/JournalPage'
import { CalendarPage } from '@/pages/calendar/CalendarPage'
import { ProfilePage } from '@/pages/profile/ProfilePage'
import { SettingsPage } from '@/pages/settings/SettingsPage'
import { LoadingScreen } from '@/components/ui/LoadingScreen'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore()
  const { profile, loading: profileLoading } = useProfileStore()

  if (loading || profileLoading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  if (user && profile && !profile.onboarding_completed) return <Navigate to="/onboarding" replace />
  return <>{children}</>
}

function OnboardingRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore()
  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  const { init } = useAuthStore()
  const { fetchProfile } = useProfileStore()
  const { user } = useAuthStore()
  useGarminSync()

  useEffect(() => {
    init()
  }, [init])

  useEffect(() => {
    if (user) fetchProfile()
  }, [user, fetchProfile])

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>

        <Route path="/onboarding" element={
          <OnboardingRoute><OnboardingPage /></OnboardingRoute>
        } />

        <Route path="/garmin/callback" element={<GarminCallbackPage />} />

        <Route element={
          <ProtectedRoute><AppLayout /></ProtectedRoute>
        }>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/session/:sessionId" element={<SessionPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/journal" element={<JournalPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

function GarminCallbackPage() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const state = params.get('state')
    if (code && state) {
      window.opener?.postMessage({ type: 'GARMIN_OAUTH', code, state }, window.location.origin)
      window.close()
    }
  }, [])
  return <LoadingScreen message="Connexion Garmin en cours…" />
}
