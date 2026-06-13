-- ============================================================
-- FamFinance — Supabase Schema
-- Jalankan di: Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. Personal data per user
create table if not exists public.user_data (
  user_id      uuid primary key references auth.users on delete cascade,
  months       jsonb not null default '{}'::jsonb,
  categories   jsonb not null default '[]'::jsonb,
  transactions jsonb not null default '[]'::jsonb,
  updated_at   timestamptz not null default now()
);

-- 2. Families (satu baris per keluarga)
create table if not exists public.families (
  id         uuid primary key default gen_random_uuid(),
  name       text not null default 'Keluarga',
  created_at timestamptz not null default now()
);

-- 3. Family members (siapa saja anggota keluarga)
create table if not exists public.family_members (
  family_id  uuid not null references public.families on delete cascade,
  user_id    uuid not null references auth.users on delete cascade,
  primary key (family_id, user_id)
);

-- 4. Shared family data (diakses bersama semua anggota)
create table if not exists public.family_data (
  family_id    uuid primary key references public.families on delete cascade,
  months       jsonb not null default '{}'::jsonb,
  categories   jsonb not null default '[]'::jsonb,
  transactions jsonb not null default '[]'::jsonb,
  updated_at   timestamptz not null default now()
);

-- ── Auto-update updated_at ────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_data_updated_at on public.user_data;
create trigger user_data_updated_at
  before update on public.user_data
  for each row execute function public.set_updated_at();

drop trigger if exists family_data_updated_at on public.family_data;
create trigger family_data_updated_at
  before update on public.family_data
  for each row execute function public.set_updated_at();

-- ── Row Level Security ────────────────────────────────────────
alter table public.user_data      enable row level security;
alter table public.families       enable row level security;
alter table public.family_members enable row level security;
alter table public.family_data    enable row level security;

-- user_data: hanya bisa akses row sendiri
drop policy if exists "user_data_own" on public.user_data;
create policy "user_data_own" on public.user_data
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- families: hanya anggota yang bisa lihat
drop policy if exists "families_member_read" on public.families;
create policy "families_member_read" on public.families
  for select using (
    exists (
      select 1 from public.family_members
      where family_id = families.id and user_id = auth.uid()
    )
  );

-- family_members: bisa lihat membership sendiri
drop policy if exists "family_members_self" on public.family_members;
create policy "family_members_self" on public.family_members
  for select using (user_id = auth.uid());

-- family_data: semua anggota bisa baca & tulis
drop policy if exists "family_data_member" on public.family_data;
create policy "family_data_member" on public.family_data
  for all using (
    exists (
      select 1 from public.family_members
      where family_id = family_data.family_id and user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.family_members
      where family_id = family_data.family_id and user_id = auth.uid()
    )
  );

-- ============================================================
-- SETELAH kedua user register, jalankan ini untuk setup family:
-- (Ganti email sesuai akun yang sudah dibuat)
-- ============================================================

-- Buat family
-- insert into public.families (name) values ('Keluarga Kecil') returning id;
-- Hasilnya: <family_id>

-- Tambah Emir sebagai anggota
-- insert into public.family_members (family_id, user_id)
-- select '<family_id>', id from auth.users where email = 'emir.firdaus@transjakarta.co.id';

-- Tambah istri sebagai anggota
-- insert into public.family_members (family_id, user_id)
-- select '<family_id>', id from auth.users where email = 'EMAIL_ISTRI@gmail.com';

-- Buat row awal family_data
-- insert into public.family_data (family_id) values ('<family_id>');
