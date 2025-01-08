-- Günlük eşleşme haklarını sıfırlayan fonksiyon
CREATE OR REPLACE FUNCTION reset_daily_matches()
RETURNS VOID AS $$
BEGIN
    -- Her oyuncunun günlük eşleşme hakkını 10'a sıfırla
    UPDATE players
    SET daily_matches_left = 10,
        last_daily_reset = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Günlük sıfırlama için trigger
CREATE OR REPLACE FUNCTION check_daily_matches_reset()
RETURNS TRIGGER AS $$
BEGIN
    -- Son sıfırlamadan bu yana 24 saat geçtiyse sıfırla
    IF (NEW.last_daily_reset IS NULL) OR 
       (CURRENT_TIMESTAMP - NEW.last_daily_reset >= INTERVAL '24 hours') THEN
        NEW.daily_matches_left = 10;
        NEW.last_daily_reset = CURRENT_TIMESTAMP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger'ı players tablosuna ekle
CREATE TRIGGER reset_daily_matches_trigger
BEFORE UPDATE ON players
FOR EACH ROW
EXECUTE FUNCTION check_daily_matches_reset();
