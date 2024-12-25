/* eslint-disable */
const JSDOMEnvironment = require("jest-environment-jsdom").default;

class JSDOMEnvironmentExtended extends JSDOMEnvironment {
  constructor(config, context) {
    // Override customExportConditions in testEnvironmentOptions when using this custom environment.
    // We do this here instead of in jest.config.js to not override the default testEnvironmentOptions
    // for other environments, specifically the node environment.
    const updatedConfig = {
      ...config,
      projectConfig: {
        ...config.projectConfig,
        testEnvironmentOptions: {
          ...config.projectConfig.testEnvironmentOptions,
          customExportConditions: [""],
        },
      },
    };
    super(updatedConfig, context);

    this.global.ReadableStream = ReadableStream;
    this.global.TextDecoder = TextDecoder;
    this.global.TextEncoder = TextEncoder;

    this.global.Blob = Blob;
    this.global.File = File;
    this.global.Headers = Headers;
    this.global.FormData = FormData;
    this.global.Request = Request;
    this.global.Response = Response;
    this.global.Request = Request;
    this.global.Response = Response;
    this.global.fetch = fetch;
    this.global.structuredClone = structuredClone;
  }
}

module.exports = JSDOMEnvironmentExtended;
