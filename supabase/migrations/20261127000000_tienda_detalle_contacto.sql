alter table "InventaVen".tiendas_publicas add column if not exists horario text;
alter table "InventaVen".tiendas_publicas add column if not exists telegram text;
alter table "InventaVen".tiendas_publicas add column if not exists instagram text;
alter table "InventaVen".tiendas_publicas add column if not exists correo_contacto text;

alter table "InventaVen".catalogo_productos add column if not exists sku text;
alter table "InventaVen".catalogo_productos add column if not exists stock numeric default 0;
alter table "InventaVen".catalogo_productos add column if not exists variantes jsonb default '[]'::jsonb;
