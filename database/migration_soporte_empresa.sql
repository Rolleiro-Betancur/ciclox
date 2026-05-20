-- database/migration_soporte_empresa.sql

CREATE TABLE IF NOT EXISTS soporte_empresa (
    id                   BIGSERIAL        PRIMARY KEY,
    empresa_id           BIGINT           NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    nombre               VARCHAR(100)     NOT NULL,
    apellido             VARCHAR(100)     NOT NULL,
    asunto               VARCHAR(150)     NOT NULL,
    descripcion          TEXT             NOT NULL,
    fecha_creacion       TIMESTAMP        NOT NULL DEFAULT NOW(),
    fecha_actualizacion  TIMESTAMP        NOT NULL DEFAULT NOW()
);

-- Índices para optimizar búsquedas por empresa
CREATE INDEX IF NOT EXISTS idx_soporte_empresa_empresa_id ON soporte_empresa(empresa_id);

-- Trigger para mantener actualizada la fecha de modificación
DROP TRIGGER IF EXISTS trg_soporte_empresa_updated ON soporte_empresa;
CREATE TRIGGER trg_soporte_empresa_updated
    BEFORE UPDATE ON soporte_empresa
    FOR EACH ROW EXECUTE FUNCTION actualizar_fecha_actualizacion();
