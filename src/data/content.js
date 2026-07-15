const unsplash = (id, w = 1600) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`

export const img = {
  hero: {
    src: unsplash('photo-1504307651254-35680f356dfd', 2200),
    alt: 'Field crew in orange coveralls rigging rebar on a live site under midday sun',
  },
  dunes: {
    src: unsplash('photo-1473580044384-7ba9967e16a0', 2200),
    alt: 'Empty desert dunes under a high white sun, footprints crossing the sand',
  },
  pylons: {
    src: unsplash('photo-1473341304170-971dccb5ac1e', 1400),
    alt: 'Transmission pylons against a copper sunset on the interconnect corridor',
  },
  classroom: {
    src: unsplash('photo-1542744173-8e7e53415bb0', 1400),
    alt: 'Instructor walking a cohort through a well-control scenario in session room two',
  },
  crew: {
    src: unsplash('photo-1541888946425-d81bb19240f5', 1400),
    alt: 'Seven trainees in high-visibility vests walking a partner site on deployment day',
  },
  welder: {
    src: unsplash('photo-1504328345606-18bbc8c9d7d1', 1400),
    alt: 'Welder under a shower of sparks during a practical assessment',
  },
  engineer: {
    src: unsplash('photo-1581091226825-a6a2a5aee158', 1400),
    alt: 'Instrumentation trainee running diagnostics at the electronics bench',
  },
  drawings: {
    src: unsplash('photo-1581092160562-40aa08e78837', 1400),
    alt: 'Piping isometrics marked up by hand during a design review exercise',
  },
}

export const partners = [
  'PDO',
  'OQ',
  'Shell',
  'bp',
  'TotalEnergies',
  'SLB',
  'Halliburton',
  'Baker Hughes',
]

export const modules = [
  {
    name: 'Employee Registry',
    meta: 'Profile · position · project · documents',
    image: 'crew',
  },
  {
    name: 'Certificate Wallet',
    meta: 'Issue and expiry dates for every required course',
    image: 'welder',
  },
  {
    name: 'Competency Engine',
    meta: 'C·B·A calculated from certificates and tenure',
    image: 'engineer',
  },
  {
    name: 'Promotion Runway',
    meta: 'Exactly what unlocks the next grade',
    image: 'drawings',
  },
  {
    name: 'Expiry Alerts',
    meta: '90-day renewal watch, automatic',
    image: 'pylons',
  },
]

export const pipeline = [
  {
    step: 'Register',
    text: 'One record per employee from day one: profile, position, project, documents, and safety certificates.',
    image: 'classroom',
  },
  {
    step: 'Certify',
    text: 'Every required certificate is logged with its issue and expiry date, then stored against the employee record.',
    image: 'welder',
  },
  {
    step: 'Grade',
    text: 'The C·B·A competency grade is calculated from valid certificates and time in position.',
    image: 'drawings',
  },
  {
    step: 'Promote',
    text: 'The promotion runway shows exactly which certificates and how much tenure unlock the next grade.',
    image: 'crew',
  },
  {
    step: 'Alert',
    text: 'Certificates entering their 90-day window surface automatically on the Alerts page before they lapse.',
    image: 'engineer',
  },
]
