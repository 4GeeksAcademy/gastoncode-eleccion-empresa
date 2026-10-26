module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/uis/backoffice/auth-shared"],
  testMatch: ["**/*.test.ts"],
  collectCoverageFrom: ["uis/backoffice/auth-shared/*.ts", "!uis/backoffice/auth-shared/*.test.ts"],
  coverageDirectory: "coverage/auth-shared",
  clearMocks: true,
  restoreMocks: true,
};
