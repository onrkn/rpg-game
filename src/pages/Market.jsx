import React, { useState, useEffect, useMemo, memo } from 'react';
import { supabase } from '../lib/supabase';
import { useGameStore } from '../store/gameStore';
import { useAuth } from '../components/AuthProvider';
import { useNotification } from '../contexts/NotificationContext';
import { motion } from 'framer-motion';
import { useLocation } from 'react-router-dom'; 

const CATEGORIES = [
  { type: 'weapon', name: 'Kılıçlar', icon: '⚔️' },
  { type: 'shield', name: 'Kalkanlar', icon: '🛡️' },
  { type: 'armor', name: 'Zırhlar', icon: '🧥' },
  { type: 'fame', name: 'Fame', icon: '✨' }
];

// Yıldız animasyonu için SVG komponenti
const StarEffect = ({ className }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    className={`absolute ${className}`}
    style={{ 
      animation: 'spin 2s linear infinite',
      transformOrigin: 'center'
    }}
  >
    <path 
      fill="currentColor" 
      d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
    />
  </svg>
);

// Item detay modalı
const ItemDetailModal = memo(({ item, onClose, player }) => {
  if (!item) return null;

  const getItemDescription = (type, name) => {
    const descriptions = {
      'weapon': 'Savaş gücünüzü artıran önemli bir ekipmandır. Hasar ve vuruş hızınızı yükseltir.',
      'shield': 'Savunma kabiliyetinizi artıran kritik bir koruyucudur. Düşman saldırılarından korunmanıza yardımcı olur.',
      'armor': 'Vücut korumanızı sağlayan dayanıklı bir zırhtır. Savunma ve dayanıklılık parametrelerinizi geliştirir.',
      'default': 'Oyun içi özel bir eşya.'
    };

    return descriptions[type] || descriptions['default'];
  };

  const getItemIcon = (type) => {
    const icons = {
      'weapon': '⚔️',
      'shield': '🛡️',
      'armor': '🧥'
    };
    return icons[type] || '❓';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white flex items-center">
            <span className="text-3xl mr-2">
              {getItemIcon(item.type)}
            </span>
            {item.name || 'Bilinmeyen Eşya'}
          </h2>
          <button 
            onClick={onClose} 
            className="text-white hover:text-red-500 transition-colors"
          >
            ✖️
          </button>
        </div>

        <div className="text-gray-300 space-y-4">
          <p>
            {getItemDescription(item.type, item.name)}
          </p>

          <div className="bg-gray-700 rounded-lg p-3 text-center">
            <div className="flex justify-center items-center mb-2">
              {item.type !== 'Güç Taşı' ? (
                <>
                  <span className="text-4xl mr-2">
                    {getItemIcon(item.type)}
                  </span>
                  <span className="text-2xl font-bold text-yellow-400">
                    {item.name}
                  </span>
                </>
              ) : (
                <>
                  <img 
                    src="/img/powerstone.png" 
                    alt="Güç Taşı" 
                    className="w-12 h-12 mr-2" 
                  />
                  <span className="text-2xl font-bold text-yellow-400">
                    {player.guctasi || 0}
                  </span>
                </>
              )}
            </div>
            <p className="text-sm text-gray-400">
              {item.type !== 'Güç Taşı' 
                ? 'Envanterdeki Eşya' 
                : 'Mevcut Güç Taşı Sayınız'}
            </p>
          </div>

          <div className="border-t border-gray-600 pt-4">
            <h3 className="text-lg font-semibold mb-2 text-white">Detaylar:</h3>
            <ul className="list-disc list-inside text-sm space-y-1">
              {item.type === 'weapon' && (
                <>
                  <li>Hasar: {item.damage}</li>
                  <li>Vuruş Hızı: {item.attack_speed}</li>
                  <li>Güç: {item.power || 0}</li>
                  <li>Geliştirme Seviyesi: +{item.enhance_level || 0}</li>
                </>
              )}
              {item.type === 'shield' && (
                <>
                  <li>Blok Şansı: {item.block_chance}%</li>
                  <li>Savunma Gücü: {item.defense}</li>
                  <li>Güç: {item.power || 0}</li>
                  <li>Geliştirme Seviyesi: +{item.enhance_level || 0}</li>
                </>
              )}
              {item.type === 'armor' && (
                <>
                  <li>Zırh Değeri: {item.armor_value}</li>
                  <li>Dayanıklılık: {item.durability}</li>
                  <li>Güç: {item.power || 0}</li>
                  <li>Geliştirme Seviyesi: +{item.enhance_level || 0}</li>
                </>
              )}
              {item.type === 'Güç Taşı' && (
                <>
                  <li>Silah Yükseltme</li>
                  <li>Zırh Geliştirme</li>
                  <li>Kalkan Güçlendirme</li>
                </>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
});

const calculateEnhanceSuccessRate = (level) => {
  const successProbabilities = {
    1: 0.90,
    2: 0.80,
    3: 0.70,
    4: 0.60,
    5: 0.50,
    6: 0.40,
    7: 0.30,
    8: 0.15,
    9: 0.10
  };

  return successProbabilities[level + 1] || 0.90;
};

function Market() {
  const { user } = useAuth();
  const { player, setPlayer } = useGameStore();
  const { showNotification } = useNotification();
  const [playerItems, setPlayerItems] = useState([]);
  const [items, setItems] = useState([]);
  const [activeType, setActiveType] = useState('weapon');
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('shop');
  const [inventory, setInventory] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isPowerStoneModalOpen, setIsPowerStoneModalOpen] = useState(false);
  const location = useLocation(); 

  const BLACKSMITH_UPGRADE_REQUIREMENTS = {
    0: { gold: 150 },
    1: { gold: 150 },
    2: { gold: 150 },
    3: { gold: 150 },
    4: { gold: 150 },
    5: { gold: 150, powerStones: 1 },
    6: { gold: 150, powerStones: 2 },
    7: { gold: 150, powerStones: 3 },
    8: { gold: 150, powerStones: 4 },
    9: { gold: 150, powerStones: 5 }
  };

  const fetchMarketData = async () => {
    try {
      if (!player || !player.id) {
        console.warn('Oyuncu bilgisi yok');
        return;
      }

      // Market itemlarını getir
      const { data: marketItems, error: marketError } = await supabase
        .from('items')
        .select('*')
        .order('power', { ascending: true });

      if (marketError) {
        console.error('Market items fetch error:', marketError);
        throw marketError;
      }

      // Oyuncunun aktif itemlarını getir
      const { data: ownedItems, error: ownedError } = await supabase
        .from('player_items')
        .select('*, items!inner(*)')
        .eq('player_id', player.id)
        .eq('deleted', false);

      if (ownedError) {
        console.error('Owned items fetch error:', ownedError);
        throw ownedError;
      }

      console.log('Market items:', marketItems);
      console.log('Owned items:', ownedItems);

      const fameItems = [
        {
          id: 'fame_powerstone_1',
          name: 'Güç Taşı',
          type: 'fame',
          price: 1000,
          description: '1 Adet Güç Taşı'
        }
      ];

      setItems([...marketItems, ...fameItems]);
      setPlayerItems(ownedItems || []);
    } catch (err) {
      console.error('Market data fetch error:', err);
      setError('Market yüklenemedi');
    }
  };

  const fetchInventory = async () => {
    try {
      if (!player || !player.id) {
        console.warn('Oyuncu bilgisi yok');
        return;
      }

      const { data, error } = await supabase
        .from('player_items')
        .select('*, items(*)')
        .eq('player_id', player.id)
        .eq('deleted', false)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Envanter çekme hatası:', error);
        showNotification('Envanter yüklenemedi', 'error');
        return;
      }

      // Boş envanter kontrolü
      if (!data || data.length === 0) {
        console.warn('Envanterde eşya yok');
        setInventory([]);
        return;
      }

      // Sadece geçerli itemları al
      const validItems = data.filter(item => 
        item.items && 
        !item.deleted && 
        ['weapon', 'shield', 'armor'].includes(item.items.type)
      );

      setInventory(validItems);
    } catch (err) {
      console.error('Envanter fetch hatası:', err);
      showNotification('Envanter yüklenirken hata oluştu', 'error');
    }
  };

  useEffect(() => {
    if (player) {
      fetchMarketData();
      fetchInventory();  // İlk yüklemede envanteri de çek

      // Profil sayfasından gelen state'i kontrol et
      if (location.state?.activeTab === 'blacksmith') {
        setActiveTab('blacksmith');
      }
    }
  }, [user, player, location.state]);

  // Aktif tab değiştiğinde veya oyuncu değiştiğinde envanteri çek
  useEffect(() => {
    if ((activeTab === 'inventory' || activeTab === 'blacksmith') && player) {
      fetchInventory();
      fetchMarketData();  // Market verilerini de yeniden çek
    }
  }, [activeTab, player]);

  // Helper fonksiyon: Oyuncunun bu item'a sahip olup olmadığını kontrol et
  const playerOwnsItem = (itemId) => {
    return playerItems.some(pi => pi.item_id === itemId);
  };

  // Helper fonksiyon: Oyuncunun bu tipte item'a sahip olup olmadığını kontrol et
  const playerOwnsItemType = (itemType) => {
    return playerItems.some(pi => pi.items?.type === itemType && pi.deleted === null && pi.equipped === true);
  };

  const buyItem = async (item) => {
    try {
      // Fame ile Güç Taşı satın alma
      if (item.type === 'fame' && item.name === 'Güç Taşı') {
        if (player.fame < item.price) {
          showNotification('Yeterli Fame yok', 'error');
          return;
        }

        const { data: updatedPlayerData, error } = await supabase
          .from('players')
          .update({ 
            fame: player.fame - item.price,
            guctasi: (player.guctasi || 0) + 1 
          })
          .eq('id', player.id)
          .select()
          .single();

        if (error) {
          showNotification('Satın alma hatası', 'error');
          return;
        }

        setPlayer(updatedPlayerData);
        showNotification('Güç Taşı satın alındı', 'success');
        return;
      }

      // Altınla item satın alma
      if (player.gold < item.price) {
        showNotification('Yeterli altın yok', 'error');
        return;
      }

      // Yeni eşyayı player_items tablosuna ekle
      const { data: insertedData, error: insertError } = await supabase
        .from('player_items')
        .insert({
          player_id: player.id,
          item_id: item.id,
          equipped: false,
          deleted: false
        })
        .select('*, items(*)');

      if (insertError) {
        console.error('Item insert error:', insertError);
        showNotification('Eşya satın alınamadı', 'error');
        return;
      }

      const insertedItem = insertedData[0];

      // Altını güncelle
      const { data: updatedPlayerData, error: goldUpdateError } = await supabase
        .from('players')
        .update({ 
          gold: player.gold - item.price || 0 
        })
        .eq('id', player.id)
        .select()
        .single();

      if (goldUpdateError || !updatedPlayerData) {
        console.error('Gold update error:', goldUpdateError);
        showNotification('Altın güncellenemedi', 'error');
        return;
      }

      // Player state'ini güncelle
      setPlayer(updatedPlayerData);

      // Gücü yeniden hesapla ve güncelle
      const playerPower = playerItems.reduce((acc, item) => acc + item.items.power, 0) + insertedItem.items.power;
      
      const { error: powerUpdateError } = await supabase
        .from('players')
        .update({ power: playerPower })
        .eq('id', player.id);

      if (powerUpdateError) {
        console.error('Power update error:', powerUpdateError);
        showNotification('Güç güncellenemedi', 'error');
        return;
      }

      // State'i güncelle
      setPlayerItems(prev => {
        const updatedItems = [...prev, insertedItem];
        return updatedItems;
      });

      showNotification(`${item.name} satın alındı`, 'success');
    } catch (error) {
      console.error('Satın alma hatası:', error);
      showNotification('Satın alma başarısız', 'error');
    }
  };

  const sellItem = async (playerItem) => {
    try {
      // Eşyayı soft delete yap
      const { error: deleteError } = await supabase
        .from('player_items')
        .update({ 
          deleted: true, 
          equipped: false 
        })
        .eq('id', playerItem.id);

      if (deleteError) {
        console.error('Sell error:', deleteError);
        showNotification('Eşya satılamadı', 'error');
        return;
      }

      // Altını güncelle
      const sellPrice = Math.floor(playerItem.items.price / 2);
      const { data: updatedPlayerData, error: goldUpdateError } = await supabase
        .from('players')
        .update({ 
          gold: player.gold + sellPrice 
        })
        .eq('id', player.id)
        .select()
        .single();

      if (goldUpdateError || !updatedPlayerData) {
        console.error('Gold update error:', goldUpdateError);
        showNotification('Altın güncellenemedi', 'error');
        return;
      }

      // Player state'ini güncelle
      setPlayer(updatedPlayerData);

      // State'i güncelle
      setPlayerItems(
        prev => prev.filter(pi => pi.id !== playerItem.id)
      );

      showNotification(`${playerItem.items.name} satıldı`, 'success');
    } catch (error) {
      console.error('Satış hatası:', error);
      showNotification('Satış başarısız', 'error');
    }
  };

  const enhanceItem = async (item) => {
    try {
      // Kalan altını kontrol et
      if (player.gold < BLACKSMITH_UPGRADE_REQUIREMENTS[item.enhance_level + 1].gold) {
        showNotification('Yeterli altın yok', 'error');
        return;
      }

      // Güç taşı kontrolü
      if (BLACKSMITH_UPGRADE_REQUIREMENTS[item.enhance_level + 1].powerStones && player.guctasi < BLACKSMITH_UPGRADE_REQUIREMENTS[item.enhance_level + 1].powerStones) {
        showNotification('Yeterli güç taşı yok', 'error');
        return;
      }

      // Başarı olasılıklarını tanımla
      const successProbabilities = {
        1: 0.90,
        2: 0.80,
        3: 0.70,
        4: 0.60,
        5: 0.50,
        6: 0.40,
        7: 0.30,
        8: 0.15,
        9: 0.10
      };

      const currentEnhanceLevel = item.enhance_level || 0;
      const successChance = successProbabilities[currentEnhanceLevel + 1] || 0.90;
      const randomValue = Math.random();
      const isSuccessful = randomValue <= successChance;

      // Item detaylarını al
      const { data: itemData, error: itemError } = await supabase
        .from('items')
        .select('power')
        .eq('id', item.item_id)
        .single();

      if (itemError || !itemData) {
        showNotification('Item bilgisi alınamadı.', 'error');
        return;
      }

      const baseItemPower = itemData.power;
      const newEnhanceLevel = (item.enhance_level || 0) + 1;
      const newPower = Math.floor(baseItemPower * Math.pow(1.2, newEnhanceLevel));
      const powerIncrease = newPower - item.power;

      // Altını güncelle
      const { data: updatedPlayerData, error: goldUpdateError } = await supabase
        .from('players')
        .update({ 
          gold: player.gold - BLACKSMITH_UPGRADE_REQUIREMENTS[item.enhance_level + 1].gold,
          guctasi: BLACKSMITH_UPGRADE_REQUIREMENTS[item.enhance_level + 1].powerStones 
            ? player.guctasi - BLACKSMITH_UPGRADE_REQUIREMENTS[item.enhance_level + 1].powerStones 
            : player.guctasi
        })
        .eq('id', player.id)
        .select()
        .single();

      if (goldUpdateError || !updatedPlayerData) {
        console.error('Gold update error:', goldUpdateError);
        showNotification('Altın güncellenemedi', 'error');
        return;
      }

      // Player state'ini güncelle
      setPlayer(updatedPlayerData);

      if (isSuccessful) {
        // Item güncellemesi
        const { data: updatedItemData, error: itemUpdateError } = await supabase
          .from('player_items')
          .update({
            enhance_level: newEnhanceLevel,
            power: newPower
          })
          .eq('id', item.id)
          .select()
          .single();

        if (itemUpdateError || !updatedItemData) {
          console.error('Item update error:', itemUpdateError);
          showNotification('Eşya güncellenemedi', 'error');
          return;
        }

        // Tüm player_items'ların toplam gücünü hesapla
        const { data: playerItemsData, error: playerItemsError } = await supabase
          .from('player_items')
          .select('power')
          .eq('player_id', player.id)
          .eq('deleted', false);

        if (playerItemsError) {
          showNotification('Toplam güç hesaplanamadı.', 'error');
          return;
        }

        const totalItemPower = playerItemsData.reduce((sum, item) => sum + item.power, 0);

        // Oyuncunun toplam gücünü güncelle
        const { error: powerUpdateError } = await supabase
          .from('players')
          .update({ power: totalItemPower })
          .eq('id', player.id);

        if (powerUpdateError) {
          console.error('Güç güncellemesi hatası:', powerUpdateError);
        }

        // Local state güncelleme
        const updatedItem = {
          ...item,
          enhance_level: newEnhanceLevel,
          power: newPower
        };

        setInventory(inventory.map(inv => 
          inv.id === item.id ? updatedItem : inv
        ));

        showNotification(
          `${item.items?.name || item.name} +${newEnhanceLevel}'a yükseltildi! Güç +${powerIncrease}`, 
          'success'
        );
      } else {
        // Başarısız güçlendirme
        showNotification(
          `${item.items?.name || item.name} güçlendirmesi başarısız oldu.`, 
          'warning'
        );
      }
    } catch (error) {
      console.error('Eşya güçlendirme hatası:', error);
      showNotification('Güçlendirme sırasında bir hata oluştu.', 'error');
    }
  };

  const getItemLevelText = (level) => {
    if (level < 3) return { text: 'Normal Kalite', color: 'text-gray-400' };
    if (level < 5) return { text: 'Gelişmiş Kalite', color: 'text-green-400' };
    if (level < 7) return { text: 'Nadir Kalite', color: 'text-blue-400' };
    if (level < 9) return { text: 'Destansı Kalite', color: 'text-purple-400' };
    return { text: 'Efsanevi Kalite', color: 'text-orange-400' };
  };

  const getItemIcon = (type) => {
    switch(type) {
      case 'weapon':
        return <span className="text-red-500">⚔️</span>;
      case 'shield':
        return <span className="text-blue-500">🛡️</span>;
      case 'armor':
        return <span className="text-green-500">🧥</span>;
      case 'fame':
        return <img src="/img/powerstone.png" alt="Güç Taşı" className="w-8 h-8" />;
      default:
        return <span>❓</span>;
    }
  };

  const filteredItems = items.filter(
    (item) => 
      activeType === item.type || 
      (activeType === 'fame' && item.type === 'fame')
  );

  const renderMarketItems = () => {
    return filteredItems.map((item) => {
      const isOwned = playerItems.some(pi => 
        !pi.deleted && 
        pi.items?.type === item.type && 
        pi.items?.id !== item.id
      );

      const hasThisItem = playerOwnsItem(item.id);

      return (
        <div 
          key={item.id} 
          className="
            bg-slate-800 rounded-lg p-3 
            flex items-center justify-between 
            hover:bg-slate-700 transition-colors
            border border-slate-700
          "
        >
          <div className="flex items-center space-x-3">
            <div className="text-2xl">{getItemIcon(item.type)}</div>
            <div>
              <h3 className="font-semibold text-sm">{item.name}</h3>
              <div className="text-xs text-slate-400 flex items-center space-x-2">
                <span>Güç: {item.power}</span>
                <span className="text-purple-400">Seviye: {item.required_level}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center">
              <img 
                src={item.type === 'fame' ? '/img/star.png' : '/img/game-coin.png'} 
                alt={item.type === 'fame' ? 'Fame' : 'Altın'} 
                className="w-5 h-5 mr-2" 
              />
              <span className={`font-semibold ${item.type === 'fame' ? 'text-blue-500' : 'text-yellow-500'}`}>
                {item.price}
              </span>
            </div>
            <button
              onClick={() => hasThisItem ? sellItem(playerItems.find(pi => pi.item_id === item.id)) : buyItem(item)}
              disabled={isOwned || (player.level < item.required_level)}
              className={`
                px-2 py-1 rounded-md text-xs transition-all duration-300
                ${isOwned
                  ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                  : (player.level < item.required_level
                    ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                    : (hasThisItem 
                      ? 'bg-red-600 text-white hover:bg-red-700' 
                      : 'bg-green-600 text-white hover:bg-green-700'))}
              `}
            >
              {player.level < item.required_level 
                ? `Seviye ${item.required_level} Gerekli` 
                : (hasThisItem ? 'Sat' : (isOwned ? 'Satın Alınamaz' : 'Satın Al'))}
            </button>
          </div>
        </div>
      );
    });
  };

  // Güç Taşı detay modalı
  const PowerStoneModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-white flex items-center">
              <img 
                src="/img/powerstone.png" 
                alt="Güç Taşı" 
                className="w-8 h-8 mr-2" 
              />
              Güç Taşı
            </h2>
            <button 
              onClick={onClose} 
              className="text-white hover:text-red-500 transition-colors"
            >
              ✖️
            </button>
          </div>

          <div className="text-gray-300 space-y-4">
            <p>
              Güç Taşları, ekipmanlarınızı yükseltmek için kullanılan özel yükseltme malzemeleridir. 
              Her bir Güç Taşı, silah, zırh veya kalkanınızın gücünü artırmak için harcanabilir.
            </p>

            <div className="bg-gray-700 rounded-lg p-3 text-center">
              <div className="flex justify-center items-center mb-2">
                <img 
                  src="/img/powerstone.png" 
                  alt="Güç Taşı" 
                  className="w-12 h-12 mr-2" 
                />
                <span className="text-2xl font-bold text-yellow-400">
                  {player.guctasi || 0}
                </span>
              </div>
              <p className="text-sm text-gray-400">
                Mevcut Güç Taşı Sayınız
              </p>
            </div>

            <div className="border-t border-gray-600 pt-4">
              <h3 className="text-lg font-semibold mb-2 text-white">Kullanım Alanları:</h3>
              <ul className="list-disc list-inside text-sm space-y-1">
                <li>Silah Yükseltme</li>
                <li>Zırh Geliştirme</li>
                <li>Kalkan Güçlendirme</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-slate-900 min-h-screen text-white">
      <div className="container mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <div className="bg-slate-800 rounded-lg px-3 py-2 flex items-center border border-slate-700">
            <h1 className="text-2xl font-bold text-indigo-400">Market</h1>
          </div>
          <div className="absolute top-4 right-4 flex items-center space-x-4">
            <div className="bg-slate-800 rounded-lg px-3 py-2 flex items-center border border-slate-700">
              <img src="/img/game-coin.png" alt="Altın" className="w-6 h-6 mr-2" />
              <span className="text-yellow-400 font-semibold text-sm">{player.gold}</span>
            </div>
            <div className="bg-slate-800 rounded-lg px-3 py-2 flex items-center border border-slate-700">
              <img src="/img/powerstone.png" alt="Güç Taşı" className="w-6 h-6 mr-2" />
              <span className="text-purple-400 font-semibold text-sm">{player.guctasi}</span>
            </div>
            <div className="bg-slate-800 rounded-lg px-3 py-2 flex items-center border border-slate-700">
              <img src="/img/star.png" alt="Fame" className="w-6 h-6 mr-2" />
              <span className="text-blue-400 font-semibold text-sm">{player.fame || 0}</span>
            </div>
          </div>
        </div>

        {/* Sekme Navigasyonu */}
        <div className="flex mb-6 bg-gray-800 rounded-full p-2">
          <button
            onClick={() => setActiveTab('shop')}
            className={`flex-1 py-2 rounded-full transition-all duration-300 
              ${activeTab === 'shop' 
                ? 'bg-blue-600 text-white' 
                : 'text-gray-400 hover:bg-gray-700'}
            `}
          >
            Mağaza
          </button>
          <button
            onClick={() => setActiveTab('blacksmith')}
            className={`flex-1 py-2 rounded-full transition-all duration-300 
              ${activeTab === 'blacksmith' 
                ? 'bg-red-600 text-white' 
                : 'text-gray-400 hover:bg-gray-700'}
            `}
          >
            Demirci
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex-1 py-2 rounded-full transition-all duration-300 
              ${activeTab === 'inventory' 
                ? 'bg-green-600 text-white' 
                : 'text-gray-400 hover:bg-gray-700'}
            `}
          >
            Envanter
          </button>
        </div>

        {/* Demirci Sekmesi */}
        {activeTab === 'blacksmith' && (
          <div>
            {inventory.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                Henüz güçlendirebileceğin bir eşyan yok.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {inventory.map(item => {
                  // Başarı olasılıkları
                  const successChance = calculateEnhanceSuccessRate(item.enhance_level || 0);
                  
                  // Başarı şansı renklendirilmesi
                  const getSuccessChanceColor = (chance) => {
                    if (chance >= 0.80) return 'text-green-500';
                    if (chance >= 0.50) return 'text-yellow-500';
                    return 'text-red-500';
                  };

                  // Item arka plan ve border renkleri
                  const getEnhancementColors = (level) => {
                    if (level >= 9) return {
                      bg: 'bg-gradient-to-r from-orange-600/10 to-orange-400/10',
                      border: 'border-2 border-orange-500/30'
                    };
                    if (level >= 7) return {
                      bg: 'bg-gradient-to-r from-purple-600/10 to-purple-400/10',
                      border: 'border-2 border-purple-500/30'
                    };
                    if (level >= 5) return {
                      bg: 'bg-gradient-to-r from-green-600/10 to-green-400/10',
                      border: 'border-2 border-green-500/30'
                    };
                    return {
                      bg: 'bg-slate-800',
                      border: ''
                    };
                  };

                  const { bg, border } = getEnhancementColors(item.enhance_level || 0);
                  const successChanceColor = getSuccessChanceColor(successChance);

                  return (
                    <motion.div 
                      key={item.id} 
                      className={`rounded-lg p-6 shadow-lg relative overflow-hidden ${bg} ${border}`}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="flex flex-col">
                        <div className="flex justify-between items-center">
                          <h3 className="text-xl font-bold text-white">
                            {item.items?.name || item.name}
                          </h3>
                          <span className="text-yellow-500 font-semibold">
                            +{item.enhance_level || 0}
                          </span>
                        </div>
                        <p className={`text-sm ${getItemLevelText(item.enhance_level || 0).color} mt-1`}>
                          {getItemLevelText(item.enhance_level || 0).text}
                        </p>
                      </div>
                      <div className="mb-4">
                        <p>Güç: {item.power}</p>
                        <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                          <div 
                            className="bg-blue-500 h-full rounded-full" 
                            style={{ 
                              width: `${Math.min(100, (item.enhance_level || 0) * 11)}%` 
                            }}
                          ></div>
                        </div>
                      </div>
                      {item.enhance_level < 9 ? (
                        <div>
                          <button
                            onClick={() => enhanceItem(item)}
                            className="w-full bg-red-600 text-white py-2 rounded-full hover:bg-red-700 transition-all"
                          >
                            Güçlendir
                          </button>
                          {item.enhance_level >= 4 && BLACKSMITH_UPGRADE_REQUIREMENTS[item.enhance_level + 1].powerStones ? (
                            <div>
                              <div className="bg-slate-700 rounded-lg p-2 mt-2 flex items-center justify-between">
                                <div className="flex items-center">
                                  <img src="/img/game-coin.png" alt="Altın" className="w-6 h-6 mr-2" />
                                  <span className="text-yellow-400 font-semibold text-sm">{BLACKSMITH_UPGRADE_REQUIREMENTS[item.enhance_level + 1].gold} Altın</span>
                                </div>
                                <div className="flex items-center">
                                  <img src="/img/powerstone.png" alt="Güç Taşı" className="w-6 h-6 mr-2" />
                                  <span className="text-purple-400 font-semibold text-sm">{BLACKSMITH_UPGRADE_REQUIREMENTS[item.enhance_level + 1].powerStones} Güç Taşı</span>
                                </div>
                              </div>
                              <div className="bg-slate-700 rounded-lg p-2 mt-2 text-center">
                                <span className="text-green-400 font-semibold text-sm">Başarı Şansı: %{Math.floor(calculateEnhanceSuccessRate(item.enhance_level || 0) * 100)}</span>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div className="bg-slate-700 rounded-lg p-2 mt-2 flex items-center justify-between">
                                <div className="flex items-center">
                                  <img src="/img/game-coin.png" alt="Altın" className="w-6 h-6 mr-2" />
                                  <span className="text-yellow-400 font-semibold text-sm">{BLACKSMITH_UPGRADE_REQUIREMENTS[item.enhance_level + 1].gold} Altın</span>
                                </div>
                              </div>
                              <div className="bg-slate-700 rounded-lg p-2 mt-2 text-center">
                                <span className="text-green-400 font-semibold text-sm">Başarı Şansı: %{Math.floor(calculateEnhanceSuccessRate(item.enhance_level || 0) * 100)}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="w-full bg-green-600 text-white py-2 rounded-full text-center font-semibold">
                          Maksimum Seviye
                        </div>
                      )}
                      {item.enhance_level >= 5 && (
                        <div className="absolute inset-0 pointer-events-none">
                          <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-green-500/20 to-transparent"></div>
                          <div className="absolute top-0 right-0 w-2 h-full bg-gradient-to-b from-green-500/20 to-transparent"></div>
                          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-green-500/20 to-transparent"></div>
                          <div className="absolute bottom-0 left-0 w-full h-2 bg-gradient-to-r from-green-500/20 to-transparent"></div>
                        </div>
                      )}
                      {item.enhance_level >= 7 && (
                        <div className="absolute inset-0 pointer-events-none">
                          <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-purple-500/20 to-transparent"></div>
                          <div className="absolute top-0 right-0 w-2 h-full bg-gradient-to-b from-purple-500/20 to-transparent"></div>
                          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-purple-500/20 to-transparent"></div>
                          <div className="absolute bottom-0 left-0 w-full h-2 bg-gradient-to-r from-purple-500/20 to-transparent"></div>
                        </div>
                      )}
                      {item.enhance_level >= 9 && (
                        <div className="absolute inset-0 pointer-events-none">
                          <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-orange-500/20 to-transparent"></div>
                          <div className="absolute top-0 right-0 w-2 h-full bg-gradient-to-b from-orange-500/20 to-transparent"></div>
                          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-orange-500/20 to-transparent"></div>
                          <div className="absolute bottom-0 left-0 w-full h-2 bg-gradient-to-r from-orange-500/20 to-transparent"></div>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Kategori Seçimi */}
        {activeTab === 'shop' && (
          <div className="flex justify-center space-x-4 mb-6">
            {CATEGORIES.map((category) => (
              <button
                key={category.type}
                onClick={() => setActiveType(category.type)}
                className={`
                  px-4 py-2 rounded-lg transition-all duration-300 
                  ${activeType === category.type 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}
                `}
              >
                <span className="mr-2">{category.icon}</span>
                {category.name}
              </button>
            ))}
          </div>
        )}

        {/* Market İçeriği */}
        {activeTab === 'shop' && (
          <div>
            {filteredItems.length === 0 ? (
              <div className="text-center text-slate-500 py-8">
                Bu kategoride henüz eşya bulunmuyor.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                {filteredItems.map((item) => {
                  const isOwned = playerItems.some(pi => 
                    !pi.deleted && 
                    pi.items?.type === item.type && 
                    pi.items?.id !== item.id
                  );

                  const hasThisItem = playerOwnsItem(item.id);

                  return (
                    <div 
                      key={item.id} 
                      className="
                        bg-slate-800 rounded-lg p-3 
                        flex items-center justify-between 
                        hover:bg-slate-700 transition-colors
                        border border-slate-700
                      "
                    >
                      <div className="flex items-center space-x-3">
                        <div className="text-2xl">{getItemIcon(item.type)}</div>
                        <div>
                          <h3 className="font-semibold text-sm">{item.name}</h3>
                          <div className="text-xs text-slate-400 flex items-center space-x-2">
                            <span>Güç: {item.power}</span>
                            <span className="text-purple-400">Seviye: {item.required_level}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center">
                          <img 
                            src={item.type === 'fame' ? '/img/star.png' : '/img/game-coin.png'} 
                            alt={item.type === 'fame' ? 'Fame' : 'Altın'} 
                            className="w-5 h-5 mr-2" 
                          />
                          <span className={`font-semibold ${item.type === 'fame' ? 'text-blue-500' : 'text-yellow-500'}`}>
                            {item.price}
                          </span>
                        </div>
                        <button
                          onClick={() => hasThisItem ? sellItem(playerItems.find(pi => pi.item_id === item.id)) : buyItem(item)}
                          disabled={isOwned || (player.level < item.required_level)}
                          className={`
                            px-2 py-1 rounded-md text-xs transition-all duration-300
                            ${isOwned
                              ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                              : (player.level < item.required_level
                                ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                                : (hasThisItem 
                                  ? 'bg-red-600 text-white hover:bg-red-700' 
                                  : 'bg-green-600 text-white hover:bg-green-700'))}
                          `}
                        >
                          {player.level < item.required_level 
                            ? `Seviye ${item.required_level} Gerekli` 
                            : (hasThisItem ? 'Sat' : (isOwned ? 'Satın Alınamaz' : 'Satın Al'))}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Envanter Sekmesi */}
        {activeTab === 'inventory' && (
          <div className="grid grid-cols-5 gap-4 p-4">
            {/* Diğer envanter eşyaları */}
            {inventory.map((item, index) => (
              <div 
                key={item.id || `item-${index}`} 
                className="bg-gray-800 rounded-lg p-2 text-center relative group hover:scale-105 transition-transform cursor-pointer flex flex-col items-center justify-between h-full"
                onClick={() => setSelectedItem({
                  type: item.items.type,
                  name: item.items.name,
                  damage: item.items.damage,
                  attack_speed: item.items.attack_speed,
                  block_chance: item.items.block_chance,
                  defense: item.items.defense,
                  armor_value: item.items.armor_value,
                  durability: item.items.durability,
                  power: item.items.power,
                  enhance_level: item.items.enhance_level
                })}
              >
                <div className="text-4xl mb-2">
                  {getItemIcon(item.items.type)}
                </div>
                <div className="text-xs text-gray-300 w-full px-1 text-center break-words">
                  {item.items?.name || 'Bilinmeyen Eşya'}
                </div>
              </div>
            ))}
            
            {/* Güç Taşı için özel alan */}
            <div 
              key="guc-tasi"
              className="bg-gray-800 rounded-lg p-2 text-center relative group hover:scale-105 transition-transform cursor-pointer flex flex-col items-center justify-between h-full"
              onClick={() => setIsPowerStoneModalOpen(true)}
            >
              <div className="text-4xl mb-2">
                <img 
                  src="/img/powerstone.png" 
                  alt="Güç Taşı" 
                  className="w-12 h-12" 
                />
              </div>
              <div className="text-xs text-gray-300 w-full px-1 text-center break-words">
                Güç Taşı
              </div>
              <div className="absolute top-1 right-1 bg-black bg-opacity-50 rounded-full px-2 py-1 text-xs text-white">
                {player.guctasi || 0}
              </div>
            </div>
            
            {/* Boş slotlar */}
            {Array(10 - (inventory.length + 1)).fill(null).map((_, index) => (
              <div 
                key={`empty-${index}`} 
                className="bg-gray-700 rounded-lg h-24 flex items-center justify-center text-gray-500 opacity-50"
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-8 w-8" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M12 4v16m8-8H4" 
                  />
                </svg>
              </div>
            ))}
          </div>
        )}
        {isPowerStoneModalOpen && (
          <PowerStoneModal 
            isOpen={isPowerStoneModalOpen} 
            onClose={() => setIsPowerStoneModalOpen(false)} 
          />
        )}
      </div>
    </div>
  );
}

export default React.memo(Market);
