alter table public.tasks add column if not exists is_example boolean not null default false;
comment on column public.tasks.is_example is 'True for sample rows loaded by the Meeting Action Tracker; removable from its UI.';
