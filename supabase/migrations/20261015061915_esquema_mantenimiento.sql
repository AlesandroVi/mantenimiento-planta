-- =====================================================================
-- Sistema de control de mantenimiento e inventario de repuestos
-- Esquema, reglas de negocio y seguridad a nivel de fila (RLS)
-- =====================================================================
--
-- Roles de la aplicación (tabla perfiles):
--   supervisor: administra equipos y repuestos, carga ingresos de stock,
--               crea y asigna órdenes de trabajo y puede reabrirlas.
--   tecnico:    ve todo, reporta fallas (crea órdenes pendientes), toma
--               órdenes sin asignar, avanza solo las suyas y retira
--               repuestos para las órdenes que tiene en curso.
--
-- Nadie puede borrar registros desde la API: los equipos y repuestos se
-- dan de baja con "activo = false" y los movimientos de stock son un
-- historial que no se modifica.

-- Funciones auxiliares en un esquema que no expone la API de datos.
create schema if not exists privado;
revoke all on schema privado from public;
grant usage on schema privado to authenticated;

-- ---------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------
create type public.rol_usuario as enum ('supervisor', 'tecnico');
create type public.estado_equipo as enum ('operativo', 'en_mantenimiento', 'fuera_de_servicio');
create type public.estado_orden as enum ('pendiente', 'en_curso', 'cerrada');
create type public.tipo_orden as enum ('preventivo', 'correctivo');
create type public.prioridad_orden as enum ('baja', 'media', 'alta', 'critica');
create type public.tipo_movimiento as enum ('ingreso', 'egreso');

-- ---------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------
create table public.perfiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre text not null,
  puesto text,
  rol public.rol_usuario not null default 'tecnico',
  creado_en timestamptz not null default now()
);

create table public.equipos (
  id bigint generated always as identity primary key,
  codigo text not null unique check (codigo ~ '^[A-Z]{2,4}-[0-9]{2,4}$'),
  nombre text not null check (char_length(nombre) between 3 and 80),
  area text not null,
  tipo text not null,
  fabricante text,
  modelo text,
  criticidad char(1) not null default 'B' check (criticidad in ('A', 'B', 'C')),
  estado public.estado_equipo not null default 'operativo',
  fecha_instalacion date,
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);

create table public.repuestos (
  id bigint generated always as identity primary key,
  codigo text not null unique check (codigo ~ '^[A-Z]{2,4}-[0-9]{3,5}$'),
  descripcion text not null check (char_length(descripcion) between 3 and 120),
  categoria text not null,
  unidad text not null default 'unidad',
  ubicacion text,
  stock_actual integer not null default 0 check (stock_actual >= 0),
  stock_minimo integer not null default 0 check (stock_minimo >= 0),
  bajo_stock boolean generated always as (stock_actual <= stock_minimo) stored,
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);

create table public.ordenes_trabajo (
  id bigint generated always as identity primary key,
  equipo_id bigint not null references public.equipos (id),
  titulo text not null check (char_length(titulo) between 3 and 120),
  descripcion text,
  tipo public.tipo_orden not null,
  prioridad public.prioridad_orden not null default 'media',
  estado public.estado_orden not null default 'pendiente',
  asignado_a uuid references public.perfiles (id),
  creado_por uuid not null default auth.uid() references public.perfiles (id),
  fecha_programada date,
  creado_en timestamptz not null default now(),
  iniciado_en timestamptz,
  cerrado_en timestamptz,
  horas_trabajadas numeric(5, 1) check (horas_trabajadas >= 0),
  notas_cierre text,
  constraint cierre_completo check (
    estado <> 'cerrada'
    or (cerrado_en is not null and nullif(trim(notas_cierre), '') is not null)
  )
);

create table public.movimientos_stock (
  id bigint generated always as identity primary key,
  repuesto_id bigint not null references public.repuestos (id),
  orden_id bigint references public.ordenes_trabajo (id),
  tipo public.tipo_movimiento not null,
  cantidad integer not null check (cantidad > 0),
  motivo text,
  usuario_id uuid default auth.uid() references public.perfiles (id),
  fecha timestamptz not null default now()
);

-- Índices para las claves foráneas y los filtros más usados.
create index ordenes_equipo_idx on public.ordenes_trabajo (equipo_id);
create index ordenes_asignado_idx on public.ordenes_trabajo (asignado_a);
create index ordenes_creado_por_idx on public.ordenes_trabajo (creado_por);
create index ordenes_estado_idx on public.ordenes_trabajo (estado);
create index movimientos_repuesto_idx on public.movimientos_stock (repuesto_id, fecha desc);
create index movimientos_orden_idx on public.movimientos_stock (orden_id);
create index movimientos_usuario_idx on public.movimientos_stock (usuario_id);

-- ---------------------------------------------------------------------
-- Funciones auxiliares y reglas de negocio
-- ---------------------------------------------------------------------

-- security definer para consultar perfiles desde las políticas sin
-- depender de su RLS. Vive en "privado", así que no se expone como RPC.
create function privado.es_supervisor()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.perfiles
    where id = (select auth.uid()) and rol = 'supervisor'
  );
$$;

revoke execute on function privado.es_supervisor() from public, anon;
grant execute on function privado.es_supervisor() to authenticated;

-- Crea el perfil de cada usuario nuevo. El rol siempre arranca como
-- técnico: nunca se toma de los metadatos que el usuario puede editar.
create function privado.crear_perfil()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.perfiles (id, nombre, puesto)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'nombre', ''), split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'puesto'
  );
  return new;
end;
$$;

create trigger al_crear_usuario
  after insert on auth.users
  for each row execute function privado.crear_perfil();

-- Reglas de las órdenes de trabajo: qué puede cambiar cada rol y en qué
-- orden avanzan los estados. Las fechas de inicio y cierre las pone la base.
-- Cuando no hay usuario (carga de datos desde el servidor) no se aplican.
create function privado.validar_orden()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  usuario uuid := (select auth.uid());
  es_supervisor boolean := privado.es_supervisor();
begin
  if usuario is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.estado := 'pendiente';
    new.iniciado_en := null;
    new.cerrado_en := null;
    new.horas_trabajadas := null;
    new.notas_cierre := null;
    if not es_supervisor and new.asignado_a is distinct from usuario then
      new.asignado_a := null;
    end if;
    return new;
  end if;

  -- UPDATE
  if not es_supervisor then
    if (new.equipo_id, new.titulo, new.descripcion, new.tipo, new.prioridad,
        new.creado_por, new.fecha_programada, new.creado_en)
       is distinct from
       (old.equipo_id, old.titulo, old.descripcion, old.tipo, old.prioridad,
        old.creado_por, old.fecha_programada, old.creado_en) then
      raise exception 'Un técnico solo puede cambiar el estado, las horas y las notas de cierre'
        using errcode = '42501';
    end if;
    -- Un técnico solo puede tomar una orden libre, no reasignarla.
    if new.asignado_a is distinct from old.asignado_a
       and not (old.asignado_a is null and new.asignado_a = usuario) then
      raise exception 'Solo un supervisor puede reasignar órdenes' using errcode = '42501';
    end if;
  end if;

  if new.estado is distinct from old.estado then
    if old.estado = 'cerrada' and not es_supervisor then
      raise exception 'Solo un supervisor puede reabrir una orden cerrada' using errcode = '42501';
    end if;
    if old.estado = 'pendiente' and new.estado = 'cerrada' then
      raise exception 'La orden tiene que pasar por "en curso" antes de cerrarse' using errcode = '23514';
    end if;
    if new.estado = 'en_curso' and new.asignado_a is null then
      raise exception 'Asigná la orden a un técnico antes de iniciarla' using errcode = '23514';
    end if;

    if new.estado = 'en_curso' then
      new.iniciado_en := coalesce(old.iniciado_en, now());
      new.cerrado_en := null;
    elsif new.estado = 'cerrada' then
      new.cerrado_en := now();
    else
      new.iniciado_en := null;
      new.cerrado_en := null;
    end if;
  else
    new.iniciado_en := old.iniciado_en;
    new.cerrado_en := old.cerrado_en;
  end if;

  return new;
end;
$$;

create trigger validar_orden
  before insert or update on public.ordenes_trabajo
  for each row execute function privado.validar_orden();

-- Aplica cada movimiento al stock del repuesto. Es security definer porque
-- el técnico no tiene permiso para actualizar repuestos directamente; las
-- políticas de movimientos_stock ya decidieron si puede cargar el movimiento.
create function privado.aplicar_movimiento()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  disponible integer;
begin
  select stock_actual into disponible
  from public.repuestos
  where id = new.repuesto_id and activo
  for update;

  if not found then
    raise exception 'El repuesto no existe o está dado de baja' using errcode = '23503';
  end if;

  if new.tipo = 'egreso' and new.cantidad > disponible then
    raise exception 'Stock insuficiente: hay % y se pidieron %', disponible, new.cantidad
      using errcode = '23514';
  end if;

  update public.repuestos
  set stock_actual = stock_actual
    + case when new.tipo = 'ingreso' then new.cantidad else -new.cantidad end
  where id = new.repuesto_id;

  return new;
end;
$$;

create trigger aplicar_movimiento
  before insert on public.movimientos_stock
  for each row execute function privado.aplicar_movimiento();

-- El stock solo cambia a través de movimientos, así queda trazabilidad.
-- pg_trigger_depth() = 1 significa que el cambio no viene de aplicar_movimiento.
create function privado.proteger_stock()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.stock_actual := 0;
  elsif new.stock_actual is distinct from old.stock_actual and pg_trigger_depth() = 1 then
    raise exception 'El stock se modifica cargando un ingreso o un egreso' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger proteger_stock
  before insert or update on public.repuestos
  for each row execute function privado.proteger_stock();

-- ---------------------------------------------------------------------
-- Permisos de la API y RLS
-- ---------------------------------------------------------------------
-- Los visitantes sin sesión (anon) no acceden a nada. Los usuarios con
-- sesión solo tienen los privilegios que usa la app; RLS decide las filas.
revoke all on public.perfiles, public.equipos, public.repuestos,
  public.ordenes_trabajo, public.movimientos_stock from anon, authenticated;

grant select on public.perfiles to authenticated;
grant select, insert, update on public.equipos to authenticated;
grant select, insert, update on public.repuestos to authenticated;
grant select, insert, update on public.ordenes_trabajo to authenticated;
grant select, insert on public.movimientos_stock to authenticated;

alter table public.perfiles enable row level security;
alter table public.equipos enable row level security;
alter table public.repuestos enable row level security;
alter table public.ordenes_trabajo enable row level security;
alter table public.movimientos_stock enable row level security;

-- Perfiles: todo el personal ve quién es quién (para asignar órdenes).
-- Nadie cambia su propio rol: no hay políticas de insert ni update.
create policy "Personal ve los perfiles" on public.perfiles
  for select to authenticated
  using (true);

-- Equipos
create policy "Personal ve los equipos" on public.equipos
  for select to authenticated
  using (true);

create policy "Supervisor da de alta equipos" on public.equipos
  for insert to authenticated
  with check ((select privado.es_supervisor()));

create policy "Supervisor edita equipos" on public.equipos
  for update to authenticated
  using ((select privado.es_supervisor()))
  with check ((select privado.es_supervisor()));

-- Repuestos
create policy "Personal ve los repuestos" on public.repuestos
  for select to authenticated
  using (true);

create policy "Supervisor da de alta repuestos" on public.repuestos
  for insert to authenticated
  with check ((select privado.es_supervisor()));

create policy "Supervisor edita repuestos" on public.repuestos
  for update to authenticated
  using ((select privado.es_supervisor()))
  with check ((select privado.es_supervisor()));

-- Órdenes de trabajo
create policy "Personal ve las órdenes" on public.ordenes_trabajo
  for select to authenticated
  using (true);

create policy "Personal reporta fallas" on public.ordenes_trabajo
  for insert to authenticated
  with check (creado_por = (select auth.uid()));

create policy "Supervisor gestiona órdenes" on public.ordenes_trabajo
  for update to authenticated
  using ((select privado.es_supervisor()))
  with check ((select privado.es_supervisor()));

create policy "Técnico avanza sus órdenes o toma una libre" on public.ordenes_trabajo
  for update to authenticated
  using (
    estado <> 'cerrada'
    and (asignado_a = (select auth.uid()) or (asignado_a is null and estado = 'pendiente'))
  )
  with check (asignado_a = (select auth.uid()));

-- Movimientos de stock: los ingresos y ajustes los carga el supervisor; el
-- técnico solo retira repuestos para una orden suya que esté en curso.
create policy "Personal ve los movimientos" on public.movimientos_stock
  for select to authenticated
  using (true);

create policy "Supervisor registra movimientos" on public.movimientos_stock
  for insert to authenticated
  with check (
    usuario_id = (select auth.uid())
    and (select privado.es_supervisor())
  );

create policy "Técnico retira repuestos para su orden" on public.movimientos_stock
  for insert to authenticated
  with check (
    usuario_id = (select auth.uid())
    and tipo = 'egreso'
    and exists (
      select 1 from public.ordenes_trabajo o
      where o.id = orden_id
        and o.asignado_a = (select auth.uid())
        and o.estado = 'en_curso'
    )
  );

-- ---------------------------------------------------------------------
-- Vistas para el panel de reportes (respetan el RLS de quien consulta)
-- ---------------------------------------------------------------------
create view public.reporte_ordenes_por_area
with (security_invoker = true) as
select
  e.area,
  count(*) filter (where o.estado = 'pendiente')::integer as pendientes,
  count(*) filter (where o.estado = 'en_curso')::integer as en_curso,
  count(*) filter (
    where o.estado = 'cerrada' and o.cerrado_en >= now() - interval '30 days'
  )::integer as cerradas_30_dias
from public.ordenes_trabajo o
join public.equipos e on e.id = o.equipo_id
group by e.area;

create view public.reporte_tiempos_por_tipo
with (security_invoker = true) as
select
  o.tipo,
  count(*)::integer as cerradas,
  round(avg(extract(epoch from (o.cerrado_en - o.iniciado_en)) / 3600)::numeric, 1)
    as horas_promedio_resolucion,
  round(avg(o.horas_trabajadas), 1) as horas_hombre_promedio
from public.ordenes_trabajo o
where o.estado = 'cerrada' and o.cerrado_en >= now() - interval '90 days'
group by o.tipo;

create view public.reporte_consumo_repuestos
with (security_invoker = true) as
select
  r.id as repuesto_id,
  r.codigo,
  r.descripcion,
  r.unidad,
  sum(m.cantidad)::integer as cantidad_consumida
from public.movimientos_stock m
join public.repuestos r on r.id = m.repuesto_id
where m.tipo = 'egreso' and m.fecha >= now() - interval '90 days'
group by r.id, r.codigo, r.descripcion, r.unidad;

revoke all on public.reporte_ordenes_por_area, public.reporte_tiempos_por_tipo,
  public.reporte_consumo_repuestos from anon, authenticated;
grant select on public.reporte_ordenes_por_area, public.reporte_tiempos_por_tipo,
  public.reporte_consumo_repuestos to authenticated;
