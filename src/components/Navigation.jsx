import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthProvider';

function Navigation() {
  const location = useLocation();
  const { user } = useAuth();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Çıkış yapılırken hata:', error.message);
    }
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  if (!user || location.pathname === '/auth' || location.pathname === '/set-username') return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50">
      <div className="max-w-lg mx-auto px-4">
        <div className="bg-slate-800/80 backdrop-blur-md rounded-t-2xl shadow-2xl border-t border-slate-700/30">
          <div className="flex justify-between py-2">
            <Link
              to="/"
              className={`flex flex-col items-center flex-1 py-2 px-2 relative transition-all duration-300 ease-in-out ${
                isActive('/') 
                  ? 'text-red-400 scale-105' 
                  : 'text-slate-400 hover:text-slate-200 hover:scale-105'
              }`}
            >
              {isActive('/') && (
                <span className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-red-500 rounded-full"></span>
              )}
              <span className="material-icons text-2xl">person</span>
              <span className="text-xs mt-1 font-medium">Profil</span>
            </Link>

            <Link
              to="/market"
              className={`flex flex-col items-center flex-1 py-2 px-2 relative transition-all duration-300 ease-in-out ${
                isActive('/market') 
                  ? 'text-red-400 scale-105' 
                  : 'text-slate-400 hover:text-slate-200 hover:scale-105'
              }`}
            >
              {isActive('/market') && (
                <span className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-red-500 rounded-full"></span>
              )}
              <span className="material-icons text-2xl">store</span>
              <span className="text-xs mt-1 font-medium">Market</span>
            </Link>

            <Link
              to="/combat"
              className={`flex flex-col items-center flex-1 py-2 px-2 relative transition-all duration-300 ease-in-out ${
                isActive('/combat') 
                  ? 'text-red-400 scale-105' 
                  : 'text-slate-400 hover:text-slate-200 hover:scale-105'
              }`}
            >
              {isActive('/combat') && (
                <span className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-red-500 rounded-full"></span>
              )}
              <span className="material-icons text-2xl">sports_kabaddi</span>
              <span className="text-xs mt-1 font-medium">Savaş</span>
            </Link>

            <Link
              to="/clan"
              className={`flex flex-col items-center flex-1 py-2 px-2 relative transition-all duration-300 ease-in-out ${
                isActive('/clan') 
                  ? 'text-red-400 scale-105' 
                  : 'text-slate-400 hover:text-slate-200 hover:scale-105'
              }`}
            >
              {isActive('/clan') && (
                <span className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-red-500 rounded-full"></span>
              )}
              <span className="material-icons text-2xl">group</span>
              <span className="text-xs mt-1 font-medium">Klan</span>
            </Link>

            <Link
              to="/casino"
              className={`flex flex-col items-center flex-1 py-2 px-2 relative transition-all duration-300 ease-in-out ${
                isActive('/casino') 
                  ? 'text-red-400 scale-105' 
                  : 'text-slate-400 hover:text-slate-200 hover:scale-105'
              }`}
            >
              {isActive('/casino') && (
                <span className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-red-500 rounded-full"></span>
              )}
              <span className="material-icons text-2xl">casino</span>
              <span className="text-xs mt-1 font-medium">Kumarhane</span>
            </Link>

            <button
              onClick={handleLogout}
              className="flex flex-col items-center flex-1 py-2 px-2 text-slate-400 hover:text-red-400 transition-all duration-300 ease-in-out hover:scale-105"
            >
              <span className="material-icons text-2xl">logout</span>
              <span className="text-xs mt-1 font-medium">Çıkış</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navigation;
