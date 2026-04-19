-- transactions.payment_provider is NOT NULL in the initial schema, but
-- a booking creates a transaction BEFORE the parent has chosen a provider
-- (Orange Money vs Wave vs PayPal vs admin-confirm). The provider is
-- only known at payment time. Let it be nullable here and pin it at
-- confirmation time in /api/payments/{sms,paypal,admin}-confirm.

alter table transactions
  alter column payment_provider drop not null;
