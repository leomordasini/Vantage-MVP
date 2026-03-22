import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Admin from './pages/Admin'
import Customers from './pages/Customers'
import CustomerDetail from './pages/CustomerDetail'
import DirectReports from './pages/DirectReports'
import DirectReportDetail from './pages/DirectReportDetail'
import Projects from './pages/Projects'
import ProjectDetail from './pages/ProjectDetail'
import Tasks from './pages/Tasks'
import Meetings from './pages/Meetings'
import MeetingDetail from './pages/MeetingDetail'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="admin" element={<Admin />} />
        <Route path="customers" element={<Customers />} />
        <Route path="customers/:id" element={<CustomerDetail />} />
        <Route path="direct-reports" element={<DirectReports />} />
        <Route path="direct-reports/:id" element={<DirectReportDetail />} />
        <Route path="projects" element={<Projects />} />
        <Route path="projects/:id" element={<ProjectDetail />} />
        <Route path="tasks" element={<Tasks />} />
        <Route path="meetings" element={<Meetings />} />
        <Route path="meetings/:id" element={<MeetingDetail />} />
      </Route>
    </Routes>
  )
}
