module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/uis/backoffice/auth-shared", "<rootDir>/lib"],
  testMatch: ["**/*.test.ts"],
  moduleNameMapper: {
    "^@brasaland/auth-shared/(.*)$": "<rootDir>/uis/backoffice/auth-shared/$1",
  },
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { diagnostics: false }],
  },
  collectCoverageFrom: [
    "uis/backoffice/auth-shared/*.ts",
    "!uis/backoffice/auth-shared/*.test.ts",
    "lib/*.ts",
    "!lib/*.test.ts",
  ],
  coverageDirectory: "coverage/auth-shared",
  clearMocks: true,
  restoreMocks: true,
};
