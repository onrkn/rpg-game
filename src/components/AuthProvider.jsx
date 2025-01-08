import React, { createContext, useState, useContext, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useGameStore } from '../store/gameStore';
import { toast } from 'react-toastify';

const AuthContext = createContext(null);

const showNotification = (message, type = 'info') => {
  switch(type) {
    case 'success':
      toast.success(message);
      break;
    case 'error':
      toast.error(message);
      break;
    case 'warning':
      toast.warning(message);
      break;
    default:
      toast.info(message);
  }
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const gameStore = useGameStore();
  const { fetchPlayer } = gameStore;

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
          console.log('Mevcut session:', session);
          console.log('Session user:', session.user);

          // Kullanıcı zaten bir kullanıcı adına sahipse
          const { data: playerData, error: playerError } = await supabase
            .from('players')
            .select('*')
            .eq('id', session.user.id)
            .single();

          console.log('Player data sorgusu:', { playerData, playerError });

          if (playerError || !playerData) {
            console.warn('Oyuncu profili bulunamadı, set-username sayfasına yönlendirilecek');
            navigate('/set-username');
          } else {
            setUser(session.user);
            // Oyuncu bilgilerini yükle ve güncel verileri al
            await fetchPlayer(session.user.id);

            // Sadece auth sayfasındaysa ana sayfaya yönlendir
            if (location.pathname === '/auth') {
              navigate('/');
            }
          }
        } else {
          setUser(null);
          navigate('/auth');
        }
      } catch (error) {
        console.error('Authentication check error:', error);
        setUser(null);
        navigate('/auth');
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      switch (event) {
        case 'SIGNED_IN':
          setUser(session?.user || null);
          setLoading(false);
          // Oyuncu bilgilerini yükle ve güncel verileri al
          fetchPlayer(session?.user?.id);

          // Sadece auth sayfasındaysa ana sayfaya yönlendir
          if (location.pathname === '/auth') {
            navigate('/');
          }
          break;
        case 'SIGNED_OUT':
          setUser(null);
          navigate('/auth');
          break;
        default:
          break;
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate, location, fetchPlayer]);

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: 'https://rpg-game-weld.vercel.app/auth/callback' // Doğru Vercel URL'si
      }
    });

    if (error) {
      console.error('Google login hatası:', error);
      showNotification('Giriş yapılamadı', 'error');
    }
  };

  const value = {
    user,
    loading,
    signInWithGoogle,
    signOut: async () => {
      await supabase.auth.signOut();
      setUser(null);
      navigate('/auth');
    }
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthProvider;
