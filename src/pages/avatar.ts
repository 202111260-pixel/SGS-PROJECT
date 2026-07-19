import me1 from '../assets/me1.jpeg';
import me2 from '../assets/me2.jpg';
import me3 from '../assets/me3.jpg';
import me4 from '../assets/me4.jpg';

/**
 * Demo portraits — the supplied photos (docs/me1 · me3 for men, me2 · me4
 * for women), resolved from the first names the demo data actually uses
 * and spread deterministically so the same person always keeps the same
 * face. Production replaces this with each employee's real photo served
 * from a private Supabase bucket through short-lived signed URLs
 * (charter §3).
 */

const MALE_PHOTOS = [me1, me3] as const;
const FEMALE_PHOTOS = [me2, me4] as const;

const FEMALE_FIRST = new Set([
  'Aisha',
  'Amal',
  'Buthaina',
  'Fatima',
  'Halima',
  'Maryam',
  'Muna',
  'Nawal',
  'Salma',
  'Zainab',
]);

/** Stable tiny hash so a name always lands on the same portrait. */
function hashOf(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i += 1) h = (h * 31 + name.charCodeAt(i)) % 9973;
  return h;
}

export function photoOf(name: string): string {
  const first = name.trim().split(/\s+/)[0] ?? '';
  const pool = FEMALE_FIRST.has(first) ? FEMALE_PHOTOS : MALE_PHOTOS;
  return pool[hashOf(name) % pool.length] ?? pool[0];
}
