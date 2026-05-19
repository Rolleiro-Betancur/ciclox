-- migration_colaboradores.sql

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_documento_identidad') THEN
        CREATE TYPE tipo_documento_identidad AS ENUM ('CC', 'CE', 'NIT', 'PASAPORTE');
    END IF;
END$$;

-- Rename recolector_id to colaborador_id in solicitudes_recoleccion
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='solicitudes_recoleccion' AND column_name='recolector_id') THEN
    ALTER TABLE solicitudes_recoleccion RENAME COLUMN recolector_id TO colaborador_id;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='solicitudes_recoleccion_recolector_id_fkey') THEN
    ALTER TABLE solicitudes_recoleccion DROP CONSTRAINT solicitudes_recoleccion_recolector_id_fkey;
  END IF;
  
  -- Add new constraint only if not already exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='fk_solicitudes_colaborador') THEN
    ALTER TABLE solicitudes_recoleccion ADD CONSTRAINT fk_solicitudes_colaborador FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Rename recolector_id to colaborador_id in calificaciones_recolector
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='calificaciones_recolector' AND column_name='recolector_id') THEN
    ALTER TABLE calificaciones_recolector RENAME COLUMN recolector_id TO colaborador_id;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='calificaciones_recolector_recolector_id_fkey') THEN
    ALTER TABLE calificaciones_recolector DROP CONSTRAINT calificaciones_recolector_recolector_id_fkey;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='fk_calificaciones_colaborador') THEN
    ALTER TABLE calificaciones_recolector ADD CONSTRAINT fk_calificaciones_colaborador FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Rename table calificaciones_recolector to calificaciones_colaborador if exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='calificaciones_recolector') THEN
    ALTER TABLE calificaciones_recolector RENAME TO calificaciones_colaborador;
  END IF;
END $$;
