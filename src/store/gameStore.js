import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { supabase } from '../lib/supabase';

const initialPlayerState = {
  level: 1,
  experience: 0,
  equipment: {
    weapon: null,
    shield: null,
    armor: null
  },
  gold: 0,
  fame: 0,
  daily_matches_left: 0,
  guctasi: 0
};

export const useGameStore = create(
  persist(
    (set, get) => ({
      player: initialPlayerState,

      fetchPlayer: async (userData) => {
        if (!userData) return;

        try {
          // Eğer userData bir user objesi ise, ID'yi çıkar
          const userId = userData.id || userData;

          // Supabase'den güncel oyuncu verilerini çek
          const { data: playerData, error } = await supabase
            .from('players')
            .select('*')
            .eq('id', userId)
            .single();

          if (error || !playerData) {
            console.error('Oyuncu verisi çekilemedi:', error);
            return;
          }

          // Varsayılan değerlerle birleştir
          const mergedPlayerData = {
            ...initialPlayerState,
            ...playerData
          };

          // State ve localStorage'ı güncelle
          set({ player: mergedPlayerData });
          localStorage.setItem('gamePlayerData', JSON.stringify(mergedPlayerData));

          return mergedPlayerData;
        } catch (err) {
          console.error('Oyuncu yükleme hatası:', err);
        }
      },

      setPlayer: (playerData) => {
        const mergedPlayerData = {
          ...initialPlayerState,
          ...playerData
        };
        
        set({ player: mergedPlayerData });
        
        // LocalStorage'a kaydet
        localStorage.setItem('gamePlayerData', JSON.stringify(mergedPlayerData));
      },

      resetPlayer: () => {
        set({ player: initialPlayerState });
        localStorage.removeItem('gamePlayerData');
      },

      calculateCurrentLevel: (totalExperience) => {
        const { levelRequirements } = get();
        if (!levelRequirements) return 1;

        let currentLevel = 1;
        for (const levelReq of levelRequirements) {
          if (totalExperience >= levelReq.cumulative_exp) {
            currentLevel = levelReq.level;
          } else {
            break;
          }
        }
        return currentLevel;
      },

      checkLevelUp: (currentExp, currentLevel) => {
        const requiredExp = get().calculateRequiredExp(currentLevel);
        
        console.group('🔍 Seviye Atlama Kontrolü');
        console.log('Mevcut Seviye:', currentLevel);
        console.log('Mevcut EXP:', currentExp);
        console.log('Gerekli EXP:', requiredExp);
        
        // Debug: Tam eşitlik ve fazlalık kontrolü
        console.log('EXP Karşılaştırma Detayları:');
        console.log('currentExp >= requiredExp:', currentExp >= requiredExp);
        console.log('currentExp === requiredExp:', currentExp === requiredExp);
        console.log('currentExp > requiredExp:', currentExp > requiredExp);
        
        // Eğer mevcut EXP gerekli EXP'den fazlaysa veya eşitse
        if (currentExp >= requiredExp) {
          console.log('✅ SEVİYE ATLAMASI GEREKİYOR!');
          console.groupEnd();
          return true;
        }
        
        console.log('❌ Henüz seviye atlaması gerekmiyor');
        console.groupEnd();
        return false;
      },

      levelUp: async () => {
        const { player } = get();
        
        try {
          const { data: { user } } = await supabase.auth.getUser();
          
          if (!user) {
            console.error('❌ Kullanıcı bulunamadı');
            return null;
          }

          const newLevel = player.level + 1;
          const requiredExp = get().calculateRequiredExp(player.level);
          const newExperience = player.experience - requiredExp;

          console.group('🆙 Seviye Atlama İşlemi');
          console.log('Eski Seviye:', player.level);
          console.log('Yeni Seviye:', newLevel);
          console.log('Gerekli EXP:', requiredExp);
          console.log('Mevcut EXP:', player.experience);
          console.log('Kalan EXP:', newExperience);

          // Supabase güncelleme
          const { data: updatedPlayerData, error } = await supabase
            .from('players')
            .update({
              level: newLevel,
              experience: newExperience
            })
            .eq('id', user.id)
            .select()
            .single();

          if (error) {
            console.error('❌ Seviye atlama sırasında hata:', error);
            console.groupEnd();
            return null;
          }

          // State güncelleme
          set((state) => ({
            player: {
              ...state.player,
              level: newLevel,
              experience: newExperience
            }
          }));

          console.log('✅ Seviye başarıyla atlandı');
          console.groupEnd();

          return updatedPlayerData;
        } catch (err) {
          console.error('❌ Seviye atlama hatası:', err);
          return null;
        }
      },

      equipItem: (slot, item) => set((state) => ({
        player: {
          ...state.player,
          equipment: {
            ...state.player.equipment,
            [slot]: item
          }
        }
      })),

      updatePlayerAfterBattle: async (battleRewards) => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          
          if (!user) return;

          const { data: updatedPlayerData, error } = await supabase
            .from('players')
            .update({
              fame: battleRewards.fame ? 
                (get().player.fame || 0) + battleRewards.fame : 
                get().player.fame,
              gold: battleRewards.gold ? 
                (get().player.gold || 0) + battleRewards.gold : 
                get().player.gold,
              daily_matches_left: battleRewards.dailyMatchesLeft !== undefined 
                ? battleRewards.dailyMatchesLeft 
                : get().player.daily_matches_left
            })
            .eq('id', user.id)
            .select()
            .single();

          if (error) {
            console.error('Savaş sonrası oyuncu güncellemesi hatası:', error);
            return;
          }

          set((state) => ({
            player: {
              ...state.player,
              fame: updatedPlayerData.fame,
              gold: updatedPlayerData.gold,
              daily_matches_left: updatedPlayerData.daily_matches_left
            }
          }));

          return updatedPlayerData;
        } catch (err) {
          console.error('Savaş sonrası güncelleme hatası:', err);
        }
      },

      addExperience: async (expToAdd) => {
        const { player } = get();
        
        console.group('🔥 EXP Güncelleme Detayları');
        console.log('🟢 Mevcut Seviye:', player.level);
        console.log('🟢 Mevcut EXP:', player.experience);
        console.log('🟢 Eklenecek EXP:', expToAdd);
        
        // Yeni toplam EXP
        const newExperience = (player.experience || 0) + expToAdd;
        
        try {
          const { data: { user } } = await supabase.auth.getUser();
          
          if (!user) {
            console.error('❌ Kullanıcı bulunamadı');
            return;
          }

          // Tüm seviye gereksinimlerini al
          const { data: levelRequirements, error } = await supabase
            .from('level_requirements')
            .select('*')
            .order('level', { ascending: true });

          if (error || !levelRequirements) {
            console.error('❌ Seviye gereksinimleri alınamadı', error);
            return;
          }

          // Debug: Tüm seviye gereksinimlerini göster
          console.log('🔍 Tüm Seviye Gereksinimleri:');
          levelRequirements.forEach(req => {
            console.log(`📊 Seviye ${req.level}: Gerekli EXP = ${req.exp_required}`);
          });

          // Seviye belirleme
          let currentLevel = player.level;
          let levelUpRewards = [];

          // Seviye belirleme
          for (const levelReq of levelRequirements) {
            console.log(`🕵️ Kontrol Edilen Seviye: ${levelReq.level}`);
            console.log(`   Gerekli EXP: ${levelReq.exp_required}`);
            console.log(`   Toplam EXP: ${newExperience}`);

            // Eğer toplam EXP, gerekli EXP'den fazla ise seviye atla
            if (newExperience >= levelReq.exp_required) {
              currentLevel = levelReq.level;
              
              console.log(`✅ Seviye Belirlendi: ${currentLevel}`);
              
              // Seviye atladıysa ödülleri topla
              if (currentLevel > player.level) {
                if (levelReq.reward_bonus) {
                  levelUpRewards.push({
                    level: currentLevel,
                    ...levelReq.reward_bonus
                  });
                }
              }
            } else {
              // Gerekli EXP'den az ise döngüyü durdur
              break;
            }
          }

          // Toplam ödülleri hesapla
          const totalRewards = levelUpRewards.reduce((acc, reward) => {
            acc.gold = (acc.gold || 0) + (reward.gold || 0);
            acc.fame = (acc.fame || 0) + (reward.fame || 0);
            return acc;
          }, {});

          console.log('🚨 KONTROL NOKTALARI:');
          console.log('   Mevcut Seviye:', player.level);
          console.log('   Hesaplanan Yeni Seviye:', currentLevel);
          console.log('   Toplam EXP:', newExperience);
          console.log('   Level Up Rewards:', levelUpRewards);

          // Supabase güncelleme
          const { data: updatedPlayerData, error: updateError } = await supabase
            .from('players')
            .update({
              level: currentLevel,
              experience: newExperience,
              gold: (player.gold || 0) + (totalRewards.gold || 0),
              fame: (player.fame || 0) + (totalRewards.fame || 0)
            })
            .eq('id', user.id)
            .select()
            .single();

          if (updateError) {
            console.error('❌ Oyuncu verisi güncellenirken hata:', updateError);
            console.groupEnd();
            return;
          }

          console.log('🌟 Supabase Güncellemesi:', updatedPlayerData);

          // State güncelleme
          set((state) => {
            const newState = {
              player: {
                ...state.player,
                level: currentLevel,
                experience: newExperience,
                gold: (state.player.gold || 0) + (totalRewards.gold || 0),
                fame: (state.player.fame || 0) + (totalRewards.fame || 0)
              }
            };
            
            console.log('🌈 Yeni State:', newState);
            console.log('🔍 State Güncelleme Detayları:');
            console.log('   Eski Seviye:', state.player.level);
            console.log('   Yeni Seviye:', newState.player.level);
            console.log('   Eski EXP:', state.player.experience);
            console.log('   Yeni EXP:', newState.player.experience);
            console.log('   Eski Altın:', state.player.gold);
            console.log('   Yeni Altın:', newState.player.gold);
            console.log('   Eski Şöhret:', state.player.fame);
            console.log('   Yeni Şöhret:', newState.player.fame);
            
            return newState;
          });

          console.log('✅ Oyuncu verisi güncellendi');
          console.log('🏆 Son Durum - Seviye:', currentLevel);
          console.log('🏆 Son Durum - EXP:', newExperience);
          console.log('🏆 Toplam Ödüller:', totalRewards);
          console.groupEnd();

          return {
            ...updatedPlayerData,
            levelUpRewards: levelUpRewards
          };
        } catch (err) {
          console.error('❌ Deneyim güncelleme hatası:', err);
          console.groupEnd();
        }
      },

      calculateRequiredExp: (level) => {
        const expRequirements = [
          0,   // Seviye 0 (başlangıç)
          100, // Seviye 1
          300, // Seviye 2
          600, // Seviye 3
          1000,// Seviye 4
          1500,// Seviye 5
          2100,// Seviye 6
          2800,// Seviye 7
          3600,// Seviye 8
          4500,// Seviye 9
          5500,// Seviye 10
          6600,// Seviye 11
          7800,// Seviye 12
          9100,// Seviye 13
          10500// Seviye 14
        ];
        
        return expRequirements[level] || 0;
      },

      calculateCurrentLevelProgress: (player) => {
        const currentLevelRequiredExp = useGameStore.getState().calculateRequiredExp(player.level);
        const previousLevelRequiredExp = useGameStore.getState().calculateRequiredExp(player.level - 1);
        
        return {
          currentExp: player.experience - previousLevelRequiredExp,
          requiredExp: currentLevelRequiredExp - previousLevelRequiredExp
        };
      },
    }),
    {
      name: 'game-storage', // unique name
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ player: state.player }),
      onRehydrateStorage: () => (state) => {
        // LocalStorage'dan yüklendiğinde çalışır
        if (!state.player) {
          state.player = initialPlayerState;
        }
      }
    }
  )
);
