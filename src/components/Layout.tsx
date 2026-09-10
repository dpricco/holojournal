import React, { useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { signOut, loadGapiAndAuthenticate } from '../services/authService';

export const Layout: React.FC = () => {
  const { isAuthenticated, googleClientId, clearCredentials } = useAppStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isAuthenticated && googleClientId && location.pathname !== '/settings') {
      loadGapiAndAuthenticate().catch(() => navigate('/settings'));
    } else if (!isAuthenticated && !googleClientId && location.pathname !== '/settings') {
      navigate('/settings');
    }
  }, [isAuthenticated, googleClientId, location.pathname, navigate]);

  const handleLogout = () => {
    signOut();
    clearCredentials();
  };

  return (
    <div className="min-h-screen flex bg-black text-lcars-orange p-2 md:p-4">
      
      {/* Left Column (LCARS Sidebar) */}
      <div className="w-12 md:w-24 flex flex-col mr-2 md:mr-4 shrink-0">
        <div className="bg-lcars-peach h-16 md:h-24 lcars-elbow-top-left mb-2 flex items-end justify-end p-2">
        </div>
        
        <div className="bg-lcars-orange flex-1 mb-2 lcars-elbow-bottom-left flex items-end justify-end p-2">
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <div className="h-16 md:h-24 bg-lcars-peach mb-2 flex items-center px-4 md:px-6 rounded-r-full shrink-0">
          <h1 className="text-black text-xl md:text-4xl font-bold tracking-widest truncate">GEMINI HOLOJOURNAL</h1>
        </div>

        {/* Navigation Bar */}
        <div className="flex space-x-2 mb-4 shrink-0">
          <Link to="/" className="bg-lcars-blue h-10 px-4 rounded-r-full flex items-center justify-center hover:bg-lcars-yellow transition-colors flex-1">
            <span className="text-black font-bold text-sm md:text-base">HOME</span>
          </Link>

          {isAuthenticated ? (
            <button onClick={handleLogout} className="bg-lcars-red h-10 px-4 rounded-l-full flex items-center justify-center hover:bg-lcars-yellow transition-colors flex-1">
              <span className="text-black font-bold text-sm md:text-base">LOGOUT</span>
            </button>
          ) : (
            <Link to="/settings" className="bg-lcars-red h-10 px-4 rounded-l-full flex items-center justify-center hover:bg-lcars-yellow transition-colors flex-1">
              <span className="text-black font-bold text-sm md:text-base">CONFIG</span>
            </Link>
          )}
        </div>

        {/* Content Viewport */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-1 md:p-2">
          <Outlet />
        </main>
      </div>

    </div>
  );
};
