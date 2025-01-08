import React, { useState, useEffect } from 'react';

const WorldBossPage = () => {
  const [boss, setBoss] = useState({
    name: 'Kadim Ejderha',
    maxHealth: 99999,
    currentHealth: 99999
  });

  const [damageRankings, setDamageRankings] = useState([]);
  const [playerDamage, setPlayerDamage] = useState(0);

  const attackBoss = () => {
    // Oyuncunun mevcut gücüne göre hasar hesaplama
    const damage = Math.floor(Math.random() * 1000); // Örnek hasar hesaplaması
    
    setBoss(prevBoss => ({
      ...prevBoss,
      currentHealth: Math.max(0, prevBoss.currentHealth - damage)
    }));

    setPlayerDamage(damage);

    // Hasar sıralamasını güncelle
    const updatedRankings = [
      ...damageRankings, 
      { player: 'Oyuncu', damage }
    ].sort((a, b) => b.damage - a.damage);

    setDamageRankings(updatedRankings);
  };

  const resetBoss = () => {
    setBoss({
      name: 'Kadim Ejderha',
      maxHealth: 99999,
      currentHealth: 99999
    });
    setDamageRankings([]);
  };

  return (
    <div className="world-boss-page">
      <h1>{boss.name}</h1>
      <div className="boss-health">
        Canı: {boss.currentHealth} / {boss.maxHealth}
      </div>
      <progress 
        value={boss.currentHealth} 
        max={boss.maxHealth}
      />
      <button onClick={attackBoss}>Saldır</button>
      
      <div className="damage-rankings">
        <h2>Hasar Sıralaması</h2>
        {damageRankings.map((entry, index) => (
          <div key={index}>
            {index === 0 && '🏆 '}
            {entry.player}: {entry.damage} hasar
          </div>
        ))}
      </div>

      {boss.currentHealth <= 0 && (
        <div className="boss-defeated">
          <h2>Kadim Ejderha Yenildi!</h2>
          <p>En çok hasar veren oyuncu: {damageRankings[0]?.player}</p>
          <p>Ödül: 1000 Altın</p>
          <button onClick={resetBoss}>Yeni Boss</button>
        </div>
      )}
    </div>
  );
};

export default WorldBossPage;
