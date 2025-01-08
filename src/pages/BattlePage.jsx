import React, { useState } from 'react';
import { Link, Routes, Route } from 'react-router-dom';
import WorldBossPage from './WorldBossPage';

const BattlePage = () => {
  const [activeTab, setActiveTab] = useState('gorevler');

  return (
    <div className="battle-page">
      <div className="battle-tabs">
        <button 
          className={activeTab === 'gorevler' ? 'active' : ''}
          onClick={() => setActiveTab('gorevler')}
        >
          Görevler
        </button>
        <button 
          className={activeTab === 'arena' ? 'active' : ''}
          onClick={() => setActiveTab('arena')}
        >
          Arena
        </button>
        <button 
          className={activeTab === 'world-boss' ? 'active' : ''}
          onClick={() => setActiveTab('world-boss')}
        >
          World Boss
        </button>
      </div>

      <div className="battle-content">
        {activeTab === 'gorevler' && <div>Görevler İçeriği</div>}
        {activeTab === 'arena' && <div>Arena İçeriği</div>}
        {activeTab === 'world-boss' && <WorldBossPage />}
      </div>
    </div>
  );
};

export default BattlePage;
