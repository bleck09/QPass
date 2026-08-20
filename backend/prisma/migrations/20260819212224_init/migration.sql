-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('Admin', 'Cliente', 'Recargador', 'Supervisor', 'Devolucion', 'UsuarioNormal', 'UsuarioNegocio', 'Ayudante');

-- CreateEnum
CREATE TYPE "EstadoIngreso" AS ENUM ('pendiente', 'ingresado', 'salio');

-- CreateEnum
CREATE TYPE "EstadoSolicitud" AS ENUM ('pendiente', 'confirmado');

-- CreateEnum
CREATE TYPE "EstadoCaso" AS ENUM ('pendiente', 'resuelto');

-- CreateEnum
CREATE TYPE "TipoTransaccion" AS ENUM ('recarga', 'consumo', 'devolucion', 'ajuste');

-- CreateEnum
CREATE TYPE "CampoReportado" AS ENUM ('nombre', 'correo', 'celular');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellidoPaterno" TEXT,
    "apellidoMaterno" TEXT,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "rol" "Rol" NOT NULL,
    "ci" TEXT,
    "celular" TEXT,
    "fechaNacimiento" TIMESTAMP(3),
    "ciudad" TEXT,
    "biografia" TEXT,
    "foto" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eventos" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "lugar" TEXT NOT NULL,
    "fecha" TEXT NOT NULL,
    "fechaISO" TIMESTAMP(3),
    "hora" TEXT,
    "imagen" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eventos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asignaciones_eventos" (
    "id" TEXT NOT NULL,
    "eventoId" TEXT NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "rol" "Rol" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asignaciones_eventos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categorias_ticket" (
    "id" TEXT NOT NULL,
    "eventoId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "cantidad" INTEGER NOT NULL,
    "precio" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categorias_ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compras" (
    "id" TEXT NOT NULL,
    "eventoId" TEXT NOT NULL,
    "compradorId" INTEGER NOT NULL,
    "montoTotal" DECIMAL(10,2) NOT NULL,
    "estado" "EstadoSolicitud" NOT NULL DEFAULT 'pendiente',
    "comprobanteUrl" TEXT,
    "comprobanteNombreArchivo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "compras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entradas" (
    "id" TEXT NOT NULL,
    "eventoId" TEXT NOT NULL,
    "compraId" TEXT,
    "categoriaTicketId" TEXT,
    "usuarioId" INTEGER,
    "isTitular" BOOLEAN NOT NULL DEFAULT false,
    "nombre" TEXT NOT NULL,
    "correo" TEXT NOT NULL,
    "celular" TEXT,
    "documento" TEXT,
    "foto" TEXT,
    "passwordTemporal" TEXT,
    "estadoIngreso" "EstadoIngreso" NOT NULL DEFAULT 'pendiente',
    "horaIngreso" TEXT,
    "horaSalida" TEXT,
    "fotoIngreso" TEXT,
    "saldo" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "entradas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "codigos_qr" (
    "id" TEXT NOT NULL,
    "eventoId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "codigo" TEXT NOT NULL,
    "generadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "entradaId" TEXT,

    CONSTRAINT "codigos_qr_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transacciones" (
    "id" TEXT NOT NULL,
    "tipo" "TipoTransaccion" NOT NULL,
    "monto" DECIMAL(10,2) NOT NULL,
    "saldoResultante" DECIMAL(10,2) NOT NULL,
    "entradaId" TEXT,
    "negocioUsuarioId" INTEGER,
    "operadorId" INTEGER NOT NULL,
    "fotoCarnetUrl" TEXT,
    "nota" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transacciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incidencias_recarga" (
    "id" TEXT NOT NULL,
    "entradaId" TEXT NOT NULL,
    "montoEntregado" DECIMAL(10,2) NOT NULL,
    "montoSolicitado" DECIMAL(10,2),
    "nota" TEXT NOT NULL,
    "recargadorId" INTEGER NOT NULL,
    "estado" "EstadoCaso" NOT NULL DEFAULT 'pendiente',
    "ajusteAplicado" DECIMAL(10,2),
    "resueltoPorId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resueltoEn" TIMESTAMP(3),

    CONSTRAINT "incidencias_recarga_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reportes_entrada" (
    "id" TEXT NOT NULL,
    "compraId" TEXT NOT NULL,
    "entradaId" TEXT NOT NULL,
    "campo" "CampoReportado" NOT NULL,
    "descripcion" TEXT NOT NULL,
    "estado" "EstadoCaso" NOT NULL DEFAULT 'pendiente',
    "valorCorregido" TEXT,
    "resueltoPorId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resueltoEn" TIMESTAMP(3),

    CONSTRAINT "reportes_entrada_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "puestos" (
    "id" TEXT NOT NULL,
    "eventoId" TEXT NOT NULL,
    "negocioId" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "logo" TEXT,
    "categoria" TEXT,
    "x" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "y" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ancho" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "alto" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "estadoActivo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "puestos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "productos" (
    "id" TEXT NOT NULL,
    "puestoId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "precio" DECIMAL(10,2) NOT NULL,
    "imagen" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "productos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "puesto_ayudantes" (
    "id" TEXT NOT NULL,
    "puestoId" TEXT NOT NULL,
    "ayudanteId" INTEGER NOT NULL,
    "turno" TEXT NOT NULL DEFAULT 'Día',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "puesto_ayudantes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ventas" (
    "id" TEXT NOT NULL,
    "puestoId" TEXT NOT NULL,
    "ayudanteId" INTEGER NOT NULL,
    "entradaId" TEXT NOT NULL,
    "montoTotal" DECIMAL(10,2) NOT NULL,
    "transaccionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ventas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "venta_items" (
    "id" TEXT NOT NULL,
    "ventaId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "nombreProducto" TEXT NOT NULL,
    "precioUnitario" DECIMAL(10,2) NOT NULL,
    "cantidad" INTEGER NOT NULL,

    CONSTRAINT "venta_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "landing_config" (
    "eventoId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "informacion" TEXT NOT NULL,
    "imagen" TEXT,
    "colorPrimario" TEXT NOT NULL,
    "colorBoton" TEXT NOT NULL,
    "colorFondo" TEXT NOT NULL,
    "colorTextoTitulo" TEXT NOT NULL,
    "colorTextoP" TEXT NOT NULL,
    "actividades" JSONB NOT NULL,
    "cronograma" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "landing_config_pkey" PRIMARY KEY ("eventoId")
);

-- CreateTable
CREATE TABLE "propuestas_landing" (
    "eventoId" TEXT NOT NULL,
    "nombreEvento" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "colorPrimario" TEXT NOT NULL,
    "colorFondo" TEXT NOT NULL,
    "colorTextoTitulo" TEXT NOT NULL,
    "colorTextoP" TEXT NOT NULL,
    "imagenPortada" TEXT,
    "mapaLugar" TEXT,
    "actividades" JSONB NOT NULL,
    "cronograma" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "propuestas_landing_pkey" PRIMARY KEY ("eventoId")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_ci_key" ON "usuarios"("ci");

-- CreateIndex
CREATE UNIQUE INDEX "asignaciones_eventos_eventoId_usuarioId_key" ON "asignaciones_eventos"("eventoId", "usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "codigos_qr_codigo_key" ON "codigos_qr"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "codigos_qr_entradaId_key" ON "codigos_qr"("entradaId");

-- CreateIndex
CREATE UNIQUE INDEX "codigos_qr_eventoId_numero_key" ON "codigos_qr"("eventoId", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "puesto_ayudantes_puestoId_ayudanteId_key" ON "puesto_ayudantes"("puestoId", "ayudanteId");

-- CreateIndex
CREATE UNIQUE INDEX "ventas_transaccionId_key" ON "ventas"("transaccionId");

-- AddForeignKey
ALTER TABLE "asignaciones_eventos" ADD CONSTRAINT "asignaciones_eventos_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "eventos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asignaciones_eventos" ADD CONSTRAINT "asignaciones_eventos_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categorias_ticket" ADD CONSTRAINT "categorias_ticket_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "eventos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compras" ADD CONSTRAINT "compras_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "eventos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compras" ADD CONSTRAINT "compras_compradorId_fkey" FOREIGN KEY ("compradorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entradas" ADD CONSTRAINT "entradas_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "eventos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entradas" ADD CONSTRAINT "entradas_compraId_fkey" FOREIGN KEY ("compraId") REFERENCES "compras"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entradas" ADD CONSTRAINT "entradas_categoriaTicketId_fkey" FOREIGN KEY ("categoriaTicketId") REFERENCES "categorias_ticket"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entradas" ADD CONSTRAINT "entradas_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "codigos_qr" ADD CONSTRAINT "codigos_qr_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "eventos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "codigos_qr" ADD CONSTRAINT "codigos_qr_entradaId_fkey" FOREIGN KEY ("entradaId") REFERENCES "entradas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transacciones" ADD CONSTRAINT "transacciones_entradaId_fkey" FOREIGN KEY ("entradaId") REFERENCES "entradas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transacciones" ADD CONSTRAINT "transacciones_negocioUsuarioId_fkey" FOREIGN KEY ("negocioUsuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transacciones" ADD CONSTRAINT "transacciones_operadorId_fkey" FOREIGN KEY ("operadorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidencias_recarga" ADD CONSTRAINT "incidencias_recarga_entradaId_fkey" FOREIGN KEY ("entradaId") REFERENCES "entradas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidencias_recarga" ADD CONSTRAINT "incidencias_recarga_recargadorId_fkey" FOREIGN KEY ("recargadorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidencias_recarga" ADD CONSTRAINT "incidencias_recarga_resueltoPorId_fkey" FOREIGN KEY ("resueltoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reportes_entrada" ADD CONSTRAINT "reportes_entrada_entradaId_fkey" FOREIGN KEY ("entradaId") REFERENCES "entradas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reportes_entrada" ADD CONSTRAINT "reportes_entrada_resueltoPorId_fkey" FOREIGN KEY ("resueltoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "puestos" ADD CONSTRAINT "puestos_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "eventos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "puestos" ADD CONSTRAINT "puestos_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productos" ADD CONSTRAINT "productos_puestoId_fkey" FOREIGN KEY ("puestoId") REFERENCES "puestos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "puesto_ayudantes" ADD CONSTRAINT "puesto_ayudantes_puestoId_fkey" FOREIGN KEY ("puestoId") REFERENCES "puestos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "puesto_ayudantes" ADD CONSTRAINT "puesto_ayudantes_ayudanteId_fkey" FOREIGN KEY ("ayudanteId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_puestoId_fkey" FOREIGN KEY ("puestoId") REFERENCES "puestos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_ayudanteId_fkey" FOREIGN KEY ("ayudanteId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_entradaId_fkey" FOREIGN KEY ("entradaId") REFERENCES "entradas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venta_items" ADD CONSTRAINT "venta_items_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "ventas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venta_items" ADD CONSTRAINT "venta_items_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "landing_config" ADD CONSTRAINT "landing_config_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "eventos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "propuestas_landing" ADD CONSTRAINT "propuestas_landing_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "eventos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
