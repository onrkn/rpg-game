-- Klan oluşturma ve katılma fonksiyonları

-- Klan oluşturma fonksiyonu
CREATE OR REPLACE FUNCTION create_clan(
  p_user_id UUID, 
  p_clan_name TEXT
) 
RETURNS JSONB 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
DECLARE
  v_clan_id UUID;
  v_existing_clan_count INT;
  v_max_clan_limit CONSTANT INT := 10;
BEGIN
  -- Kullanıcının zaten bir klana üye olup olmadığını kontrol et
  IF EXISTS (
    SELECT 1 
    FROM clan_members 
    WHERE user_id = p_user_id
  ) THEN
    RETURN jsonb_build_object(
      'success', false, 
      'message', 'Zaten bir klana üyesiniz'
    );
  END IF;

  -- Klan sayısı kontrolü
  SELECT COUNT(*) INTO v_existing_clan_count FROM clans;
  IF v_existing_clan_count >= v_max_clan_limit THEN
    RETURN jsonb_build_object(
      'success', false, 
      'message', 'Maksimum klan sayısına ulaşıldı'
    );
  END IF;

  -- Klan adı kontrolü
  IF EXISTS (
    SELECT 1 
    FROM clans 
    WHERE LOWER(name) = LOWER(p_clan_name)
  ) THEN
    RETURN jsonb_build_object(
      'success', false, 
      'message', 'Bu isimde bir klan zaten var'
    );
  END IF;

  -- Klan oluştur
  INSERT INTO clans (
    name, 
    leader_id, 
    member_count, 
    total_power
  ) VALUES (
    p_clan_name, 
    p_user_id, 
    1, 
    0
  ) RETURNING id INTO v_clan_id;

  -- Kullanıcıyı klan üyesi olarak ekle
  INSERT INTO clan_members (
    clan_id, 
    user_id, 
    role, 
    power
  ) VALUES (
    v_clan_id, 
    p_user_id, 
    'leader', 
    0
  );

  RETURN jsonb_build_object(
    'success', true, 
    'clan_id', v_clan_id,
    'message', 'Klan başarıyla oluşturuldu'
  );
END;
$$;

-- Klana katılma fonksiyonu
CREATE OR REPLACE FUNCTION join_clan(
  p_user_id UUID, 
  p_clan_id UUID
) 
RETURNS JSONB 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
DECLARE
  v_current_member_count INT;
  v_max_member_limit CONSTANT INT := 10;
BEGIN
  -- Kullanıcının zaten bir klana üye olup olmadığını kontrol et
  IF EXISTS (
    SELECT 1 
    FROM clan_members 
    WHERE user_id = p_user_id
  ) THEN
    RETURN jsonb_build_object(
      'success', false, 
      'message', 'Zaten bir klana üyesiniz'
    );
  END IF;

  -- Klan üye sayısı kontrolü
  SELECT member_count INTO v_current_member_count 
  FROM clans 
  WHERE id = p_clan_id;

  IF v_current_member_count >= v_max_member_limit THEN
    RETURN jsonb_build_object(
      'success', false, 
      'message', 'Klan üye kapasitesi doldu'
    );
  END IF;

  -- Klana üye ekle
  INSERT INTO clan_members (
    clan_id, 
    user_id, 
    role, 
    power
  ) VALUES (
    p_clan_id, 
    p_user_id, 
    'member', 
    0
  );

  -- Klan üye sayısını güncelle
  UPDATE clans 
  SET member_count = member_count + 1 
  WHERE id = p_clan_id;

  RETURN jsonb_build_object(
    'success', true, 
    'message', 'Klana başarıyla katıldınız'
  );
END;
$$;

-- Klan çıkış fonksiyonu
CREATE OR REPLACE FUNCTION leave_clan(
  p_user_id UUID
) 
RETURNS JSONB 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
DECLARE
  v_clan_id UUID;
  v_user_role TEXT;
BEGIN
  -- Kullanıcının mevcut klan bilgilerini al
  SELECT clan_id, role 
  INTO v_clan_id, v_user_role
  FROM clan_members 
  WHERE user_id = p_user_id;

  IF v_clan_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false, 
      'message', 'Herhangi bir klana üye değilsiniz'
    );
  END IF;

  -- Lider ise ve başka üye varsa çıkamaz
  IF v_user_role = 'leader' AND 
     (SELECT COUNT(*) FROM clan_members WHERE clan_id = v_clan_id) > 1 THEN
    RETURN jsonb_build_object(
      'success', false, 
      'message', 'Lider olarak klandan çıkamazsınız'
    );
  END IF;

  -- Klandan çıkar
  DELETE FROM clan_members WHERE user_id = p_user_id;

  -- Eğer lider çıkıyorsa ve klan boşsa, klanı sil
  IF v_user_role = 'leader' THEN
    DELETE FROM clans WHERE id = v_clan_id;
  ELSE
    -- Üye sayısını güncelle
    UPDATE clans 
    SET member_count = member_count - 1 
    WHERE id = v_clan_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true, 
    'message', 'Klandan başarıyla çıkış yapıldı'
  );
END;
$$;
