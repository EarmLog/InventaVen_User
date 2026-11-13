-- Campos adicionales para clasificar la cuenta y los datos fiscales del negocio.
-- Se ejecuta una sola vez; los valores existentes quedan como cuenta personal.

ALTER TABLE "InventaVen".perfiles
  ADD COLUMN IF NOT EXISTS tipo_cuenta text NOT NULL DEFAULT 'personal',
  ADD COLUMN IF NOT EXISTS negocio_registrado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sufijo_legal text,
  ADD COLUMN IF NOT EXISTS rif text;

COMMENT ON COLUMN "InventaVen".perfiles.tipo_cuenta IS
  'Tipo de cuenta: personal, micronegocio, negocio o empresa.';
COMMENT ON COLUMN "InventaVen".perfiles.negocio_registrado IS
  'Indica si el negocio está legalmente registrado en Venezuela.';
COMMENT ON COLUMN "InventaVen".perfiles.sufijo_legal IS
  'Sufijo legal venezolano: C.A., S.A., S.R.L., C.A.S.A., S.C. o Cooperativa.';
COMMENT ON COLUMN "InventaVen".perfiles.rif IS
  'RIF del negocio con formato J-12345678-9.';
