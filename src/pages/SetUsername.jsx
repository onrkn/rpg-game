import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useGameStore } from '../store/gameStore';

function SetUsername() {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }
      setUser(user);
    };
    getUser();
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      // Kullanıcı adının benzersiz olup olmadığını kontrol et
      const { data: existingUser, error: checkError } = await supabase
        .from('players')
        .select('username')
        .eq('username', username)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existingUser) {
        setError('Bu kullanıcı adı zaten kullanılıyor');
        return;
      }

      // Yeni oyuncu oluştur
      const { error: insertError } = await supabase
        .from('players')
        .insert([
          {
            id: user.id,
            username: username,
            level: 1,
            experience: 0,
            power: 1000,
            gold: 100,
            created_at: new Date().toISOString()
          }
        ]);

      if (insertError) throw insertError;

      // Başarılı! Ana sayfaya yönlendir
      navigate('/');
    } catch (error) {
      console.error('Kullanıcı adı kaydedilirken hata:', error.message);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="card max-w-md w-full mx-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Hoş Geldin Savaşçı!</h1>
          <p className="text-slate-400">Maceraya başlamadan önce kendine bir isim seç</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Kullanıcı adını gir"
              className="input w-full"
              minLength={3}
              maxLength={20}
              pattern="[a-zA-Z0-9_]+"
              title="Sadece harf, rakam ve alt çizgi kullanabilirsin"
              required
            />
            {error && (
              <p className="text-red-500 text-sm mt-1">{error}</p>
            )}
          </div>

          <button
            type="submit"
            className="btn-primary w-full"
            disabled={loading}
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Kaydediliyor...
              </div>
            ) : (
              'Maceraya Başla'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default SetUsername;
