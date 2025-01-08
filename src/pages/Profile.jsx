import React, { useState, useEffect, useMemo, useReducer } from 'react';
import { supabase } from '../lib/supabase';
import { useGameStore } from '../store/gameStore';
import { useAuth } from '../components/AuthProvider';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaChartBar, 
  FaTrophy, 
  FaClock, 
  FaCoins, 
  FaStar, 
  FaMedal,
  FaTimes,
  FaChartLine,
  FaCheckCircle
} from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Manuel olarak ikonları tanımla
const UserIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
    <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z" clipRule="evenodd" />
  </svg>
);

const StarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-yellow-500">
    <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.007z" clipRule="evenodd" />
  </svg>
);

const ShieldIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-blue-500">
    <path fillRule="evenodd" d="M12.516 2.17a.75.75 0 0 0-1.032 0 11.209 11.209 0 0 1-7.877 3.08.75.75 0 0 0-.722.515A12.74 12.74 0 0 0 2.25 9.75c0 5.942 4.064 10.933 9.563 12.348a.749.749 0 0 0 .374 0c5.499-1.415 9.563-6.406 9.563-12.348 0-1.39-.231-2.733-.654-4.076a.75.75 0 0 0-.722-.516h-.013a11.21 11.21 0 0 1-7.877-3.08Z" clipRule="evenodd" />
  </svg>
);

const SwordIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-red-500">
    <path fillRule="evenodd" d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.026 0-1.799.773-1.799 1.799 0 .526.21 1.031.589 1.412l6.005 6.005c.36.36.86.585 1.411.585h.001c.151 0 .303-.02.451-.054a5.036 5.036 0 0 0 2.52-1.4l4.06-4.06a2.105 2.105 0 0 0-1.484-3.575h-1.618l4.13-4.129a1.762 1.762 0 0 0 0-2.491 1.755 1.755 0 0 0-2.49 0L13.5 6.55v-2.49Z" clipRule="evenodd" />
  </svg>
);

const CrownIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-purple-500">
    <path d="M11.645 20.91l-2.517-2.455a.75.75 0 0 1-.176-.402l-.462-5.842a.75.75 0 0 1 .554-.722 8.666 8.666 0 0 0 3.056-1.395.75.75 0 0 1 .898 0 8.677 8.677 0 0 0 3.071 1.404.75.75 0 0 1 .554.722l-.462 5.842a.75.75 0 0 1-.175.402l-2.517 2.455a.75.75 0 0 1-1.058 0Z" />
    <path d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Zm0 8.25a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Zm0 4.5a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z" />
  </svg>
);

const CoinIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-yellow-500">
    <path d="M12 7.5a2.25 2.25 0 1 0 0 4.5 2.25 2.25 0 0 0 0-4.5Z" />
    <path fillRule="evenodd" d="M1.5 4.875C1.5 3.839 2.34 3 3.375 3h17.25c1.035 0 1.875.84 1.875 1.875v9.75c0 1.036-.84 1.875-1.875 1.875H3.375A1.875 1.875 0 0 1 1.5 14.625v-9.75ZM8.25 9.75a3.75 3.75 0 1 1 7.5 0 3.75 3.75 0 0 1-7.5 0ZM18.75 9a.75.75 0 0 0-.75.75v.008c0 .414.336.75.75.75h.008a.75.75 0 0 0 .75-.75V9.75a.75.75 0 0 0-.75-.75h-.008ZM4.5 9.75a.75.75 0 0 0-.75.75v.008c0 .414.336.75.75.75h.008a.75.75 0 0 0 .75-.75V9.75a.75.75 0 0 0-.75-.75h-.008Z" clipRule="evenodd" />
  </svg>
);

// Item kategorileri için simgeler
const CATEGORY_ICONS = {
  weapon: <SwordIcon />,
  shield: <ShieldIcon />,
  armor: <CrownIcon />
};

function Profile() {
  const { user } = useAuth();
  const { player, calculateCurrentLevelProgress } = useGameStore();
  const [playerItems, setPlayerItems] = useState([]);
  const [activeCategory, setActiveCategory] = useState('weapon');
  const [leaderboardModal, setLeaderboardModal] = useState(false);
  const [leaderboardType, setLeaderboardType] = useState('fame');
  const [leaderboard, setLeaderboard] = useState([]);
  const [playerRank, setPlayerRank] = useState(null);
  const navigate = useNavigate();

  const [dailyQuests, setDailyQuests] = useState([
    {
      id: 'arena_battles',
      title: 'Arena Savaşçısı',
      description: 'Arenada 3 kez savaş yap',
      progress: 0,
      target: 3,
      reward: { 
        xp: 10, 
        gold: 10,
        items: [{ name: 'Güç Taşı', quantity: 1 }] 
      },
      completed: false,
      resetTime: null,
      rewardClaimed: false
    }
  ]);

  // Günlük görevleri çekme ve kontrol etme fonksiyonu
  const fetchAndCheckDailyQuests = async () => {
    try {
      const { data, error } = await supabase
        .from('player_daily_quests')
        .select('*')
        .eq('player_id', player.id)
        .single();

      const now = new Date();
      const midnightUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));

      if (error || !data) {
        // İlk defa görev oluşturma
        await supabase.from('player_daily_quests').upsert({
          player_id: player.id,
          arena_battles_progress: 0,
          arena_battles_completed: false,
          reset_time: midnightUTC.toISOString()
        });

        setDailyQuests(prevQuests => prevQuests.map(quest => ({
          ...quest,
          progress: 0,
          completed: false,
          resetTime: midnightUTC,
          rewardClaimed: false
        })));
      } else {
        // Mevcut görevleri kontrol etme
        const shouldReset = new Date(data.reset_time) <= now;

        if (shouldReset) {
          // Görevleri sıfırla
          await supabase.from('player_daily_quests').upsert({
            player_id: player.id,
            arena_battles_progress: 0,
            arena_battles_completed: false,
            reset_time: midnightUTC.toISOString()
          });

          setDailyQuests(prevQuests => prevQuests.map(quest => ({
            ...quest,
            progress: 0,
            completed: false,
            resetTime: midnightUTC,
            rewardClaimed: false
          })));
        } else {
          // Mevcut görev ilerlemesini güncelle
          setDailyQuests(prevQuests => prevQuests.map(quest => ({
            ...quest,
            progress: data.arena_battles_progress,
            completed: data.arena_battles_completed,
            resetTime: new Date(data.reset_time),
            rewardClaimed: data.reward_claimed
          })));
        }
      }
    } catch (error) {
      console.error('Günlük görevler alınırken hata:', error);
    }
  };

  // Görevi güncelleme fonksiyonu
  const updateQuestProgress = async (questId, currentProgress) => {
    try {
      const updatedQuests = dailyQuests.map(quest => {
        if (quest.id === questId) {
          const newProgress = currentProgress;
          const completed = newProgress >= quest.target;
          
          if (completed && !quest.completed) {
            // Ödülleri ver
            player.addExperience(quest.reward.xp);
            player.addGold(quest.reward.gold);
            addPowerStone();
          }

          return { 
            ...quest, 
            progress: newProgress,
            completed: completed,
            rewardClaimed: false
          };
        }
        return quest;
      });

      setDailyQuests(updatedQuests);

      // Supabase'de oyuncu verilerini güncelle
      const { error } = await supabase
        .from('player_daily_quests')
        .upsert({
          player_id: player.id,
          arena_battles_progress: currentProgress,
          arena_battles_completed: currentProgress >= dailyQuests.find(q => q.id === questId).target,
          reset_time: dailyQuests.find(q => q.id === questId).resetTime.toISOString()
        });

      if (error) {
        console.error('Görev güncellenemedi:', error);
      }
    } catch (error) {
      console.error('Görev güncellenirken hata:', error);
    }
  };

  // Combat sayfasından çağrılacak
  const incrementArenaBattles = () => {
    const arenaQuest = dailyQuests.find(q => q.id === 'arena_battles');
    if (arenaQuest && !arenaQuest.completed) {
      updateQuestProgress('arena_battles', arenaQuest.progress + 1);
    }
  };

  // Görevi tamamlama ve ödül alma fonksiyonu
  const claimQuestReward = async (quest) => {
    try {
      const gameStore = useGameStore.getState();

      // XP ve Altın ekleme
      await gameStore.addExperience(quest.reward.xp);
      await gameStore.updatePlayerAfterBattle({ gold: quest.reward.gold });

      // Güç Taşı eklemesi
      const { data: updatedPlayerData, error } = await supabase
        .from('players')
        .update({ 
          guctasi: (player.guctasi || 0) + 1 
        })
        .eq('id', player.id)
        .select()
        .single();

      if (error) {
        console.error('Güç Taşı eklenemedi:', error);
        return;
      }

      // Player state'ini güncelle
      gameStore.fetchPlayer(updatedPlayerData);

      // Ödül alındı olarak işaretle
      const { error: questError } = await supabase
        .from('player_daily_quests')
        .update({ reward_claimed: true })
        .eq('player_id', player.id);

      if (questError) {
        console.error('Ödül güncelleme hatası:', questError);
        return;
      }

      // Günlük görevleri güncelle
      setDailyQuests(prevQuests => 
        prevQuests.map(q => 
          q.id === quest.id 
            ? { ...q, rewardClaimed: true } 
            : q
        )
      );

      toast.success(` Görev Ödülü Alındı! 
+${quest.reward.xp} XP
+${quest.reward.gold} Altın
+1 Güç Taşı`, {
        position: "top-right",
        autoClose: 3000,
        theme: "dark",
      });

    } catch (error) {
      console.error('Ödül alma hatası:', error);
      toast.error('Bir hata oluştu!', {
        position: "top-right",
        autoClose: 3000,
        theme: "dark",
      });
    }
  };

  // Sayfa yüklendiğinde ve oyuncu değiştiğinde görevleri kontrol et
  useEffect(() => {
    if (player) {
      fetchAndCheckDailyQuests();
    }
  }, [player]);

  // Görev sıfırlama zamanını hesaplama
  const calculateTimeRemaining = (resetTime) => {
    if (!resetTime) return '00:00:00';
    
    const now = new Date();
    const remaining = resetTime.getTime() - now.getTime();
    
    if (remaining <= 0) return '00:00:00';
    
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Oyuncunun itemlarını çek
  useEffect(() => {
    const fetchPlayerItems = async () => {
      if (!player) return;

      try {
        const { data, error } = await supabase
          .from('player_items')
          .select('*, items(*)')
          .eq('player_id', player.id)
          .eq('deleted', false);

        if (error) {
          console.error('Fetch player items error:', error);
          return;
        }

        setPlayerItems(data || []);

        // Tüm item'ların toplam gücünü hesapla
        const totalItemPower = (data || []).reduce(
          (total, item) => total + (item.power || item.items?.power || 0), 
          0
        );

        // Hesaplanan gücü güncelle
        const { error: updateError } = await supabase
          .from('players')
          .update({ power: totalItemPower })
          .eq('id', player.id);

        if (updateError) {
          console.error('Güç güncellenirken hata:', updateError);
        }
      } catch (error) {
        console.error('Error fetching player items:', error);
      }
    };

    fetchPlayerItems();
  }, [player]);

  // Liderlik tablosu çekme fonksiyonu
  const fetchLeaderboard = async (type = 'fame') => {
    try {
      const orderColumn = type === 'fame' ? 'fame' : (type === 'level' ? 'level' : 'power');
      
      const { data, error } = await supabase
        .from('players')
        .select('id, username, level, fame, power')
        .order(orderColumn, { ascending: false })
        .limit(50);

      if (error) {
        console.error('Liderlik tablosu hatası:', error);
        return;
      }

      // Oyuncunun sıralamasını bul
      const rank = data.findIndex(p => p.id === player.id) + 1;
      setPlayerRank(rank);
      setLeaderboard(data);
      setLeaderboardType(type);
      setLeaderboardModal(true);
    } catch (error) {
      console.error('Liderlik tablosu hatası:', error);
    }
  };

  // Item kategorisine göre filtreleme
  const filteredItems = useMemo(() => 
    playerItems.filter(item => item.items.type === activeCategory),
    [playerItems, activeCategory]
  );

  // Oyuncu güç istatistikleri
  const playerStats = useMemo(() => {
    const equippedItems = playerItems.filter(item => item.equipped);
    const totalPower = equippedItems.reduce(
      (total, item) => total + (item.power || item.items?.power || 0), 
      player?.base_power || 0
    );

    return {
      basePower: player?.base_power || 0,
      itemPower: equippedItems.reduce(
        (total, item) => total + (item.power || item.items?.power || 0), 
        0
      ),
      totalPower
    };
  }, [playerItems, player]);

  const levelProgress = calculateCurrentLevelProgress(player);
  const expProgressPercentage = 
    (levelProgress.currentExp / levelProgress.requiredExp) * 100;

  // Item güncelleme (equipped durumu)
  const toggleItemEquipped = async (item) => {
    try {
      // Aynı kategorideki diğer itemları unequip et
      const categoryItems = playerItems.filter(
        pi => pi.items.type === item.items.type
      );

      const updates = categoryItems.map(pi => ({
        id: pi.id,
        equipped: pi.id === item.id
      }));

      const updatePromises = updates.map(async (update) => {
        const { error } = await supabase
          .from('player_items')
          .update({ equipped: update.equipped })
          .eq('id', update.id);

        if (error) {
          console.error(`Update error for item ${update.id}:`, error);
        }
      });

      await Promise.all(updatePromises);

      // Local state'i güncelle
      setPlayerItems(prev => 
        prev.map(pi => ({
          ...pi, 
          equipped: pi.id === item.id
        }))
      );

      // Oyuncunun gücünü yeniden hesapla
      // Supabase ile oyuncu gücünü güncelle
      const { error: updateError } = await supabase
        .from('players')
        .update({ power: playerStats.totalPower })
        .eq('id', player.id);

      if (updateError) {
        console.error('Güç güncellenirken hata:', updateError);
      } else {
        console.log(`Güç güncellendi: ${playerStats.totalPower}`);
      }
    } catch (error) {
      console.error('Toggle item error:', error);
    }
  };

  // Liderlik tablosu modalı
  const LeaderboardModal = () => (
    <AnimatePresence>
      {leaderboardModal && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
          onClick={() => setLeaderboardModal(false)}
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.9 }}
            className="bg-gray-800 rounded-2xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white flex items-center">
                <FaMedal className="mr-2 text-yellow-500" /> 
                Liderlik Tablosu
              </h2>
              <button 
                onClick={() => setLeaderboardModal(false)}
                className="text-gray-400 hover:text-red-500"
              >
                <FaTimes />
              </button>
            </div>

            <div className="flex bg-gray-900 rounded-full p-1 mb-4">
              {[
                { type: 'fame', label: 'Fame', icon: <FaTrophy className="mr-2" /> },
                { type: 'level', label: 'Seviye', icon: <FaChartLine className="mr-2" /> },
                { type: 'power', label: 'Güç', icon: <FaChartBar className="mr-2" /> }
              ].map(({ type, label, icon }) => (
                <button 
                  key={type}
                  onClick={() => fetchLeaderboard(type)}
                  className={`
                    flex-1 py-2 rounded-full transition-all duration-300 flex items-center justify-center
                    ${leaderboardType === type 
                      ? 'bg-yellow-600 text-white shadow-lg' 
                      : 'text-gray-400 hover:bg-gray-800'}
                  `}
                >
                  {icon}
                  {label}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              {leaderboard.map((entry, index) => (
                <div 
                  key={entry.id}
                  className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                    entry.id === player.id 
                      ? 'bg-yellow-600 bg-opacity-20' 
                      : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-gray-400 font-bold">
                      #{index + 1}
                    </span>
                    <span className={`font-semibold ${
                      entry.id === player.id ? 'text-white' : 'text-gray-300'
                    }`}>
                      {entry.username}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-yellow-500 font-bold">
                      {leaderboardType === 'fame' ? entry.fame : (leaderboardType === 'level' ? entry.level : entry.power)}
                    </span>
                    <span className="text-gray-400 text-sm">
                      {leaderboardType === 'fame' ? 'Fame' : (leaderboardType === 'level' ? 'Seviye' : 'Güç')}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {playerRank && (
              <div className="mt-4 text-center">
                <p className="text-gray-400">
                  Senin Sıralaman: 
                  <span className="font-bold text-yellow-500 ml-2">
                    #{playerRank}
                  </span>
                </p>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  useEffect(() => {
    if (leaderboardModal) {
      fetchLeaderboard();
    }
  }, [leaderboardModal]);

  const addPowerStone = async () => {
    const { data: itemData, error: itemError } = await supabase
      .from('items')
      .select('id')
      .eq('name', 'Güç Taşı')
      .single();

    if (itemError) {
      console.error('Güç Taşı bulunamadı:', itemError);
      return;
    }

    const { error } = await supabase
      .from('player_inventory')
      .insert({
        player_id: player.id,
        item_id: itemData.id,
        quantity: 1
      });

    if (error) {
      console.error('Güç Taşı eklenemedi:', error);
    } else {
      toast.success('Güç Taşı envanterine eklendi!');
    }
  };

  if (!player) return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white flex items-center justify-center"
    >
      <div className="text-center">
        <p className="text-xl text-gray-400">Oyuncu bilgileri yükleniyor...</p>
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white p-6">
      <ToastContainer />
      <div className="max-w-6xl mx-auto">
        {/* Profil Başlığı */}
        <div className="flex items-center space-x-4 mb-6 bg-gray-800 rounded-lg p-4 shadow-md">
          <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center">
            <UserIcon className="w-8 h-8 text-gray-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl font-bold text-white">{player.username}</h1>
                <button 
                  onClick={() => fetchLeaderboard()}
                  className="text-gray-400 hover:text-yellow-500 transition-colors"
                >
                  <FaMedal className="w-5 h-5" />
                </button>
              </div>
              <div className="bg-gray-700 text-gray-300 px-2 py-1 rounded-full text-sm">
                Seviye {player.level}
              </div>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all duration-300 ease-in-out" 
                style={{ width: `${expProgressPercentage}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>EXP: {levelProgress.currentExp}</span>
              <span>Sonraki Seviye: {levelProgress.requiredExp}</span>
            </div>
          </div>
        </div>

        {/* Liderlik Tablosu Modal */}
        <LeaderboardModal />

        {/* Fame, Altın, Güç Puanları */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { 
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-yellow-500 mb-2">
                  <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.007z" clipRule="evenodd" />
                </svg>
              ),
              value: player.fame,
              label: 'Fame',
              color: 'text-yellow-500'
            },
            { 
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-green-500 mb-2">
                  <path d="M12 7.5a2.25 2.25 0 1 0 0 4.5 2.25 2.25 0 0 0 0-4.5Z" />
                  <path fillRule="evenodd" d="M1.5 4.875C1.5 3.839 2.34 3 3.375 3h17.25c1.035 0 1.875.84 1.875 1.875v9.75c0 1.036-.84 1.875-1.875 1.875H3.375A1.875 1.875 0 0 1 1.5 14.625v-9.75ZM8.25 9.75a3.75 3.75 0 1 1 7.5 0 3.75 3.75 0 0 1-7.5 0ZM18.75 9a.75.75 0 0 0-.75.75v.008c0 .414.336.75.75.75h.008a.75.75 0 0 0 .75-.75V9.75a.75.75 0 0 0-.75-.75h-.008ZM4.5 9.75a.75.75 0 0 0-.75.75v.008c0 .414.336.75.75.75h.008a.75.75 0 0 0 .75-.75V9.75a.75.75 0 0 0-.75-.75h-.008Z" clipRule="evenodd" />
                </svg>
              ),
              value: player.gold || 0,
              label: 'Altın',
              color: 'text-green-500'
            },
            { 
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-red-500 mb-2">
                  <path fillRule="evenodd" d="M12 2.25a.75.75 0 0 1 .634.74v.002c0 .495.392.907.867.98a16.524 16.524 0 0 1 3.313.728.75.75 0 0 1 .486.981 14.527 14.527 0 0 0-.497 1.902.75.75 0 0 1-.336.524c-.383.258-.867.395-1.337.395h-.002c-.618 0-1.177.324-1.506.834a.75.75 0 0 1-1.248 0c-.33-.51-.888-.834-1.507-.834h-.001c-.47 0-.954-.138-1.337-.395a.75.75 0 0 1-.336-.524 14.35 14.35 0 0 0-.497-1.902.75.75 0 0 1 .486-.98 16.787 16.787 0 0 1 3.313-.729.75.75 0 0 0 .634-.74ZM12 5.532c-.77 0-1.536.12-2.247.35a.75.75 0 0 0-.526.708c0 .485.23.955.635 1.194.915.53 1.96.845 3.138.845s2.223-.315 3.138-.845a1.364 1.364 0 0 0 .635-1.194.75.75 0 0 0-.526-.708A6.015 6.015 0 0 0 12 5.532ZM6.756 8.242a.75.75 0 0 1 .68.478 6.63 6.63 0 0 0 1.15 1.74c.832.87 1.946 1.44 3.164 1.44s2.332-.57 3.164-1.44a6.63 6.63 0 0 0 1.15-1.74.75.75 0 0 1 .68-.478 3.75 3.75 0 0 1 3.011 1.542.75.75 0 0 1 .138.51c-.01.624-.06 1.624-.247 2.455-.19.842-.62 1.599-1.46 1.999a5.21 5.21 0 0 1-2.41.571 5.21 5.21 0 0 1-2.41-.571c-.84-.4-1.27-1.157-1.46-1.999a9.923 9.923 0 0 1-.247-2.455.75.75 0 0 1 .138-.51 3.75 3.75 0 0 1 3.011-1.542Z" clipRule="evenodd" />
                </svg>
              ),
              value: player.power,
              label: 'Güç Puanı',
              color: 'text-red-500'
            }
          ].map((stat, index) => (
            <div 
              key={index} 
              className="bg-gray-800 rounded-2xl p-4 flex flex-col items-center justify-center hover:bg-gray-700 transition-colors group"
            >
              {stat.icon}
              <p className={`text-3xl font-bold ${stat.color} group-hover:scale-105 transition-transform`}>
                {stat.value}
              </p>
              <p className="text-xs text-gray-400 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Ekipman */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          <div className="bg-gray-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <SwordIcon className="mr-2 text-gray-400" /> 
              Ekipmanlar
            </h2>
            <div className="grid grid-cols-3 gap-4">
              {[
                { slot: 'weapon', icon: <SwordIcon className="w-10 h-10 text-red-500" />, name: 'Silah' },
                { slot: 'shield', icon: <ShieldIcon className="w-10 h-10 text-blue-500" />, name: 'Kalkan' },
                { slot: 'armor', icon: <CrownIcon className="w-10 h-10 text-purple-500" />, name: 'Zırh' }
              ].map(({ slot, icon, name }) => (
                <div 
                  key={slot} 
                  className="bg-gray-700 rounded-xl p-3 text-center hover:bg-gray-600 transition-all group relative cursor-pointer"
                  onClick={() => navigate('/market', { 
                    state: { 
                      activeTab: 'blacksmith',
                      selectedSlot: slot 
                    } 
                  })}
                >
                  {(() => {
                    const equippedItem = playerItems.find(item => 
                      item.equipped && item.items.type === slot
                    );
                    
                    if (equippedItem) {
                      return (
                        <>
                          <div 
                            className="absolute top-1 right-1 bg-yellow-500 text-black rounded-full px-2 py-1 text-xs font-bold"
                          >
                            +{equippedItem.enhance_level || 0}
                          </div>
                          {icon}
                          <p className="text-sm mt-2 font-semibold text-white group-hover:text-yellow-300 transition-colors">
                            {equippedItem.items.name}
                          </p>
                          <p className="text-xs text-green-400">
                            +{equippedItem.power} Güç
                          </p>
                        </>
                      );
                    }
                    
                    return (
                      <>
                        {icon}
                        <p className="text-sm mt-2 font-semibold text-gray-400">{name}</p>
                        <p className="text-xs text-gray-500">Ekipman Yok</p>
                      </>
                    );
                  })()}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Günlük Görevler */}
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl p-6 space-y-6 border border-gray-700 shadow-2xl">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center space-x-3">
              <FaChartBar className="text-purple-500 w-8 h-8" />
              <h2 className="text-2xl font-bold text-white">Günlük Görevler</h2>
            </div>
            <div className="bg-gray-700 rounded-full px-3 py-1 text-sm text-gray-300 flex items-center space-x-2">
              <FaClock className="text-yellow-500" />
              <span>{calculateTimeRemaining(dailyQuests[0]?.resetTime)}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {dailyQuests.map((quest, index) => (
              <div 
                key={index} 
                className={`relative bg-gray-800 rounded-lg p-4 shadow-md mb-4 overflow-hidden ${
                  quest.rewardClaimed ? 'opacity-70' : ''
                }`}
              >
                {quest.rewardClaimed && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10">
                    <div className="text-green-400 text-lg font-bold flex items-center">
                      <FaCheckCircle className="mr-2" />
                      Ödül Alındı
                    </div>
                  </div>
                )}
                <div className="relative z-0">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center space-x-2">
                      <FaMedal className="text-yellow-500" />
                      <h3 className="text-white font-semibold">{quest.title}</h3>
                    </div>
                    <div className="text-sm text-gray-400">
                      {quest.rewardClaimed 
                        ? `${quest.target} / ${quest.target} Savaş` 
                        : `${quest.progress} / ${quest.target} Savaş`
                      }
                    </div>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2.5 mb-2">
                    <div 
                      className="bg-green-500 h-2.5 rounded-full" 
                      style={{
                        width: quest.rewardClaimed 
                          ? '100%' 
                          : `${(quest.progress / quest.target) * 100}%`
                      }}
                    ></div>
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="text-sm text-gray-400">
                      Ödül: {quest.reward.xp} XP, {quest.reward.gold} Altın
                    </div>
                    {quest.completed && !quest.rewardClaimed && (
                      <button 
                        onClick={() => claimQuestReward(quest)}
                        className="bg-green-500 text-white text-sm py-2 px-4 rounded-full hover:bg-green-600 transition-colors"
                      >
                        Ödülü Al
                      </button>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 mt-2">
                    <FaCoins className="text-yellow-500" />
                    <span>{quest.reward.gold} Altın</span>
                    <FaStar className="text-purple-500 ml-2" />
                    <span>{quest.reward.xp} XP</span>
                    {quest.reward.items && quest.reward.items.map((item, index) => (
                      <div key={index} className="flex items-center ml-2">
                        <img 
                          src="/img/powerstone.png" 
                          alt={item.name} 
                          className="w-5 h-5 mr-1" 
                        />
                        <span>{item.quantity} {item.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;
