import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useGameStore } from '../store/gameStore';
import { useAuth } from '../components/AuthProvider';
import { useNotification } from '../contexts/NotificationContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaBattleNet, 
  FaTasks, 
  FaUserFriends, 
  FaRobot, 
  FaDotCircle, 
  FaShieldAlt,
  FaTrophy,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaStar,
  FaSync,
  FaSkull
} from 'react-icons/fa';
import FarmArea from '../components/FarmArea';
import { toast } from 'react-toastify';

const MISSIONS = [
  {
    id: 1,
    name: 'Kolay Görev',
    duration: 10,
    difficulty: 'Kolay',
    xp: 10
  },
  {
    id: 2,
    name: 'Orta Görev',
    duration: 60,
    difficulty: 'Orta', 
    xp: 150
  },
  {
    id: 3,
    name: 'Zor Görev',
    duration: 480,
    difficulty: 'Zor',
    xp: 3000
  }
];

export default function Combat() {
  const { user } = useAuth();
  const { player, updatePlayerAfterBattle, addExperience } = useGameStore();
  const { showNotification } = useNotification();
  const [activeTab, setActiveTab] = useState('farm'); // Varsayılan sekmeyi tarla olarak ayarla
  
  // Arena State
  const [arenaMode, setArenaMode] = useState(null);
  const [playerHealth, setPlayerHealth] = useState(100);
  const [opponentHealth, setOpponentHealth] = useState(100);
  const [currentTurn, setCurrentTurn] = useState('player');
  const [battleLog, setBattleLog] = useState([]);
  const [opponent, setOpponent] = useState(null);
  // Günlük eşleşme sayısını doğrudan player nesnesinden al
  const dailyMatchesLeft = player?.daily_matches_left || 0;

  // Görev ve Arena Fetch Fonksiyonları
  const [isMatchmaking, setIsMatchmaking] = useState(false);
  const [isAutoAttacking, setIsAutoAttacking] = useState(false);

  const findOpponent = async () => {
    if (dailyMatchesLeft <= 0) {
      alert('Günlük eşleşme hakkınız doldu!');
      return;
    }

    try {
      setIsMatchmaking(true);

      // Eşleştirme animasyonu için biraz bekle
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Yakın güçteki oyuncu arama
      const { data: playerData, error: playerError } = await supabase
        .from('players')
        .select('*')
        .neq('id', player.id)
        .gte('power', player.power * 0.8)
        .lte('power', player.power * 1.2)
        .limit(1);

      if (playerError || !playerData || playerData.length === 0) {
        // Bot oluştur
        const botOpponent = {
          id: 'bot',
          username: 'Arena Bot',
          power: Math.round(player.power * (Math.random() * 0.4 + 0.8)),
          is_bot: true
        };
        setOpponent(botOpponent);
        startBattle(botOpponent);
      } else {
        const opponent = playerData[0];
        setOpponent(opponent);
        startBattle(opponent);
      }

      setIsMatchmaking(false);
    } catch (error) {
      console.error('Rakip bulma hatası:', error);
      setIsMatchmaking(false);
    }
  };

  useEffect(() => {
    // Otomatik savaş başlatma
    if (activeTab === 'arena' && !arenaMode && opponent) {
      const timer = setTimeout(() => {
        if (!arenaMode) {
          startBattle(opponent);
        }
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [activeTab, arenaMode, opponent]);

  useEffect(() => {
    // Otomatik savaş başlatma ve otomatik saldırı
    if (arenaMode === 'battle' && currentTurn === 'opponent') {
      setIsAutoAttacking(true);
      const timer = setTimeout(() => {
        performAttack();
        setIsAutoAttacking(false);
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [arenaMode, currentTurn]);

  useEffect(() => {
    // Oyuncunun power'ı değiştiğinde HP'yi güncelle
    if (player && playerHealth !== null) {
      const newMaxHealth = calculateHealthFromPower(player.power);
      
      // Mevcut HP'yi orantılı olarak güncelle
      const healthPercentage = playerHealth / (playerHealth || newMaxHealth);
      const updatedHealth = Math.floor(newMaxHealth * healthPercentage);
      
      setPlayerHealth(updatedHealth);
    }
  }, [player?.power]);

  useEffect(() => {
    const calculateTimeToMidnightUTC = () => {
      const now = new Date();
      const utcNow = Date.UTC(
        now.getUTCFullYear(), 
        now.getUTCMonth(), 
        now.getUTCDate(), 
        now.getUTCHours(), 
        now.getUTCMinutes(), 
        now.getUTCSeconds()
      );
      
      const nextMidnightUTC = Date.UTC(
        now.getUTCFullYear(), 
        now.getUTCMonth(), 
        now.getUTCDate() + 1, 
        0, 0, 0
      );
      
      const remainingTime = nextMidnightUTC - utcNow;
      
      const hours = Math.floor(remainingTime / (1000 * 60 * 60));
      const minutes = Math.floor((remainingTime % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((remainingTime % (1000 * 60)) / 1000);
      
      setRemainingResetTime({
        hours,
        minutes,
        seconds
      });
    };

    // İlk çalıştırma
    calculateTimeToMidnightUTC();
    
    // Her saniye kontrol et
    const timer = setInterval(calculateTimeToMidnightUTC, 1000);
    return () => clearInterval(timer);
  }, []);

  const startBattle = (opponent) => {
    setPlayerHealth(calculateHealthFromPower(player.power));
    setOpponentHealth(calculateHealthFromPower(opponent.power));
    setCurrentTurn('player');
    setBattleLog([`Savaş ${opponent.username} karşısında başladı!`]);
    setArenaMode('battle');
  };

  const performAttack = () => {
    if (currentTurn !== 'player' && currentTurn !== 'opponent') return;
    if (playerHealth <= 0 || opponentHealth <= 0) return;

    const attackingPower = currentTurn === 'player' ? player.power : opponent.power;
    const minDamage = Math.max(1, Math.floor(attackingPower * 0.5)); // %50 alt sınır
    const maxDamage = Math.floor(attackingPower * 1.5); // %50 üst sınır
    const damage = Math.floor(Math.random() * (maxDamage - minDamage + 1)) + minDamage;

    if (currentTurn === 'player') {
      const newOpponentHealth = Math.max(0, opponentHealth - damage);
      
      const log = [`${player.username} ${damage} hasar vurdu!`];
      setBattleLog(prevLog => [log[0], ...prevLog]);
      
      setOpponentHealth(newOpponentHealth);
      setCurrentTurn('opponent');

      if (newOpponentHealth <= 0) {
        endBattle('win');
        return;
      }
    } else {
      const newPlayerHealth = Math.max(0, playerHealth - damage);
      
      const opponentLog = [`${opponent.username} ${damage} hasar vurdu!`];
      setBattleLog(prevLog => [opponentLog[0], ...prevLog]);
      
      setPlayerHealth(newPlayerHealth);
      setCurrentTurn('player');

      if (newPlayerHealth <= 0) {
        endBattle('lose');
      }
    }
  };

  const endBattle = async (result) => {
    try {
      // Günlük eşleşme sayısını azalt
      const updatedMatchesLeft = dailyMatchesLeft - 1;
      
      // Supabase ile oyuncu verilerini güncelle
      const battleRewards = {
        fame: result === 'win' ? 100 : -50,
        gold: result === 'win' ? 100 : 0,
        dailyMatchesLeft: updatedMatchesLeft
      };

      // Oyuncu verilerini güncelle
      await updatePlayerAfterBattle(battleRewards);

      // Arena günlük görev ilerlemesini güncelle (kazanma veya kaybetme durumunda)
      const { data, error } = await supabase
        .from('player_daily_quests')
        .select('arena_battles_progress')
        .eq('player_id', player.id)
        .single();

      if (data && !error) {
        const currentProgress = data.arena_battles_progress || 0;
        const newProgress = Math.min(currentProgress + 1, 3);

        await supabase
          .from('player_daily_quests')
          .update({ 
            arena_battles_progress: newProgress,
            arena_battles_completed: newProgress === 3
          })
          .eq('player_id', player.id);

        // Arena görevini güncelle
        if (window.incrementArenaBattles) {
          window.incrementArenaBattles();
        }
      }

      // Deneyim ekle (sadece kazanma durumunda)
      if (result === 'win') {
        const expToAdd = 10; // Savaş kazanınca 10 EXP
        const currentPlayer = player;

        const updatedPlayer = await addExperience(expToAdd);
        
        // Seviye atladıysa bilgilendir
        if (updatedPlayer && updatedPlayer.level > currentPlayer.level) {
          const levelUpRewards = updatedPlayer.levelUpRewards || [];
          const rewardMessages = levelUpRewards.map(reward => 
            `Seviye ${reward.level} Ödülleri: ${reward.gold} Altın, ${reward.fame} Şöhret`
          ).join('\n');

          toast.success(`🎊 Tebrikler! Seviye Atladınız! 
Yeni Seviye: ${updatedPlayer.level}
${rewardMessages}`, {
            position: "top-right",
            autoClose: 5000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            progress: undefined,
            theme: "dark",
          });
        }
      }

      // Savaş sonucunu bildir
      showNotification(
        result === 'win' 
          ? `${opponent.username}'ı yendiniz! +100 Fame` 
          : `${opponent.username} tarafından yenildiniz. -50 Fame`, 
        result === 'win' ? 'success' : 'error'
      );

      // Yerel state'i güncelle
      if (result === 'win') {
        setBattleLog(prevLog => [...prevLog, 'Kazandınız! 100 Altın, 100 Fame Puanı ve 10 EXP']);
      } else {
        setBattleLog(prevLog => [...prevLog, 'Kaybettiniz!']);
      }

      setTimeout(() => {
        setArenaMode(result);
      }, 1000);
    } catch (error) {
      console.error('Savaş sonucu güncellenirken hata:', error);
    }
  };

  const handleDefeat = async () => {
    const { player } = useGameStore.getState();
    
    try {
      // 50 Fame kaybı
      const fameToSubtract = 50;
      
      // Supabase'de oyuncu verilerini güncelle
      const { data, error } = await supabase
        .from('players')
        .update({
          fame: Math.max((player.fame || 0) - fameToSubtract, 0)
        })
        .eq('id', player.id)
        .select()
        .single();
      
      if (error) {
        console.error('Oyuncu güncellemesi hatası:', error);
        return;
      }
      
      // Global state'i güncelle
      useGameStore.getState().setState(state => ({
        player: {
          ...state.player,
          fame: Math.max((state.player.fame || 0) - fameToSubtract, 0)
        }
      }));
      
      // Bildirim
      toast.error(`🏳️ Mağlup oldunuz! ${fameToSubtract} Fame puanı kaybettiniz.`, {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "dark",
      });

      // Mağlubiyet state'i
      setArenaMode('lose');
    } catch (error) {
      console.error('Mağlubiyet işlemi hatası:', error);
      toast.error('Bir hata oluştu!');
    }
  };

  const [famePlayers, setFamePlayers] = useState([]);
  const [playerRank, setPlayerRank] = useState(null);
  const [currentFamePage, setCurrentFamePage] = useState(1);

  // Fame sıralamasını getir
  const fetchFameRankings = async () => {
    try {
      const { data, error } = await supabase
        .from('players')
        .select('id, username, fame, level, power')
        .order('fame', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Oyuncu sıralaması alınamadı:', error);
        return [];
      }

      return data;
    } catch (error) {
      console.error('Oyuncu sıralaması hatası:', error);
      return [];
    }
  };

  useEffect(() => {
    if (activeTab === 'arena') {
      fetchFameRankings().then(data => setFamePlayers(data));
    }
  }, [activeTab]);

  const changeFamePage = (page) => {
    setCurrentFamePage(page);
  };

  // Formatlanmış süre
  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Kalan süre için yardımcı fonksiyon
  const formatRemainingTime = (time) => {
    const hours = String(time.hours).padStart(2, '0');
    const minutes = String(time.minutes).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  // Oyuncu detay modalı state'i
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  // Oyuncu detaylarını getir
  const fetchPlayerDetails = async (playerId) => {
    try {
      // Oyuncu bilgilerini çek
      const { data: playerDetails, error: playerError } = await supabase
        .from('players')
        .select('*')
        .eq('id', playerId)
        .single();

      if (playerError) {
        console.error('Oyuncu detayları getirilemedi:', playerError);
        return null;
      }

      // Oyuncunun tüm ekipmanlarını çek (güvenlik kontrolü olmadan)
      const { data: playerItems, error: itemsError } = await supabase
        .from('player_items')
        .select('*, items(*)')
        .eq('player_id', playerId);

      console.log('Oyuncu Ekipmanları:', playerItems);
      console.log('Ekipman Hatası:', itemsError);

      // Sadece aktif ve silinmemiş ekipmanları filtrele
      const activeItems = playerItems
        ? playerItems.filter(pi => 
            pi.items && 
            (pi.equipped === true || pi.is_equipped === true) && 
            (pi.deleted === false || pi.is_deleted === false)
          )
        : [];

      // Seçilen oyuncuya ekipmanları ekle
      const playerWithItems = {
        ...playerDetails,
        player_items: activeItems
      };

      return playerWithItems;
    } catch (error) {
      console.error('Oyuncu detayları hatası:', error);
      return null;
    }
  };

  // Oyuncu detay modalını aç
  const openPlayerDetailsModal = async (selectedPlayerData) => {
    try {
      console.log('Seçilen Oyuncu:', selectedPlayerData);
      
      // Oyuncunun tüm ekipmanlarını çek (güvenlik kontrolü olmadan)
      const { data: playerItems, error: itemsError } = await supabase
        .from('player_items')
        .select('*, items(*)')
        .eq('player_id', selectedPlayerData.id);

      console.log('Oyuncu Ekipmanları (Tüm Detaylar):', playerItems);
      console.log('Ekipman Hatası:', itemsError);

      // Sadece aktif ve silinmemiş ekipmanları filtrele
      const activeItems = playerItems
        ? playerItems.filter(pi => 
            pi.items && 
            (pi.equipped === true || pi.is_equipped === true) && 
            (pi.deleted === false || pi.is_deleted === false)
          )
        : [];

      // Her bir aktif item için detaylı log
      activeItems.forEach(item => {
        console.log('Aktif Item Detayları:', {
          itemId: item.id,
          itemName: item.items.name,
          basePower: item.items.power,
          enchantLevel: item.enchant_level,
          equipped: item.equipped
        });
      });

      // Seçilen oyuncuya ekipmanları ekle
      const playerWithItems = {
        ...selectedPlayerData,
        player_items: activeItems
      };

      setSelectedPlayer(playerWithItems);
    } catch (error) {
      console.error('Oyuncu detayları getirilirken hata:', error);
    }
  };

  // Oyuncu detay modalını kapat
  const closePlayerDetailsModal = () => {
    setSelectedPlayer(null);
  };

  // Savaş fonksiyonu
  const challengePlayer = async (challengedPlayer) => {
    if (!player) return;

    try {
      // Oyuncunun mevcut gücünü hesapla
      const playerPower = player.power;
      const challengedPlayerPower = challengedPlayer.power;

      // Rastgele zafer şansı hesapla (güç farkına göre)
      const powerDifference = playerPower - challengedPlayerPower;
      const winProbability = 0.5 + (powerDifference / (playerPower + challengedPlayerPower)) * 0.5;
      const randomOutcome = Math.random();

      const isPlayerWinner = randomOutcome < winProbability;

      // Fame güncellemesi
      const fameChange = isPlayerWinner ? 100 : -50;
      const challengedFameChange = isPlayerWinner ? -50 : 100;

      // Oyuncunun mevcut famei 0'dan fazlaysa eksilme işlemi yap
      const updatedPlayerFame = Math.max(
        0, 
        (player.fame || 0) + fameChange
      );

      const updatedChallengedPlayerFame = Math.max(
        0, 
        (challengedPlayer.fame || 0) + challengedFameChange
      );

      // Supabase'de fame güncellemesi
      const { error: playerFameError } = await supabase
        .from('players')
        .update({ fame: updatedPlayerFame })
        .eq('id', player.id);

      const { error: challengedPlayerFameError } = await supabase
        .from('players')
        .update({ fame: updatedChallengedPlayerFame })
        .eq('id', challengedPlayer.id);

      if (playerFameError || challengedPlayerFameError) {
        console.error('Fame güncelleme hatası', playerFameError || challengedPlayerFameError);
        showNotification(error.message || 'Savaş sonucu güncellenemedi', 'error');
        return;
      }

      // Savaş kazanınca gold ve experience ekle
      if (isPlayerWinner) {
        await useGameStore.getState().addExperience(10);  // 10 EXP ekle
      }

      // Savaş sonucunu bildir
      showNotification(
        isPlayerWinner 
          ? `${challengedPlayer.username}'ı yendiniz! +100 Fame, +10 EXP` 
          : `${challengedPlayer.username} tarafından yenildiniz. -50 Fame`, 
        isPlayerWinner ? 'success' : 'error'
      );
    } catch (error) {
      console.error('Savaş hatası:', error);
      showNotification('Savaş sırasında bir hata oluştu', 'error');
    }
  };

  // World Boss için state'ler
  const [worldBossList, setWorldBossList] = useState([
    {
      id: 1,
      name: 'Kadim Ejderha',
      maxHealth: 99999,
      currentHealth: 99999,
      level: 1,
      rewards: {
        gold: 1000,
        xp: 5000
      },
      startTime: null,
      endTime: null,
      remainingTime: null
    }
  ]);

  const [selectedWorldBoss, setSelectedWorldBoss] = useState(null);
  const [bossAttackResult, setBossAttackResult] = useState(null);
  const [worldBossDamageRankings, setWorldBossDamageRankings] = useState([]);
  const [currentBattleId, setCurrentBattleId] = useState(null);
  const [hasPlayerAttacked, setHasPlayerAttacked] = useState(false);

  // Kalan süreyi hesaplama fonksiyonu
  const calculateRemainingTime = (startTime, endTime) => {
    const now = new Date();
    const end = new Date(endTime);
    const diff = end - now;

    if (diff <= 0) return null;

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return { hours, minutes, seconds };
  };

  const fetchWorldBossData = async () => {
    try {
      // Aktif World Boss'u çek
      let fetchedData = await supabase.rpc('get_active_world_boss');

      console.log('World Boss Fetch Data:', fetchedData);

      let data = fetchedData.data && fetchedData.data[0] ? fetchedData.data[0] : null;

      console.log('Extracted Data:', data);

      if (!data || fetchedData.error) {
        console.error('World Boss veri yükleme hatası:', fetchedData.error);
        
        // Eğer aktif boss yoksa yeni oluştur
        const { data: newBossData, error: newBossError } = await supabase.rpc('create_new_world_boss');
        
        console.log('New Boss Data:', newBossData, 'Error:', newBossError);

        if (newBossError) {
          console.error('Yeni World Boss oluşturma hatası:', newBossError);
          return;
        }

        // Yeni oluşturulan boss verilerini kullan
        data = newBossData[0];
      }

      // Güvenli kontrol ekleyelim
      if (!data || !data.boss_start_time || !data.boss_end_time) {
        console.error('World Boss verisi eksik', data);
        return;
      }

      // Kalan zamanı hesapla
      const remainingTime = calculateRemainingTime(
        data.boss_start_time, 
        data.boss_end_time
      );

      // Boss listesini güncelle
      setWorldBossList([{
        currentHealth: data.boss_current_health || 10000,  // Sabit 10000 HP
        maxHealth: data.boss_max_health || 10000,          // Sabit 10000 HP
        currentBattleId: data.boss_battle_id,
        level: data.boss_level,
        startTime: data.boss_start_time,
        endTime: data.boss_end_time,
        remainingTime,
        status: data.boss_status,
        name: `Kadim Ejderha`, // Boss ismini ekle
        rewards: {
          gold: 1000  // Sabit ödül miktarı
        }
      }]);

      // Mevcut battle ID'yi ayarla
      setCurrentBattleId(data.boss_battle_id);

      // Hasar sıralamasını çek
      fetchWorldBossDamageRankings();
    } catch (error) {
      console.error('World Boss veri yükleme hatası:', error);
    }
  };

  useEffect(() => {
    // İlk yükleme
    fetchWorldBossData();

    // Her 5 dakikada bir kontrol et
    const timer = setInterval(fetchWorldBossData, 5 * 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const checkPlayerAttack = async () => {
      if (!currentBattleId || !player) return;

      const { count, error } = await supabase
        .from('world_boss_rankings')
        .select('*', { count: 'exact' })
        .eq('player_id', player.id)
        .eq('battle_id', currentBattleId);

      setHasPlayerAttacked(count > 0);
    };

    checkPlayerAttack();
    
    // Her 1 saatte bir kontrol et
    const timer = setInterval(checkPlayerAttack, 60 * 60 * 1000);
    return () => clearInterval(timer);
  }, [currentBattleId, player]);

  const attackWorldBoss = async () => {
    if (!currentBattleId || !player) return;

    try {
      // Oyuncunun güç seviyesine göre hasar hesapla
      const damage = Math.max(1, Math.floor(
        player.power * (Math.random() * 0.5 + 0.5)
      ));

      // Debug: Tüm gerekli bilgileri kontrol et
      console.log('World Boss Attack Debug:', {
        playerId: player.id,
        battleId: currentBattleId,
        damage: damage,
        username: player.username
      });

      // Supabase RPC çağrısı ile hasar ver
      const { data, error } = await supabase.rpc('log_world_boss_damage', {
        p_player_id: player.id,
        p_damage: damage
      });

      if (error) {
        console.error('World Boss hasar kayıt hatası:', error);
        showNotification(error.message || 'Hasar kaydedilemedi', 'error');
        return;
      }

      // Bilgileri güncelle
      if (data) {
        const newBossHealth = data.new_boss_health || 0;
        const goldReward = data.player_gold_reward || 0;
        
        // Boss sağlığını güncelle
        setWorldBossList(prevList => {
          const updatedList = [...prevList];
          if (updatedList[0]) {
            updatedList[0].currentHealth = newBossHealth;
          }
          return updatedList;
        });

        // Ödül varsa bildirim gönder
        if (goldReward > 0) {
          showNotification(`Boss yenildi! ${goldReward} altın kazandınız.`, 'success');
        } else {
          showNotification(`World Boss'a ${damage} hasar verdiniz!`, 'success');
        }

        // Sıralamaları ve verileri güncelle
        await fetchWorldBossData();
      }

    } catch (error) {
      console.error('World Boss saldırı hatası:', error);
      showNotification('Saldırı sırasında bir hata oluştu', 'error');
    }
  };

  const fetchWorldBossDamageRankings = async () => {
    try {
      console.log('Fetching World Boss Damage Rankings');

      // Debug bilgisini al
      const { data: debugData, error: debugError } = await supabase.rpc('debug_world_boss_damage_log');

      console.log('World Boss Damage Log Debug:', { debugData, debugError });

      // Hasar sıralamasını getir
      const { data, error } = await supabase.rpc('get_world_boss_damage_rankings');

      console.log('Hasar Sıralaması Verisi:', { data, error });

      if (error) {
        console.error('Hasar sıralaması yüklenemedi:', error);
        setWorldBossDamageRankings([]);
        return;
      }

      // Hasar sıralamasını güncelle
      if (data && data.length > 0) {
        const processedRankings = data.map(item => ({
          playerId: item.player_id,
          username: item.username,
          damage: item.player_damage,
          goldReward: Math.floor(item.gold_reward), // Tam sayıya yuvarla
          totalBossDamage: item.total_boss_damage,
          rank: item.player_rank
        }));

        console.log('İşlenmiş Hasar Sıralaması:', processedRankings);
        setWorldBossDamageRankings(processedRankings);
      } else {
        setWorldBossDamageRankings([]);
      }
    } catch (error) {
      console.error('Hasar sıralaması fetch hatası:', error);
      setWorldBossDamageRankings([]);
    }
  };

  const refreshWorldBossRankings = async () => {
    try {
      // Mevcut hasar sıralamasını getir
      const { data, error } = await supabase.rpc('get_world_boss_damage_rankings');

      console.log('Hasar Sıralaması Yenileme Verisi:', { data, error });

      if (error) {
        console.error('Hasar sıralaması yüklenemedi:', error);
        setWorldBossDamageRankings([]);
        showNotification('Sıralama güncellenemedi', 'error');
        return;
      }

      // Hasar sıralamasını güncelle
      if (data && data.length > 0) {
        const processedRankings = data.map(item => ({
          playerId: item.player_id,
          username: item.username,
          damage: item.player_damage,
          goldReward: Math.floor(item.gold_reward),
          totalBossDamage: item.total_boss_damage,
          rank: item.player_rank
        }));

        console.log('İşlenmiş Hasar Sıralaması:', processedRankings);
        setWorldBossDamageRankings(processedRankings);
        showNotification('Sıralama güncellendi', 'success');
      } else {
        setWorldBossDamageRankings([]);
        showNotification('Sıralama bulunamadı', 'warning');
      }
    } catch (error) {
      console.error('Hasar sıralaması fetch hatası:', error);
      setWorldBossDamageRankings([]);
      showNotification('Sıralama yenilenemedi', 'error');
    }
  };

  if (!player) {
    return <div>Yükleniyor...</div>;
  }

  // Farm Area için gerekli state'i ekleyelim
  const [farmAttempts, setFarmAttempts] = useState({});

  // Power'a bağlı HP hesaplama fonksiyonu
  const calculateHealthFromPower = (power) => {
    // Örnek formül: Güç * 2 + 50
    // Bu formülü oyunun dengesine göre ayarlayabilirsiniz
    return Math.floor(power * 2 + 50);
  };

  const [remainingResetTime, setRemainingResetTime] = useState({
    hours: 24,
    minutes: 0,
    seconds: 0
  });

  const handleVictory = async () => {
    const { addExperience } = useGameStore.getState();
    
    try {
      // 10 EXP kazanma
      await addExperience(10);
      
      toast.success('🏆 Savaşı kazandınız! 10 EXP kazandınız.', {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "dark",
      });

      // Diğer zafer işlemleri
      setArenaMode('victory');
    } catch (error) {
      console.error('Zafer işlemi hatası:', error);
      toast.error('Bir hata oluştu!');
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Sekme Butonları */}
      <div className="grid grid-cols-3 gap-2 mb-4 bg-gray-900 p-1 rounded-xl">
        <button
          onClick={() => setActiveTab('farm')}
          className={`flex-1 py-2 px-4 rounded-xl text-sm font-semibold flex items-center justify-center space-x-2 transition-all duration-300 ${
            activeTab === 'farm' 
              ? 'bg-green-600 text-white' 
              : 'text-slate-400 hover:bg-slate-700'
          }`}
        >
          <FaTasks className="mr-2" />
          <span>Tarla</span>
        </button>

        <button
          onClick={() => setActiveTab('arena')}
          className={`flex-1 py-2 px-4 rounded-xl text-sm font-semibold flex items-center justify-center space-x-2 transition-all duration-300 ${
            activeTab === 'arena' 
              ? 'bg-blue-600 text-white' 
              : 'text-slate-400 hover:bg-slate-700'
          }`}
        >
          <FaShieldAlt className="mr-2" />
          <span>Arena</span>
        </button>

        <button
          onClick={() => setActiveTab('world-boss')}
          className={`flex-1 py-2 px-4 rounded-xl text-sm font-semibold flex items-center justify-center space-x-2 transition-all duration-300 ${
            activeTab === 'world-boss' 
              ? 'bg-orange-600 text-white' 
              : 'text-slate-400 hover:bg-slate-700'
          }`}
        >
          <FaSkull className="mr-2" />
          <span>Dünya Boss</span>
        </button>
      </div>

      {/* Tarla Bölümü */}
      {activeTab === 'farm' && (
        <FarmArea 
          player={player} 
          supabase={supabase} 
          farmAttempts={farmAttempts} 
          setFarmAttempts={setFarmAttempts} 
          showNotification={showNotification}
        />
      )}

      {/* Arena Bölümü */}
      {activeTab === 'arena' && (
        <div className="space-y-4">
          {isMatchmaking && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
            >
              <motion.div
                animate={{ 
                  scale: [1, 1.1, 1],
                  rotate: [0, 10, -10, 0]
                }}
                transition={{ 
                  duration: 0.5,
                  repeat: Infinity,
                  repeatType: 'loop'
                }}
                className="bg-gray-800 rounded-3xl p-8 text-center"
              >
                <div className="flex justify-center items-center space-x-4 mb-4">
                  <FaUserFriends className="text-4xl text-blue-500 animate-pulse" />
                  <FaRobot className="text-4xl text-red-500 animate-pulse" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-4">Eşleştiriliyor...</h2>
                <p className="text-gray-400">Rakip aranıyor, lütfen bekleyin.</p>
              </motion.div>
            </motion.div>
          )}

          {!arenaMode && (
            <div className="text-center bg-gray-800 rounded-2xl p-6 shadow-xl">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center space-x-2">
                  <FaBattleNet className="text-green-500" />
                  <span className="font-semibold text-gray-300">
                    Günlük Kalan Eşleşme 
                    <span className="text-xs text-blue-300 ml-2">
                      (yenilenecek : {formatRemainingTime(remainingResetTime)})
                    </span>
                  </span>
                </div>
                <span className="text-2xl font-bold text-green-400">
                  {dailyMatchesLeft}/10
                </span>
              </div>
              
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center space-x-2">
                  <FaTrophy className="text-yellow-500" />
                  <span className="font-semibold">Toplam Savaşlar</span>
                </div>
                <span className="text-xl font-bold text-blue-500">
                  {player.total_battles || 0}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <FaCheckCircle className="text-green-500" />
                  <span className="font-semibold">Kazanılan</span>
                </div>
                <span className="text-xl font-bold text-green-500">
                  {player.battles_won || 0}
                </span>
              </div>

              <div className="flex justify-between items-center mt-2">
                <div className="flex items-center space-x-2">
                  <FaTimesCircle className="text-red-500" />
                  <span className="font-semibold">Kaybedilen</span>
                </div>
                <span className="text-xl font-bold text-red-500">
                  {player.battles_lost || 0}
                </span>
              </div>

              {/* Güncel Fame Alanı */}
              <div className="flex justify-between items-center mt-4 bg-gray-700 rounded-xl p-3">
                <div className="flex items-center space-x-2">
                  <FaTrophy className="text-yellow-500" />
                  <span className="font-semibold text-gray-300">Güncel Fame</span>
                </div>
                <span className="text-2xl font-bold text-yellow-400">
                  {player.fame}
                </span>
              </div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={findOpponent}
                disabled={dailyMatchesLeft <= 0 || isMatchmaking}
                className={`
                  w-full py-3 rounded-full mt-6 transition-all duration-300
                  ${dailyMatchesLeft > 0 && !isMatchmaking 
                    ? 'bg-gradient-to-r from-blue-600 to-blue-800 text-white hover:shadow-lg' 
                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'}
                `}
              >
                {dailyMatchesLeft > 0 && !isMatchmaking ? 'Eşleştir' : 'Günlük Limit Doldu'}
              </motion.button>
            </div>
          )}

          {arenaMode === 'battle' && (
            <div className="flex justify-between items-center space-x-4">
              {/* Sol Taraf - Oyuncu */}
              <div className="w-1/2 bg-gray-800 rounded-2xl p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold">{player.username}</h3>
                  <span className="text-green-500">HP: {playerHealth}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Güç: {Math.round(player.power)}</span>
                  <span>Fame: {player.fame}</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-4 overflow-hidden">
                  <div 
                    className="h-4 bg-green-500 transition-all duration-300" 
                    style={{ 
                      width: `${Math.max(0, Math.min(100, (playerHealth / calculateHealthFromPower(player.power)) * 100))}%`,
                      maxWidth: '100%'
                    }}
                  ></div>
                </div>
              </div>

              {/* Orta - VS */}
              <div className="text-3xl font-bold text-red-500">VS</div>

              {/* Sağ Taraf - Rakip */}
              <div className="w-1/2 bg-gray-800 rounded-2xl p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold">{opponent?.username || '?'}</h3>
                  <span className="text-green-500">HP: {opponentHealth}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Güç: {opponent?.is_bot ? Math.round(opponent.power) : (opponent?.power || '?')}</span>
                  <span>Fame: {opponent?.is_bot ? 0 : (opponent?.fame || '?')}</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-4 overflow-hidden">
                  <div 
                    className="h-4 bg-red-500 transition-all duration-300" 
                    style={{ 
                      width: `${Math.max(0, Math.min(100, (opponentHealth / calculateHealthFromPower(opponent.power)) * 100))}%`,
                      maxWidth: '100%'
                    }}
                  ></div>
                </div>
              </div>
            </div>
          )}

          {arenaMode === 'battle' && (
            <div className="mt-6">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={performAttack}
                disabled={currentTurn !== 'player' || playerHealth <= 0 || opponentHealth <= 0}
                className={`
                  w-full py-3 rounded-full transition-all duration-300
                  ${currentTurn === 'player' && playerHealth > 0 && opponentHealth > 0
                    ? 'bg-gradient-to-r from-red-600 to-red-800 text-white hover:shadow-lg' 
                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'}
                `}
              >
                {isAutoAttacking ? 'Saldırılıyor...' : 'Saldır'}
              </motion.button>
            </div>
          )}

          {/* Savaş Günlüğü */}
          {arenaMode === 'battle' && (
            <div className="mt-4 bg-gray-800 rounded-2xl p-4 max-h-40 overflow-y-auto">
              {battleLog.map((log, index) => (
                <div 
                  key={index} 
                  className="text-sm text-gray-300 mb-2 animate-pulse"
                >
                  {log}
                </div>
              ))}
            </div>
          )}

          {/* Fame Sıralaması */}
          {arenaMode === null && (
            <div className="mt-6 bg-gray-800 rounded-2xl p-4 shadow-xl">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-yellow-500">Fame Sıralaması</h2>
                <div className="flex items-center space-x-2 text-gray-400">
                  <span>Sayfa</span>
                  <span className="text-yellow-500 font-bold">{currentFamePage}</span>
                  <span>/10</span>
                </div>
              </div>
              
              <div className="space-y-2 mb-4">
                {famePlayers.map((p, index) => (
                  <motion.div 
                    key={p.id} 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`
                      flex justify-between items-center p-3 rounded-lg
                      ${p.id === player.id 
                        ? 'bg-yellow-600 text-white' 
                        : 'bg-gray-700 hover:bg-gray-600'}
                    `}
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-gray-400 font-bold w-8 text-right">
                        {index + 1}.
                      </span>
                      <span className="font-semibold">{p.username}</span>
                      <button 
                        onClick={() => openPlayerDetailsModal(p)}
                        className="text-gray-400 hover:text-white"
                      >
                        Detay
                      </button>
                    </div>
                    <span className="text-yellow-500 font-bold">
                      {p.fame}
                    </span>
                  </motion.div>
                ))}
              </div>

              {/* Sayfa Numaraları */}
              <div className="flex justify-center space-x-2 mt-4">
                {Array(10).fill(0).map((_, index) => (
                  <motion.button 
                    key={index} 
                    onClick={() => changeFamePage(index + 1)}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className={`
                      w-10 h-10 rounded-full transition-all duration-300 flex items-center justify-center
                      ${currentFamePage === index + 1 
                        ? 'bg-yellow-500 text-white' 
                        : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}
                    `}
                  >
                    {index + 1}
                  </motion.button>
                ))}
              </div>

              {/* Oyuncunun Kendi Sıralaması */}
              {playerRank && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-6 bg-gray-700 rounded-2xl p-4 text-center"
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <FaTrophy className="text-yellow-500" />
                      <span className="text-gray-300">Sıralamanız</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-yellow-500 font-bold text-xl">
                        #{playerRank.rank}
                      </span>
                      <span className="text-yellow-400 font-semibold">
                        {playerRank.fame} Fame
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          )}

          {/* Savaş Sonucu Modalı */}
          {(arenaMode === 'win' || arenaMode === 'lose') && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            >
              <motion.div 
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                className="bg-gray-800 rounded-3xl p-8 max-w-md w-full text-center"
              >
                <h2 className="text-3xl font-bold mb-6 text-center">
                  {arenaMode === 'win' ? 'Zafer Kazandınız!' : 'Mağlup Oldunuz'}
                </h2>

                {arenaMode === 'win' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center bg-gray-700 p-4 rounded-2xl">
                      <span className="text-yellow-400">🏆 Altın Ödülü</span>
                      <span className="font-bold text-white">+100</span>
                    </div>
                    <div className="flex justify-between items-center bg-gray-700 p-4 rounded-2xl">
                      <span className="text-blue-400">⭐ Fame Puanı</span>
                      <span className="font-bold text-white">+100</span>
                    </div>
                    <div className="flex justify-between items-center bg-gray-700 p-4 rounded-2xl">
                      <span className="text-green-400">💪 Deneyim Puanı</span>
                      <span className="font-bold text-white">+10</span>
                    </div>
                  </div>
                )}

                {arenaMode === 'lose' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center bg-gray-700 p-4 rounded-2xl">
                      <span className="text-red-400">💔 Fame Kaybı</span>
                      <span className="font-bold text-white">-50</span>
                    </div>
                  </div>
                )}

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setArenaMode(null);
                    setOpponent(null);
                    setPlayerHealth(null);
                    setOpponentHealth(null);
                    setCurrentTurn(null);
                    setBattleLog([]);
                  }}
                  className="mt-6 w-full bg-blue-600 text-white py-3 rounded-full hover:bg-blue-700 transition-all duration-300"
                >
                  Tamam
                </motion.button>
              </motion.div>
            </motion.div>
          )}
        </div>
      )}

      {/* Dünya Boss Bölümü */}
      {activeTab === 'world-boss' && (
        <div className="world-boss-section bg-gradient-to-br from-gray-900 to-gray-800 min-h-screen p-6">
          <div className="max-w-6xl mx-auto">
            {/* Başlık ve Açıklama */}
            <div className="text-center mb-10">
              <h1 className="text-4xl font-bold text-white mb-4">Dünya Boss Savaşı</h1>
              <p className="text-gray-400 max-w-2xl mx-auto">
                Dünyanın en güçlü canavarına karşı savaş! Tüm oyuncuların ortak hedefi, bu efsanevi düşmanı yenmek.
              </p>
            </div>

            <div className="boss-container grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Boss Kartı */}
              {worldBossList.map((boss, index) => (
                <div 
                  key={`world-boss-${boss.currentBattleId || index}`}
                  className="world-boss-container bg-gray-900 rounded-3xl p-6 shadow-2xl space-y-6"
                >
                  <div className="boss-header bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl p-4 mb-6 flex flex-col items-center justify-center space-y-3 shadow-xl border border-gray-700">
                    <div className="w-28 h-28 bg-white/20 rounded-full flex items-center justify-center text-5xl mb-4">
                      <img 
                        src="/img/dragon.gif" 
                        alt="World Boss" 
                        className="w-24 h-24 object-contain mix-blend-multiply"
                      />
                    </div>
                    <div className="text-center">
                      <h2 className="text-2xl font-bold text-white mb-1">{boss.name}</h2>
                      <p className="text-gray-400 text-xs px-2">Dünyanın en güçlü canavarı</p>
                    </div>
                  </div>
                  
                  {/* Can Çubuğu */}
                  <div className="boss-health-bar mb-6 bg-gray-800 rounded-2xl p-4 shadow-md">
                    <div className="flex justify-between text-sm text-gray-400 mb-2">
                      <span>Boss Can Puanı</span>
                      <span>{boss.currentHealth} / {boss.maxHealth}</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-4 overflow-hidden">
                      <div 
                        className="h-full bg-red-600 rounded-full transition-all duration-300" 
                        style={{width: `${(boss.currentHealth / boss.maxHealth) * 100}%`}}
                      ></div>
                    </div>
                  </div>
                  
                  {/* Boss İstatistikleri */}
                  <div className="boss-stats grid grid-cols-3 gap-4 mb-6">
                    <div className="stat bg-gray-800 rounded-xl p-3 text-center shadow-md">
                      <FaStar className="text-yellow-500 mx-auto mb-2" />
                      <p className="text-white text-sm">Seviye {boss.level}</p>
                    </div>
                    <div className="stat bg-gray-800 rounded-xl p-3 text-center shadow-md">
                      <FaClock className="text-blue-500 mx-auto mb-2" />
                      <p className="text-white text-sm">
                        {boss.remainingTime ? formatRemainingTime(boss.remainingTime) : 'Süre Doldu'}
                      </p>
                    </div>
                    <div className="stat bg-gray-800 rounded-xl p-3 text-center shadow-md">
                      <FaTrophy className="text-green-500 mx-auto mb-2" />
                      <p className="text-white text-sm">1000 Altın</p>
                    </div>
                  </div>
                  
                  {/* Saldırı Butonu */}
                  <button 
                    onClick={attackWorldBoss}
                    disabled={hasPlayerAttacked}
                    className={`
                      w-full py-3 rounded-full text-white font-bold transition-all duration-300 
                      ${hasPlayerAttacked 
                        ? 'bg-gray-600 cursor-not-allowed' 
                        : 'bg-red-600 hover:bg-red-700 hover:scale-105 active:scale-95'
                      }
                    `}
                  >
                    {hasPlayerAttacked ? 'Zaten Saldırdınız' : 'Saldır'}
                  </button>
                </div>
              ))}
              
              {/* Hasar Sıralaması */}
              <div className="damage-rankings bg-gray-800 rounded-3xl p-6 shadow-xl">
                <h3 className="text-2xl font-bold text-white mb-6 text-center">Hasar Sıralaması</h3>
                {worldBossDamageRankings.length > 0 ? (
                  <div className="ranking-list space-y-4">
                    {worldBossDamageRankings.slice(0, 10).map((entry, index) => (
                      <div 
                        key={entry.playerId} 
                        className={`
                          ranking-item flex justify-between items-center p-3 rounded-lg
                          ${index === 0 ? 'bg-yellow-600 text-white' : 'bg-gray-700 text-gray-300'}
                        `}
                      >
                        <div className="flex items-center space-x-4">
                          {index === 0 && <FaTrophy className="text-2xl" />}
                          <span className="font-semibold">{entry.username}</span>
                        </div>
                        <div className="flex items-center space-x-4">
                          <span className="font-bold">{entry.damage} Hasar</span>
                          <span className="font-bold">{entry.goldReward} Altın</span>
                        </div>
                      </div>
                    ))}
                    
                    {worldBossDamageRankings.length > 10 && (
                      <div className="text-center text-gray-500 mt-4">
                        Ve {worldBossDamageRankings.length - 10} daha fazla oyuncu...
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-gray-500">
                    Henüz kimse saldırmadı
                  </div>
                )}
                {worldBossDamageRankings.length > 0 && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={refreshWorldBossRankings}
                    className="w-auto mx-auto mt-4 bg-blue-600 text-white px-4 py-2 rounded-full hover:bg-blue-700 transition-all duration-300 flex items-center justify-center space-x-2"
                  >
                    <FaSync className="mr-2" />
                    Sıralamayı Yenile
                  </motion.button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Oyuncu Detay Modalı */}
      {selectedPlayer && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={closePlayerDetailsModal}
        >
          <div 
            className="bg-slate-800 rounded-2xl shadow-2xl w-96 max-w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Üst Bölüm */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-center relative">
              <button 
                onClick={closePlayerDetailsModal}
                className="absolute top-4 right-4 text-white hover:text-gray-200 transition-colors"
              >
                ✕
              </button>
              <div className="flex flex-col items-center">
                <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center text-5xl mb-4">
                  {selectedPlayer.username[0].toUpperCase()}
                </div>
                <h2 className="text-2xl font-bold text-white">{selectedPlayer.username}</h2>
              </div>
            </div>

            {/* İstatistikler */}
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-700 rounded-lg p-3 text-center">
                  <div className="text-sm text-slate-400">Seviye</div>
                  <div className="font-bold text-lg text-indigo-300">{selectedPlayer.level}</div>
                </div>
                <div className="bg-slate-700 rounded-lg p-3 text-center">
                  <div className="text-sm text-slate-400">Güç</div>
                  <div className="font-bold text-lg text-green-300">{selectedPlayer.power}</div>
                </div>
                <div className="bg-slate-700 rounded-lg p-3 text-center">
                  <div className="text-sm text-slate-400">Fame</div>
                  <div className="font-bold text-lg text-yellow-300">{selectedPlayer.fame}</div>
                </div>
              </div>

              {/* Aktif Ekipmanlar */}
              <div className="mt-4">
                <h3 className="text-lg font-semibold mb-2 text-indigo-400">Aktif Ekipmanlar</h3>
                {selectedPlayer.player_items
                  .filter(pi => 
                    pi.items && 
                    (pi.equipped === true || pi.is_equipped === true) && 
                    (pi.deleted === false || pi.is_deleted === false)
                  )
                  .map((playerItem) => {
                    // Enchantment seviyesini ve toplam gücü hesapla
                    const enchantLevel = playerItem.enhance_level || playerItem.enchant_level || 0;
                    const basePower = playerItem.items.power || 0;
                    const totalPower = playerItem.power || (basePower + (enchantLevel * 5)); // Eğer power varsa onu kullan

                    // Enchantment seviyesine göre renk sınıfını belirle
                    const enchantColorClass = 
                      enchantLevel >= 9 ? 'bg-orange-600 border-orange-500' :
                      enchantLevel >= 7 ? 'bg-purple-600 border-purple-500' :
                      enchantLevel >= 5 ? 'bg-green-600 border-green-500' :
                      enchantLevel >= 4 ? 'bg-blue-600 border-blue-500' :
                      enchantLevel >= 3 ? 'bg-red-600 border-red-500' :
                      enchantLevel >= 2 ? 'bg-yellow-600 border-yellow-500' :
                      enchantLevel >= 1 ? 'bg-gray-600 border-gray-500' :
                      'bg-slate-700 border-slate-600';

                    return (
                      <div 
                        key={playerItem.id} 
                        className={`
                          rounded-lg p-3 mb-2 flex flex-col sm:flex-row items-start sm:items-center 
                          border-l-4 ${enchantColorClass} 
                          space-y-2 sm:space-y-0 sm:space-x-3
                        `}
                      >
                        <div className="text-2xl sm:mr-3 self-center">{playerItem.items.emoji || playerItem.items.icon || '🔧'}</div>
                        <div className="flex-grow text-center sm:text-left">
                          <div className="font-semibold text-sm sm:text-base">
                            +{enchantLevel} {playerItem.items.name}
                          </div>
                          <div className="text-xs sm:text-sm text-slate-300">
                            Güç: {totalPower} ({basePower} + {enchantLevel * 5})
                          </div>
                        </div>
                      </div>
                    );
                  })}
                {selectedPlayer.player_items.filter(pi => 
                  pi.items && 
                  (pi.equipped === true || pi.is_equipped === true) && 
                  (pi.deleted === false || pi.is_deleted === false)
                ).length === 0 && (
                  <p className="text-slate-500 text-center">Aktif ekipman yok</p>
                )}
              </div>
            </div>

            {/* Alt Buton */}
            {selectedPlayer.id !== player.id && (
              <div className="p-4 bg-slate-700 flex justify-center relative">
                <button
                  disabled
                  className="
                    w-full py-3 rounded-lg 
                    bg-slate-600 text-slate-400 cursor-not-allowed
                    flex items-center justify-center
                    space-x-2
                  "
                >
                  <span>⚔️</span>
                  <span className="text-red-500">Yakında</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
