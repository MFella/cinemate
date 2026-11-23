export default () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  frontendUrl: process.env.FRONTEND_URL,
  database: {
    url: process.env.DATABASE_URL,
    directUrl: process.env.DIRECT_URL,
  },
  tmdbApi: {
    url: process.env.TMDB_API_URL,
    key: process.env.TMDB_API_TOKEN,
  },
  cognito: {
    region: process.env.COGNITO_REGION,
    userPoolId: process.env.COGNITO_USER_POOL_ID,
    clientId: process.env.COGNITO_CLIENT_ID,
    clientSecret: process.env.COGNITO_CLIENT_SECRET,
    // Hosted UI domain without https://, e.g. cinemate.auth.eu-central-1.amazoncognito.com
    domain: process.env.COGNITO_DOMAIN,
    // must be registered as a callback URL of the app client
    redirectUri: process.env.COGNITO_REDIRECT_URI,
    // must be registered as a sign-out URL of the app client
    logoutUri: process.env.FRONTEND_URL,
  },
  // sign-in to a shared demo account (see docs/demo.md); off unless DEMO_MODE=true
  demo: {
    enabled: process.env.DEMO_MODE === 'true',
    resetIntervalMs: Number(process.env.DEMO_RESET_MINUTES ?? 60) * 60 * 1000,
    tokenSecret: process.env.DEMO_TOKEN_SECRET,
  },
  isDevMode: process.env.NODE_ENV === 'dev',
});
