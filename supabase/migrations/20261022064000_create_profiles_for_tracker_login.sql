-- One row per person who can sign in to the Meeting Action Tracker, linked to Supabase Auth.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9][a-z0-9._-]{1,31}$'),
  display_name text not null check (length(trim(display_name)) between 1 and 60),
  role text not null default 'member' check (role in ('admin', 'member')),
  must_change_password boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);
comment on table public.profiles is 'Meeting Action Tracker accounts. Passwords live in auth.users; changes go through the manage-users edge function.';

alter table public.profiles enable row level security;

create or replace function public.is_tracker_user()
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.profiles where id = auth.uid()) $$;

create or replace function public.is_tracker_admin()
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') $$;

create policy "tracker users read profiles" on public.profiles
  for select to authenticated using (public.is_tracker_user());

create or replace function public.mark_password_changed()
returns void language sql security definer set search_path = ''
as $$ update public.profiles set must_change_password = false where id = auth.uid() $$;

revoke all on function public.is_tracker_user() from public, anon;
revoke all on function public.is_tracker_admin() from public, anon;
revoke all on function public.mark_password_changed() from public, anon;
grant execute on function public.is_tracker_user() to authenticated;
grant execute on function public.is_tracker_admin() to authenticated;
grant execute on function public.mark_password_changed() to authenticated;

revoke all on table public.profiles from anon;
grant select on table public.profiles to authenticated;
