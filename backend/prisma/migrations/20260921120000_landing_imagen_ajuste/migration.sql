-- Encuadre de la imagen del encabezado de la página del evento (punto focal,
-- zoom, oscurecido y desenfoque). JSON opcional: null = sin ajustar.
ALTER TABLE "landing_config" ADD COLUMN "imagenAjuste" JSONB;
