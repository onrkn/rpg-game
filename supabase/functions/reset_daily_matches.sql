-- Günlük eşleşme haklarını sıfırlayan fonksiyon
CREATE OR REPLACE FUNCTION reset_daily_matches_at_midnight()
RETURNS void AS $$
BEGIN
  -- Tüm oyuncuların günlük eşleşme haklarını 10'a sıfırla
  UPDATE players 
  SET 
    daily_matches_left = 10,
    daily_matches_reset_time = NOW() AT TIME ZONE 'UTC'
  WHERE 
    (daily_matches_reset_time IS NULL OR 
     (NOW() AT TIME ZONE 'UTC') - daily_matches_reset_time >= INTERVAL '24 hours');
END;
$$ LANGUAGE plpgsql;

-- Fonksiyonu çağırmak için örnek
-- SELECT reset_daily_matches_at_midnight();
