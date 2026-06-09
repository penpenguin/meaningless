module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      comment: 'Circular dependencies make ownership and refactoring boundaries unclear.',
      from: {},
      to: {
        circular: true
      }
    },
    {
      name: 'no-unresolvable',
      severity: 'error',
      comment: 'Imports must resolve the same way they do during typecheck and build.',
      from: {},
      to: {
        couldNotResolve: true
      }
    },
    {
      name: 'no-production-to-tests',
      severity: 'error',
      comment: 'Production modules must not depend on test-only modules.',
      from: {
        path: '^src/',
        pathNot: ['(?:\\.test\\.ts$|/__tests__/|/fixtures/)']
      },
      to: {
        path: '(?:\\.test\\.ts$|/__tests__/|/fixtures/)'
      }
    },
    {
      name: 'no-domain-to-ui',
      severity: 'error',
      comment: 'Domain and utility layers must not import UI or app-shell modules.',
      from: {
        path: '^src/(?:content|game|types|utils)/',
        pathNot: '\\.test\\.ts$'
      },
      to: {
        path: '^src/(?:components|AdvancedAquariumApp|main)'
      }
    },
    {
      name: 'no-ui-to-app-shell',
      severity: 'error',
      comment: 'Reusable UI modules should not depend on application entrypoints.',
      from: {
        path: '^src/(?:components|assets|content|game|types|utils)/',
        pathNot: '\\.test\\.ts$'
      },
      to: {
        path: '^src/(?:AdvancedAquariumApp|main)'
      }
    }
  ],
  options: {
    doNotFollow: {
      path: 'node_modules',
      dependencyTypes: [
        'npm',
        'npm-dev',
        'npm-optional',
        'npm-peer',
        'npm-bundled',
        'npm-no-pkg'
      ]
    },
    tsConfig: {
      fileName: 'tsconfig.json'
    }
  }
}
