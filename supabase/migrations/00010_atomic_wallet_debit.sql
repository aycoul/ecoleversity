-- Atomic wallet debit — prevents double-spend race condition
CREATE OR REPLACE FUNCTION debit_wallet(
  p_user_id UUID,
  p_amount INT,
  p_description TEXT
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_wallet_id UUID;
  v_new_balance INT;
BEGIN
  -- Lock wallet row and debit atomically
  UPDATE wallets
  SET balance_xof = balance_xof - p_amount
  WHERE user_id = p_user_id AND balance_xof >= p_amount
  RETURNING id, balance_xof INTO v_wallet_id, v_new_balance;

  IF v_wallet_id IS NULL THEN
    RAISE EXCEPTION 'Insufficient balance or wallet not found';
  END IF;

  -- Record transaction
  INSERT INTO wallet_transactions (wallet_id, type, amount_xof, description)
  VALUES (v_wallet_id, 'debit', -p_amount, p_description);

  RETURN v_new_balance;
END;
$$;
