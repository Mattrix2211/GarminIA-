export const SPORT_COLORS: Record<string, string> = {
  Cyclisme: '#c8f064',
  'Course à pied': '#ff7c5c',
  Natation: '#55cccc',
  Trail: '#6c63ff',
  Musculation: '#ffaa33',
  CrossFit: '#ff5555',
  Triathlon: '#cc88ff',
}

export function sportEmoji(sport: string): string {
  const map: Record<string, string> = {
    Cyclisme: '🚴', 'Course à pied': '🏃', Triathlon: '🏊', Trail: '🏔️',
    Natation: '🏊', Musculation: '💪', CrossFit: '🔥',
  }
  return map[sport] ?? '🏅'
}
