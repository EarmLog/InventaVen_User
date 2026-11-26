create table if not exists "InventaVen".tiendas_publicas (
  usuario_id uuid primary key,
  slug text unique,
  token text unique,
  activo boolean default true,
  telefono text,
  tasa_publicada numeric,
  nombre_negocio text,
  actualizado_en timestamptz
);

create table if not exists "InventaVen".catalogo_productos (
  id uuid primary key default gen_random_uuid(),
  tienda_id uuid references "InventaVen".tiendas_publicas (usuario_id) on delete cascade,
  producto_id text,
  nombre text,
  descripcion text,
  categoria text,
  precio_usd numeric,
  precio_ves numeric,
  imagen_url text,
  orden integer,
  activo boolean default true,
  actualizado_en timestamptz,
  constraint catalogo_productos_tienda_producto_unico unique (tienda_id, producto_id)
);

alter table "InventaVen".tiendas_publicas enable row level security;
alter table "InventaVen".catalogo_productos enable row level security;

drop policy if exists "tiendas_publicas_select_propio" on "InventaVen".tiendas_publicas;
create policy "tiendas_publicas_select_propio"
on "InventaVen".tiendas_publicas
for select to authenticated
using (auth.uid() = usuario_id);

drop policy if exists "tiendas_publicas_insert_propio" on "InventaVen".tiendas_publicas;
create policy "tiendas_publicas_insert_propio"
on "InventaVen".tiendas_publicas
for insert to authenticated
with check (auth.uid() = usuario_id);

drop policy if exists "tiendas_publicas_update_propio" on "InventaVen".tiendas_publicas;
create policy "tiendas_publicas_update_propio"
on "InventaVen".tiendas_publicas
for update to authenticated
using (auth.uid() = usuario_id)
with check (auth.uid() = usuario_id);

drop policy if exists "tiendas_publicas_delete_propio" on "InventaVen".tiendas_publicas;
create policy "tiendas_publicas_delete_propio"
on "InventaVen".tiendas_publicas
for delete to authenticated
using (auth.uid() = usuario_id);

drop policy if exists "catalogo_productos_select_propio" on "InventaVen".catalogo_productos;
create policy "catalogo_productos_select_propio"
on "InventaVen".catalogo_productos
for select to authenticated
using (auth.uid() = tienda_id);

drop policy if exists "catalogo_productos_insert_propio" on "InventaVen".catalogo_productos;
create policy "catalogo_productos_insert_propio"
on "InventaVen".catalogo_productos
for insert to authenticated
with check (auth.uid() = tienda_id);

drop policy if exists "catalogo_productos_update_propio" on "InventaVen".catalogo_productos;
create policy "catalogo_productos_update_propio"
on "InventaVen".catalogo_productos
for update to authenticated
using (auth.uid() = tienda_id)
with check (auth.uid() = tienda_id);

drop policy if exists "catalogo_productos_delete_propio" on "InventaVen".catalogo_productos;
create policy "catalogo_productos_delete_propio"
on "InventaVen".catalogo_productos
for delete to authenticated
using (auth.uid() = tienda_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'catalogo-productos',
  'catalogo-productos',
  true,
  5242880,
  array['image/jpeg']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "catalogo_productos_select_publico" on storage.objects;
create policy "catalogo_productos_select_publico"
on storage.objects
for select to public
using (bucket_id = 'catalogo-productos');

drop policy if exists "catalogo_productos_insert_propio" on storage.objects;
create policy "catalogo_productos_insert_propio"
on storage.objects
for insert to authenticated
with check (
  bucket_id = 'catalogo-productos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "catalogo_productos_update_propio" on storage.objects;
create policy "catalogo_productos_update_propio"
on storage.objects
for update to authenticated
using (
  bucket_id = 'catalogo-productos'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'catalogo-productos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "catalogo_productos_delete_propio" on storage.objects;
create policy "catalogo_productos_delete_propio"
on storage.objects
for delete to authenticated
using (
  bucket_id = 'catalogo-productos'
  and (storage.foldername(name))[1] = auth.uid()::text
);
