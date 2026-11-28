create table if not exists "InventaVen".configuraciones_usuario (
  usuario_id uuid primary key references auth.users (id) on delete cascade,
  datos jsonb not null default '{}'::jsonb,
  actualizado_en timestamptz not null default now()
);

alter table "InventaVen".configuraciones_usuario enable row level security;

drop policy if exists "configuraciones_usuario_propias" on "InventaVen".configuraciones_usuario;
create policy "configuraciones_usuario_propias"
on "InventaVen".configuraciones_usuario
for all to authenticated
using (auth.uid() = usuario_id)
with check (auth.uid() = usuario_id);

create table if not exists "InventaVen".imagenes_producto (
  producto_id uuid primary key,
  usuario_id uuid not null references auth.users (id) on delete cascade,
  ruta text not null,
  token text not null unique,
  content_type text not null default 'image/jpeg',
  actualizado_en timestamptz not null default now()
);

alter table "InventaVen".imagenes_producto enable row level security;

drop policy if exists "imagenes_producto_select_propio" on "InventaVen".imagenes_producto;
create policy "imagenes_producto_select_propio"
on "InventaVen".imagenes_producto
for select to authenticated
using (auth.uid() = usuario_id);

drop policy if exists "imagenes_producto_insert_propio" on "InventaVen".imagenes_producto;
create policy "imagenes_producto_insert_propio"
on "InventaVen".imagenes_producto
for insert to authenticated
with check (auth.uid() = usuario_id);

drop policy if exists "imagenes_producto_update_propio" on "InventaVen".imagenes_producto;
create policy "imagenes_producto_update_propio"
on "InventaVen".imagenes_producto
for update to authenticated
using (auth.uid() = usuario_id)
with check (auth.uid() = usuario_id);

drop policy if exists "imagenes_producto_delete_propio" on "InventaVen".imagenes_producto;
create policy "imagenes_producto_delete_propio"
on "InventaVen".imagenes_producto
for delete to authenticated
using (auth.uid() = usuario_id);

alter table "InventaVen".catalogo_productos
add column if not exists imagen_token text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'catalogo-productos',
  'catalogo-productos',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "catalogo_productos_select_publico" on storage.objects;
drop policy if exists "catalogo_productos_insert_propio" on storage.objects;
drop policy if exists "catalogo_productos_update_propio" on storage.objects;
drop policy if exists "catalogo_productos_delete_propio" on storage.objects;

grant all on "InventaVen".configuraciones_usuario to service_role;
grant all on "InventaVen".imagenes_producto to service_role;
grant all on "InventaVen".catalogo_productos to service_role;
