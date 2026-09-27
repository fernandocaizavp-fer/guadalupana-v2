-- Rango de fechas de la tarea (inicio y fecha límite de entrega).
-- Nullable para no afectar tareas existentes.
ALTER TABLE "Tarea" ADD COLUMN     "fechaFin" TIMESTAMP(3),
ADD COLUMN     "fechaInicio" TIMESTAMP(3);
