export interface MoodMovie {
    imdb_id: string;
    title: string;
    year: number;
    popularity: number;
    description: string;
    content_rating: string;
    movie_length: number;
    rating: number;
    created_at: string;
    trailer: string;
    image_url: string;
    release?: null;
    plot: string;
    banner: string;
    type: string;
    more_like_this: MoreLikeThis;
    gen?: (GenEntity)[] | null;
    keywords?: (KeywordsEntity)[] | null;
  }

  export interface MoreLikeThis {
  }

  export interface GenEntity {
    id: number;
    genre: string;
}
  
  export interface KeywordsEntity {
    id: number;
    keyword: string;
  }
  