const { NxWebpackPlugin } = require('@nx/webpack');
const CopyPlugin = require('copy-webpack-plugin');
const { join } = require('path');
const { IgnorePlugin, optimize } = require('webpack');

// Single-file bundle for AWS Lambda: every dependency is bundled (no node_modules in the
// package).
const prismaClient = join(__dirname, '../../node_modules/.prisma/client');

module.exports = {
  output: {
    path: join(__dirname, '../../dist/apps/backend-lambda'),
    libraryTarget: 'commonjs2',
  },
  plugins: [
    // Nest loads these in a try/catch and only when the matching feature is used
    new IgnorePlugin({
      resourceRegExp:
        /^(@nestjs\/(microservices|websockets)(\/.*)?|@fastify\/.*|class-transformer\/storage)$/,
    }),
    // one file: the lazy import of AppModule must not create extra chunks
    new optimize.LimitChunkCountPlugin({ maxChunks: 1 }),
    new NxWebpackPlugin({
      target: 'node',
      compiler: 'tsc',
      main: './src/lambda.ts',
      tsConfig: './tsconfig.app.json',
      externalDependencies: 'none',
      generatePackageJson: false,
      optimization: false,
      outputHashing: 'none',
      sourceMap: true,
    }),
    // Prisma finds its query engine and schema next to the bundle
    new CopyPlugin({
      patterns: [
        {
          from: join(
            prismaClient,
            'libquery_engine-rhel-openssl-3.0.x.so.node'
          ),
        },
        { from: join(prismaClient, 'schema.prisma') },
      ],
    }),
  ],
};
