import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'

// Route-level code splitting: the landing ships GSAP + ScrollSmoother, the
// dashboard ships Motion. Splitting them means neither route pays for the
// other's animation engine — each loads only what it renders.
const Landing = lazy(() => import('./pages/Landing'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const DeepAnalytics = lazy(() =>
  import('./pages/Dashboard').then((m) => ({ default: m.DeepAnalytics })),
)
const EmployeeForm = lazy(() => import('./pages/EmployeeForm'))
const Competency = lazy(() => import('./pages/Competency'))

// Warm paper hold while a route chunk streams in — no white flash, no spinner.
function RouteFallback() {
  return <div aria-hidden style={{ minHeight: '100vh', background: 'oklch(0.963 0.013 85)' }} />
}

export default function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/dashboard/analytics" element={<DeepAnalytics />} />
        <Route path="/employees/new" element={<EmployeeForm mode="new" />} />
        <Route path="/employees/:id/edit" element={<EmployeeForm mode="edit" />} />
        <Route path="/training" element={<Competency />} />
      </Routes>
    </Suspense>
  )
}
