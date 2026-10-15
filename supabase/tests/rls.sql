-- =====================================================================
-- Pruebas de seguridad (RLS) y reglas de negocio
-- =====================================================================
-- Se hace pasar por cada usuario de demo (como lo hace la API de Supabase)
-- y verifica qué puede y qué no puede hacer. Todo corre en una sola
-- transacción que termina con un error a propósito: así ningún cambio
-- queda guardado y el mensaje del error trae el informe.
--
-- Uso: pegar el archivo completo en el SQL Editor de Supabase y ejecutarlo.

-- Cambia de usuario igual que PostgREST: rol de Postgres + claims del JWT.
create function pg_temp.como(usuario uuid) returns void
language plpgsql as $$
begin
  reset role;
  if usuario is null then
    perform set_config('request.jwt.claims', '{"role": "anon"}', true);
    set local role anon;
  else
    perform set_config('request.jwt.claims',
      json_build_object('sub', usuario, 'role', 'authenticated')::text, true);
    set local role authenticated;
  end if;
end;
$$;

create function pg_temp.r(paso boolean, descripcion text) returns text
language sql as $$
  select E'\n' || case when paso then 'OK     ' else 'FALLA  ' end || descripcion;
$$;

do $pruebas$
declare
  sup uuid;
  tec uuid;
  sofia uuid;
  ot_propia bigint;
  ot_ajena bigint;
  ot_libre bigint;
  ot_cerrada bigint;
  ot_pendiente bigint;
  rep bigint;
  stock_antes integer;
  stock_despues integer;
  n integer;
  nueva public.ordenes_trabajo;
  informe text := '';
begin
  select id into sup from auth.users where email = 'supervisor.demo@example.com';
  select id into tec from auth.users where email = 'tecnico.demo@example.com';
  select id into sofia from auth.users where email = 'sofia.herrera@example.com';
  select id into ot_propia from public.ordenes_trabajo where asignado_a = tec and estado = 'en_curso' limit 1;
  select id into ot_ajena from public.ordenes_trabajo where asignado_a = sofia and estado = 'en_curso' limit 1;
  select id into ot_libre from public.ordenes_trabajo where asignado_a is null and estado = 'pendiente' limit 1;
  select id into ot_cerrada from public.ordenes_trabajo where asignado_a = tec and estado = 'cerrada' limit 1;
  select id into ot_pendiente from public.ordenes_trabajo where asignado_a = tec and estado = 'pendiente' limit 1;
  select id into rep from public.repuestos where codigo = 'JUN-5001';

  -- ---------------- Visitante sin sesión ----------------
  perform pg_temp.como(null);
  begin
    perform 1 from public.equipos;
    informe := informe || pg_temp.r(false, 'Sin sesión no se pueden leer los equipos');
  exception when others then
    informe := informe || pg_temp.r(sqlstate = '42501', 'Sin sesión no se pueden leer los equipos');
  end;

  begin
    perform 1 from public.reporte_ordenes_por_area;
    informe := informe || pg_temp.r(false, 'Sin sesión no se pueden leer los reportes');
  exception when others then
    informe := informe || pg_temp.r(sqlstate = '42501', 'Sin sesión no se pueden leer los reportes');
  end;

  -- ---------------- Técnico ----------------
  perform pg_temp.como(tec);

  select count(*) into n from public.equipos;
  informe := informe || pg_temp.r(n = 15, 'El técnico ve los 15 equipos');

  select count(*) into n from public.reporte_ordenes_por_area;
  informe := informe || pg_temp.r(n > 0, 'El técnico ve los reportes');

  begin
    insert into public.equipos (codigo, nombre, area, tipo) values ('XX-999', 'Equipo de prueba', 'Producción', 'Bomba');
    informe := informe || pg_temp.r(false, 'El técnico no puede dar de alta equipos');
  exception when others then
    informe := informe || pg_temp.r(sqlstate = '42501', 'El técnico no puede dar de alta equipos');
  end;

  update public.repuestos set stock_minimo = 0 where id = rep;
  get diagnostics n = row_count;
  informe := informe || pg_temp.r(n = 0, 'El técnico no puede editar repuestos');

  begin
    update public.perfiles set rol = 'supervisor' where id = tec;
    informe := informe || pg_temp.r(false, 'El técnico no puede ascenderse a supervisor');
  exception when others then
    informe := informe || pg_temp.r(sqlstate = '42501', 'El técnico no puede ascenderse a supervisor');
  end;

  begin
    insert into public.movimientos_stock (repuesto_id, tipo, cantidad) values (rep, 'ingreso', 50);
    informe := informe || pg_temp.r(false, 'El técnico no puede cargar ingresos de stock');
  exception when others then
    informe := informe || pg_temp.r(sqlstate = '42501', 'El técnico no puede cargar ingresos de stock');
  end;

  begin
    insert into public.movimientos_stock (repuesto_id, orden_id, tipo, cantidad) values (rep, ot_ajena, 'egreso', 1);
    informe := informe || pg_temp.r(false, 'El técnico no retira repuestos para órdenes ajenas');
  exception when others then
    informe := informe || pg_temp.r(sqlstate = '42501', 'El técnico no retira repuestos para órdenes ajenas');
  end;

  begin
    insert into public.movimientos_stock (repuesto_id, orden_id, tipo, cantidad) values (rep, ot_pendiente, 'egreso', 1);
    informe := informe || pg_temp.r(false, 'El técnico no retira repuestos para órdenes sin iniciar');
  exception when others then
    informe := informe || pg_temp.r(sqlstate = '42501', 'El técnico no retira repuestos para órdenes sin iniciar');
  end;

  select stock_actual into stock_antes from public.repuestos where id = rep;
  insert into public.movimientos_stock (repuesto_id, orden_id, tipo, cantidad) values (rep, ot_propia, 'egreso', 2);
  select stock_actual into stock_despues from public.repuestos where id = rep;
  informe := informe || pg_temp.r(stock_despues = stock_antes - 2,
    'El técnico retira repuestos para su orden en curso y el stock baja');

  begin
    insert into public.movimientos_stock (repuesto_id, orden_id, tipo, cantidad) values (rep, ot_propia, 'egreso', 999);
    informe := informe || pg_temp.r(false, 'No se puede retirar más stock del que hay');
  exception when others then
    informe := informe || pg_temp.r(sqlerrm like 'Stock insuficiente%', 'No se puede retirar más stock del que hay');
  end;

  update public.ordenes_trabajo set estado = 'cerrada', notas_cierre = 'x' where id = ot_ajena;
  get diagnostics n = row_count;
  informe := informe || pg_temp.r(n = 0, 'El técnico no puede tocar órdenes de otro técnico');

  begin
    update public.ordenes_trabajo set titulo = 'Otro título' where id = ot_propia;
    informe := informe || pg_temp.r(false, 'El técnico no puede cambiar el título de su orden');
  exception when others then
    informe := informe || pg_temp.r(sqlstate = '42501', 'El técnico no puede cambiar el título de su orden');
  end;

  begin
    update public.ordenes_trabajo set estado = 'cerrada' where id = ot_propia;
    informe := informe || pg_temp.r(false, 'Cerrar una orden exige notas de cierre');
  exception when others then
    informe := informe || pg_temp.r(sqlstate = '23514', 'Cerrar una orden exige notas de cierre');
  end;

  update public.ordenes_trabajo
  set estado = 'cerrada', notas_cierre = 'Trabajo terminado', horas_trabajadas = 3
  where id = ot_propia
  returning * into nueva;
  informe := informe || pg_temp.r(nueva.estado = 'cerrada' and nueva.cerrado_en is not null,
    'El técnico cierra su orden y la base registra la fecha de cierre');

  update public.ordenes_trabajo set estado = 'en_curso' where id = ot_cerrada;
  get diagnostics n = row_count;
  informe := informe || pg_temp.r(n = 0, 'El técnico no puede reabrir órdenes cerradas');

  update public.ordenes_trabajo set asignado_a = tec where id = ot_libre;
  get diagnostics n = row_count;
  informe := informe || pg_temp.r(n = 1, 'El técnico puede tomar una orden libre');

  begin
    update public.ordenes_trabajo set asignado_a = sofia where id = ot_libre;
    informe := informe || pg_temp.r(false, 'El técnico no puede reasignar órdenes');
  exception when others then
    informe := informe || pg_temp.r(sqlstate = '42501', 'El técnico no puede reasignar órdenes');
  end;

  insert into public.ordenes_trabajo (equipo_id, titulo, tipo, estado, asignado_a)
  select id, 'Falla reportada en la prueba', 'correctivo', 'cerrada', sofia from public.equipos limit 1
  returning * into nueva;
  informe := informe || pg_temp.r(nueva.estado = 'pendiente' and nueva.asignado_a is null and nueva.creado_por = tec,
    'Una falla reportada por el técnico nace pendiente y sin asignar');

  begin
    perform privado.cargar_demo();
    informe := informe || pg_temp.r(false, 'Los usuarios no pueden ejecutar la carga de datos');
  exception when others then
    informe := informe || pg_temp.r(sqlstate = '42501', 'Los usuarios no pueden ejecutar la carga de datos');
  end;

  -- ---------------- Supervisor ----------------
  perform pg_temp.como(sup);

  begin
    update public.repuestos set stock_actual = 500 where id = rep;
    informe := informe || pg_temp.r(false, 'Ni el supervisor cambia el stock sin un movimiento');
  exception when others then
    informe := informe || pg_temp.r(sqlstate = '42501', 'Ni el supervisor cambia el stock sin un movimiento');
  end;

  select stock_actual into stock_antes from public.repuestos where id = rep;
  insert into public.movimientos_stock (repuesto_id, tipo, cantidad, motivo) values (rep, 'ingreso', 10, 'Prueba');
  select stock_actual into stock_despues from public.repuestos where id = rep;
  informe := informe || pg_temp.r(stock_despues = stock_antes + 10, 'El supervisor carga un ingreso y el stock sube');

  update public.repuestos set stock_minimo = 12 where id = rep;
  get diagnostics n = row_count;
  informe := informe || pg_temp.r(n = 1, 'El supervisor edita el stock mínimo');

  begin
    update public.ordenes_trabajo set estado = 'cerrada', notas_cierre = 'x' where id = ot_pendiente;
    informe := informe || pg_temp.r(false, 'Una orden pendiente no puede cerrarse sin pasar por en curso');
  exception when others then
    informe := informe || pg_temp.r(sqlstate = '23514', 'Una orden pendiente no puede cerrarse sin pasar por en curso');
  end;

  begin
    update public.ordenes_trabajo set estado = 'en_curso', asignado_a = null where id = ot_pendiente;
    informe := informe || pg_temp.r(false, 'No se inicia una orden sin técnico asignado');
  exception when others then
    informe := informe || pg_temp.r(sqlstate = '23514', 'No se inicia una orden sin técnico asignado');
  end;

  update public.ordenes_trabajo set estado = 'en_curso' where id = ot_cerrada;
  get diagnostics n = row_count;
  informe := informe || pg_temp.r(n = 1, 'El supervisor puede reabrir una orden cerrada');

  insert into public.equipos (codigo, nombre, area, tipo) values ('XX-999', 'Equipo de prueba', 'Producción', 'Bomba');
  informe := informe || pg_temp.r(true, 'El supervisor da de alta equipos');

  begin
    delete from public.equipos where codigo = 'XX-999';
    informe := informe || pg_temp.r(false, 'Nadie puede borrar registros desde la API');
  exception when others then
    informe := informe || pg_temp.r(sqlstate = '42501', 'Nadie puede borrar registros desde la API');
  end;

  reset role;
  raise exception 'Resultado (% fallas, cambios descartados):%',
    (length(informe) - length(replace(informe, 'FALLA', ''))) / 5, informe;
end;
$pruebas$;
