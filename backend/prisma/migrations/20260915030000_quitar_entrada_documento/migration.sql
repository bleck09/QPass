-- Entrada.documento era una columna muerta: no estaba en ningun DTO ni en
-- ningun create/update, asi que jamas se escribio. Solo se leia, y por eso las
-- pantallas de Recargador, Devolucion, Ayudante, Supervisor y Admin mostraban
-- el documento vacio y sus buscadores "por documento" no encontraban nada.
-- El documento de identidad real es Usuario.ci, que ademas es obligatorio al
-- completar el perfil.
-- Verificado antes de dropear: 0 de 13 filas tenian dato.
ALTER TABLE "entradas" DROP COLUMN "documento";
