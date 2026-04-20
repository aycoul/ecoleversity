#!/usr/bin/env node
// One-shot seeder for landing-page inventory.
// Creates 4 AI stand-in teachers + group classes + courses so the home
// page's DB-driven featured section has diverse, clickable content.
// Idempotent: re-running upserts existing teachers by email.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT = 'vhivhqfhpwhrlinjjfwa';
const SUPABASE_URL = 'https://' + PROJECT + '.supabase.co';

function fetchServiceKey() {
  const envPath = resolve(__dirname, '..', '.env.local');
  const env = readFileSync(envPath, 'utf8');
  const match = env.match(/^SUPABASE_SERVICE_ROLE_KEY=(.+)$/m);
  if (!match) throw new Error('SUPABASE_SERVICE_ROLE_KEY not in .env.local');
  return match[1].trim();
}

async function lookupUserIdByEmail(serviceKey, email) {
  // /auth/v1/admin/users ?email= is ignored, and PostgREST blocks auth
  // schema. Paginate the admin list and match by email in JS. Fine for
  // seeds (only hundreds of users) — do not use at runtime.
  const target = email.toLowerCase();
  for (let page = 1; page < 50; page++) {
    const res = await fetch(
      SUPABASE_URL + '/auth/v1/admin/users?page=' + page + '&per_page=100',
      { headers: { apikey: serviceKey, Authorization: 'Bearer ' + serviceKey } },
    );
    if (!res.ok) throw new Error('lookupUserIdByEmail page ' + page + ': ' + res.status);
    const body = await res.json();
    const users = body.users || [];
    if (users.length === 0) return null;
    const hit = users.find((u) => (u.email || '').toLowerCase() === target);
    if (hit) return hit.id;
    if (users.length < 100) return null;
  }
  return null;
}

async function createOrGetUser(serviceKey, email, name) {
  const createRes = await fetch(SUPABASE_URL + '/auth/v1/admin/users', {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: 'Bearer ' + serviceKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      password: crypto.randomUUID() + 'Aa1!',
      email_confirm: true,
      user_metadata: { display_name: name, role: 'teacher', language: 'fr', ai_seed: true },
    }),
  });
  const body = await createRes.json();
  if (createRes.ok) return body.id;
  // Already-exists response varies by version; fall back to email lookup.
  const existingId = await lookupUserIdByEmail(serviceKey, email);
  if (existingId) return existingId;
  throw new Error('createOrGetUser failed: ' + JSON.stringify(body));
}

async function sbRest(serviceKey, path, body, method, prefer) {
  method = method || 'POST';
  prefer = prefer || 'resolution=merge-duplicates,return=representation';
  const res = await fetch(SUPABASE_URL + '/rest/v1' + path, {
    method,
    headers: {
      apikey: serviceKey,
      Authorization: 'Bearer ' + serviceKey,
      'Content-Type': 'application/json',
      Prefer: prefer,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(method + ' ' + path + ' -> ' + res.status + ': ' + text);
  return text ? JSON.parse(text) : null;
}

const AI_TEACHERS = [
  {
    email: 'aya.konan@ai.ecoleversity.com',
    name: 'Aya Konan',
    city: 'Abidjan',
    subjects: ['mathematiques', 'maths_financieres'],
    bio: "Professeure de mathématiques passionnée, 12 ans d'expérience. Spécialisée en préparation BEPC et BAC. Ma méthode : comprendre pour réussir.",
    rating: 4.9,
    ratingCount: 87,
  },
  {
    email: 'paul.nguessan@ai.ecoleversity.com',
    name: "Paul N'Guessan",
    city: 'Yamoussoukro',
    subjects: ['francais', 'philosophie'],
    bio: "Enseignant de français et philosophie, agrégé. Je rends la littérature vivante et l'analyse accessible. Préparation BAC ma spécialité.",
    rating: 4.8,
    ratingCount: 54,
  },
  {
    email: 'fatou.toure@ai.ecoleversity.com',
    name: 'Fatou Touré',
    city: 'Bouaké',
    subjects: ['anglais'],
    bio: "English teacher with 8 years of experience. Focus on conversation and exam prep (BEPC, BAC, TOEIC). Patient with beginners, rigorous with advanced students.",
    rating: 5.0,
    ratingCount: 41,
  },
  {
    email: 'ibrahim.diallo@ai.ecoleversity.com',
    name: 'Ibrahim Diallo',
    city: 'San Pédro',
    subjects: ['physique_chimie', 'svt', 'sciences'],
    bio: "Docteur en physique-chimie. J'enseigne les sciences en rendant l'abstrait concret : expériences, schémas, intuitions. BAC scientifique ma force.",
    rating: 4.7,
    ratingCount: 62,
  },
];

const GRADE_LEVELS = ['6eme', '5eme', '4eme', '3eme', '2nde', '1ere', 'Terminale'];

const SUBJECT_LABEL = {
  mathematiques: 'Mathématiques',
  francais: 'Français',
  anglais: 'Anglais',
  physique_chimie: 'Physique-Chimie',
  svt: 'SVT',
  sciences: 'Sciences',
};

function futureDate(hoursFromNow) {
  return new Date(Date.now() + hoursFromNow * 3600 * 1000).toISOString();
}

async function main() {
  const serviceKey = fetchServiceKey();
  console.log('✓ service_role loaded from .env.local');

  for (const t of AI_TEACHERS) {
    console.log('\n--- ' + t.name + ' ---');
    const id = await createOrGetUser(serviceKey, t.email, t.name);
    console.log('  user_id:', id);

    await sbRest(serviceKey, '/profiles?on_conflict=id', [
      {
        id,
        role: 'teacher',
        display_name: t.name,
        bio: t.bio,
        city: t.city,
        country: 'CI',
        language_preference: 'fr',
        phone_verified: true,
      },
    ]);
    console.log('  ✓ profile');

    await sbRest(serviceKey, '/teacher_profiles?on_conflict=id', [
      {
        id,
        subjects: t.subjects,
        grade_levels: GRADE_LEVELS,
        verification_status: 'fully_verified',
        commission_rate: 0.2,
        rating_avg: t.rating,
        rating_count: t.ratingCount,
        follower_count: Math.floor(t.ratingCount * 0.4),
      },
    ]);
    console.log('  ✓ teacher_profile');

    // Clear previously seeded classes + courses for this teacher to keep
    // the script idempotent without accumulating duplicates.
    await sbRest(serviceKey, '/live_classes?teacher_id=eq.' + id, null, 'DELETE', 'return=minimal');
    await sbRest(serviceKey, '/courses?teacher_id=eq.' + id, null, 'DELETE', 'return=minimal');
    console.log('  ✓ cleared previous classes + courses');

    const classOffsets = [
      {
        hours: 24 + Math.floor(Math.random() * 24),
        grade: '3eme',
        titleSuffix: 'Préparation BEPC (hebdomadaire)',
        format: 'group',
        maxStudents: 12,
        price: 2500,
        recurrence: 'weekly',
      },
      {
        hours: 24 * 3 + Math.floor(Math.random() * 24),
        grade: 'Terminale',
        titleSuffix: 'Cours particulier BAC',
        format: 'one_on_one',
        maxStudents: 1,
        price: 5000,
        recurrence: 'one_time',
      },
      {
        hours: 24 * 5 + Math.floor(Math.random() * 48),
        grade: 'Terminale',
        titleSuffix: 'Stage BAC intensif',
        format: 'group',
        maxStudents: 12,
        price: 2500,
        recurrence: 'one_time',
      },
    ];
    for (const o of classOffsets) {
      const subject = t.subjects[0];
      const label = SUBJECT_LABEL[subject] || subject;
      await sbRest(
        serviceKey,
        '/live_classes',
        [
          {
            teacher_id: id,
            title: label + ' — ' + o.titleSuffix,
            description: 'Cours en direct animé par ' + t.name + '. ' + t.bio.slice(0, 120),
            subject,
            grade_level: o.grade,
            format: o.format,
            max_students: o.maxStudents,
            price_xof: o.price,
            scheduled_at: futureDate(o.hours),
            duration_minutes: 60,
            recurrence: o.recurrence,
            status: 'scheduled',
          },
        ],
        'POST',
        'return=minimal',
      );
      console.log('  ✓ class ' + label + ' / ' + o.titleSuffix + ' (' + o.format + ', ' + o.recurrence + ')');
    }

    const courseSubject = t.subjects[0];
    const courseLabel = SUBJECT_LABEL[courseSubject] || courseSubject;
    await sbRest(
      serviceKey,
      '/courses',
      [
        {
          teacher_id: id,
          title: courseLabel + ' — Pack complet niveau Terminale',
          description:
            'Un parcours structuré en vidéos, animé par ' +
            t.name +
            '. Exercices corrigés, fiches de révision, suivi de progression.',
          subject: courseSubject,
          grade_level: 'Terminale',
          language: 'fr',
          price_xof: 15000,
          status: 'published',
          total_duration_minutes: 240,
          enrollment_count: Math.floor(t.ratingCount * 0.6),
          rating_avg: t.rating - 0.1,
          rating_count: Math.floor(t.ratingCount * 0.4),
        },
      ],
      'POST',
      'return=minimal',
    );
    console.log('  ✓ course ' + courseLabel);
  }

  console.log('\n✅ Seeding complete');
}

main().catch((e) => {
  console.error('FAIL:', e);
  process.exit(1);
});
