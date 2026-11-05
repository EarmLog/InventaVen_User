-- Habilitar Row Level Security en la tabla de perfiles
ALTER TABLE InventaVen.perfiles ENABLE ROW LEVEL SECURITY;

-- Cada usuario autenticado solo puede leer su propio perfil
CREATE POLICY "perfiles_select_propio"
ON InventaVen.perfiles
FOR SELECT
USING (auth.uid() = id);

-- Cada usuario autenticado solo puede crear su propio perfil
CREATE POLICY "perfiles_insert_propio"
ON InventaVen.perfiles
FOR INSERT
WITH CHECK (auth.uid() = id);

-- Cada usuario autenticado solo puede actualizar su propio perfil
CREATE POLICY "perfiles_update_propio"
ON InventaVen.perfiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Cada usuario autenticado solo puede eliminar su propio perfil
CREATE POLICY "perfiles_delete_propio"
ON InventaVen.perfiles
FOR DELETE
USING (auth.uid() = id);
