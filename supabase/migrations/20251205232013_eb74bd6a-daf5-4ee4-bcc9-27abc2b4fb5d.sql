INSERT INTO public.user_roles (user_id, role)
VALUES ('3000d380-c9fe-4e37-88ce-e94096da347e', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;