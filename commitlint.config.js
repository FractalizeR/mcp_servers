/**
 * Commitlint configuration for conventional commits
 *
 * Format: <type>(<scope>): <subject>
 *
 * Types:
 * - feat: New feature (→ minor version)
 * - fix: Bug fix (→ patch version)
 * - perf: Performance improvement (→ patch version)
 * - refactor: Code refactoring (→ patch version)
 * - docs: Documentation only
 * - style: Code style changes (formatting, etc)
 * - test: Adding/updating tests
 * - chore: Maintenance tasks
 * - ci: CI/CD changes
 *
 * Breaking changes: Add "!" after type or include "BREAKING CHANGE:" in body
 * Example: feat!: remove deprecated API → major version
 */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Type must be one of the allowed values
    'type-enum': [
      2,
      'always',
      [
        'feat', // New feature
        'fix', // Bug fix
        'perf', // Performance improvement
        'refactor', // Code refactoring
        'docs', // Documentation
        'style', // Code style
        'test', // Tests
        'chore', // Maintenance
        'ci', // CI/CD
        'build', // Build system
        'revert', // Revert commit
      ],
    ],
    // Type is required
    'type-empty': [2, 'never'],
    // Subject is required
    'subject-empty': [2, 'never'],
    // Subject max length
    'subject-max-length': [2, 'always', 100],
    // Header max length
    'header-max-length': [2, 'always', 120],
    // Body max line length (more relaxed for AI)
    'body-max-line-length': [1, 'always', 200],
    // Footer max line length
    'footer-max-line-length': [1, 'always', 200],
  },
};
