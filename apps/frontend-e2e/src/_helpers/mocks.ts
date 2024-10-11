import { BrowserContext, Page } from '@playwright/test';

const MAIN_BACKEND_URL = 'http://localhost:3000/';
export const mockedCookies: Array<
  Record<'name' | 'value' | 'domain' | 'path', string>
> = [
  {
    domain: 'localhost',
    path: '/',
    name: 'access_token',
    value:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5OTk5OTk5OTk5OTk5OTk5OTk5OTkiLCJlbWFpbCI6ImV4YW1wbGVAZ21haWwuY29tIiwicGljdHVyZSI6Imh0dHBzOi8vbGgzLmdvb2dsZXVzZXJjb250ZW50LmNvbS9leHhNanhhZHFFUjRJZTNfVE1lQnFaZlN3TkJmTF8zdFUwWHZuNHRKM19QT3R3NGhhWE5iSXg3T0w3djUyX0RjYUJwZT13OTYiLCJpYXQiOjI3Mjc0MzEzMjZ9.A7-xZEO8z24IOJZgdImnet-XUx7cVMgv7vN8_c_ULqQ',
  },
];

export const setupAuthCookie = async (page: Page, context: BrowserContext) => {
  await page.goto('/');
  await context.addCookies(mockedCookies);
};

type GenObject = {
  id: number;
  name: string;
};

export const mockUserMail = 'example@wp.pl';
const mockGenreId = 1;

export const availableGenEntities: Array<GenObject> = [
  {
    id: mockGenreId,
    name: 'Comedy',
  },
  {
    id: 2,
    name: 'Action',
  },
  {
    id: 3,
    name: 'Adventure',
  },
];

export async function mockApiCall<T>(
  page: Page,
  path: string,
  objectToReturn: T
) {
  await page.route(`${MAIN_BACKEND_URL}${path}`, async route => {
    await route.fulfill({ json: objectToReturn });
  });
}

export const noResultFoundMatchResult = {
  matchedRateValue: 'YES',
  matchedRates: [],
  isLastPage: true,
};

export const mockMatchResult = {
  movies: [
    {
      id: 365177,
      genreIds: [mockGenreId],
      overview:
        'Returning to her home planet, an infamous bounty hunter forms an unexpected alliance with a team of unlikely heroes. Together, they battle monsters and dangerous bandits to protect a young girl who holds the key to unimaginable power.',
      posterPath: '/865DntZzOdX6rLMd405R0nFkLmL.jpg',
      releaseDate: '2024-08-07',
      title: 'Borderlands',
      voteAverage: 5.809,
    },
    {
      id: 573435,
      genreIds: [mockGenreId],
      overview:
        'After their late former Captain is framed, Lowrey and Burnett try to clear his name, only to end up on the run themselves.',
      posterPath: '/oGythE98MYleE6mZlGs5oBGkux1.jpg',
      releaseDate: '2024-06-05',
      title: 'Bad Boys: Ride or Die',
      voteAverage: 7.55,
    },
    {
      id: 1225377,
      genreIds: [mockGenreId],
      overview:
        "It's Alex's 21st Birthday, but she's stuck at the amusement arcade on a late shift so her friends decide to surprise her, but a masked killer dressed as Mickey Mouse decides to play a game of his own with them which she must survive.",
      posterPath: '/3ovFaFeojLFIl5ClqhtgYMDS8sE.jpg',
      releaseDate: '2024-08-23',
      title: 'The Mouse Trap',
      voteAverage: 5,
    },
  ],
  selectedGenreId: mockGenreId,
  pageGenres: availableGenEntities,
  pageNumber: 1,
};

export const mockRateResult = {
  isRateSaved: true,
  moviesCountLeftOnPage: 2,
};

export const populatedFoundMatchResult = {
  matchedRateValue: 'YES',
  matchedRates: [
    {
      id: '50bba7dd-5fb9-4ab4-b735-f57bb5daf106',
      movie: {
        id: 704239,
        genreIds: [28, 35],
        overview:
          'A New Jersey construction worker goes from regular guy to aspiring spy when his long-lost high school sweetheart recruits him for an espionage mission.',
        posterPath: '/d9CTnTHip1RbVi2OQbA2LJJQAGI.jpg',
        releaseDate: '2024-08-15',
        title: 'The Union',
        voteAverage: 6.282,
      },
      user: {
        id: '999999999999999999999',
        email: mockUserMail,
        genreId: mockGenreId,
        picture:
          'https://lh3.googleusercontent.com/exxMjxadqER4Ie3_TMeBqZfSwNBfL_3tU0Xvn4tJ3_POtw4haXNbIx7OL7v52_DcaBpe=w96',
      },
      isWatched: false,
    },
    {
      id: '70291d67-a8da-4d94-959b-2b7217f76be0',
      movie: {
        id: 940551,
        genreIds: [16, 28, 12, 35, 10751],
        overview:
          'After a migrating duck family alights on their pond with thrilling tales of far-flung places, the Mallard family embarks on a family road trip, from New England, to New York City, to tropical Jamaica.',
        posterPath: '/ldfCF9RhR40mppkzmftxapaHeTo.jpg',
        releaseDate: '2023-12-06',
        title: 'Migration',
        voteAverage: 7.445,
      },
      user: {
        id: '999999999999999999999',
        email: mockUserMail,
        genreId: mockGenreId,
        picture:
          'https://lh3.googleusercontent.com/exxMjxadqER4Ie3_TMeBqZfSwNBfL_3tU0Xvn4tJ3_POtw4haXNbIx7OL7v52_DcaBpe=w96',
      },
      isWatched: false,
    },
    {
      id: '7c89ad8a-fe60-4fa1-ab13-95dc32e4d35c',
      movie: {
        id: 519182,
        genreIds: [16, 10751, 35, 28],
        overview:
          'Gru and Lucy and their girls—Margo, Edith and Agnes—welcome a new member to the Gru family, Gru Jr., who is intent on tormenting his dad. Gru also faces a new nemesis in Maxime Le Mal and his femme fatale girlfriend Valentina, forcing the family to go on the run.',
        posterPath: '/wWba3TaojhK7NdycRhoQpsG0FaH.jpg',
        releaseDate: '2024-06-20',
        title: 'Despicable Me 4',
        voteAverage: 7.183,
      },
      user: {
        id: '999999999999999999999',
        email: mockUserMail,
        genreId: mockGenreId,
        picture:
          'https://lh3.googleusercontent.com/exxMjxadqER4Ie3_TMeBqZfSwNBfL_3tU0Xvn4tJ3_POtw4haXNbIx7OL7v52_DcaBpe=w96',
      },
      isWatched: false,
    },
    {
      id: '9b7eab3f-0aad-4097-bcfd-bcf8a9505f0c',
      movie: {
        id: 831815,
        genreIds: [16, 35, 12, 10751],
        overview:
          'When Bikini Bottom is scooped from the ocean, scientific squirrel Sandy Cheeks and her pal SpongeBob SquarePants saddle up for Texas to save their town.',
        posterPath: '/30YnfZdMNIV7noWLdvmcJS0cbnQ.jpg',
        releaseDate: '2024-08-01',
        title: 'Saving Bikini Bottom: The Sandy Cheeks Movie',
        voteAverage: 6.3,
      },
      user: {
        id: '999999999999999999999',
        email: mockUserMail,
        genreId: mockGenreId,
        picture:
          'https://lh3.googleusercontent.com/exxMjxadqER4Ie3_TMeBqZfSwNBfL_3tU0Xvn4tJ3_POtw4haXNbIx7OL7v52_DcaBpe=w96',
      },
      isWatched: false,
    },
    {
      id: 'a58b9d1f-1224-4ddb-911f-63a67c939794',
      movie: {
        id: 365177,
        genreIds: [28, 878, 35, 12, 53],
        overview:
          'Returning to her home planet, an infamous bounty hunter forms an unexpected alliance with a team of unlikely heroes. Together, they battle monsters and dangerous bandits to protect a young girl who holds the key to unimaginable power.',
        posterPath: '/865DntZzOdX6rLMd405R0nFkLmL.jpg',
        releaseDate: '2024-08-07',
        title: 'Borderlands',
        voteAverage: 5.809,
      },
      user: {
        id: '999999999999999999999',
        email: mockUserMail,
        genreId: mockGenreId,
        picture:
          'https://lh3.googleusercontent.com/exxMjxadqER4Ie3_TMeBqZfSwNBfL_3tU0Xvn4tJ3_POtw4haXNbIx7OL7v52_DcaBpe=w96',
      },
      isWatched: false,
    },
    {
      id: 'a8a592c0-66e5-46ea-91dc-a91863f68bdc',
      movie: {
        id: 826510,
        genreIds: [12, 10751, 14, 35],
        overview:
          "Inside of his book, adventurous Harold can make anything come to life simply by drawing it. After he grows up and draws himself off the book's pages and into the physical world, Harold finds he has a lot to learn about real life.",
        posterPath: '/dEsuQOZwdaFAVL26RjgjwGl9j7m.jpg',
        releaseDate: '2024-07-31',
        title: 'Harold and the Purple Crayon',
        voteAverage: 6.984,
      },
      user: {
        id: '999999999999999999999',
        email: mockUserMail,
        genreId: mockGenreId,
        picture:
          'https://lh3.googleusercontent.com/exxMjxadqER4Ie3_TMeBqZfSwNBfL_3tU0Xvn4tJ3_POtw4haXNbIx7OL7v52_DcaBpe=w96',
      },
      isWatched: false,
    },
    {
      id: 'b8a52e58-f2fb-4e33-ae24-559abb5eb3a9',
      movie: {
        id: 1139817,
        genreIds: [28, 35, 80],
        overview:
          "A talented martial artist who can't walk past a person in need unites with a probation officer to fight and prevent crime as a martial arts officer.",
        posterPath: '/rEaJSXAlNfdhRpDHiNcJsoUa9qE.jpg',
        releaseDate: '2024-09-10',
        title: 'Officer Black Belt',
        voteAverage: 7.909,
      },
      user: {
        id: '999999999999999999999',
        email: mockUserMail,
        genreId: mockGenreId,
        picture:
          'https://lh3.googleusercontent.com/exxMjxadqER4Ie3_TMeBqZfSwNBfL_3tU0Xvn4tJ3_POtw4haXNbIx7OL7v52_DcaBpe=w96',
      },
      isWatched: false,
    },
    {
      id: 'e8085202-1886-44e0-8cac-3910b7b4a6c8',
      movie: {
        id: 1309923,
        genreIds: [28, 53, 35, 18],
        overview:
          'Hostage negotiator Alan Bender is called to rescue the president from a kidnapping, only to find himself also mediating to save his wife and marriage.',
        posterPath: '/bHQG4UsLMFCy91gfLAFRpnCOPdP.jpg',
        releaseDate: '2024-07-25',
        title: 'Non Negotiable',
        voteAverage: 6.035,
      },
      user: {
        id: '999999999999999999999',
        email: mockUserMail,
        genreId: mockGenreId,
        picture:
          'https://lh3.googleusercontent.com/exxMjxadqER4Ie3_TMeBqZfSwNBfL_3tU0Xvn4tJ3_POtw4haXNbIx7OL7v52_DcaBpe=w96',
      },
      isWatched: false,
    },
    {
      id: 'ef5b2303-584e-4556-895b-05e32416f63f',
      movie: {
        id: 748783,
        genreIds: [16, 35, 10751, 12, 28],
        overview:
          'Garfield, the world-famous, Monday-hating, lasagna-loving indoor cat, is about to have a wild outdoor adventure! After an unexpected reunion with his long-lost father – scruffy street cat Vic – Garfield and his canine friend Odie are forced from their perfectly pampered life into joining Vic in a hilarious, high-stakes heist.',
        posterPath: '/p6AbOJvMQhBmffd0PIv0u8ghWeY.jpg',
        releaseDate: '2024-04-30',
        title: 'The Garfield Movie',
        voteAverage: 7.122,
      },
      user: {
        id: '999999999999999999999',
        email: mockUserMail,
        genreId: mockGenreId,
        picture:
          'https://lh3.googleusercontent.com/exxMjxadqER4Ie3_TMeBqZfSwNBfL_3tU0Xvn4tJ3_POtw4haXNbIx7OL7v52_DcaBpe=w96',
      },
      isWatched: false,
    },
  ],
  isLastPage: true,
};
