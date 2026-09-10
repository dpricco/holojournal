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
    <div className="min-h-screen flex bg-black text-lcars-orange p-4">
      
      {/* Left Column (LCARS Sidebar) */}
      <div className="w-32 flex flex-col mr-4">
        <div className="bg-lcars-peach h-24 lcars-elbow-top-left mb-2 flex items-end justify-end p-2">
          <span className="text-black font-bold text-2xl">47</span>
        </div>
        
        <Link to="/" className="bg-lcars-blue h-16 w-full mb-2 flex items-center justify-end p-2 hover:bg-lcars-yellow transition-colors">
          <span className="text-black font-bold text-xl text-right">HOME</span>
        </Link>

        {isAuthenticated ? (
          <button onClick={handleLogout} className="bg-lcars-red h-12 w-full mb-2 flex items-center justify-end p-2 hover:bg-lcars-yellow transition-colors text-right">
            <span className="text-black font-bold">LOGOUT</span>
          </button>
        ) : (
          <Link to="/settings" className="bg-lcars-red h-12 w-full mb-2 flex items-center justify-end p-2 hover:bg-lcars-yellow transition-colors text-right">
            <span className="text-black font-bold">CONFIG</span>
          </Link>
        )}

        <div className="bg-lcars-orange flex-1 mb-2 lcars-elbow-bottom-left flex items-end justify-end p-2">
          <span className="text-black font-bold">74205.3</span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="h-24 bg-lcars-peach mb-4 flex items-center px-6 rounded-r-full">
          <h1 className="text-black text-4xl font-bold tracking-widest">GEMINI HOLOJOURNAL</h1>
        </div>

        {/* Content Viewport */}
        <main className="flex-1 overflow-y-auto p-2">
          <Outlet />
        </main>
      </div>

    </div>
  );
};
