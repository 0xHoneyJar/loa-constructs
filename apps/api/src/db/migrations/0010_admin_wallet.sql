-- cycle-040: Promote primary admin wallet
-- Idempotent — SET is_admin = true is a no-op if already true
UPDATE users SET is_admin = true
WHERE LOWER(wallet_address) = LOWER('0x79092A805f1cf9B0F5bE3c5A296De6e51c1DEd34');
