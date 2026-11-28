alter table "InventaVen".perfiles
  add column if not exists direccion text,
  add column if not exists zona_postal text;

alter table "InventaVen".perfiles enable row level security;

drop policy if exists "perfiles_select_propio" on "InventaVen".perfiles;
create policy "perfiles_select_propio"
on "InventaVen".perfiles
for select to authenticated
using (auth.uid() = id);

drop policy if exists "perfiles_insert_propio" on "InventaVen".perfiles;
create policy "perfiles_insert_propio"
on "InventaVen".perfiles
for insert to authenticated
with check (auth.uid() = id);

drop policy if exists "perfiles_update_propio" on "InventaVen".perfiles;
create policy "perfiles_update_propio"
on "InventaVen".perfiles
for update to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "perfiles_delete_propio" on "InventaVen".perfiles;
create policy "perfiles_delete_propio"
on "InventaVen".perfiles
for delete to authenticated
using (auth.uid() = id);
