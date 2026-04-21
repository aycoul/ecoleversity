-- Add 'paypal' to the payment_provider enum.
--
-- The PayPal capture path (/api/payments/paypal-capture) was silently
-- failing because the enum lacked this value. The UPDATE threw
-- "invalid input value for enum payment_provider: paypal" but the
-- server-side code (before the parallel fix in paypal-capture/route.ts)
-- swallowed the error — `const { data: updated } = await ...` — and
-- wrongly returned `{status: "already_confirmed"}` to the client.
-- The client treated that as success and showed "Paiement confirmé"
-- while the DB stayed pending. First diaspora payment tested via
-- sandbox surfaced this.
--
-- Also add 'flutterwave' + 'cinetpay' — future Phase 7 providers per
-- CLAUDE.md. Adding enum values is free; a dedicated migration per
-- provider adds noise.

ALTER TYPE payment_provider ADD VALUE IF NOT EXISTS 'paypal';
ALTER TYPE payment_provider ADD VALUE IF NOT EXISTS 'flutterwave';
ALTER TYPE payment_provider ADD VALUE IF NOT EXISTS 'cinetpay';
