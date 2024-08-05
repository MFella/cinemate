import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { RestDataService } from '../_services/rest-data.service';
import { MovieInitData } from '../typings/common';
import { catchError, throwError, timeout } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { AlertInteractionService } from '../_services/alert-interaction.service';

const cachedMovies: Array<any> = [
  {
      "id": "tt1201607",
      "gen": [
          {
              "id": 4,
              "name": "Adventure"
          },
          {
              "id": 6,
              "name": "Fantasy"
          },
          {
              "id": 8,
              "name": "Drama"
          },
          {
              "id": 15,
              "name": "Mystery"
          }
      ],
      "image_url": "https://m.media-amazon.com/images/M/MV5BMGVmMWNiMDktYjQ0Mi00MWIxLTk0N2UtN2ZlYTdkN2IzNDNlXkEyXkFqcGdeQXVyODE5NzE3OTE@._V1_UX182_CR0,0,182,268_AL_.jpg",
      "year": 2011,
      "title": "Harry Potter and the Deathly Hallows: Part 2",
      "description": "Harry (Daniel Radcliffe), Ron (Rupert Grint), and Hermione (Emma Watson) continue their quest of finding and destroying Voldemort's (Ralph Fiennes') three remaining Horcruxes, the magical items responsible for his immortality. But as the mystical Deathly Hallows are uncovered, and Voldemort finds out about their mission, the biggest battle begins, and life as they know it will never be the same again.",
      "rating": 8.1,
      "pageNumber": 1
  },
  {
      "id": "tt5109280",
      "gen": [
          {
              "id": 4,
              "name": "Adventure"
          },
          {
              "id": 5,
              "name": "Family"
          },
          {
              "id": 6,
              "name": "Fantasy"
          },
          {
              "id": 9,
              "name": "Comedy"
          },
          {
              "id": 10,
              "name": "Animation"
          },
          {
              "id": 13,
              "name": "Action"
          }
      ],
      "image_url": "https://m.media-amazon.com/images/M/MV5BZWNiOTc4NGItNGY4YS00ZGNkLThkOWEtMDE2ODcxODEwNjkwXkEyXkFqcGdeQXVyMTkxNjUyNQ@@._V1_UX182_CR0,0,182,268_AL_.jpg",
      "year": 2021,
      "title": "Raya and the Last Dragon",
      "description": "Long ago, in the fantasy world of Kumandra, humans and dragons lived together in harmony. However, when sinister monsters known as the Druun threatened the land, the dragons sacrificed themselves to save humanity. Now, 500 years later, those same monsters have returned, and it's up to a lone warrior to track down the last dragon and stop the Druun for good.",
      "rating": 7.4,
      "pageNumber": 1
  },
  {
      "id": "tt4154756",
      "gen": [
          {
              "id": 4,
              "name": "Adventure"
          },
          {
              "id": 11,
              "name": "Sci-Fi"
          },
          {
              "id": 13,
              "name": "Action"
          }
      ],
      "image_url": "https://m.media-amazon.com/images/M/MV5BMjMxNjY2MDU1OV5BMl5BanBnXkFtZTgwNzY1MTUwNTM@._V1_UX182_CR0,0,182,268_AL_.jpg",
      "year": 2018,
      "title": "Avengers: Infinity War",
      "description": "As the Avengers and their allies have continued to protect the world from threats too large for any one hero to handle, a new danger has emerged from the cosmic shadows: Thanos. A despot of intergalactic infamy, his goal is to collect all six Infinity Stones, artifacts of unimaginable power, and use them to inflict his twisted will on all of reality. Everything the Avengers have fought for has led up to this moment, the fate of Earth and existence has never been more uncertain.",
      "rating": 8.4,
      "pageNumber": 1
  },
  {
      "id": "tt6878306",
      "gen": [
          {
              "id": 4,
              "name": "Adventure"
          },
          {
              "id": 8,
              "name": "Drama"
          },
          {
              "id": 13,
              "name": "Action"
          },
          {
              "id": 25,
              "name": "Western"
          }
      ],
      "image_url": "https://m.media-amazon.com/images/M/MV5BMDNlNmVlNDItMjE3Yi00ZTA3LWIyOTktNDhhMGFlZjk5ZDQ0XkEyXkFqcGdeQXVyMDM2NDM2MQ@@._V1_UX182_CR0,0,182,268_AL_.jpg",
      "year": 2020,
      "title": "News of the World",
      "description": "Five years after the end of the Civil War, Captain Jefferson Kyle Kidd (Tom Hanks), a veteran of three wars, now moves from town to town as a non-fiction storyteller, sharing the news of presidents and queens, glorious feuds, devastating catastrophes, and gripping adventures from the far reaches of the globe. On the plains of Texas, he crosses paths with Johanna (Helena Zengel), a 10-year-old taken in by the Kiowa people six years earlier and raised as one of their own. Johanna, hostile to a world she's never experienced, is being returned to her biological aunt and uncle against her will. Kidd agrees to deliver the child where the law says she belongs. As they travel hundreds of miles into the unforgiving wilderness, the two will face tremendous challenges of both human and natural forces as they search for a place that either can call home.",
      "rating": 6.8,
      "pageNumber": 1
  },
  {
      "id": "tt0293429",
      "gen": [
          {
              "id": 4,
              "name": "Adventure"
          },
          {
              "id": 6,
              "name": "Fantasy"
          },
          {
              "id": 11,
              "name": "Sci-Fi"
          },
          {
              "id": 13,
              "name": "Action"
          },
          {
              "id": 14,
              "name": "Thriller"
          }
      ],
      "image_url": "https://m.media-amazon.com/images/M/MV5BY2ZlNWIxODMtN2YwZi00ZjNmLWIyN2UtZTFkYmZkNDQyNTAyXkEyXkFqcGdeQXVyODkzNTgxMDg@._V1_UX182_CR0,0,182,268_AL_.jpg",
      "year": 2021,
      "title": "Mortal Kombat",
      "description": "MMA fighter Cole Young (Lewis Tan), accustomed to taking a beating for money, is unaware of his heritage-or why Outworld's Emperor Shang Tsung (Chin Han) has sent his best warrior, Sub-Zero (Joe Taslim), an otherworldly Cryomancer, to hunt Cole down. Fearing for his family's safety, Cole goes in search of Sonya Blade (Jessica McNamee) at the direction of Jax (Mehcad Brooks), a Special Forces Major who bears the same strange dragon marking Cole was born with. Soon, he finds himself at the temple of Lord Raiden (Tadanobu Asano), an Elder God and the protector of Earthrealm, who grants sanctuary to those who bear the mark. Here, Cole trains with experienced warriors Liu Kang (Ludi Lin), Kung Lao (Max Huang) and rogue mercenary Kano (Josh Lawson), as he prepares to stand with Earth's greatest champions against the enemies of Outworld in a high stakes battle for the universe. But will Cole be pushed hard enough to unlock his arcana-the immense power from within his soul-in time to save not...",
      "rating": 7,
      "pageNumber": 1
  },
  {
      "id": "tt0458339",
      "gen": [
          {
              "id": 4,
              "name": "Adventure"
          },
          {
              "id": 11,
              "name": "Sci-Fi"
          },
          {
              "id": 13,
              "name": "Action"
          }
      ],
      "image_url": "https://m.media-amazon.com/images/M/MV5BMTYzOTc2NzU3N15BMl5BanBnXkFtZTcwNjY3MDE3NQ@@._V1_UX182_CR0,0,182,268_AL_.jpg",
      "year": 2011,
      "title": "Captain America: The First Avenger",
      "description": "It is 1942, America has entered World War II, and sickly but determined Steve Rogers is frustrated at being rejected yet again for military service. Everything changes when Dr. Erskine recruits him for the secret Project Rebirth. Proving his extraordinary courage, wits and conscience, Rogers undergoes the experiment and his weak body is suddenly enhanced into the maximum human potential. When Dr. Erskine is then immediately assassinated by an agent of Nazi Germany's secret HYDRA research department (headed by Johann Schmidt, a.k.a. the Red Skull), Rogers is left as a unique man who is initially misused as a propaganda mascot; however, when his comrades need him, Rogers goes on a successful adventure that truly makes him Captain America, and his war against Schmidt begins.",
      "rating": 6.9,
      "pageNumber": 1
  },
  {
      "id": "tt4154796",
      "gen": [
          {
              "id": 4,
              "name": "Adventure"
          },
          {
              "id": 8,
              "name": "Drama"
          },
          {
              "id": 11,
              "name": "Sci-Fi"
          },
          {
              "id": 13,
              "name": "Action"
          }
      ],
      "image_url": "https://m.media-amazon.com/images/M/MV5BMTc5MDE2ODcwNV5BMl5BanBnXkFtZTgwMzI2NzQ2NzM@._V1_UX182_CR0,0,182,268_AL_.jpg",
      "year": 2019,
      "title": "Avengers: Endgame",
      "description": "After the devastating events of Avengers: Infinity War (2018), the universe is in ruins due to the efforts of the Mad Titan, Thanos. With the help of remaining allies, the Avengers must assemble once more in order to undo Thanos's actions and undo the chaos to the universe, no matter what consequences may be in store, and no matter who they face...",
      "rating": 8.4,
      "pageNumber": 1
  },
  {
      "id": "tt12361974",
      "gen": [
          {
              "id": 4,
              "name": "Adventure"
          },
          {
              "id": 6,
              "name": "Fantasy"
          },
          {
              "id": 11,
              "name": "Sci-Fi"
          },
          {
              "id": 13,
              "name": "Action"
          }
      ],
      "image_url": "https://m.media-amazon.com/images/M/MV5BYjI3NDg0ZTEtMDEwYS00YWMyLThjYjktMTNlM2NmYjc1OGRiXkEyXkFqcGdeQXVyMTEyMjM2NDc2._V1_UX182_CR0,0,182,268_AL_.jpg",
      "year": 2021,
      "title": "Zack Snyder's Justice League",
      "description": "Determined to ensure Superman's ultimate sacrifice was not in vain, Bruce Wayne aligns forces with Diana Prince with plans to recruit a team of metahumans to protect the world from an approaching threat of catastrophic proportions. The task proves more difficult than Bruce imagined, as each of the recruits must face the demons of their own pasts to transcend that which has held them back, allowing them to come together, finally forming an unprecedented league of heroes. Now united, Batman, Wonder Woman, Aquaman, Cyborg and The Flash may be too late to save the planet from Steppenwolf, DeSaad and Darkseid and their dreadful intentions.",
      "rating": 8.1,
      "pageNumber": 1
  },
  {
      "id": "tt0816692",
      "gen": [
          {
              "id": 4,
              "name": "Adventure"
          },
          {
              "id": 8,
              "name": "Drama"
          },
          {
              "id": 11,
              "name": "Sci-Fi"
          }
      ],
      "image_url": "https://m.media-amazon.com/images/M/MV5BZjdkOTU3MDktN2IxOS00OGEyLWFmMjktY2FiMmZkNWIyODZiXkEyXkFqcGdeQXVyMTMxODk2OTU@._V1_UX182_CR0,0,182,268_AL_.jpg",
      "year": 2014,
      "title": "Interstellar",
      "description": "Earth's future has been riddled by disasters, famines, and droughts. There is only one way to ensure mankind's survival: Interstellar travel. A newly discovered wormhole in the far reaches of our solar system allows a team of astronauts to go where no man has gone before, a planet that may have the right environment to sustain human life.",
      "rating": 8.6,
      "pageNumber": 1
  },
  {
      "id": "tt0120737",
      "gen": [
          {
              "id": 4,
              "name": "Adventure"
          },
          {
              "id": 6,
              "name": "Fantasy"
          },
          {
              "id": 8,
              "name": "Drama"
          },
          {
              "id": 13,
              "name": "Action"
          }
      ],
      "image_url": "https://m.media-amazon.com/images/M/MV5BN2EyZjM3NzUtNWUzMi00MTgxLWI0NTctMzY4M2VlOTdjZWRiXkEyXkFqcGdeQXVyNDUzOTQ5MjY@._V1_UX182_CR0,0,182,268_AL_.jpg",
      "year": 2001,
      "title": "The Lord of the Rings: The Fellowship of the Ring",
      "description": "An ancient Ring thought lost for centuries has been found, and through a strange twist of fate has been given to a small Hobbit named Frodo. When Gandalf discovers the Ring is in fact the One Ring of the Dark Lord Sauron, Frodo must make an epic quest to the Cracks of Doom in order to destroy it. However, he does not go alone. He is joined by Gandalf, Legolas the elf, Gimli the Dwarf, Aragorn, Boromir, and his three Hobbit friends Merry, Pippin, and Samwise. Through mountains, snow, darkness, forests, rivers and plains, facing evil and danger at every corner the Fellowship of the Ring must go. Their quest to destroy the One Ring is the only hope for the end of the Dark Lords reign.",
      "rating": 8.8,
      "pageNumber": 1
  },
  {
      "id": "tt1436562",
      "gen": [
          {
              "id": 4,
              "name": "Adventure"
          },
          {
              "id": 5,
              "name": "Family"
          },
          {
              "id": 7,
              "name": "Crime"
          },
          {
              "id": 9,
              "name": "Comedy"
          },
          {
              "id": 10,
              "name": "Animation"
          },
          {
              "id": 30,
              "name": "Musical"
          }
      ],
      "image_url": "https://m.media-amazon.com/images/M/MV5BMTU2MDY3MzAzMl5BMl5BanBnXkFtZTcwMTg0NjM5NA@@._V1_UX182_CR0,0,182,268_AL_.jpg",
      "year": 2011,
      "title": "Rio",
      "description": "In Rio de Janeiro, baby macaw, Blu, is captured by dealers and smuggled to the USA. While driving through Moose Lake, Minnesota, the truck that is transporting Blu accidentally drops Blu's box on the road. A girl, Linda, finds the bird and raises him with love. Fifteen years later, Blu is a domesticated and intelligent bird that does not fly and lives a comfortable life with bookshop owner Linda. Out of the blue, clumsy Brazilian ornithologist, Tulio, visits Linda and explains that Blu is the last male of his species, and he has a female called Jewel in Rio de Janeiro. He invites Linda to bring Blu to Rio so that he and Jewel can save their species. Linda travels with Blu and Tulio to Rio de Janeiro and they leave Blu and Jewel in a large cage in the institute where Tulio works. While they are having dinner, smugglers break into the institute and steal Blu and Jewel to sell them. Linda and Tulio look everywhere for Blu, who is chained to Jewel and hidden in a slum. Meanwhile, Jewel ...",
      "rating": 6.9,
      "pageNumber": 1
  },
  {
      "id": "tt1843866",
      "gen": [
          {
              "id": 4,
              "name": "Adventure"
          },
          {
              "id": 11,
              "name": "Sci-Fi"
          },
          {
              "id": 13,
              "name": "Action"
          },
          {
              "id": 14,
              "name": "Thriller"
          }
      ],
      "image_url": "https://m.media-amazon.com/images/M/MV5BMzA2NDkwODAwM15BMl5BanBnXkFtZTgwODk5MTgzMTE@._V1_UX182_CR0,0,182,268_AL_.jpg",
      "year": 2014,
      "title": "Captain America: The Winter Soldier",
      "description": "For Steve Rogers, awakening after decades of suspended animation involves more than catching up on pop culture; it also means that this old school idealist must face a world of subtler threats and difficult moral complexities. That becomes clear when Director Nick Fury is killed by the mysterious assassin, the Winter Soldier, but not before warning Rogers that SHIELD has been subverted by its enemies. When Rogers acts on Fury's warning to trust no one there, he is branded as a traitor by the organization. Now a fugitive, Captain America must get to the bottom of this deadly mystery with the help of the Black Widow and his new friend, The Falcon. However, the battle will be costly for the Sentinel of Liberty, with Rogers finding enemies where he least expects them while learning that the Winter Soldier looks disturbingly familiar.",
      "rating": 7.7,
      "pageNumber": 1
  },
  {
      "id": "tt2222042",
      "gen": [
          {
              "id": 4,
              "name": "Adventure"
          },
          {
              "id": 6,
              "name": "Fantasy"
          },
          {
              "id": 9,
              "name": "Comedy"
          },
          {
              "id": 11,
              "name": "Sci-Fi"
          },
          {
              "id": 13,
              "name": "Action"
          }
      ],
      "image_url": "https://m.media-amazon.com/images/M/MV5BYWVkMWEyMDUtZTVmOC00MTYxLWE1ZTUtNjk4M2IzMjY2OTIxXkEyXkFqcGdeQXVyMDk5Mzc5MQ@@._V1_UX182_CR0,0,182,268_AL_.jpg",
      "year": 2020,
      "title": "Love and Monsters",
      "description": "Seven years after the Monsterpocalypse, Joel Dawson (Dylan O'Brien), along with the rest of humanity, has been living underground ever since giant creatures took control of the land. After reconnecting over radio with his high school girlfriend Aimee (Jessica Henwick), who is now 80 miles away at a coastal colony, Joel begins to fall for her again. As Joel realizes that there's nothing left for him underground, he decides against all logic to venture out to Aimee, despite all the dangerous monsters that stand in his way. The fun-filled and action-packed adventure also stars Michael Rooker and Ariana Greenblatt.",
      "rating": 7,
      "pageNumber": 1
  },
  {
      "id": "tt3501632",
      "gen": [
          {
              "id": 4,
              "name": "Adventure"
          },
          {
              "id": 6,
              "name": "Fantasy"
          },
          {
              "id": 9,
              "name": "Comedy"
          },
          {
              "id": 11,
              "name": "Sci-Fi"
          },
          {
              "id": 13,
              "name": "Action"
          }
      ],
      "image_url": "https://m.media-amazon.com/images/M/MV5BMjMyNDkzMzI1OF5BMl5BanBnXkFtZTgwODcxODg5MjI@._V1_UX182_CR0,0,182,268_AL_.jpg",
      "year": 2017,
      "title": "Thor: Ragnarok",
      "description": "Imprisoned on the other side of the universe, the mighty Thor (Chris Hemsworth) finds himself in a deadly gladiatorial contest that pits him against The Incredible Hulk (Mark Ruffalo), his former ally and fellow Avenger. Thor's quest for survival leads him in a race against time to prevent the all-powerful Hela (Cate Blanchett) from destroying his home world and the Asgardian civilization.",
      "rating": 7.9,
      "pageNumber": 1
  },
  {
      "id": "tt1345836",
      "gen": [
          {
              "id": 4,
              "name": "Adventure"
          },
          {
              "id": 13,
              "name": "Action"
          }
      ],
      "image_url": "https://m.media-amazon.com/images/M/MV5BMTk4ODQzNDY3Ml5BMl5BanBnXkFtZTcwODA0NTM4Nw@@._V1_UX182_CR0,0,182,268_AL_.jpg",
      "year": 2012,
      "title": "The Dark Knight Rises",
      "description": "Despite his tarnished reputation after the events of The Dark Knight (2008), in which he took the rap for Dent's crimes, Batman feels compelled to intervene to assist the city and its Police force, which is struggling to cope with Bane's plans to destroy the city.",
      "rating": 8.4,
      "pageNumber": 1
  },
  {
      "id": "tt4154664",
      "gen": [
          {
              "id": 4,
              "name": "Adventure"
          },
          {
              "id": 11,
              "name": "Sci-Fi"
          },
          {
              "id": 13,
              "name": "Action"
          }
      ],
      "image_url": "https://m.media-amazon.com/images/M/MV5BMTE0YWFmOTMtYTU2ZS00ZTIxLWE3OTEtYTNiYzBkZjViZThiXkEyXkFqcGdeQXVyODMzMzQ4OTI@._V1_UX182_CR0,0,182,268_AL_.jpg",
      "year": 2019,
      "title": "Captain Marvel",
      "description": "After crashing an experimental aircraft, Air Force pilot Carol Danvers is discovered by the Kree and trained as a member of the elite Starforce Military under the command of her mentor Yon-Rogg. Six years later, after escaping to Earth while under attack by the Skrulls, Danvers begins to discover there's more to her past. With help from S.H.I.E.L.D. agent Nick Fury, they set out to unravel the truth.",
      "rating": 6.9,
      "pageNumber": 1
  }
];

export const movieInitDataResolver: ResolveFn<MovieInitData> = (_route, _state) => {
  const requestCancelTimeoutMs = 6000;
  const alertInteractionService = inject(AlertInteractionService);
  alertInteractionService.isLoadingSpinnerActive$.next(true);

//   const mockedMovieInitData: MovieInitData = {
//     movies: cachedMovies,
//     genre: 'Adventure'
//   };

  // of(mockedMovieInitData)
  return inject(RestDataService).fetchMoviesData().pipe(
    timeout(requestCancelTimeoutMs),
    catchError((_error: HttpErrorResponse) => {
    alertInteractionService.isLoadingSpinnerActive$.next(false);
    return throwError(() => new Error('Error occured during fetch movies data'));
  }));

};
