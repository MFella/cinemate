export default () => ({
    port: parseInt(process.env.PORT, 10) || 3000,
    database: {
      url: process.env.DATABASE_URL,
      directUrl: process.env.DIRECT_URL
    },
    tmdbApi: {
        url: process.env.TMDB_API_URL,
        key: process.env.TMDB_API_TOKEN
    }
});