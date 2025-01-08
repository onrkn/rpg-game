-- Ensure UUID extension is enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table if not exists
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create world_boss table
CREATE TABLE IF NOT EXISTS world_boss (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    max_health NUMERIC NOT NULL,
    current_health NUMERIC NOT NULL,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create world_boss_damage table
CREATE TABLE world_boss_damage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    boss_battle_id UUID NOT NULL,
    player_id UUID NOT NULL,
    damage NUMERIC NOT NULL DEFAULT 0,
    gold_reward NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (player_id) REFERENCES users(id),
    FOREIGN KEY (boss_battle_id) REFERENCES world_boss(id)
);

-- Hasar sıralaması için RPC fonksiyonu
CREATE OR REPLACE FUNCTION get_world_boss_damage_rankings(p_boss_battle_id UUID)
RETURNS TABLE (
    player_id UUID,
    username TEXT,
    player_damage NUMERIC,
    gold_reward NUMERIC,
    total_boss_damage NUMERIC,
    player_rank INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        wb.player_id,
        u.username,
        wb.damage,
        COALESCE(wb.gold_reward, 0) as gold_reward,
        (SELECT COALESCE(SUM(damage), 0) FROM world_boss_damage WHERE boss_battle_id = p_boss_battle_id),
        RANK() OVER (ORDER BY wb.damage DESC) as player_rank
    FROM 
        world_boss_damage wb
    JOIN 
        users u ON wb.player_id = u.id
    WHERE 
        wb.boss_battle_id = p_boss_battle_id
    ORDER BY 
        player_rank;
END;
$$ LANGUAGE plpgsql;

-- Debug fonksiyonu
CREATE OR REPLACE FUNCTION debug_world_boss_damage_log(p_boss_battle_id UUID)
RETURNS TABLE (
    log_details JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        jsonb_build_object(
            'total_damage_records', (SELECT COUNT(*) FROM world_boss_damage WHERE boss_battle_id = p_boss_battle_id),
            'total_damage', (SELECT COALESCE(SUM(damage), 0) FROM world_boss_damage WHERE boss_battle_id = p_boss_battle_id),
            'unique_players', (SELECT COUNT(DISTINCT player_id) FROM world_boss_damage WHERE boss_battle_id = p_boss_battle_id)
        );
END;
$$ LANGUAGE plpgsql;
