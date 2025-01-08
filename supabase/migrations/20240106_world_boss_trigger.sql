-- Mevcut world_boss tablosunu temizle ve otomatik oluşturma mekanizması ekle
BEGIN;

-- Eğer tablo zaten varsa sil
DROP TABLE IF EXISTS world_boss;

-- World Boss tablosunu oluştur
CREATE TABLE world_boss (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    level INTEGER NOT NULL DEFAULT 1,
    health NUMERIC NOT NULL DEFAULT 1000,
    max_health NUMERIC NOT NULL DEFAULT 1000,
    damage_taken NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'defeated', 'inactive')),
    spawn_time TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    next_spawn_time TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP + INTERVAL '24 hours',
    difficulty TEXT DEFAULT 'normal' CHECK (difficulty IN ('easy', 'normal', 'hard', 'legendary')),
    rewards JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Otomatik spawn için fonksiyon oluştur
CREATE OR REPLACE FUNCTION spawn_world_boss()
RETURNS TRIGGER AS $$
BEGIN
    -- Eğer aktif world boss yoksa veya mevcut boss yenildiyse yeni boss oluştur
    IF NOT EXISTS (SELECT 1 FROM world_boss WHERE status = 'active') THEN
        INSERT INTO world_boss (
            name, 
            level, 
            health, 
            max_health, 
            status, 
            spawn_time, 
            next_spawn_time,
            difficulty,
            rewards
        ) VALUES (
            'Karanlık İmparator', 
            FLOOR(RANDOM() * 10 + 1)::INTEGER, 
            1000, 
            1000, 
            'active', 
            CURRENT_TIMESTAMP, 
            CURRENT_TIMESTAMP + INTERVAL '24 hours',
            (ARRAY['easy', 'normal', 'hard', 'legendary'])[FLOOR(RANDOM() * 4 + 1)],
            jsonb_build_object(
                'gold', FLOOR(RANDOM() * 1000 + 500),
                'exp', FLOOR(RANDOM() * 500 + 250),
                'rare_items', ARRAY[
                    'Karanlık Kılıç', 
                    'İmparator Zırhı', 
                    'Güç Madalyonu'
                ]
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger oluştur (her gün bir kez çalışacak)
CREATE OR REPLACE FUNCTION check_and_spawn_world_boss()
RETURNS TRIGGER AS $$
BEGIN
    -- Her gün saat 00:00'da yeni boss spawn et
    IF (NEW.current_timestamp::time = '00:00:00'::time) THEN
        PERFORM spawn_world_boss();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Zamanlayıcı trigger
CREATE TRIGGER world_boss_daily_spawn
AFTER INSERT ON world_boss
FOR EACH ROW
EXECUTE FUNCTION check_and_spawn_world_boss();

-- İlk world boss'u oluştur
INSERT INTO world_boss (
    name, 
    level, 
    health, 
    max_health, 
    status, 
    spawn_time, 
    next_spawn_time,
    difficulty,
    rewards
) VALUES (
    'Karanlık İmparator', 
    FLOOR(RANDOM() * 10 + 1)::INTEGER, 
    1000, 
    1000, 
    'active', 
    CURRENT_TIMESTAMP, 
    CURRENT_TIMESTAMP + INTERVAL '24 hours',
    (ARRAY['easy', 'normal', 'hard', 'legendary'])[FLOOR(RANDOM() * 4 + 1)],
    jsonb_build_object(
        'gold', FLOOR(RANDOM() * 1000 + 500),
        'exp', FLOOR(RANDOM() * 500 + 250),
        'rare_items', ARRAY[
            'Karanlık Kılıç', 
            'İmparator Zırhı', 
            'Güç Madalyonu'
        ]
    )
);

COMMIT;
