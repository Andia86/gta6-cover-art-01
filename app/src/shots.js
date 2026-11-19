// Vice Panels — deterministic screenshot scenes.
// A ?shot=<name> URL renders one full-viewport canvas with a fixed
// preset and flags readiness in the document title once fonts and
// samples are on screen, so headless captures are stable.

export const SHOT_SCENES = {
  'cover-land': {
    w: 1920, h: 1080,
    state: { layout: 'grid', grade: 'vice-sunset', title: 'NEON COAST', subtitle: 'vice city nights', tagline: 'ONE LAST RIDE · 2026', titleStyle: 'sunset', heat: 5, badge: 'LAUNCH WEEK', badgeOn: true },
  },
  'cover-port': {
    w: 1080, h: 1350,
    state: { layout: 'nine', grade: 'vice-sunset', title: 'NEON COAST', subtitle: 'vice city nights', tagline: 'ONE LAST RIDE · 2026', titleStyle: 'sunset', heat: 5, badge: 'LAUNCH WEEK', badgeOn: true },
  },
  'cover-square': {
    w: 1080, h: 1080,
    state: { layout: 'hero-stack', grade: 'neon-night', title: 'MIDNIGHT PALMS', subtitle: 'after dark', tagline: 'ONE LAST RIDE · 2026', titleStyle: 'neon', heat: 4, badge: 'LAUNCH WEEK', badgeOn: true },
  },
};

export function shotNameFromUrl() {
  const name = new URLSearchParams(location.search).get('shot');
  return name && SHOT_SCENES[name] ? name : null;
}
