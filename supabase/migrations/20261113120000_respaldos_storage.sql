-- Bucket privado para copias de seguridad de InventaVen.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'respaldos',
  'respaldos',
  false,
  52428800,
  array['application/zip', 'application/x-zip-compressed']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Cada usuario solo puede ver las copias guardadas en su propia carpeta.
drop policy if exists "respaldos_select_propio" on storage.objects;
create policy "respaldos_select_propio"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'respaldos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Cada usuario solo puede subir copias dentro de su propia carpeta.
drop policy if exists "respaldos_insert_propio" on storage.objects;
create policy "respaldos_insert_propio"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'respaldos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Cada usuario solo puede actualizar sus propias copias.
drop policy if exists "respaldos_update_propio" on storage.objects;
create policy "respaldos_update_propio"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'respaldos'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'respaldos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Cada usuario solo puede borrar sus propias copias.
drop policy if exists "respaldos_delete_propio" on storage.objects;
create policy "respaldos_delete_propio"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'respaldos'
  and (storage.foldername(name))[1] = auth.uid()::text
);
