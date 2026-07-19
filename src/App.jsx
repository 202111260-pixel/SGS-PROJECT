import { lazy, Suspense } from 'react'
import { Routes, Route, Link } from 'react-router-dom'

// Route-level code splitting: the landing ships GSAP + ScrollSmoother, the
// dashboard ships Motion. Splitting them means neither route pays for the
// other's animation engine — each loads only what it renders.
const Landing = lazy(() => import('./pages/Landing'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const DeepAnalytics = lazy(() =>
  import('./pages/Dashboard').then((m) => ({ default: m.DeepAnalytics })),
)
const EmployeeForm = lazy(() => import('./pages/EmployeeForm'))
const EmployeeDirectory = lazy(() => import('./pages/EmployeeDirectory'))
const EmployeeProfile = lazy(() => import('./pages/EmployeeProfile'))
const Competency = lazy(() => import('./pages/Competency'))
const Roster = lazy(() => import('./pages/Roster'))
const Team = lazy(() => import('./pages/Team'))

// Warm paper hold while a route chunk streams in — no white flash, no spinner.
function RouteFallback() {
  return <div aria-hidden style={{ minHeight: '100vh', background: 'oklch(0.963 0.013 85)' }} />
}

// Catch-all: any unknown URL (typo, stale link, deep-link refresh) lands here
// instead of a blank screen, with a way back into the app.
function NotFound() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: 'oklch(0.963 0.013 85)',
        color: 'oklch(0.22 0.02 55)',
        fontFamily: 'system-ui, sans-serif',
        textAlign: 'center',
        padding: '2rem',
      }}
    >
      <div>
        <p style={{ fontSize: '0.75rem', letterSpacing: '0.18em', textTransform: 'uppercase', opacity: 0.6 }}>
          Error 404
        </p>
        <h1 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', margin: '0.5rem 0 0.75rem' }}>Page not found</h1>
        <p style={{ fontSize: '0.95rem', opacity: 0.7, margin: '0 0 1.5rem' }}>
          The page you’re looking for doesn’t exist or has moved.
        </p>
        <Link
          to="/dashboard"
          style={{
            display: 'inline-block',
            borderRadius: '999px',
            background: 'oklch(0.22 0.02 55)',
            color: 'oklch(0.963 0.013 85)',
            padding: '0.65rem 1.4rem',
            fontSize: '0.9rem',
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/dashboard/analytics" element={<DeepAnalytics />} />
        <Route path="/employees" element={<EmployeeDirectory />} />
        <Route path="/employees/new" element={<EmployeeForm mode="new" />} />
        <Route path="/employees/:id/edit" element={<EmployeeForm mode="edit" />} />
        <Route path="/employees/:id" element={<EmployeeProfile />} />
        <Route path="/training" element={<Competency />} />
        <Route path="/roster" element={<Roster />} />
        <Route path="/team" element={<Team />} />
        <Route path="/team/:id" element={<Team />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  )
}
