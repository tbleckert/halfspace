import type { SportmonksTopscorer } from '@shared/contracts'

export function makeTopscorer(overrides: Partial<SportmonksTopscorer> = {}): SportmonksTopscorer {
  return {
    id: 1,
    season_id: 25591,
    player_id: 100,
    participant_id: 37,
    type_id: 208,
    position: 1,
    total: 12,
    type: { id: 208, name: 'Goals', developer_name: 'GOAL_TOPSCORER' },
    player: {
      id: 100,
      sport_id: 1,
      country_id: 752,
      nationality_id: 752,
      city_id: null,
      position_id: 27,
      detailed_position_id: null,
      type_id: null,
      name: 'Alex Forward',
      display_name: 'Alex Forward',
      image_path: null,
      height: null,
      weight: null,
      date_of_birth: '2000-01-01',
      gender: 'male'
    },
    participant: {
      id: 37,
      sport_id: 1,
      country_id: null,
      venue_id: null,
      gender: 'male',
      name: 'Halfspace FC',
      image_path: null,
      founded: null,
      placeholder: false
    },
    ...overrides
  }
}
