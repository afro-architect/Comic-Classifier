/**
 * captions.js — the built-in wit. No API key required, ever.
 *
 * Pools are keyed by motif category, by confidence band, and by narrative
 * context (first sighting / returning class / rapid flapping). A seeded picker
 * avoids repeating the same line twice in a row.
 */

import { makeRng, hashString } from './prng.js';

const MOTIF_LINES = {
  cat: [
    'The {name} permits this observation.',
    'A {name}. Naturally, it is unimpressed.',
    'Certified {name}. Suspiciously good at posing.',
    'Our {name} returns, contractually aloof.',
    'I have inked the {name}. The {name} noticed.',
    'Four legs, zero remorse: {name}.',
  ],
  dog: [
    'A {name}! Morale improves immediately.',
    'The {name} approves of absolutely everything.',
    'Tail detected. Conclusion: {name}.',
    'The {name} has already forgiven you.',
    'Good {name}. Objectively. Scientifically.',
  ],
  face: [
    'A face. Possibly yours. Filed as {name}.',
    'The {name} looks directly into the nib.',
    'Portrait mode: {name}, dramatically lit.',
    'I have drawn your chin twice. Sorry, {name}.',
    'A human, labelled {name}, doing human things.',
  ],
  hand: [
    'Five fingers of pure {name} energy.',
    'A gesture! The {name} speaks without speaking.',
    'Approval detected. Logging as {name}.',
    'The {name} enters, thumb-first.',
    'That is a hand, and it means {name}.',
  ],
  desk: [
    'Nothing happens here. It is called {name}.',
    'The {name}: a still life of unfinished intentions.',
    'Empty as promised. This is {name}.',
    'The {name} waits. It is very good at waiting.',
    'Furniture, dust, and the ghost of productivity: {name}.',
  ],
  mug: [
    'A {name}. Fuel for the ink supply.',
    'Steam rising. Verdict: {name}.',
    'The {name} is either coffee or a plot device.',
    'Third {name} today. Nobody is counting. I am.',
    'Warm, round, essential: {name}.',
  ],
  book: [
    'A {name}. Pages that have not judged you yet.',
    'The {name} lies open, hopeful.',
    'Someone is reading. Or pretending to. {name}.',
    'Paper, ink, ambition: {name}.',
    'The {name} contains at least one good sentence.',
  ],
  phone: [
    'The {name} glows with unread obligations.',
    'A rectangle of infinite scroll: {name}.',
    'The {name} has notifications. Ignore them.',
    'Held aloft like a relic: {name}.',
    'That is a {name}, and it knows too much.',
  ],
  plant: [
    'A {name}. Still alive, against the odds.',
    'The {name} is photosynthesising judgementally.',
    'Green, patient, unbothered: {name}.',
    'Water the {name}. That is the whole panel.',
    'The {name} leans toward the window and hope.',
  ],
  food: [
    'The {name}. Lunch has entered the narrative.',
    'Steam, noodles, joy: {name}.',
    'I would draw the {name} faster if I could eat it.',
    'A bowl of {name}, cross-hatched with longing.',
    'The {name} is the real protagonist here.',
  ],
  box: [
    'A {name}. Contents: unknown, probably cables.',
    'The {name} sits there, being a {name}.',
    'Six sides of {name}. A shape with commitment.',
    'The {name} has arrived. Nobody ordered it.',
    'Cardboard, tape, mystery: {name}.',
  ],
  lamp: [
    'The {name} does the lighting in this panel.',
    'Illumination, courtesy of one {name}.',
    'The {name} makes the hatching worth it.',
    'A pool of light. Signed, {name}.',
    'Without the {name} this is just a dark square.',
  ],
  car: [
    'A {name}, mid-escape.',
    'Four wheels of {name}. Speed lines included.',
    'The {name} is going somewhere. Probably.',
    'Chrome and motion: {name}.',
  ],
  bottle: [
    'A {name}. Hydration, or something stronger.',
    'The {name} stands like a small monument.',
    'Label unreadable. Still a {name}.',
    'Glass, light, and a {name}-shaped silhouette.',
  ],
  mystery: [
    'Something is out there. It answers to {name}.',
    'A shape. A rumour. Possibly {name}.',
    'I drew {name} the only way I know: vaguely.',
    'Unidentified, but confidently labelled {name}.',
    'The {name} defies my modest visual vocabulary.',
  ],
};

const BAND_LINES = {
  sure: [
    'No notes. That is {name}.',
    'I would testify: {name}.',
    'Unmistakably {name}. Ink is dry on it.',
    '{name}. I stake the beret on it.',
    'Textbook {name}. Frame it.',
    'The nib did not hesitate: {name}.',
    'That is {name} and I will hear no arguments.',
    'Clarity like fresh paper: {name}.',
    'One glance. {name}. Next panel.',
    'I have drawn {name} before. This is that.',
  ],
  hedging: [
    'Leaning {name}. Softly. In pencil.',
    'Probably {name}. Do not quote the panel.',
    'A {name}, I think. The light is arguing.',
    'Seventy percent {name}, thirty percent vibes.',
    'It has the posture of a {name}.',
    'Call it {name} until something better arrives.',
    'If pressed: {name}. Please do not press.',
    'The evidence gestures toward {name}.',
    'A {name}-adjacent situation.',
    'I sketched {name} and left the eraser out.',
  ],
  confused: [
    'Two ideas, one silhouette. Possibly {name}?',
    'The model shrugged. I drew the shrug.',
    'Could be {name}. Could be its cousin.',
    'I cannot commit. Neither can the model.',
    'Ambiguity, rendered in cross-hatch.',
    'Both answers arrived holding hands.',
    'This panel is a question, not a statement.',
    'The confidence bars are having a debate.',
    'Somewhere between {name} and regret.',
    'I need more samples and a stronger coffee.',
  ],
};

const CONTEXT_LINES = {
  first: [
    'First sighting of {name}. Historic.',
    'New character enters: {name}.',
    'Introducing {name}, fresh from the training set.',
    'A debut! The {name} takes the stage.',
    'I have never inked a {name} before. Here goes.',
    'Cast update: {name} joins the strip.',
  ],
  returning: [
    'You again, {name}.',
    'The {name} returns. Sequels are hard.',
    '{name}, back for another panel.',
    'Once more, with {name}.',
    'The {name} refuses to leave the frame.',
    'Recurring role: {name}.',
  ],
  rapid: [
    'Slow down. The ink is still wet.',
    'Too fast! I have only two hands.',
    '{name} already? My nib is smoking.',
    'Give me one panel of peace.',
    'This strip is turning into a flipbook.',
    'Hold still, the hatching takes time.',
  ],
};

const NARRATOR_LINES = {
  sure: ['Aha!', 'There it is.', 'Called it.', 'Obviously.', 'Ink it.', 'Perfect.', 'Naturally.', 'Bold. Correct.'],
  hedging: ['Hmm...', 'Maybe?', 'I think?', 'Close enough.', 'Roughly.', "Let's say yes.", 'Provisionally.'],
  confused: ['???', 'Uh...', 'Which one?', 'Both? Neither?', 'Do not ask me.', 'I need a nap.', 'Try again?'],
  first: ['Ooh, new!', 'A stranger!', 'Who is this?', 'Fresh ink!'],
  rapid: ['Slow down!', 'Too fast!', 'My wrist!', 'Steady on.'],
};

function pickFrom(pool, rng, avoid) {
  if (!pool || !pool.length) return '';
  const options = pool.filter((l) => l !== avoid);
  const list = options.length ? options : pool;
  return list[Math.floor(rng() * list.length) % list.length];
}

/**
 * @param {object} ctx
 *  label, motif, confidence, threshold, first, returning, rapid, confused,
 *  panelIndex, lastCaption
 * @returns {{ caption: string, bubble: string, band: string }}
 */
export function makeCaption(ctx) {
  const {
    label = 'something',
    motif = 'mystery',
    confidence = 0,
    threshold = 0.7,
    first = false,
    returning = false,
    rapid = false,
    confused = false,
    panelIndex = 0,
    lastCaption = '',
  } = ctx;

  const rng = makeRng(hashString(`${label}|${panelIndex}|${Math.round(confidence * 100)}`));
  const band = confused || confidence < threshold * 0.85 ? 'confused' : confidence >= 0.88 ? 'sure' : 'hedging';

  let pool;
  const roll = rng();
  if (rapid && roll < 0.6) pool = CONTEXT_LINES.rapid;
  else if (first && roll < 0.55) pool = CONTEXT_LINES.first;
  else if (band === 'confused') pool = roll < 0.7 ? BAND_LINES.confused : MOTIF_LINES[motif] || MOTIF_LINES.mystery;
  else if (returning && roll < 0.35) pool = CONTEXT_LINES.returning;
  else if (roll < 0.62) pool = MOTIF_LINES[motif] || MOTIF_LINES.mystery;
  else pool = BAND_LINES[band];

  const caption = pickFrom(pool, rng, lastCaption).replace(/\{name\}/g, label);
  const bubblePool = rapid ? NARRATOR_LINES.rapid : first && band !== 'confused' ? NARRATOR_LINES.first : NARRATOR_LINES[band];
  const bubble = pickFrom(bubblePool, rng, '');
  return { caption, bubble, band };
}

export const CAPTION_LINE_COUNT =
  Object.values(MOTIF_LINES).reduce((n, a) => n + a.length, 0) +
  Object.values(BAND_LINES).reduce((n, a) => n + a.length, 0) +
  Object.values(CONTEXT_LINES).reduce((n, a) => n + a.length, 0) +
  Object.values(NARRATOR_LINES).reduce((n, a) => n + a.length, 0);
