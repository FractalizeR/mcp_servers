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

export { createGridFixture, createDeleteGridResultFixture } from './grid.fixture.js';

export { createResourcesResponseFixture } from './resource.fixture.js';

export {
  expectDefinitionMatchesSchema,
  validateGeneratedDefinition,
  expectDefinitionFullyValid,
  getValidationResult,
} from './schema-definition-matcher.js';
