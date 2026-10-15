-- =====================================================================
-- Datos de prueba de la demo (todos inventados) y reinicio diario
-- =====================================================================
-- privado.cargar_demo() carga los datos de ejemplo con fechas relativas a
-- hoy, así los reportes siempre muestran actividad reciente. Necesita los
-- usuarios de demo que crea supabase/seed.sql y espera las tablas vacías
-- (privado.reiniciar_demo() las vacía antes de llamarla).

create function privado.cargar_demo()
returns void
language plpgsql
set search_path = ''
as $$
declare
  sup uuid;
  tec1 uuid;
  tec2 uuid;
begin
  select id into sup from auth.users where email = 'supervisor.demo@example.com';
  select id into tec1 from auth.users where email = 'tecnico.demo@example.com';
  select id into tec2 from auth.users where email = 'sofia.herrera@example.com';

  if sup is null or tec1 is null or tec2 is null then
    raise notice 'Faltan los usuarios de demo: ejecutá supabase/seed.sql';
    return;
  end if;

  -- Equipos de la planta
  insert into public.equipos
    (codigo, nombre, area, tipo, fabricante, modelo, criticidad, estado, fecha_instalacion)
  values
    ('BC-101', 'Bomba centrífuga de alimentación', 'Producción', 'Bomba', 'KSB', 'Etanorm 50-200', 'A', 'operativo', '2018-03-12'),
    ('BC-102', 'Bomba centrífuga de recirculación', 'Producción', 'Bomba', 'Grundfos', 'NK 65-250', 'B', 'en_mantenimiento', '2019-07-01'),
    ('RE-201', 'Reactor de mezcla con agitador', 'Producción', 'Reactor', 'Metalúrgica Andina', 'RM-3000', 'A', 'operativo', '2016-11-20'),
    ('CT-202', 'Cinta transportadora de producto', 'Producción', 'Transportador', 'Interroll', 'CT-800', 'B', 'operativo', '2020-02-15'),
    ('CA-301', 'Compresor de aire a tornillo N.° 1', 'Sala de compresores', 'Compresor', 'Atlas Copco', 'GA 37', 'A', 'operativo', '2017-05-08'),
    ('CA-302', 'Compresor de aire a tornillo N.° 2', 'Sala de compresores', 'Compresor', 'Kaeser', 'ASD 40', 'A', 'fuera_de_servicio', '2021-09-30'),
    ('SE-303', 'Secador de aire refrigerativo', 'Sala de compresores', 'Secador', 'Atlas Copco', 'FD 120', 'B', 'operativo', '2017-05-08'),
    ('CV-401', 'Caldera humotubular 2 t/h', 'Calderas', 'Caldera', 'Calderas del Norte', 'CHN-2000', 'A', 'operativo', '2015-04-22'),
    ('BA-402', 'Bomba de alimentación de caldera', 'Calderas', 'Bomba', 'Grundfos', 'CR 10-8', 'A', 'operativo', '2015-04-22'),
    ('PA-501', 'Planta de ósmosis inversa', 'Tratamiento de agua', 'Tratamiento', 'Hidro Sistemas', 'OI-5000', 'B', 'operativo', '2019-01-10'),
    ('TK-502', 'Tanque de agua de proceso 50 m³', 'Tratamiento de agua', 'Tanque', null, null, 'C', 'operativo', '2014-08-05'),
    ('EN-601', 'Envasadora de bolsas de 25 kg', 'Envasado', 'Envasadora', 'Pack Industrial', 'EB-25', 'B', 'operativo', '2022-06-18'),
    ('AE-602', 'Autoelevador eléctrico', 'Envasado', 'Autoelevador', 'Toyota', '8FBE18', 'B', 'en_mantenimiento', '2020-10-02'),
    ('GE-701', 'Grupo electrógeno 250 kVA', 'Servicios generales', 'Generador', 'Cummins', 'C250 D5', 'A', 'operativo', '2016-02-28'),
    ('TR-702', 'Transformador 13,2/0,4 kV 630 kVA', 'Servicios generales', 'Eléctrico', 'Tadeo Czerweny', 'TC-630', 'A', 'operativo', '2014-08-05');

  -- Repuestos del pañol (el stock arranca en 0 y se carga con movimientos)
  insert into public.repuestos (codigo, descripcion, categoria, unidad, ubicacion, stock_minimo)
  values
    ('ROD-6205', 'Rodamiento rígido de bolas 6205-2RS', 'Rodamientos', 'unidad', 'Pañol A-01', 6),
    ('ROD-6308', 'Rodamiento rígido de bolas 6308-2Z', 'Rodamientos', 'unidad', 'Pañol A-01', 4),
    ('SM-0450', 'Sello mecánico 45 mm para bomba centrífuga', 'Sellos', 'unidad', 'Pañol A-02', 2),
    ('COR-0620', 'Correa en V B-62', 'Transmisión', 'unidad', 'Pañol A-03', 4),
    ('JUN-5001', 'Junta espirometálica 2" 150#', 'Juntas', 'unidad', 'Pañol A-04', 10),
    ('VAL-5002', 'Válvula esférica 1" de acero inoxidable', 'Válvulas', 'unidad', 'Pañol A-05', 2),
    ('TER-5003', 'Trampa de vapor termodinámica 1/2"', 'Válvulas', 'unidad', 'Pañol A-05', 2),
    ('FIL-1001', 'Filtro de aire para compresor GA 37', 'Filtros', 'unidad', 'Pañol B-01', 2),
    ('FIL-1002', 'Filtro de aceite para compresor', 'Filtros', 'unidad', 'Pañol B-01', 2),
    ('FIL-1003', 'Separador aire/aceite para compresor', 'Filtros', 'unidad', 'Pañol B-01', 1),
    ('ACE-2001', 'Aceite sintético para compresor', 'Lubricantes', 'litro', 'Pañol B-04', 20),
    ('GRA-2002', 'Grasa de litio EP2', 'Lubricantes', 'kg', 'Pañol B-04', 5),
    ('MEM-3001', 'Membrana de ósmosis inversa 8"', 'Tratamiento de agua', 'unidad', 'Pañol C-01', 2),
    ('CAR-3002', 'Cartucho filtrante 5 micrones', 'Tratamiento de agua', 'unidad', 'Pañol C-01', 10),
    ('CON-4001', 'Contactor tripolar 32 A bobina 220 V', 'Eléctricos', 'unidad', 'Pañol D-01', 3),
    ('REL-4002', 'Relé térmico 18-25 A', 'Eléctricos', 'unidad', 'Pañol D-01', 2),
    ('FUS-4003', 'Fusible NH 100 A', 'Eléctricos', 'unidad', 'Pañol D-02', 6),
    ('BAT-6001', 'Batería de tracción 48 V para autoelevador', 'Baterías', 'unidad', 'Pañol D-03', 1);

  -- Stock inicial y reposiciones
  insert into public.movimientos_stock (repuesto_id, tipo, cantidad, motivo, usuario_id, fecha)
  select r.id, 'ingreso', v.cantidad, v.motivo, sup, now() - v.dias * interval '1 day'
  from (values
    ('ROD-6205', 8, 90, 'Stock inicial'),
    ('ROD-6308', 6, 90, 'Stock inicial'),
    ('SM-0450', 3, 90, 'Stock inicial'),
    ('COR-0620', 10, 90, 'Stock inicial'),
    ('JUN-5001', 20, 90, 'Stock inicial'),
    ('VAL-5002', 5, 90, 'Stock inicial'),
    ('TER-5003', 5, 90, 'Stock inicial'),
    ('FIL-1001', 5, 90, 'Stock inicial'),
    ('FIL-1002', 4, 90, 'Stock inicial'),
    ('FIL-1003', 2, 90, 'Stock inicial'),
    ('ACE-2001', 60, 90, 'Stock inicial'),
    ('GRA-2002', 18, 90, 'Stock inicial'),
    ('MEM-3001', 3, 90, 'Stock inicial'),
    ('CAR-3002', 24, 90, 'Stock inicial'),
    ('CON-4001', 8, 90, 'Stock inicial'),
    ('REL-4002', 4, 90, 'Stock inicial'),
    ('FUS-4003', 12, 90, 'Stock inicial'),
    ('BAT-6001', 1, 90, 'Stock inicial'),
    ('ACE-2001', 20, 30, 'Compra OC-2318'),
    ('CAR-3002', 12, 20, 'Compra OC-2341')
  ) as v (codigo, cantidad, dias, motivo)
  join public.repuestos r on r.codigo = v.codigo
  order by v.dias desc;

  -- Órdenes de trabajo: cerradas, en curso y pendientes.
  -- tecnico: 1 = técnico demo (mecánico), 2 = técnica electricista.
  -- Los tiempos están en días hacia atrás desde hoy y la duración en horas.
  insert into public.ordenes_trabajo
    (equipo_id, titulo, descripcion, tipo, prioridad, estado, asignado_a, creado_por,
     fecha_programada, creado_en, iniciado_en, cerrado_en, horas_trabajadas, notas_cierre)
  select
    e.id, v.titulo, v.descripcion, v.tipo::public.tipo_orden, v.prioridad::public.prioridad_orden,
    v.estado::public.estado_orden,
    case v.tecnico when 1 then tec1 when 2 then tec2 end,
    case when v.reportada_por_tecnico then tec1 else sup end,
    current_date + v.programada_en,
    now() - v.creada_hace * interval '1 day',
    now() - v.iniciada_hace * interval '1 day',
    now() - v.iniciada_hace * interval '1 day' + v.duracion_h * interval '1 hour',
    v.horas, v.notas
  from (values
    ('BC-101', 'Cambio de rodamientos lado acople', 'Vibración alta en el lado acople (7,8 mm/s).', 'correctivo', 'alta', 'cerrada', 1, false, null::integer, 80::float8, 80::float8, 6::float8, 5.0::numeric, 'Se reemplazaron los rodamientos 6205 y 6308. Vibración final 2,1 mm/s.'),
    ('CA-301', 'Service de 2000 horas', 'Cambio de filtros y aceite según plan del fabricante.', 'preventivo', 'media', 'cerrada', 1, false, null, 70, 69, 4, 3.5, 'Cambio de filtro de aire, filtro de aceite y 18 L de aceite. Sin pérdidas.'),
    ('GE-701', 'Prueba mensual con carga', 'Arranque y prueba de 30 minutos con carga.', 'preventivo', 'baja', 'cerrada', 2, false, null, 62, 62, 2, 1.5, 'Prueba realizada sin novedades.'),
    ('PA-501', 'Reemplazo de cartuchos del prefiltro', 'Presión diferencial del prefiltro en 1,2 bar.', 'preventivo', 'media', 'cerrada', 2, false, null, 58, 57, 3, 2.0, 'Cambio de 6 cartuchos. Presión diferencial normalizada.'),
    ('EN-601', 'Falla en el sensor de peso', 'Las bolsas salen con peso irregular.', 'correctivo', 'alta', 'cerrada', 2, true, null, 50, 50, 9, 6.0, 'Se recalibró la celda de carga y se reemplazó el contactor del motor de dosificación.'),
    ('BC-102', 'Pérdida por sello mecánico', 'Goteo constante en el sello del lado bomba.', 'correctivo', 'alta', 'cerrada', 1, true, null, 45, 44, 20, 7.5, 'Sello mecánico y juntas reemplazados. Prueba hidráulica correcta.'),
    ('CV-401', 'Inspección de trampas de vapor', 'Recorrido trimestral de trampas de vapor.', 'preventivo', 'media', 'cerrada', 1, false, null, 40, 39, 5, 4.0, 'Se cambiaron 2 trampas que dejaban pasar vapor vivo.'),
    ('CT-202', 'Cambio de correas de transmisión', 'Correas cristalizadas y patinando en el arranque.', 'correctivo', 'media', 'cerrada', 1, true, null, 33, 32, 3, 2.5, 'Juego de 3 correas B-62 reemplazado y poleas alineadas.'),
    ('TR-702', 'Termografía del tablero general', 'Termografía semestral de conexiones.', 'preventivo', 'media', 'cerrada', 2, false, null, 28, 27, 4, 3.0, 'Punto caliente en fusibles de fase R: se reemplazaron 3 fusibles NH.'),
    ('CA-302', 'Engrase de rodamientos del motor', 'Lubricación según plan.', 'preventivo', 'baja', 'cerrada', 1, false, null, 21, 20, 2, 1.5, 'Engrase realizado con 1 kg de grasa EP2.'),
    ('BA-402', 'Ruido en la bomba de alimentación', 'Ruido metálico y temperatura alta en el motor.', 'correctivo', 'critica', 'cerrada', 1, true, null, 15, 15, 5, 4.5, 'Rodamientos del motor dañados; se reemplazaron los dos.'),
    ('RE-201', 'Revisión del agitador y reductor', 'Inspección semestral del conjunto de agitación.', 'preventivo', 'media', 'cerrada', 1, false, null, 10, 9, 6, 5.0, 'Ajuste de bulones y engrase del soporte del agitador.'),
    ('GE-701', 'Prueba mensual con carga', 'Arranque y prueba de 30 minutos con carga.', 'preventivo', 'baja', 'cerrada', 2, false, null, 6, 5, 2, 1.5, 'Sin novedades. Combustible al 85 %.'),
    ('PA-501', 'Baja producción de permeado', 'El caudal de permeado bajó un 30 %.', 'correctivo', 'alta', 'cerrada', 2, false, null, 4, 4, 26, 8.0, 'Se reemplazaron 2 membranas dañadas. Caudal recuperado.'),
    ('BC-102', 'Alineación láser bomba-motor', 'Alineación posterior al cambio de sello.', 'preventivo', 'media', 'en_curso', 1, false, null, 3, 1, null, null, null),
    ('CA-302', 'El compresor no arranca', 'Disparo de protección térmica al arrancar.', 'correctivo', 'critica', 'en_curso', 2, false, null, 2, 2, null, null, null),
    ('AE-602', 'La batería no retiene la carga', 'Autonomía menor a 2 horas.', 'correctivo', 'alta', 'en_curso', 2, true, null, 3, 2, null, null, null),
    ('CV-401', 'Limpieza de tubos de la caldera', 'Limpieza anual de tubos de humo.', 'preventivo', 'media', 'en_curso', 1, false, null, 1, 0.2, null, null, null),
    ('SE-303', 'Cambio de filtros coalescentes', 'Reemplazo anual de filtros del secador.', 'preventivo', 'media', 'pendiente', 1, false, 5, 2, null, null, null, null),
    ('TK-502', 'Inspección interna y limpieza del tanque', 'Vaciado, limpieza e inspección visual.', 'preventivo', 'baja', 'pendiente', null, false, 20, 2, null, null, null, null),
    ('EN-601', 'Ajuste de mordazas de sellado', 'Algunas bolsas salen mal selladas.', 'correctivo', 'media', 'pendiente', null, true, null, 1, null, null, null, null),
    ('CA-301', 'Service de 4000 horas', 'Cambio de filtros, separador y aceite.', 'preventivo', 'alta', 'pendiente', 1, false, 12, 1, null, null, null, null),
    ('TR-702', 'Medición de puesta a tierra', 'Medición anual de la malla de puesta a tierra.', 'preventivo', 'media', 'pendiente', 2, false, 8, 1, null, null, null, null),
    ('CT-202', 'Ruido en rodillo de retorno', 'Rodillo de retorno trabado cerca del cabezal.', 'correctivo', 'alta', 'pendiente', null, true, null, 0.5, null, null, null, null),
    ('BC-101', 'Análisis de vibraciones trimestral', 'Medición en 4 puntos de bomba y motor.', 'preventivo', 'baja', 'pendiente', 1, false, 15, 0.3, null, null, null, null)
  ) as v (equipo, titulo, descripcion, tipo, prioridad, estado, tecnico, reportada_por_tecnico,
          programada_en, creada_hace, iniciada_hace, duracion_h, horas, notas)
  join public.equipos e on e.codigo = v.equipo
  order by v.creada_hace desc;

  -- Repuestos usados en las órdenes (se descuentan del stock)
  insert into public.movimientos_stock (repuesto_id, orden_id, tipo, cantidad, motivo, usuario_id, fecha)
  select r.id, o.id, 'egreso', v.cantidad, 'Consumo en orden de trabajo', o.asignado_a,
         o.iniciado_en + interval '1 hour'
  from (values
    ('BC-101', 'Cambio de rodamientos lado acople', 'ROD-6205', 2),
    ('BC-101', 'Cambio de rodamientos lado acople', 'ROD-6308', 1),
    ('CA-301', 'Service de 2000 horas', 'FIL-1001', 1),
    ('CA-301', 'Service de 2000 horas', 'FIL-1002', 1),
    ('CA-301', 'Service de 2000 horas', 'ACE-2001', 18),
    ('PA-501', 'Reemplazo de cartuchos del prefiltro', 'CAR-3002', 6),
    ('EN-601', 'Falla en el sensor de peso', 'CON-4001', 1),
    ('BC-102', 'Pérdida por sello mecánico', 'SM-0450', 1),
    ('BC-102', 'Pérdida por sello mecánico', 'JUN-5001', 2),
    ('CV-401', 'Inspección de trampas de vapor', 'TER-5003', 2),
    ('CT-202', 'Cambio de correas de transmisión', 'COR-0620', 3),
    ('TR-702', 'Termografía del tablero general', 'FUS-4003', 3),
    ('CA-302', 'Engrase de rodamientos del motor', 'GRA-2002', 1),
    ('BA-402', 'Ruido en la bomba de alimentación', 'ROD-6205', 2),
    ('RE-201', 'Revisión del agitador y reductor', 'GRA-2002', 2),
    ('PA-501', 'Baja producción de permeado', 'MEM-3001', 2),
    ('CA-302', 'El compresor no arranca', 'REL-4002', 1),
    ('CA-302', 'El compresor no arranca', 'CON-4001', 2),
    ('AE-602', 'La batería no retiene la carga', 'BAT-6001', 1)
  ) as v (equipo, titulo, repuesto, cantidad)
  join public.equipos e on e.codigo = v.equipo
  join public.ordenes_trabajo o on o.equipo_id = e.id and o.titulo = v.titulo
  join public.repuestos r on r.codigo = v.repuesto
  order by o.iniciado_en;
end;
$$;

revoke execute on function privado.cargar_demo() from public;
