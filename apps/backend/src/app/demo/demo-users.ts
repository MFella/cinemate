/**
 * Demo accounts live in a reserved id range: 20 digits starting with 9999999999.
 * Real ids are Google subs (21 digits starting with 1) and Facebook ids (about 16 digits).
 */
const DEMO_ID_PATTERN = /^9999999999\d{10}$/;

export const isDemoUserId = (id: string | number | bigint): boolean =>
  DEMO_ID_PATTERN.test(String(id));

const demoId = (n: number): string =>
  `9999999999${String(n).padStart(10, '0')}`;

export type DemoPerson = {
  id: string;
  name: string;
  email: string;
  picture: string;
};

const person = (n: number, name: string): DemoPerson => ({
  id: demoId(n),
  name,
  email: `${name.toLowerCase()}@demo.cinemate.app`,
  // static assets of the frontend (apps/frontend/src/assets/demo)
  picture: `assets/demo/${name.toLowerCase()}.svg`,
});

export const DEMO_USER = person(1, 'Demo');
export const DEMO_FRIENDS = [
  person(2, 'Anna'),
  person(3, 'Bob'),
  person(4, 'Carla'),
  person(5, 'Dan'),
];
/** Asked to be a friend of the demo user; waiting for the answer. */
export const DEMO_PENDING_FRIEND = person(6, 'Eva');

export const ALL_DEMO_PEOPLE: Array<DemoPerson> = [
  DEMO_USER,
  ...DEMO_FRIENDS,
  DEMO_PENDING_FRIEND,
];
export const ALL_DEMO_IDS = ALL_DEMO_PEOPLE.map(({ id }) => id);
