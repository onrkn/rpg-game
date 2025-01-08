import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';

const ClanPage = () => {
  const { user, profile, loading: authLoading } = useAuth();
  
  console.log('ClanPage User:', user);
  console.log('ClanPage Profile:', profile);
  console.log('ClanPage Loading:', authLoading);

  const [clanState, setClanState] = useState({
    currentClan: null,
    availableClans: [],
    members: [],
    isLeader: false,
    loading: true
  });

  const [modalState, setModalState] = useState({
    createClan: false,
    joinClan: false,
    clanName: ''
  });

  const fetchClanData = useCallback(async () => {
    // Eğer authentication hala yükleniyorsa veya kullanıcı yoksa bekleme
    if (authLoading || !profile) {
      console.log('Authentication still loading or no profile');
      setClanState(prev => ({ ...prev, loading: false }));
      return;
    }

    setClanState(prev => ({ ...prev, loading: true }));

    try {
      // Kullanıcının mevcut klan üyeliğini kontrol et
      const { data: memberData, error: memberError } = await supabase
        .from('clan_members')
        .select('clan_id, role, clans(*)')
        .eq('user_id', profile.id)
        .single();

      if (memberError && memberError.code !== 'PGRST116') {
        throw memberError;
      }

      if (memberData) {
        // Kullanıcı bir klana üye
        const { data: membersData, error: membersError } = await supabase
          .from('clan_members')
          .select('user_id, role, power, profiles(username)')
          .eq('clan_id', memberData.clan_id)
          .order('power', { ascending: false });

        if (membersError) throw membersError;

        setClanState({
          currentClan: memberData.clans,
          members: membersData,
          isLeader: memberData.role === 'leader',
          availableClans: [],
          loading: false
        });
      } else {
        // Kullanıcı henüz bir klana üye değil
        const { data: clansData, error: clansError } = await supabase
          .from('clans')
          .select('*')
          .lt('member_count', 10);

        if (clansError) throw clansError;

        setClanState(prev => ({
          ...prev,
          availableClans: clansData || [],
          loading: false
        }));
      }
    } catch (error) {
      console.error('Klan bilgileri yüklenirken hata:', error);
      toast.error('Klan bilgileri yüklenemedi');
      setClanState(prev => ({ ...prev, loading: false }));
    }
  }, [profile, authLoading]);

  useEffect(() => {
    console.log('User or Profile or Loading changed:', { user, profile, authLoading });
    fetchClanData();
  }, [fetchClanData, profile, authLoading]);

  const handleCreateClan = async () => {
    console.log('handleCreateClan called');
    console.log('Current User:', user);
    console.log('Current Profile:', profile);

    if (!profile) {
      console.error('No profile found when trying to create clan');
      toast.error('Klan oluşturmak için giriş yapmalısınız');
      return;
    }

    const trimmedClanName = modalState.clanName.trim();
    
    if (!trimmedClanName) {
      toast.error('Klan adı boş olamaz');
      return;
    }

    try {
      console.log('Attempting to create clan with user ID:', profile.id);
      const { data, error } = await supabase.rpc('create_clan', {
        p_user_id: profile.id,
        p_clan_name: trimmedClanName
      });

      console.log('Full Supabase Response:', { data, error });

      if (error) {
        console.error('Supabase Error:', error);
        toast.error(error.message || 'Klan oluşturma hatası');
        return;
      }

      if (data === null || data === undefined) {
        console.error('No data returned from create_clan');
        toast.error('Klan oluşturulamadı');
        return;
      }

      const parsedData = typeof data === 'string' ? JSON.parse(data) : data;

      console.log('Parsed Data:', parsedData);

      if (parsedData && parsedData.success) {
        toast.success(parsedData.message);
        setModalState(prev => ({ 
          ...prev, 
          createClan: false, 
          clanName: '' 
        }));
        fetchClanData();
      } else {
        toast.error(parsedData?.message || 'Klan oluşturulamadı');
      }
    } catch (error) {
      console.error('Klan oluşturma try-catch hatası:', error);
      toast.error(error.message || 'Beklenmedik bir hata oluştu');
    }
  };

  const handleJoinClan = async (clanId) => {
    try {
      const { data, error } = await supabase.rpc('join_clan', {
        p_user_id: profile.id,
        p_clan_id: clanId
      });

      console.log('Join Clan Full Response:', { data, error });

      if (error) {
        console.error('Supabase Join Clan Error:', error);
        toast.error(error.message || 'Klana katılma hatası');
        return;
      }

      if (!data) {
        console.error('No data returned from join_clan');
        toast.error('Klana katılınamadı');
        return;
      }

      const parsedData = typeof data === 'string' ? JSON.parse(data) : data;

      console.log('Join Clan Parsed Data:', parsedData);

      if (parsedData.success) {
        toast.success(parsedData.message);
        setModalState(prev => ({ ...prev, joinClan: false }));
        fetchClanData();
      } else {
        toast.error(parsedData.message || 'Klana katılınamadı');
      }
    } catch (error) {
      console.error('Klana katılma try-catch hatası:', error);
      toast.error(error.message || 'Beklenmedik bir hata oluştu');
    }
  };

  const handleLeaveClan = async () => {
    try {
      const { data, error } = await supabase.rpc('leave_clan', {
        p_user_id: profile.id
      });

      console.log('Leave Clan Full Response:', { data, error });

      if (error) {
        console.error('Supabase Leave Clan Error:', error);
        toast.error(error.message || 'Klandan çıkma hatası');
        return;
      }

      if (!data) {
        console.error('No data returned from leave_clan');
        toast.error('Klandan çıkılamadı');
        return;
      }

      const parsedData = typeof data === 'string' ? JSON.parse(data) : data;

      console.log('Leave Clan Parsed Data:', parsedData);

      if (parsedData.success) {
        toast.success(parsedData.message);
        fetchClanData();
      } else {
        toast.error(parsedData.message || 'Klandan çıkılamadı');
      }
    } catch (error) {
      console.error('Klandan çıkma try-catch hatası:', error);
      toast.error(error.message || 'Beklenmedik bir hata oluştu');
    }
  };

  if (clanState.loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin mb-4">🌀</div>
          <p className="text-xl">Klan bilgileri yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      {clanState.currentClan ? (
        <div className="max-w-2xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-800 rounded-lg p-6 mb-6"
          >
            <div className="flex justify-between items-center mb-4">
              <h1 className="text-2xl font-bold">{clanState.currentClan.name} Klanı</h1>
              {clanState.isLeader && (
                <span className="bg-yellow-500 text-black px-2 py-1 rounded-full text-xs">
                  Lider
                </span>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-400">Toplam Üye</p>
                <p className="font-semibold">{clanState.currentClan.member_count}/10</p>
              </div>
              <div>
                <p className="text-gray-400">Toplam Güç</p>
                <p className="font-semibold">{clanState.currentClan.total_power || 0}</p>
              </div>
            </div>

            <div className="mt-4 flex justify-center">
              <button 
                onClick={handleLeaveClan}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition duration-300"
              >
                Klandan Ayrıl
              </button>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-800 rounded-lg p-6"
          >
            <h2 className="text-xl font-bold mb-4">Klan Üyeleri</h2>
            {clanState.members.map(member => (
              <motion.div
                key={member.user_id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-between items-center bg-gray-700 rounded-lg p-4 mb-3"
              >
                <div>
                  <p className="font-semibold">{member.profiles.username}</p>
                  <p className="text-sm text-gray-400">
                    {member.role === 'leader' ? 'Klan Lideri' : 'Üye'}
                  </p>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-gray-400">
                    Güç: {member.power}
                  </span>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      ) : (
        <div className="max-w-md mx-auto">
          <h1 className="text-2xl font-bold mb-6 text-center">Klan Sistemi</h1>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-800 rounded-lg p-6 mb-4"
          >
            <p className="text-center mb-4">Henüz bir klana üye değilsiniz</p>
            
            <div className="flex justify-center space-x-4">
              <button 
                onClick={() => setModalState(prev => ({ ...prev, createClan: true }))}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition duration-300"
              >
                Klan Oluştur
              </button>
              {clanState.availableClans.length > 0 && (
                <button 
                  onClick={() => setModalState(prev => ({ ...prev, joinClan: true }))}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition duration-300"
                >
                  Klana Katıl
                </button>
              )}
            </div>
          </motion.div>

          {/* Klan Oluşturma Modal */}
          <AnimatePresence>
            {modalState.createClan && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
              >
                <motion.div
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0.9 }}
                  className="bg-gray-800 rounded-lg p-6 w-96"
                >
                  <h2 className="text-xl font-bold mb-4">Yeni Klan Oluştur</h2>
                  <input 
                    type="text"
                    value={modalState.clanName}
                    onChange={(e) => setModalState(prev => ({ ...prev, clanName: e.target.value }))}
                    placeholder="Klan adını girin"
                    className="w-full p-2 mb-4 bg-gray-700 rounded-lg text-white"
                  />
                  <div className="flex justify-between">
                    <button 
                      onClick={() => setModalState(prev => ({ ...prev, createClan: false, clanName: '' }))}
                      className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg"
                    >
                      İptal
                    </button>
                    <button 
                      onClick={handleCreateClan}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg"
                    >
                      Oluştur
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Klana Katılma Modal */}
          <AnimatePresence>
            {modalState.joinClan && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
              >
                <motion.div
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0.9 }}
                  className="bg-gray-800 rounded-lg p-6 w-96 max-h-[80vh] overflow-y-auto"
                >
                  <h2 className="text-xl font-bold mb-4">Mevcut Klanlar</h2>
                  {clanState.availableClans.map(clan => (
                    <div 
                      key={clan.id}
                      className="bg-gray-700 rounded-lg p-4 mb-3 flex justify-between items-center"
                    >
                      <div>
                        <h3 className="font-semibold">{clan.name}</h3>
                        <p className="text-sm text-gray-400">
                          Üye: {clan.member_count}/10
                        </p>
                      </div>
                      <button 
                        onClick={() => {
                          handleJoinClan(clan.id);
                          setModalState(prev => ({ ...prev, joinClan: false }));
                        }}
                        className="bg-green-600 hover:bg-green-700 text-white font-bold py-1 px-3 rounded-lg"
                      >
                        Katıl
                      </button>
                    </div>
                  ))}
                  <div className="mt-4 text-center">
                    <button 
                      onClick={() => setModalState(prev => ({ ...prev, joinClan: false }))}
                      className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg"
                    >
                      Kapat
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default ClanPage;
