-- Oyuncu görevleri tablosu
CREATE TABLE player_missions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    mission_id TEXT NOT NULL,
    status TEXT CHECK (status IN ('active', 'completed', 'failed')) DEFAULT 'active',
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Görev tablosu
CREATE TABLE missions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    difficulty TEXT CHECK (difficulty IN ('Kolay', 'Orta', 'Zor')),
    duration INTEGER NOT NULL,
    xp_reward INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Örnek görevleri ekle
INSERT INTO missions (id, name, description, difficulty, duration, xp_reward)
VALUES 
    ('easy', 'Kolay Görev', 'Basit bir görev', 'Kolay', 600, 10),
    ('medium', 'Orta Görev', 'Orta zorlukta bir görev', 'Orta', 3600, 150),
    ('hard', 'Zor Görev', 'Çok zor bir görev', 'Zor', 28800, 3000)
ON CONFLICT (id) DO NOTHING;

-- Otomatik güncelleme zamanı için trigger
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_player_missions_modtime
BEFORE UPDATE ON player_missions
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();
