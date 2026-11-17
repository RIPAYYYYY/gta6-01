// Missions and side work for Neon Bay Nights. Rico Vane, a wheelman for hire,
// takes jobs from Mara at the Marina Club: five story jobs in a chain, plus
// taxi fares and cash stashes for anyone who wants extra money.

/** Fixed places on the map, in world coordinates — every one sits on a road centre line. */
export const PLACES = {
  marinaClub: { x: 540, y: 1980, name: 'Marina Club' },
  downtownClub: { x: 1980, y: 900, name: 'Neon Rooms' },
  uptownSports: { x: 1260, y: 540, name: 'Uptown Showroom' },
  dexGarage: { x: 540, y: 900, name: "Dex's Garage" },
  harbor: { x: 2340, y: 1260, name: 'Harbor Docks' },
  suburbsHouse: { x: 900, y: 1980, name: 'Palm House' },
  downtownBank: { x: 1980, y: 1260, name: 'Bay Bank' },
  yacht: { x: 2700, y: 1980, name: "Mara's Yacht" },
};

export const MISSION_TITLES = [
  'First Fare',
  'Hot Wheels',
  'The Drop',
  'Heat',
  'The Big Score',
];

export const MISSION_INTROS = [
  'Mara needs a driver. Go see her at the Marina Club.',
  'A sports car is waiting in Uptown. Take it to Dex\u2019s Garage.',
  'Pick up the package at the Harbor Docks. Deliver it quietly.',
  'The cops are all over you. Lose the heat \u2014 get to zero stars.',
  'One last job: the Bay Bank, then the yacht. Make it count.',
];

/**
 * A mission is a list of steps. Each step names its text, its target, how close
 * counts, whether the player must be in a car, and what happens on arrival.
 */
export function missionSteps(index) {
  if (index === 0) {
    return [
      { text: 'Meet Mara at the Marina Club', target: PLACES.marinaClub, radius: 80, needCar: false },
      { text: 'Drive Mara to Neon Rooms, Downtown', target: PLACES.downtownClub, radius: 90, needCar: true },
    ];
  }
  if (index === 1) {
    return [
      { text: 'Steal the sports car in Uptown (E by the car)', target: PLACES.uptownSports, radius: 100, needCar: false, stealSports: true },
      { text: 'Deliver the car to Dex\u2019s Garage, Old Town', target: PLACES.dexGarage, radius: 90, needCar: true },
    ];
  }
  if (index === 2) {
    return [
      { text: 'Pick up the package at the Harbor Docks', target: PLACES.harbor, radius: 80, needCar: false, raisesHeat: 1 },
      { text: 'Deliver the package to the Palm House, Suburbs', target: PLACES.suburbsHouse, radius: 90, needCar: false },
    ];
  }
  if (index === 3) {
    return [
      { text: 'Lose the heat \u2014 get your wanted level to zero', target: null, radius: 0, needCar: false, loseHeat: true, startHeat: 3 },
    ];
  }
  return [
    { text: 'Hit the Bay Bank, Downtown', target: PLACES.downtownBank, radius: 90, needCar: false, raisesHeat: 2 },
    { text: 'Escape to Mara\u2019s Yacht at the Marina', target: PLACES.yacht, radius: 100, needCar: false },
  ];
}

/** Cash stash spots, one per district corner, on road centres. */
export function stashSpots() {
  return [
    { x: 180, y: 180 }, { x: 2700, y: 180 }, { x: 180, y: 1260 },
    { x: 2700, y: 900 }, { x: 1260, y: 1980 }, { x: 1980, y: 180 },
    { x: 900, y: 540 }, { x: 2340, y: 1980 },
  ];
}
