import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './components/AuthProvider';
import { NotificationProvider } from './contexts/NotificationContext';
import Navigation from './components/Navigation';
import Profile from './pages/Profile';
import Market from './pages/Market';
import Combat from './pages/Combat';
import Clan from './pages/Clan';
import Auth from './pages/Auth';
import SetUsername from './pages/SetUsername';
import BattlePage from './pages/BattlePage';
import ClanPage from './pages/ClanPage';
import Casino from './pages/Casino';
import { useGameStore } from './store/gameStore';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Korumalı route bileşeni
function ProtectedRoute({ children }) {
  const { user, loading: authLoading } = useAuth();
  const { loading: playerLoading } = useGameStore();

  if (authLoading || playerLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return children;
}

// Ana uygulama içeriği
function AppContent() {
  const { user } = useAuth();

  const routes = [
    { 
      path: "/auth", 
      element: <Auth />,
      key: "auth"
    },
    { 
      path: "/auth/callback", 
      element: <Auth />,
      key: "auth-callback"
    },
    { 
      path: "/set-username", 
      element: <SetUsername />,
      key: "set-username"
    },
    { 
      path: "/", 
      element: (
        <ProtectedRoute>
          <Profile />
        </ProtectedRoute>
      ),
      key: "profile"
    },
    { 
      path: "/market", 
      element: (
        <ProtectedRoute>
          <Market />
        </ProtectedRoute>
      ),
      key: "market"
    },
    { 
      path: "/combat", 
      element: (
        <ProtectedRoute>
          <Combat />
        </ProtectedRoute>
      ),
      key: "combat"
    },
    { 
      path: "/clan", 
      element: (
        <ProtectedRoute>
          <ClanPage />
        </ProtectedRoute>
      ),
      key: "clan"
    },
    { 
      path: "/battle", 
      element: <BattlePage />,
      key: "battle"
    },
    { 
      path: "/casino", 
      element: (
        <ProtectedRoute>
          <Casino />
        </ProtectedRoute>
      ),
      key: "casino"
    }
  ];

  React.useEffect(() => {
    const incrementArenaBattles = () => {
      const profilePage = document.querySelector('[data-page="profile"]');
      if (profilePage && profilePage.incrementArenaBattles) {
        profilePage.incrementArenaBattles();
      }
    };

    window.incrementArenaBattles = incrementArenaBattles;

    return () => {
      delete window.incrementArenaBattles;
    };
  }, []);

  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-900 text-white flex flex-col">
      <div className="flex-grow overflow-auto">
        <Routes>
          {routes.map(route => (
            <Route 
              key={route.key} 
              path={route.path} 
              element={route.element} 
            />
          ))}
        </Routes>
      </div>
      {user && <Navigation />}
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <NotificationProvider>
          <AppContent />
          <ToastContainer 
            position="top-right"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="dark"
          />
        </NotificationProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
