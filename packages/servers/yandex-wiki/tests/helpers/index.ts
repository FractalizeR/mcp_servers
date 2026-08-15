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
  createDescendantsResponseFixture,
} from './page.fixture.js';

export { createGridFixture, createDeleteGridResultFixture } from './grid.fixture.js';

export { createResourcesResponseFixture } from './resource.fixture.js';

export { createSearchResponseFixture } from './search.fixture.js';

export { createCommentFixture, createCommentsResponseFixture } from './comment.fixture.js';

export { createPageAccessFixture } from './page-access.fixture.js';

export { createServerConfigFixture } from './server-config.fixture.js';

export {
  expectDefinitionMatchesSchema,
  validateGeneratedDefinition,
  expectDefinitionFullyValid,
  getValidationResult,
} from './schema-definition-matcher.js';
