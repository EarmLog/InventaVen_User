grant usage on schema "InventaVen" to service_role, authenticated, anon;

grant all on table "InventaVen".tiendas_publicas to service_role;
grant all on table "InventaVen".catalogo_productos to service_role;

grant select, insert, update, delete on table "InventaVen".tiendas_publicas to authenticated;
grant select, insert, update, delete on table "InventaVen".catalogo_productos to authenticated;
