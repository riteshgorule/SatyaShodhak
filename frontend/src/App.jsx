import { useState } from 'react';
import LandingPage from './pages/LandingPage';
import VerifyPage from './pages/VerifyPage';
import CommunityPage from './pages/CommunityPage';
import DashboardPage from './pages/Dashboard';
import SignInPage from './pages/SignInPage';
import SignUpPage from './pages/SignUpPage';

function App() {
  const [currentPage, setCurrentPage] = useState('landing');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleNavigate = (page) => {
    setCurrentPage(page);
  };

  const handleLogin = () => {
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
  };

  return (
    <>
      {currentPage === 'landing' && <LandingPage onNavigate={handleNavigate} isLoggedIn={isLoggedIn} onLogout={handleLogout} />}
      {currentPage === 'verify' && <VerifyPage onNavigate={handleNavigate} isLoggedIn={isLoggedIn} onLogout={handleLogout} />}
      {currentPage === 'community' && <CommunityPage onNavigate={handleNavigate} isLoggedIn={isLoggedIn} onLogout={handleLogout} />}
      {currentPage === 'dashboard' && <DashboardPage onNavigate={handleNavigate} isLoggedIn={isLoggedIn} onLogout={handleLogout} />}
      {currentPage === 'signin' && <SignInPage onNavigate={handleNavigate} onLogin={handleLogin} />}
      {currentPage === 'signup' && <SignUpPage onNavigate={handleNavigate} onLogin={handleLogin} />}
    </>
  );
}

export default App;
