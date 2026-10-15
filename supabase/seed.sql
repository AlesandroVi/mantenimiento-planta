-- =====================================================================
-- Usuarios de demo y carga inicial de datos de prueba
-- =====================================================================
-- Las cuentas de demo son públicas a propósito (aparecen en la pantalla de
-- login) y usan dominios example.com, que no pertenecen a nadie.
-- Sofía Herrera no tiene contraseña conocida: solo existe para asignarle órdenes.

do $$
declare
  usuarios constant jsonb := '[
    {"email": "supervisor.demo@example.com", "nombre": "Laura Gómez", "puesto": "Jefa de mantenimiento", "rol": "supervisor", "clave": "PlantaDemo2026"},
    {"email": "tecnico.demo@example.com", "nombre": "Martín Ríos", "puesto": "Técnico mecánico", "rol": "tecnico", "clave": "PlantaDemo2026"},
    {"email": "sofia.herrera@example.com", "nombre": "Sofía Herrera", "puesto": "Técnica electricista", "rol": "tecnico", "clave": null}
  ]';
  u jsonb;
  nuevo_id uuid;
begin
  for u in select * from jsonb_array_elements(usuarios) loop
    if exists (select 1 from auth.users where email = u ->> 'email') then
      continue;
    end if;

    nuevo_id := gen_random_uuid();

    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change,
      email_change_token_current, phone_change, phone_change_token, reauthentication_token
    ) values (
      '00000000-0000-0000-0000-000000000000', nuevo_id, 'authenticated', 'authenticated',
      u ->> 'email',
      extensions.crypt(coalesce(u ->> 'clave', gen_random_uuid()::text), extensions.gen_salt('bf')),
      now(),
      '{"provider": "email", "providers": ["email"]}',
      jsonb_build_object('nombre', u ->> 'nombre', 'puesto', u ->> 'puesto'),
      now(), now(), '', '', '', '', '', '', '', ''
    );

    insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (
      nuevo_id::text, nuevo_id,
      jsonb_build_object('sub', nuevo_id::text, 'email', u ->> 'email', 'email_verified', true),
      'email', now(), now(), now()
    );

    -- El trigger al_crear_usuario ya creó el perfil como técnico.
    update public.perfiles set rol = (u ->> 'rol')::public.rol_usuario where id = nuevo_id;
  end loop;
end;
$$;

-- Datos de prueba (solo si las tablas están vacías)
select privado.cargar_demo() where not exists (select 1 from public.equipos);
