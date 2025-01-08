-- Klan oluşturma fonksiyonu
CREATE OR REPLACE FUNCTION create_clan(p_user_id UUID, p_clan_name TEXT)
RETURNS UUID AS $$
DECLARE
    v_clan_id UUID;
    v_member_limit INTEGER := 10;
    v_existing_clan_count INTEGER;
BEGIN
    -- Kullanıcının zaten bir klanı var mı kontrolü
    SELECT COUNT(*) INTO v_existing_clan_count
    FROM clan_members
    WHERE user_id = p_user_id;

    IF v_existing_clan_count > 0 THEN
        RAISE EXCEPTION 'Zaten bir klana üyesiniz';
    END IF;

    -- Klan oluşturma
    INSERT INTO clans (name, leader_id, member_count)
    VALUES (p_clan_name, p_user_id, 1)
    RETURNING id INTO v_clan_id;

    -- Kullanıcıyı klan liderliğine ekle
    INSERT INTO clan_members (clan_id, user_id, role, power)
    VALUES (v_clan_id, p_user_id, 'leader', 0);

    RETURN v_clan_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Klana katılma fonksiyonu
CREATE OR REPLACE FUNCTION join_clan(p_user_id UUID, p_clan_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_member_count INTEGER;
    v_member_limit INTEGER := 10;
    v_existing_clan_count INTEGER;
BEGIN
    -- Kullanıcının zaten bir klanı var mı kontrolü
    SELECT COUNT(*) INTO v_existing_clan_count
    FROM clan_members
    WHERE user_id = p_user_id;

    IF v_existing_clan_count > 0 THEN
        RAISE EXCEPTION 'Zaten bir klana üyesiniz';
    END IF;

    -- Klan üye sayısı kontrolü
    SELECT member_count INTO v_member_count
    FROM clans
    WHERE id = p_clan_id;

    IF v_member_count >= v_member_limit THEN
        RAISE EXCEPTION 'Klan üye limiti dolmuştur';
    END IF;

    -- Klana üye ekleme
    INSERT INTO clan_members (clan_id, user_id, role, power)
    VALUES (p_clan_id, p_user_id, 'member', 0);

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION log_world_boss_damage(
    p_player_id UUID, 
    p_damage NUMERIC
)
RETURNS TABLE (
    new_boss_health NUMERIC, 
    player_gold_reward NUMERIC
) AS $$
DECLARE
    v_current_boss_health NUMERIC;
    v_total_boss_health NUMERIC;
    v_total_damage NUMERIC;
    v_player_damage_percentage NUMERIC;
    v_player_gold_reward NUMERIC;
    v_boss_status TEXT;
BEGIN
    -- Mevcut boss'un bilgilerini al
    SELECT current_health, max_health, status 
    INTO v_current_boss_health, v_total_boss_health, v_boss_status
    FROM world_boss 
    WHERE status = 'active'
    LIMIT 1;

    -- Boss zaten yenildiyse saldırıya izin verme
    IF v_boss_status = 'defeated' THEN
        RAISE EXCEPTION 'Boss zaten yenildi';
    END IF;

    -- Günlük saldırı kontrolü
    PERFORM 1 
    FROM world_boss_damage_log 
    WHERE player_id = p_player_id 
      AND attack_date = CURRENT_DATE;
    
    IF FOUND THEN
        RAISE EXCEPTION 'Günde bir kez saldırabilirsiniz';
    END IF;

    -- Yeni boss sağlığını hesapla
    v_current_boss_health := GREATEST(0, v_current_boss_health - p_damage);

    -- Boss yenildiyse
    IF v_current_boss_health = 0 THEN
        -- Toplam hasarı hesapla
        SELECT COALESCE(SUM(damage), 0) INTO v_total_damage 
        FROM world_boss_damage_log 
        WHERE attack_date = CURRENT_DATE;

        -- Oyuncunun hasar yüzdesini hesapla
        v_player_damage_percentage := p_damage / (v_total_damage + p_damage);
        
        -- Oyuncunun altın ödülünü hesapla
        v_player_gold_reward := FLOOR(1000 * v_player_damage_percentage);

        -- Boss'u yenildi olarak işaretle
        UPDATE world_boss 
        SET status = 'defeated', 
            defeated_at = CURRENT_TIMESTAMP 
        WHERE status = 'active';

        -- Oyuncuya altın gönder
        UPDATE players 
        SET gold = gold + v_player_gold_reward 
        WHERE id = p_player_id;
    END IF;

    -- Hasar log'unu kaydet
    INSERT INTO world_boss_damage_log (
        player_id, 
        damage, 
        gold_reward,
        attack_date
    ) VALUES (
        p_player_id, 
        p_damage, 
        COALESCE(v_player_gold_reward, 0),
        CURRENT_DATE
    );

    -- Boss sağlığını güncelle
    UPDATE world_boss 
    SET current_health = v_current_boss_health 
    WHERE status = 'active';

    -- Sonuçları döndür
    RETURN QUERY 
    SELECT v_current_boss_health, COALESCE(v_player_gold_reward, 0);
END;
$$ LANGUAGE plpgsql;

-- Hasar sıralaması fonksiyonu
CREATE OR REPLACE FUNCTION get_world_boss_damage_rankings(
  p_world_boss_id UUID DEFAULT NULL, 
  p_battle_id UUID DEFAULT NULL
)
RETURNS TABLE (
    player_id UUID,
    username TEXT,
    player_damage NUMERIC,
    gold_reward NUMERIC,
    total_boss_damage NUMERIC,
    player_rank BIGINT
) AS $$
DECLARE
    selected_battle_id UUID;
    total_damage NUMERIC;
BEGIN
    -- Hangi ID'yi kullanacağımıza karar ver
    selected_battle_id := COALESCE(p_battle_id, p_world_boss_id);

    IF selected_battle_id IS NULL THEN
        RAISE EXCEPTION 'Either battle_id or world_boss_id must be provided';
    END IF;

    -- Toplam boss hasarını hesapla
    SELECT COALESCE(SUM(wbdl.damage), 0) INTO total_damage 
    FROM world_boss_damage_log wbdl
    WHERE wbdl.battle_id = selected_battle_id;

    -- Hasar sıralamasını döndür
    RETURN QUERY
    WITH damage_aggregation AS (
        SELECT 
            wbdl.player_id,
            COALESCE(u.username, 'Bilinmeyen Oyuncu') AS username,
            COALESCE(SUM(wbdl.damage), 0) AS player_damage,
            COALESCE(SUM(wbdl.gold_reward), 0) AS gold_reward
        FROM 
            world_boss_damage_log wbdl
        LEFT JOIN 
            users u ON wbdl.player_id = u.id
        WHERE 
            wbdl.battle_id = selected_battle_id
        GROUP BY 
            wbdl.player_id, u.username
    )
    SELECT 
        da.player_id,
        da.username,
        da.player_damage,
        da.gold_reward,
        total_damage,
        RANK() OVER (ORDER BY da.player_damage DESC)::BIGINT AS player_rank
    FROM 
        damage_aggregation da
    ORDER BY 
        player_rank;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
