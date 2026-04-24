-- =====================================================
-- CICLOX - Base de datos completa
-- Adaptada a pantallas de USUARIO y EMPRESA
-- =====================================================


-- =====================================================
-- ENUMS
-- =====================================================

CREATE TYPE rol_usuario AS ENUM ('USUARIO', 'EMPRESA');

CREATE TYPE tipo_dispositivo AS ENUM (
    'CELULAR', 'COMPUTADOR', 'TABLET', 'TELEVISOR',
    'IMPRESORA', 'BATERIA', 'CARGADOR', 'ELECTRODOMESTICO', 'OTRO'
);

-- NUEVO: estado físico visible en la pantalla de selección de dispositivo
CREATE TYPE estado_fisico_dispositivo AS ENUM (
    'ENCIENDE', 'DANIADO', 'ROTO', 'COMPLETO', 'INCOMPLETO'
);

CREATE TYPE estado_dispositivo AS ENUM (
    'REGISTRADO', 'EN_PROCESO_RECOLECCION', 'RECOLECTADO',
    'EN_RECICLAJE', 'RECICLADO', 'CANCELADO'
);

CREATE TYPE tipo_recoleccion AS ENUM ('DOMICILIO', 'PUNTO_RECOLECCION');

CREATE TYPE estado_solicitud AS ENUM (
    'PENDIENTE', 'ACEPTADA', 'EN_TRANSITO',
    'RECOLECTADA', 'COMPLETADA', 'CANCELADA', 'RECHAZADA'
);

CREATE TYPE tipo_movimiento AS ENUM (
    'REGISTRO', 'SOLICITUD_CREADA', 'ACEPTADO', 'EN_TRANSITO',
    'RECIBIDO_PUNTO', 'RECIBIDO_EMPRESA', 'EN_CLASIFICACION',
    'EN_DESMANTELAMIENTO', 'EN_RECICLAJE', 'RECICLADO', 'CERTIFICADO_EMITIDO'
);

CREATE TYPE metodologia_reciclaje AS ENUM (
    'DESMONTAJE_MANUAL', 'TRATAMIENTO_MECANICO', 'RECUPERACION_MATERIALES',
    'DISPOSICION_FINAL_SEGURA', 'REFABRICACION', 'REUTILIZACION'
);

CREATE TYPE estado_reciclaje AS ENUM ('EN_PROCESO', 'COMPLETADO', 'CERTIFICADO');

CREATE TYPE tipo_notificacion AS ENUM (
    'SOLICITUD_ACEPTADA', 'SOLICITUD_EN_TRANSITO', 'SOLICITUD_RECOLECTADA',
    'RECICLAJE_COMPLETADO', 'CERTIFICADO_DISPONIBLE', 'NUEVA_SOLICITUD',
    'RECORDATORIO', 'SISTEMA'
);

CREATE TYPE estado_reporte AS ENUM ('BORRADOR', 'PUBLICADO', 'CERTIFICADO');

-- NUEVO: tipos para el sistema de puntos y recompensas
CREATE TYPE tipo_movimiento_puntos AS ENUM (
    'GANADO_RECICLAJE',   -- +puntos al completar recolección
    'CANJEADO_RECOMPENSA' -- -puntos al canjear
);

CREATE TYPE tipo_recompensa AS ENUM (
    'BONO_CICLOX',   -- descuento en tecnología (MovilClick, Turing, etc.)
    'MERCADITOS'     -- bono en supermercados (Éxito, Jumbo, etc.)
);

CREATE TYPE estado_canje AS ENUM (
    'PENDIENTE',  -- QR generado, esperando ser usado
    'EXITOSO',    -- canjeado correctamente en el aliado
    'RECHAZADO',  -- rechazado en el punto de pago
    'EXPIRADO'    -- pasó el tiempo de vigencia (30 min) sin usarse
);


-- =====================================================
-- TABLAS BASE
-- =====================================================

CREATE TABLE usuarios (
    id                   BIGSERIAL       PRIMARY KEY,
    nombre               VARCHAR(100)    NOT NULL,
    email                VARCHAR(150)    NOT NULL UNIQUE,
    contrasena           VARCHAR(255)    NOT NULL,
    telefono             VARCHAR(20),
    direccion            VARCHAR(200),
    departamento         VARCHAR(100),                 -- NUEVO: visto en formulario de solicitud
    rol                  rol_usuario     NOT NULL,
    activo               BOOLEAN         NOT NULL DEFAULT TRUE,
    codigo_recuperacion  VARCHAR(10),
    codigo_expiracion    TIMESTAMP,
    fcm_token            VARCHAR(300),                 -- para notificaciones push
    fecha_registro       TIMESTAMP       NOT NULL DEFAULT NOW(),
    fecha_actualizacion  TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_usuarios_rol   ON usuarios(rol);


-- NUEVO: perfil extendido para empresas (datos de verificación y registro)
CREATE TABLE perfiles_empresa (
    id              BIGSERIAL       PRIMARY KEY,
    usuario_id      BIGINT          NOT NULL UNIQUE REFERENCES usuarios(id),
    nombre_empresa  VARCHAR(150)    NOT NULL,
    nit             VARCHAR(30),
    logo_url        VARCHAR(300),
    descripcion     VARCHAR(500),
    verificada      BOOLEAN         NOT NULL DEFAULT FALSE,  -- pantalla REGISTRO Y VERIFICACIÓN
    fecha_creacion  TIMESTAMP       NOT NULL DEFAULT NOW(),
    fecha_actualizacion TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_perfiles_empresa_usuario ON perfiles_empresa(usuario_id);


-- =====================================================
-- DISPOSITIVOS
-- =====================================================

CREATE TABLE dispositivos (
    id                   BIGSERIAL               PRIMARY KEY,
    ciudadano_id         BIGINT                  NOT NULL REFERENCES usuarios(id),
    tipo                 tipo_dispositivo         NOT NULL,
    marca                VARCHAR(100)            NOT NULL,
    modelo               VARCHAR(100),
    serial_numero        VARCHAR(50),
    descripcion          VARCHAR(500),
    foto_url             VARCHAR(300),
    estado_fisico        estado_fisico_dispositivo NOT NULL DEFAULT 'ENCIENDE', -- NUEVO
    estado               estado_dispositivo       NOT NULL DEFAULT 'REGISTRADO',
    anio_fabricacion     INTEGER                 DEFAULT 0,
    fecha_registro       TIMESTAMP               NOT NULL DEFAULT NOW(),
    fecha_actualizacion  TIMESTAMP               NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dispositivos_ciudadano ON dispositivos(ciudadano_id);
CREATE INDEX idx_dispositivos_estado    ON dispositivos(estado);
CREATE INDEX idx_dispositivos_tipo      ON dispositivos(tipo);


-- =====================================================
-- PUNTOS DE RECOLECCIÓN
-- =====================================================

CREATE TABLE puntos_recoleccion (
    id               BIGSERIAL        PRIMARY KEY,
    empresa_id       BIGINT           NOT NULL REFERENCES usuarios(id),
    nombre           VARCHAR(150)     NOT NULL,
    direccion        VARCHAR(300)     NOT NULL,
    barrio           VARCHAR(100),
    ciudad           VARCHAR(100),
    latitud          DOUBLE PRECISION NOT NULL,
    longitud         DOUBLE PRECISION NOT NULL,
    descripcion      VARCHAR(500),
    horario_atencion VARCHAR(200),
    telefono         VARCHAR(20),
    activo           BOOLEAN          NOT NULL DEFAULT TRUE,
    tipos_aceptados  VARCHAR(500),
    fecha_creacion   TIMESTAMP        NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_puntos_empresa ON puntos_recoleccion(empresa_id);
CREATE INDEX idx_puntos_activo  ON puntos_recoleccion(activo);
CREATE INDEX idx_puntos_geo     ON puntos_recoleccion(latitud, longitud);


-- =====================================================
-- RECOLECTORES (colaboradores/operarios de empresa)
-- Nuevo: visible en pantalla de trazabilidad del usuario
-- =====================================================

CREATE TABLE recolectores (
    id                    BIGSERIAL    PRIMARY KEY,
    empresa_id            BIGINT       NOT NULL REFERENCES usuarios(id),
    nombre                VARCHAR(100) NOT NULL,
    telefono              VARCHAR(20),
    foto_url              VARCHAR(300),
    calificacion_promedio DOUBLE PRECISION NOT NULL DEFAULT 0,
    total_calificaciones  INTEGER          NOT NULL DEFAULT 0,
    activo                BOOLEAN          NOT NULL DEFAULT TRUE,
    fecha_registro        TIMESTAMP        NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_recolectores_empresa ON recolectores(empresa_id);


-- =====================================================
-- SOLICITUDES DE RECOLECCIÓN
-- =====================================================

CREATE TABLE solicitudes_recoleccion (
    id                    BIGSERIAL        PRIMARY KEY,
    ciudadano_id          BIGINT           NOT NULL REFERENCES usuarios(id),
    empresa_id            BIGINT           REFERENCES usuarios(id),
    punto_recoleccion_id  BIGINT           REFERENCES puntos_recoleccion(id),
    recolector_id         BIGINT           REFERENCES recolectores(id),  -- NUEVO
    tipo_recoleccion      tipo_recoleccion NOT NULL DEFAULT 'DOMICILIO',

    -- Dirección de recogida (paso 2 del formulario)
    direccion_recoleccion VARCHAR(300),
    ciudad                VARCHAR(100),
    departamento          VARCHAR(100),    -- NUEVO: visto en formulario
    referencia            VARCHAR(200),    -- NUEVO: campo "Referencia (opcional)"
    telefono_contacto     VARCHAR(20),

    -- Programación
    fecha_preferida       DATE,
    hora_estimada_inicio  VARCHAR(10),     -- NUEVO: "Entre 2:00 pm"
    hora_estimada_fin     VARCHAR(10),     -- NUEVO: "– 5:00 pm"

    -- Estado
    estado                estado_solicitud NOT NULL DEFAULT 'PENDIENTE',
    motivo_rechazo        VARCHAR(500),    -- NUEVO: "Fuera de zona de cobertura"
    comentario_empresa    VARCHAR(500),

    -- Trazabilidad de fechas
    fecha_creacion        TIMESTAMP        NOT NULL DEFAULT NOW(),
    fecha_actualizacion   TIMESTAMP        NOT NULL DEFAULT NOW(),
    fecha_aceptacion      TIMESTAMP,
    fecha_recoleccion     TIMESTAMP
);

CREATE INDEX idx_solicitudes_ciudadano ON solicitudes_recoleccion(ciudadano_id);
CREATE INDEX idx_solicitudes_empresa   ON solicitudes_recoleccion(empresa_id);
CREATE INDEX idx_solicitudes_estado    ON solicitudes_recoleccion(estado);
CREATE INDEX idx_solicitudes_recolector ON solicitudes_recoleccion(recolector_id);


-- NUEVO: tabla pivote que relaciona una solicitud con uno o más dispositivos
-- (en las pantallas se ven solicitudes con "Cantidad: 01 / 03 dispositivos")
CREATE TABLE solicitud_dispositivos (
    id             BIGSERIAL PRIMARY KEY,
    solicitud_id   BIGINT    NOT NULL REFERENCES solicitudes_recoleccion(id) ON DELETE CASCADE,
    dispositivo_id BIGINT    NOT NULL REFERENCES dispositivos(id),
    cantidad       INTEGER   NOT NULL DEFAULT 1,
    UNIQUE (solicitud_id, dispositivo_id)
);

CREATE INDEX idx_sol_disp_solicitud  ON solicitud_dispositivos(solicitud_id);
CREATE INDEX idx_sol_disp_dispositivo ON solicitud_dispositivos(dispositivo_id);


-- =====================================================
-- CALIFICACIONES AL RECOLECTOR
-- NUEVO: pantalla "¿Cómo fue tu experiencia?" con estrellas
-- =====================================================

CREATE TABLE calificaciones_recolector (
    id              BIGSERIAL PRIMARY KEY,
    solicitud_id    BIGINT    NOT NULL UNIQUE REFERENCES solicitudes_recoleccion(id),
    recolector_id   BIGINT    NOT NULL REFERENCES recolectores(id),
    ciudadano_id    BIGINT    NOT NULL REFERENCES usuarios(id),
    estrellas       INTEGER   NOT NULL CHECK (estrellas BETWEEN 1 AND 5),
    comentario      VARCHAR(500),
    fecha           TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_calificaciones_recolector ON calificaciones_recolector(recolector_id);


-- =====================================================
-- SISTEMA DE PUNTOS
-- NUEVO: pantalla "Tus puntos" con saldo, historial y progreso
-- =====================================================

-- Saldo actual del usuario
CREATE TABLE puntos_usuario (
    id                  BIGSERIAL PRIMARY KEY,
    usuario_id          BIGINT    NOT NULL UNIQUE REFERENCES usuarios(id),
    saldo_actual        INTEGER   NOT NULL DEFAULT 0,
    total_ganado        INTEGER   NOT NULL DEFAULT 0,
    total_canjeado      INTEGER   NOT NULL DEFAULT 0,
    fecha_actualizacion TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_puntos_usuario ON puntos_usuario(usuario_id);


-- Historial de movimientos de puntos (+reciclaje / -canje)
CREATE TABLE movimientos_puntos (
    id           BIGSERIAL               PRIMARY KEY,
    usuario_id   BIGINT                  NOT NULL REFERENCES usuarios(id),
    solicitud_id BIGINT                  REFERENCES solicitudes_recoleccion(id),
    canje_id     BIGINT,                 -- FK a canjes (se agrega después)
    cantidad     INTEGER                 NOT NULL,  -- positivo = ganado, negativo = canjeado
    tipo         tipo_movimiento_puntos  NOT NULL,
    descripcion  VARCHAR(200),           -- "Reciclaje Celular", "Bono Ciclox", etc.
    fecha        TIMESTAMP               NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mov_puntos_usuario ON movimientos_puntos(usuario_id);
CREATE INDEX idx_mov_puntos_fecha   ON movimientos_puntos(fecha);


-- =====================================================
-- RECOMPENSAS Y CANJES
-- NUEVO: pantallas "Bono Ciclox", "Mercaditos", QR codes
-- =====================================================

-- Catálogo de recompensas disponibles
CREATE TABLE recompensas (
    id               BIGSERIAL        PRIMARY KEY,
    nombre           VARCHAR(150)     NOT NULL,   -- "Bono Ciclox", "Mercaditos"
    descripcion      VARCHAR(500),
    icono_url        VARCHAR(300),
    tipo             tipo_recompensa  NOT NULL,
    puntos_requeridos INTEGER         NOT NULL,   -- 600 pts (Bono Ciclox), 5000 pts (Mercaditos)
    valor_monetario  DOUBLE PRECISION,            -- $20.000 COP
    porcentaje_descuento INTEGER,                 -- 30% (Bono Ciclox)
    aliados          VARCHAR(500),               -- "MovilClick, Turing" / "Éxito, Jumbo"
    activo           BOOLEAN          NOT NULL DEFAULT TRUE,
    fecha_creacion   TIMESTAMP        NOT NULL DEFAULT NOW()
);


-- Canjes realizados por usuarios
-- Genera un código QR con vigencia de 30 minutos
CREATE TABLE canjes (
    id               BIGSERIAL      PRIMARY KEY,
    usuario_id       BIGINT         NOT NULL REFERENCES usuarios(id),
    recompensa_id    BIGINT         NOT NULL REFERENCES recompensas(id),
    puntos_usados    INTEGER        NOT NULL,
    codigo_qr        VARCHAR(500),              -- contenido para renderizar el QR
    codigo_texto     VARCHAR(20)    NOT NULL,   -- "ED24FH" mostrado bajo el QR
    estado           estado_canje   NOT NULL DEFAULT 'PENDIENTE',
    fecha_creacion   TIMESTAMP      NOT NULL DEFAULT NOW(),
    fecha_expiracion TIMESTAMP      NOT NULL,   -- fecha_creacion + 30 minutos
    fecha_uso        TIMESTAMP                  -- cuándo fue confirmado por el aliado
);

CREATE INDEX idx_canjes_usuario    ON canjes(usuario_id);
CREATE INDEX idx_canjes_estado     ON canjes(estado);
CREATE INDEX idx_canjes_expiracion ON canjes(fecha_expiracion);

-- Agregar FK de movimientos_puntos a canjes ahora que la tabla existe
ALTER TABLE movimientos_puntos
    ADD CONSTRAINT fk_movimientos_puntos_canje
    FOREIGN KEY (canje_id) REFERENCES canjes(id);


-- =====================================================
-- TRAZABILIDAD RAEE
-- =====================================================

CREATE TABLE movimientos_raee (
    id                BIGSERIAL        PRIMARY KEY,
    dispositivo_id    BIGINT           NOT NULL REFERENCES dispositivos(id),
    responsable_id    BIGINT           NOT NULL REFERENCES usuarios(id),
    solicitud_id      BIGINT           REFERENCES solicitudes_recoleccion(id),
    tipo              tipo_movimiento  NOT NULL,
    ubicacion_origen  VARCHAR(200),
    ubicacion_destino VARCHAR(200),
    descripcion       VARCHAR(500),
    latitud           DOUBLE PRECISION,
    longitud          DOUBLE PRECISION,
    evidencia_url     VARCHAR(300),
    fecha             TIMESTAMP        NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_movimientos_dispositivo ON movimientos_raee(dispositivo_id);
CREATE INDEX idx_movimientos_fecha       ON movimientos_raee(fecha);
CREATE INDEX idx_movimientos_tipo        ON movimientos_raee(tipo);


-- =====================================================
-- RECICLAJES
-- =====================================================

CREATE TABLE reciclajes (
    id                     BIGSERIAL              PRIMARY KEY,
    dispositivo_id         BIGINT                 NOT NULL UNIQUE REFERENCES dispositivos(id),
    empresa_id             BIGINT                 NOT NULL REFERENCES usuarios(id),
    metodologia            metodologia_reciclaje  NOT NULL,
    fecha_inicio           DATE                   NOT NULL,
    fecha_fin              DATE,
    peso_kg                DOUBLE PRECISION,
    co2_evitado_kg         DOUBLE PRECISION,
    materiales_recuperados VARCHAR(500),
    residuos_peligrosos    VARCHAR(500),
    certificado_url        VARCHAR(300),
    numero_certificado     VARCHAR(100),
    estado                 estado_reciclaje       NOT NULL DEFAULT 'EN_PROCESO',
    observaciones          TEXT,
    fecha_registro         TIMESTAMP              NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reciclajes_empresa ON reciclajes(empresa_id);
CREATE INDEX idx_reciclajes_estado  ON reciclajes(estado);


-- =====================================================
-- NOTIFICACIONES
-- =====================================================

CREATE TABLE notificaciones (
    id              BIGSERIAL          PRIMARY KEY,
    usuario_id      BIGINT             NOT NULL REFERENCES usuarios(id),
    titulo          VARCHAR(150)       NOT NULL,
    mensaje         VARCHAR(500)       NOT NULL,
    tipo            tipo_notificacion  NOT NULL,
    leida           BOOLEAN            NOT NULL DEFAULT FALSE,
    referencia_id   BIGINT,
    referencia_tipo VARCHAR(50),
    enviada         BOOLEAN            NOT NULL DEFAULT FALSE,
    fecha_creacion  TIMESTAMP          NOT NULL DEFAULT NOW(),
    fecha_lectura   TIMESTAMP
);

CREATE INDEX idx_notificaciones_usuario ON notificaciones(usuario_id);
CREATE INDEX idx_notificaciones_leida   ON notificaciones(leida);


-- =====================================================
-- REPORTES AMBIENTALES (empresa)
-- =====================================================

CREATE TABLE reportes_ambientales (
    id                             BIGSERIAL      PRIMARY KEY,
    empresa_id                     BIGINT         NOT NULL REFERENCES usuarios(id),
    periodo_inicio                 DATE           NOT NULL,
    periodo_fin                    DATE           NOT NULL,
    total_dispositivos_gestionados INTEGER        NOT NULL DEFAULT 0,
    total_solicitudes_completadas  INTEGER        NOT NULL DEFAULT 0,
    total_peso_kg                  DOUBLE PRECISION DEFAULT 0,
    total_co2_evitado_kg           DOUBLE PRECISION DEFAULT 0,
    desglose_dispositivos_json     TEXT,
    desglose_metodologia_json      TEXT,
    estado                         estado_reporte NOT NULL DEFAULT 'BORRADOR',
    reporte_url                    VARCHAR(300),
    fecha_generacion               TIMESTAMP      NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reportes_empresa ON reportes_ambientales(empresa_id);
CREATE INDEX idx_reportes_periodo ON reportes_ambientales(periodo_inicio, periodo_fin);


-- =====================================================
-- TRIGGERS: auto-actualizar fecha_actualizacion
-- =====================================================

CREATE OR REPLACE FUNCTION actualizar_fecha_actualizacion()
RETURNS TRIGGER AS $$
BEGIN
    NEW.fecha_actualizacion = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_usuarios_updated
    BEFORE UPDATE ON usuarios
    FOR EACH ROW EXECUTE FUNCTION actualizar_fecha_actualizacion();

CREATE TRIGGER trg_dispositivos_updated
    BEFORE UPDATE ON dispositivos
    FOR EACH ROW EXECUTE FUNCTION actualizar_fecha_actualizacion();

CREATE TRIGGER trg_solicitudes_updated
    BEFORE UPDATE ON solicitudes_recoleccion
    FOR EACH ROW EXECUTE FUNCTION actualizar_fecha_actualizacion();

CREATE TRIGGER trg_perfiles_empresa_updated
    BEFORE UPDATE ON perfiles_empresa
    FOR EACH ROW EXECUTE FUNCTION actualizar_fecha_actualizacion();


-- =====================================================
-- FUNCIÓN: actualizar saldo de puntos automáticamente
-- =====================================================

CREATE OR REPLACE FUNCTION actualizar_saldo_puntos()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO puntos_usuario (usuario_id, saldo_actual, total_ganado, total_canjeado)
    VALUES (NEW.usuario_id, NEW.cantidad, GREATEST(NEW.cantidad, 0), GREATEST(-NEW.cantidad, 0))
    ON CONFLICT (usuario_id) DO UPDATE SET
        saldo_actual   = puntos_usuario.saldo_actual + NEW.cantidad,
        total_ganado   = puntos_usuario.total_ganado + GREATEST(NEW.cantidad, 0),
        total_canjeado = puntos_usuario.total_canjeado + GREATEST(-NEW.cantidad, 0),
        fecha_actualizacion = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_actualizar_puntos
    AFTER INSERT ON movimientos_puntos
    FOR EACH ROW EXECUTE FUNCTION actualizar_saldo_puntos();


-- =====================================================
-- FUNCIÓN: actualizar calificación promedio del recolector
-- =====================================================

CREATE OR REPLACE FUNCTION actualizar_calificacion_recolector()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE recolectores SET
        calificacion_promedio = (
            SELECT ROUND(AVG(estrellas)::numeric, 1)
            FROM calificaciones_recolector
            WHERE recolector_id = NEW.recolector_id
        ),
        total_calificaciones = (
            SELECT COUNT(*) FROM calificaciones_recolector
            WHERE recolector_id = NEW.recolector_id
        )
    WHERE id = NEW.recolector_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_calificacion_recolector
    AFTER INSERT OR UPDATE ON calificaciones_recolector
    FOR EACH ROW EXECUTE FUNCTION actualizar_calificacion_recolector();
