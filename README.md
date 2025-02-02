# Class Interactor

An application for facilitating in-class interaction and a test-bed for [CSCI312 "Software Development"](https://catalog.middlebury.edu/courses/view/catalog/catalog%2FMCUG/course/course%2FCSCI0312).

## Creation

This is a [PNPM](https://pnpm.io)-based [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app). It uses Vitest and Testing Library for testing, ESLint for static analysis, Prettier for styling, and is configured to use GitHub actions for testing pull requests.

Development dependencies installed with:

```plaintext
💻 pnpm install -D  vitest @vitejs/plugin-react vite-tsconfig-paths jsdom husky lint-staged prettier eslint-config-prettier @testing-library/react @testing-library/jest-dom eslint-plugin-testing-library
```

The module alias `@/` is configured for `src/`.

To enable sockets for real-time interaction, this application uses a custom server with NextJS.

## Setup

### Dependencies

Install application dependencies with `💻 pnpm install`.

You will also need to have Docker installed on your development system. This application is designed to use the PostgreSQL RDBMS for testing, development and production. It will automatically start (and stop) ephemeral database servers in containers for tests and database server with persistent storage in a container for development.

For development you will need to specify the `DATABASE_URL` in the `.env.development.local` file that matches the specifications in `docker-compose.dev.yml`, e.g.,

```plaintext
DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres
```

### RDBMS Migration and Seeding

Database migration and seeding is implemented with Knex.js. Due to differences in how [knex and Next handle imports](https://github.com/knex/knex/issues/3849#issuecomment-643411244) we need to specify additional configuration when running knex commands. To assist, the configuration is built into a script. All knex commands should use `npm run knex ...`.

Initialize the database with:

```plaintext
💻 pnpm run knex migrate:latest
💻 pnpm run knex seed:run
```

To change the environment specify `NODE_ENV` before the command ot specify with environment variables and knex environment to use, e.g., `💻 NODE_ENV=production npm run knex migrate:latest`.
