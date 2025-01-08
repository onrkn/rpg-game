-- Klan tablosu
CREATE TABLE clans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    leader_id UUID NOT NULL,
    total_power BIGINT DEFAULT 0,
    member_count INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (leader_id) REFERENCES profiles(id)
);

-- Klan üyeleri tablosu
CREATE TABLE clan_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clan_id UUID NOT NULL,
    user_id UUID NOT NULL,
    role TEXT DEFAULT 'member', -- 'leader', 'member'
    power BIGINT DEFAULT 0,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (clan_id) REFERENCES clans(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
    UNIQUE(clan_id, user_id)
);

-- Klan üye sayısı ve toplam güç güncellemesi için trigger
CREATE OR REPLACE FUNCTION update_clan_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Klan üye sayısını güncelle
    UPDATE clans 
    SET member_count = (
        SELECT COUNT(*) 
        FROM clan_members 
        WHERE clan_id = NEW.clan_id
    ),
    total_power = (
        SELECT COALESCE(SUM(power), 0)
        FROM clan_members
        WHERE clan_id = NEW.clan_id
    )
    WHERE id = NEW.clan_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_clan_stats_trigger
AFTER INSERT OR UPDATE OR DELETE ON clan_members
FOR EACH ROW
EXECUTE FUNCTION update_clan_stats();
