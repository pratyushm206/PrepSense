const globals = require('globals');

const sharedRules = {
  'no-undef': 'error',
  'no-unused-vars': 'warn'
};

module.exports = [
  {
    files: ['src/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser, React: 'readonly' },
      parserOptions: { ecmaFeatures: { jsx: true } }
    },
    rules: sharedRules
  },
  {
    files: ['controllers/**/*.js', 'routes/**/*.js', 'middleware/**/*.js', 'models/**/*.js', 'services/**/*.js', 'config/**/*.js', 'scripts/**/*.js', 'tests/**/*.js', 'e2e/**/*.js', 'e2e/**/*.cjs', 'server.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: globals.node,
      parserOptions: { ecmaFeatures: { jsx: true } }
    },
    rules: sharedRules
  },
  {
    files: ['e2e/**/*.{js,cjs}'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } }
  }
];
