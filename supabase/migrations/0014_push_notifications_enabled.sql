-- Préférence utilisateur : notifications push pour les nouvelles questions.

alter table public.users
  add column if not exists push_notifications_enabled boolean not null default false;

comment on column public.users.push_notifications_enabled is
  'Si true, l''utilisateur reçoit les Web Push lors d''une nouvelle question (abonnement actif requis).';
