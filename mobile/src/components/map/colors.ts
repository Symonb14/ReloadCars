export const MAP_COLORS = {
  partner: '#22c55e',
  public: '#9ca3af',
  route: '#16a34a',
  destination: '#ef4444',
}

export function pointColor(source: 'partner' | 'ocm') {
  return source === 'partner' ? MAP_COLORS.partner : MAP_COLORS.public
}
