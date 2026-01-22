import React, { useState, useCallback, useEffect } from 'react';
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import { PrimeReactProvider } from 'primereact/api';

// Styles
import "primereact/resources/themes/lara-light-cyan/theme.css";
import 'primeicons/primeicons.css';
import 'primeflex/primeflex.css';
import './index.css';

// Components & Pages
import Header from './components/Header';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import Dashboard from './pages/Dashboard';
import DailyActivity from './pages/DailyActivity';
import Profile from './pages/Profile.jsx';
import Resources from './pages/Resources.jsx';
import Login from './pages/Login';
import UserManagement from './pages/UserManagement.jsx';

function App() {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('userInfo');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const handleLogout = useCallback(() => {
    localStorage.clear(); 
    setUser(null);
    // Use navigate or window.location
    window.location.href = '/login?session=expired';
  }, []);

  useEffect(() => {
    if (!user) return; 

    let logoutTimer;
    // Set to 15 minutes as requested (15 * 60 * 1000)
    const timeoutDuration = 15 * 60 * 1000; 

    const resetTimer = () => {
      if (logoutTimer) clearTimeout(logoutTimer);
      logoutTimer = setTimeout(() => {
        handleLogout();
      }, timeoutDuration);
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => window.addEventListener(event, resetTimer));

    resetTimer(); 

    return () => {
      if (logoutTimer) clearTimeout(logoutTimer);
      events.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [user, handleLogout]);

  return (
    <PrimeReactProvider>
      <BrowserRouter>
        <div className="flex flex-column min-h-screen bg-slate-50">
          <Routes>
            {/* Public Route */}
            <Route path="/login" element={
              <>
              <div className="login-div">
                <Header showProfile={false} />
                <main className="flex-grow-1"><Login setUser={setUser} /></main>
                <Footer />
              </div>
              </>
            } />

            {/* Admin Specific Route */}
            <Route path="/users" element={
              <ProtectedRoute requiredRoles={['ADMIN', 'SUPER_ADMIN']}>
                <Header user={user} />
                <main className="flex-grow-1">
                  <UserManagement user={user} />
                </main>
                <Footer />
              </ProtectedRoute>
            } />

            {/* Standard Protected Routes */}
            {['/dashboard', '/daily-activities', '/profile','/resources'].map((path) => {
              // Corrected Conditional Logic
              let Component;
              if (path === '/dashboard') Component = Dashboard;
              else if (path === '/daily-activities') Component = DailyActivity;
              else if (path === '/resources') Component = Resources;
              else Component = Profile;
              return (
                <Route key={path} path={path} element={
                  <ProtectedRoute>
                    <Header user={user} />
                    <main className="flex-grow-1">
                      <Component user={user} />
                    </main>
                    <Footer />
                  </ProtectedRoute>
                } />
              );
            })}

            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </div>
      </BrowserRouter>
    </PrimeReactProvider>
  );

}

export default App;