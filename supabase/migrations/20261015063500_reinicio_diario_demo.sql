-- =====================================================================
-- Reinicio diario de la demo pública
-- =====================================================================
-- Vacía SOLO las tablas de este sistema y vuelve a cargar los datos de
-- prueba, para que la demo quede prolija aunque los visitantes la usen.

create function privado.reiniciar_demo()
returns void
language plpgsql
set search_path = ''
as $$
begin
  truncate public.movimientos_stock, public.ordenes_trabajo, public.repuestos, public.equipos
    restart identity;
  perform privado.cargar_demo();
end;
$$;

revoke execute on function privado.reiniciar_demo() from public;

-- Todos los días a las 3:00 de Argentina (6:00 UTC)
create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

select cron.schedule('reiniciar-demo-mantenimiento', '0 6 * * *', 'select privado.reiniciar_demo()');
