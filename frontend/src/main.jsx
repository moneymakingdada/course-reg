import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './styles/Admindashboard.css'
import './styles/Studentdashboard.css'
import './styles/Instructordashboard.css'
import './styles/MyCourses.css'
import './styles/auth.css'
import './styles/global.css'
import './styles/Navbar.css'
import './styles/Sidebar.css'
import './styles/Registration.css'
import './styles/Waitlist.css'
import './styles/Coursemanagement.css'
import './styles/Registrationmonitor.css'
import './styles/Paymentsmonitor.css'
import './styles/Notificationbell.css'


createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
