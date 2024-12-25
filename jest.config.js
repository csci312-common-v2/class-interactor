const nextJest = require("next/jest");

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: "./",
});

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ["@testing-library/jest-dom", "<rootDir>/jest.setup.js"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  // We create a custom environment to fill pieces of the browser environment that JSDOM does not provide
  // Based on: https://github.com/mswjs/mswjs.io/issues/292#issue-1977585807
  // We note that is not the recommended approach, but it is the only one that works for us so far without downgrading
  // Next, etc.
  testEnvironment: "<rootDir>/jsdom-extended.js",
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig);
