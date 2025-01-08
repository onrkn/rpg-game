import React, { useState, useEffect } from 'react';
import { FaSkull, FaStar, FaClock, FaDice, FaBattleNet } from 'react-icons/fa';
import { useGameStore } from '../store/gameStore';

const calculateSuccessChance = (playerPower, monsterPower) => {
  // Eğer canavar gücü tanımsızsa varsayılan değer kullan
  if (monsterPower == null || monsterPower === undefined) {
    monsterPower = playerPower; // Eşit güç varsay
  }
  
  // Oyuncu gücü canavardan ne kadar fazla/az
  const powerDifference = playerPower - monsterPower;
  
  // Temel başarı şansı
  let baseChance = 0.5;
  
  // Güç farkına göre şansı ayarla
  if (powerDifference > 0) {
    // Oyuncu daha güçlüyse, şansı artır
    baseChance += Math.min(0.4, powerDifference / monsterPower);
  } else {
    // Oyuncu daha zayıfsa, şansı azalt
    baseChance -= Math.min(0.4, Math.abs(powerDifference) / playerPower);
  }
  
  // Şansı 0 ile 1 arasında sınırla
  return Math.max(0.1, Math.min(0.9, baseChance));
};

const FarmArea = ({ 
  player, 
  supabase, 
  farmAttempts, 
  setFarmAttempts, 
  showNotification 
}) => {
  const { updatePlayer, setState, addExperience } = useGameStore();
  const [monsters, setMonsters] = useState([]);
  const [monsterSuccessChances, setMonsterSuccessChances] = useState({});

  useEffect(() => {
    const fetchMonsters = async () => {
      const { data: monsterData, error: monsterError } = await supabase
        .from('monsters')
        .select('*');

      if (monsterData) {
        setMonsters(monsterData);
        
        // Her canavar için başarı şansını hesapla
        const chances = monsterData.reduce((acc, monster) => {
          acc[monster.id] = calculateSuccessChance(player.power, monster.power);
          return acc;
        }, {});
        setMonsterSuccessChances(chances);
        
        console.log('Monster Success Chances:', chances);
        console.log('Player Power:', player.power);
        console.log('Monsters:', monsterData);
        
        // Her canavar için kalan hakları çek
        const attemptsPromises = monsterData.map(async (monster) => {
          const { data, error } = await supabase.rpc('check_farm_attempts', {
            p_player_id: player.id,
            p_monster_id: monster.id
          });
          
          return { monsterId: monster.id, attempts: data };
        });

        const attemptsResults = await Promise.all(attemptsPromises);
        const attemptsMap = attemptsResults.reduce((acc, result) => {
          acc[result.monsterId] = result.attempts;
          return acc;
        }, {});

        setFarmAttempts(attemptsMap);
      }
    };

    fetchMonsters();
  }, [player.id, supabase]);

  const handleFarmMonster = async (monsterId) => {
    try {
      // Kalan hakları kontrol et
      if (farmAttempts[monsterId] <= 0) {
        showNotification({
          type: 'error',
          message: 'Bu canavar için günlük savaş hakkınız kalmadı.'
        });
        return;
      }

      // Başarı şansını al
      const successChance = monsterSuccessChances[monsterId];
      const randomValue = Math.random();
      const isSuccessful = randomValue <= successChance;

      console.log('Farm Monster Params:', {
        p_player_id: player.id,
        p_monster_id: monsterId,
        successChance,
        randomValue,
        isSuccessful
      });

      const { data, error } = await supabase.rpc('farm_monster', {
        p_player_id: player.id,
        p_monster_id: monsterId,
        p_is_successful: isSuccessful
      });

      console.log('Farm Monster Response:', { data, error });

      if (error) {
        console.error('Supabase RPC Error:', error);
        showNotification({
          type: 'error',
          message: `Hata: ${error.message}`
        });
        return;
      }

      // Hakları güncelle
      setFarmAttempts(prev => ({...prev, [monsterId]: prev[monsterId] - 1}));

      if (!isSuccessful) {
        showNotification({
          type: 'error',
          message: 'Savaş başarısız oldu! Bir hakkınız düşürüldü.'
        });
        return;
      }

      const expGained = data[0]?.gained_exp || 0;
      const goldGained = data[0]?.gained_gold || 0;

      if (expGained > 0 || goldGained > 0) {
        const updatedPlayer = await addExperience(expGained);

        showNotification({
          type: 'success',
          message: `${expGained} EXP ve ${goldGained} altın kazandınız!`
        });
      }
    } catch (catchError) {
      console.error('Farm Monster Catch Error:', catchError);
      showNotification({
        type: 'error',
        message: catchError.message || 'Bilinmeyen bir hata oluştu.'
      });
    }
  };

  return (
    <div className="p-4 bg-gray-900 min-h-screen">
      <div className="max-w-4xl mx-auto">
        {/* Başlık ve Açıklama */}
        <div className="mb-6 text-center">
          <h2 className="text-3xl font-bold text-white mb-2">Farm</h2>
          <p className="text-gray-400 max-w-xl mx-auto">
            Canavarlarla savaşarak deneyim ve ödüller kazanın. Her canavar için günlük 3 savaş hakkınız bulunmaktadır.
          </p>
        </div>

        {/* Canavar Kartları */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {monsters.map((monster) => (
            <div 
              key={monster.id} 
              className="bg-gray-800 rounded-xl shadow-lg overflow-hidden transform transition-all hover:scale-105 hover:shadow-2xl"
            >
              {/* Canavar Resmi */}
              <div className="relative h-48 bg-gray-700 flex items-center justify-center">
                <img 
                  src={
                    monster.name.toLowerCase().includes('goblin') 
                    ? '/img/goblin.gif' 
                    : monster.name.toLowerCase().includes('orc')
                    ? '/img/orc.gif'
                    : monster.name.toLowerCase().includes('troll')
                    ? '/img/cyclops.gif'
                    : (monster.image_url || '/default-monster.png')
                  } 
                  alt={monster.name} 
                  className="max-h-full max-w-full object-contain mix-blend-multiply"
                />
                <div className="absolute top-2 right-2 bg-black/50 px-2 py-1 rounded-full text-white text-sm">
                  {monster.difficulty_level === 'easy' && <span className="text-green-500">Kolay</span>}
                  {monster.difficulty_level === 'medium' && <span className="text-yellow-500">Orta</span>}
                  {monster.difficulty_level === 'hard' && <span className="text-red-500">Zor</span>}
                </div>
              </div>

              {/* Canavar Bilgileri */}
              <div className="p-4">
                <h3 className="text-xl font-bold text-white mb-2">{monster.name}</h3>
                
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="bg-gray-700 rounded-lg p-2 text-center">
                    <FaStar className="text-yellow-500 mx-auto mb-1" />
                    <p className="text-white text-sm">Exp {monster.exp_reward}</p>
                  </div>
                  <div className="bg-gray-700 rounded-lg p-2 text-center">
                    <FaSkull className="text-red-500 mx-auto mb-1" />
                    <p className="text-white text-sm">
                      Kalan Hak: {farmAttempts[monster.id] || 0}/3
                    </p>
                  </div>
                  <div className="bg-gray-700 rounded-lg p-2 text-center">
                    <FaBattleNet className="text-blue-500 mx-auto mb-1" />
                    <p className="text-white text-sm">Güç {monster.power}</p>
                  </div>
                </div>

                {/* Savaş Butonu */}
                <div className="space-y-2">
                  <button 
                    onClick={() => handleFarmMonster(monster.id)}
                    disabled={farmAttempts[monster.id] === 0}
                    className={`w-full py-3 rounded-lg transition-all ${
                      farmAttempts[monster.id] === 0 
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                      : 'bg-green-600 hover:bg-green-700 text-white hover:scale-105 active:scale-95'
                    }`}
                  >
                    {farmAttempts[monster.id] === 0 ? 'Hak Bitti' : 'Savaş'}
                  </button>
                  
                  {monsterSuccessChances[monster.id] !== undefined && (
                    <div className="text-center text-sm text-gray-400">
                      Başarı Şansı: {(monsterSuccessChances[monster.id] * 100).toFixed(1)}%
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FarmArea;
