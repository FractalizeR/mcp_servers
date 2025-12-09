// tests/helpers/index.ts
export {
  createMockLogger,
  createMockHttpClient,
  createMockCacheManager,
  createMockFacade,
  createPartialMock,
} from './mock-factories.js';

export {
  createPageFixture,
  createAsyncOperationFixture,
  createDeleteResultFixture,
} from './page.fixture.js';

export {
  expectDefinitionMatchesSchema,
  validateGeneratedDefinition,
  expectDefinitionFullyValid,
  getValidationResult,
} from './schema-definition-matcher.js';
