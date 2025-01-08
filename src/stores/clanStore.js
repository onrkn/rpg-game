import { create } from 'zustand';
import { supabase } from '../lib/supabaseClient';

export const useClanStore = create((set, get) => ({
    clan: null,
    members: [],
    isLeader: false,

    fetchClanData: async (userId) => {
        // Kullanıcının klanını getir
        const { data: memberData, error: memberError } = await supabase
            .from('clan_members')
            .select('clan_id, role')
            .eq('user_id', userId)
            .single();

        if (memberError || !memberData) {
            console.error('Klan bulunamadı', memberError);
            return null;
        }

        // Klan detaylarını getir
        const { data: clanData, error: clanError } = await supabase
            .from('clans')
            .select('*')
            .eq('id', memberData.clan_id)
            .single();

        if (clanError) {
            console.error('Klan bilgileri alınamadı', clanError);
            return null;
        }

        // Klan üyelerini getir
        const { data: membersData, error: membersError } = await supabase
            .from('clan_members')
            .select('user_id, role, power, last_active_at, profiles(username)')
            .eq('clan_id', memberData.clan_id);

        if (membersError) {
            console.error('Üyeler getirilemedi', membersError);
            return null;
        }

        set({
            clan: clanData,
            members: membersData,
            isLeader: memberData.role === 'leader'
        });

        return clanData;
    },

    removeMember: async (memberId) => {
        const { clan, isLeader } = get();
        
        if (!isLeader) return false;

        const { error } = await supabase
            .from('clan_members')
            .delete()
            .eq('user_id', memberId)
            .eq('clan_id', clan.id);

        if (error) {
            console.error('Üye çıkarılamadı', error);
            return false;
        }

        // Üyeyi listeden çıkar
        set(state => ({
            members: state.members.filter(m => m.user_id !== memberId),
            clan: {
                ...state.clan,
                member_count: state.clan.member_count - 1
            }
        }));

        return true;
    },

    createClan: async (userId, clanName) => {
        // Yeni klan oluşturma
        const { data, error } = await supabase.rpc('create_clan', {
            p_user_id: userId,
            p_clan_name: clanName
        });

        if (error) {
            console.error('Klan oluşturulamadı', error);
            return null;
        }

        return data;
    },

    joinClan: async (userId, clanId) => {
        // Klana katılma
        const { data, error } = await supabase.rpc('join_clan', {
            p_user_id: userId,
            p_clan_id: clanId
        });

        if (error) {
            console.error('Klana katılınamadı', error);
            return false;
        }

        return true;
    }
}));
