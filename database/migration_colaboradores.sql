-- Migración de Recolectores a Colaboradores

-- 1. Crear ENUM si no existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_documento_identidad') THEN
        CREATE TYPE tipo_documento_identidad AS ENUM ('CC', 'CE', 'NIT', 'PASAPORTE');
    END IF;
END$$;

-- 2. Modificar la tabla colaboradores
ALTER TABLE colaboradores ADD COLUMN IF NOT EXISTS calificacion_promedio DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE colaboradores ADD COLUMN IF NOT EXISTS total_calificaciones INTEGER NOT NULL DEFAULT 0;

-- 3. Modificar solicitudes_recoleccion
ALTER TABLE solicitudes_recoleccion RENAME COLUMN recolector_id TO colaborador_id;

ALTER TABLE solicitudes_recoleccion DROP CONSTRAINT IF EXISTS solicitudes_recoleccion_recolector_id_fkey;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_solicitudes_colaborador' AND table_name = 'solicitudes_recoleccion'
    ) THEN
        ALTER TABLE solicitudes_recoleccion ADD CONSTRAINT fk_solicitudes_colaborador FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id);
    END IF;
END$$;

-- 4. Modificar calificaciones_recolector
ALTER TABLE calificaciones_recolector RENAME TO calificaciones_colaborador;

ALTER TABLE calificaciones_colaborador RENAME COLUMN recolector_id TO colaborador_id;

ALTER TABLE calificaciones_colaborador DROP CONSTRAINT IF EXISTS calificaciones_recolector_recolector_id_fkey;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_calificaciones_colaborador' AND table_name = 'calificaciones_colaborador'
    ) THEN
        ALTER TABLE calificaciones_colaborador ADD CONSTRAINT fk_calificaciones_colaborador FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id);
    END IF;
END$$;

-- 5. Actualizar Trigger
CREATE OR REPLACE FUNCTION actualizar_calificacion_colaborador()
RETURNS TRIGGER AS $func$
BEGIN
    UPDATE colaboradores SET
        calificacion_promedio = (
            SELECT ROUND(AVG(estrellas)::numeric, 1)
            FROM calificaciones_colaborador
            WHERE colaborador_id = NEW.colaborador_id
        ),
        total_calificaciones = (
            SELECT COUNT(*) FROM calificaciones_colaborador
            WHERE colaborador_id = NEW.colaborador_id
        )
    WHERE id = NEW.colaborador_id;
    RETURN NEW;
END;
$func$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_calificacion_recolector ON calificaciones_colaborador;
DROP TRIGGER IF EXISTS trg_calificacion_colaborador ON calificaciones_colaborador;

CREATE TRIGGER trg_calificacion_colaborador
    AFTER INSERT OR UPDATE ON calificaciones_colaborador
    FOR EACH ROW EXECUTE FUNCTION actualizar_calificacion_colaborador();

-- Eliminar tabla recolectores si ya no se usa (Opcional, pero dejémoslo para después si hay datos, o la borramos de una vez? Mejor dejarla huérfana por seguridad o borrarla). No la borraré por ahora, en caso de rollback.
