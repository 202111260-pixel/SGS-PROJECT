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

export const programs = [
  {
    name: 'HSE & H2S Field Safety',
    meta: '6 weeks · NEBOSH-aligned',
    image: 'crew',
  },
  {
    name: 'Well Control & Drilling',
    meta: '8 weeks · IWCF Level 3',
    image: 'welder',
  },
  {
    name: 'Electrical & Instrumentation',
    meta: '10 weeks · CompEx certified',
    image: 'engineer',
  },
  {
    name: 'Mechanical Integrity & Piping',
    meta: '9 weeks · ASME-aligned',
    image: 'drawings',
  },
  {
    name: 'Operations Readiness & Start-up',
    meta: '12 weeks · OPITO-aligned',
    image: 'pylons',
  },
]

export const pipeline = [
  {
    step: 'Enroll',
    text: 'One record per trainee from day one: profile, sponsor company, target role, program plan.',
    image: 'classroom',
  },
  {
    step: 'Train',
    text: 'Instructor-led sessions with attendance, assessments and practicals logged in real time.',
    image: 'welder',
  },
  {
    step: 'Certify',
    text: 'Accredited exams sat on site. Certificates issued, verified and stored against the record.',
    image: 'drawings',
  },
  {
    step: 'Deploy',
    text: 'Graduates placed with partner operators, with the full training file handed over at the gate.',
    image: 'crew',
  },
  {
    step: 'Monitor',
    text: 'Post-placement performance reviews every thirty days, reported back to the sponsor.',
    image: 'engineer',
  },
]
