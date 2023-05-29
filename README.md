# Class Interactor

An application for facilitating in-class interaction and a test-bed for [CSCI312 "Software Development"](https://catalog.middlebury.edu/courses/view/catalog/catalog%2FMCUG/course/course%2FCSCI0312).

## Creation

This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app). It uses Jest and Testing Library for testing, ESLint for static analysis, Prettier for styling, and is configured to use GitHub actions for testing pull requests.

Development dependencies installed with:

```plaintext
💻 npm install -D jest jest-environment-jsdom husky lint-staged prettier eslint-config-prettier @testing-library/react @testing-library/jest-dom eslint-plugin-testing-library
```

The module alias `@/` is configured for `src/`.

To enable sockets for real-time interaction, this application uses a custom server implemented with Express.

## Setup

### Dependencies

Install dependencies with `💻 npm install`

### Migration

Due to differences in how [knex and Next handle imports](https://github.com/knex/knex/issues/3849#issuecomment-643411244) we need to specify additional configuration when running knex commands. To assist, the configuration is built into a script. All knex commands should use `npm run knex ...`.

Initialize the database with:

```plaintext
💻 npm run knex migrate:latest
💻 npm run knex seed:run
```
