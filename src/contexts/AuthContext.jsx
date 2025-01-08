import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { toast } from 'react-toastify';

// Context oluştur
const AuthContext = createContext();

// Provider bileşeni
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchPlayerData = useCallback(async (userId) => {
    if (!userId) {
      console.error('🚨 No user ID provided for player data fetch');
      return null;
    }

    try {
      console.log(`🔍 Fetching player data for user ID: ${userId}`);
      
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('🚨 Player data fetch error:', error);
        return null;
      }

      console.log('✅ Player data fetched successfully:', data);
      return data;
    } catch (fetchError) {
      console.error('🚨 Player data fetch exception:', fetchError);
      return null;
    }
  }, []);

  useEffect(() => {
    const checkInitialSession = async () => {
      try {
        console.log('🕵️ Checking initial session...');
        
        const { data: { session } } = await supabase.auth.getSession();
        
        console.log('🔍 Initial Session Details:', {
          sessionExists: !!session,
          userEmail: session?.user?.email || 'No User',
          userId: session?.user?.id || 'No ID'
        });

        if (session?.user) {
          console.log(`🔑 User found: ${session.user.email}`);
          
          const playerData = await fetchPlayerData(session.user.id);

          if (playerData) {
            console.log('👤 Player data found, creating user object');
            
            const userFromPlayer = {
              id: playerData.id,
              email: session.user.email || playerData.username + '@game.com',
              username: playerData.username
            };

            console.log('👥 User Object:', userFromPlayer);
            
            setUser(userFromPlayer);
            setProfile(playerData);
          } else {
            console.warn('❗ No player data found, setting session user');
            setUser(session.user);
          }
        } else {
          console.warn('❌ No session user found');
        }
      } catch (error) {
        console.error('🚨 Initial Session Check Error:', error);
      } finally {
        console.log('✨ Authentication initialization complete');
        setLoading(false);
      }
    };

    checkInitialSession();
  }, [fetchPlayerData]);

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔁 Auth state changed:', event);
        console.log('🔍 Session:', session);

        if (event === 'SIGNED_IN' && session?.user) {
          console.log(`🔑 User signed in: ${session.user.email}`);
          
          const playerData = await fetchPlayerData(session.user.id);

          console.log('🔍 Player data sorgusu (auth state change):', playerData);

          if (playerData) {
            console.log('👤 Player data found, creating user object');
            
            const userFromPlayer = {
              id: playerData.id,
              email: session.user.email || playerData.username + '@game.com',
              username: playerData.username
            };

            console.log('👥 User Object:', userFromPlayer);
            
            setUser(userFromPlayer);
            setProfile(playerData);
            setLoading(false);
          } else {
            console.warn('❗ No player data found (auth state change)');
            setUser(session.user);
            setProfile(null);
            setLoading(false);
          }
        } else if (event === 'SIGNED_OUT') {
          console.log('🚫 User signed out');
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [fetchPlayerData]);

  const signIn = async (email, password) => {
    setLoading(true);
    try {
      console.log(`🔑 Signing in user: ${email}`);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('🚨 Sign in error:', error);
        toast.error(error.message);
        setLoading(false);
        return false;
      }

      console.log('✅ User signed in successfully:', data.user);
      
      if (data.user) {
        const playerData = await fetchPlayerData(data.user.id);
        
        if (playerData) {
          console.log('👤 Player data found, setting user and profile');
          setUser(data.user);
          setProfile(playerData);
        } else {
          console.warn('❗ No player data found, setting session user');
          setUser(data.user);
        }
      }

      setLoading(false);
      return true;
    } catch (error) {
      console.error('🚨 Sign in error:', error);
      toast.error('Giriş yapılırken bir hata oluştu');
      setLoading(false);
      return false;
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      console.log('🚫 Signing out user...');
      
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      setLoading(false);
    } catch (error) {
      console.error('🚨 Sign out error:', error);
      toast.error('Çıkış yapılırken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email, password, username) => {
    setLoading(true);
    try {
      console.log(`📝 Signing up user: ${email}`);
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username
          }
        }
      });

      if (error) {
        console.error('🚨 Sign up error:', error);
        toast.error(error.message);
        throw error;
      }

      console.log('✅ User signed up successfully:', data.user);
      
      if (data.user) {
        console.log('📝 Creating profile for user...');
        
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            username,
          });

        if (profileError) {
          console.error('🚨 Profile creation error:', profileError);
          toast.error('Profil oluşturulamadı');
        } else {
          console.log('✅ Profile created successfully');
          setUser(data.user);
          const profileData = await fetchPlayerData(data.user.id);
          if (profileData) {
            setProfile(profileData);
          }
        }
      }

      toast.success('Kayıt başarılı');
      return data;
    } catch (error) {
      console.error('🚨 Sign up error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Context value'sunu oluştur
  const value = {
    user,
    profile,
    loading,
    signIn,
    signOut,
    signUp
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook oluştur
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};