import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useGameStore } from '../store/gameStore';

function Clan() {
  const [userClan, setUserClan] = useState(null);
  const [clanMembers, setClanMembers] = useState([]);
  const [allClans, setAllClans] = useState([]);
  const [loading, setLoading] = useState(true);
  const player = useGameStore((state) => state.player);

  useEffect(() => {
    loadClanData();
  }, []);

  const loadClanData = async () => {
    try {
      // Kullanıcının klan üyeliğini kontrol et
      const { data: memberData } = await supabase
        .from('clan_members')
        .select(`
          *,
          clans (*)
        `)
        .eq('player_id', player.id)
        .single();

      if (memberData) {
        setUserClan(memberData.clans);
        // Klan üyelerini yükle
        const { data: members } = await supabase
          .from('clan_members')
          .select(`
            *,
            players (username, level, power)
          `)
          .eq('clan_id', memberData.clan_id);
        setClanMembers(members);
      } else {
        // Mevcut klanları listele
        const { data: clans } = await supabase
          .from('clans')
          .select('*');
        setAllClans(clans);
      }
    } catch (error) {
      console.error('Klan bilgileri yüklenirken hata:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const createClan = async (clanName) => {
    try {
      // Önce klanı oluştur
      const { data: clan, error: clanError } = await supabase
        .from('clans')
        .insert([
          {
            name: clanName,
            leader_id: player.id
          }
        ])
        .select()
        .single();

      if (clanError) throw clanError;

      // Sonra lider olarak kendini ekle
      const { error: memberError } = await supabase
        .from('clan_members')
        .insert([
          {
            clan_id: clan.id,
            player_id: player.id,
            role: 'leader'
          }
        ]);

      if (memberError) throw memberError;

      loadClanData();
    } catch (error) {
      console.error('Klan oluşturulurken hata:', error.message);
    }
  };

  const joinClan = async (clanId) => {
    try {
      const { error } = await supabase
        .from('clan_members')
        .insert([
          {
            clan_id: clanId,
            player_id: player.id
          }
        ]);

      if (error) throw error;
      loadClanData();
    } catch (error) {
      console.error('Klana katılırken hata:', error.message);
    }
  };

  if (loading) {
    return <div className="text-center">Yükleniyor...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Klan</h1>

      {userClan ? (
        <div>
          <div className="bg-gray-800 p-4 rounded-lg mb-4">
            <h2 className="text-xl font-bold mb-2">{userClan.name}</h2>
            <p>Seviye: {userClan.level}</p>
          </div>

          <div className="bg-gray-800 p-4 rounded-lg">
            <h3 className="text-lg font-bold mb-2">Üyeler</h3>
            <div className="grid gap-2">
              {clanMembers.map(member => (
                <div key={member.id} className="bg-gray-700 p-2 rounded flex justify-between items-center">
                  <div>
                    <p>{member.players.username}</p>
                    <p className="text-sm">Seviye: {member.players.level}</p>
                  </div>
                  <span className="capitalize">{member.role}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div>
          <div className="mb-4">
            <h2 className="text-xl font-bold mb-2">Klan Oluştur</h2>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Klan Adı"
                className="bg-gray-700 p-2 rounded"
                id="clanName"
              />
              <button
                onClick={() => createClan(document.getElementById('clanName').value)}
                className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-700"
              >
                Oluştur
              </button>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold mb-2">Mevcut Klanlar</h2>
            <div className="grid gap-2">
              {allClans.map(clan => (
                <div key={clan.id} className="bg-gray-800 p-4 rounded-lg flex justify-between items-center">
                  <div>
                    <p className="font-bold">{clan.name}</p>
                    <p className="text-sm">Seviye: {clan.level}</p>
                  </div>
                  <button
                    onClick={() => joinClan(clan.id)}
                    className="bg-green-600 px-4 py-2 rounded hover:bg-green-700"
                  >
                    Katıl
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Clan;
