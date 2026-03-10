// Feature release dates — "Nouveau" badge shown for 1 day after release
export const featureReleaseDates: Record<string, string> = {
  // key = workspace item URL, value = release date ISO string
  // Example: "/entrepot/inventaire": "2026-02-24",
};

// Upcoming features — "Prochainement" badge, item grayed out and not clickable
export const upcomingFeatures: string[] = [
  // URLs of sidebar items to mark as "Prochainement"
  // Example: "/analytique/previsions",
];

export function isNewFeature(url: string): boolean {
  const releaseDate = featureReleaseDates[url];
  if (!releaseDate) return false;
  const release = new Date(releaseDate);
  const now = new Date();
  return now.getTime() - release.getTime() < 24 * 60 * 60 * 1000;
}

export function isUpcomingFeature(url: string): boolean {
  return upcomingFeatures.includes(url);
}
