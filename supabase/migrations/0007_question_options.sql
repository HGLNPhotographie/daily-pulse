-- Options de vote personnalisables par question (libellés, emojis, flèches…)
-- Les clés internes restent pour / neutre / contre pour les totaux et votes.

alter table public.questions
  add column if not exists options jsonb not null default '[
    {"key":"pour","label":"POUR"},
    {"key":"neutre","label":"NEUTRE"},
    {"key":"contre","label":"CONTRE"}
  ]'::jsonb;

comment on column public.questions.options is
  'Libellés affichés pour les 3 choix (ordre : pour, neutre, contre).';

alter table public.questions drop constraint if exists questions_options_shape;

alter table public.questions
  add constraint questions_options_shape check (
    jsonb_typeof(options) = 'array'
    and jsonb_array_length(options) = 3
    and (options->0->>'key') = 'pour'
    and (options->1->>'key') = 'neutre'
    and (options->2->>'key') = 'contre'
    and char_length(coalesce(options->0->>'label', '')) between 1 and 32
    and char_length(coalesce(options->1->>'label', '')) between 1 and 32
    and char_length(coalesce(options->2->>'label', '')) between 1 and 32
  );

-- Backfill les lignes existantes sans options valides
update public.questions
set options = '[
  {"key":"pour","label":"POUR"},
  {"key":"neutre","label":"NEUTRE"},
  {"key":"contre","label":"CONTRE"}
]'::jsonb
where options is null
   or jsonb_array_length(options) <> 3;
