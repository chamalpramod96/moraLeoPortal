import js from '@eslint/js';
import react from 'eslint-plugin-react';
import hooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default [
  { ignores: ['dist/**', 'node_modules/**', 'tests/rules/**'] },
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { react, 'react-hooks': hooks },
    settings: { react: { version: '18' } },
    rules: {
      ...react.configs.recommended.rules,
      ...hooks.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',     // not needed with the new JSX transform
      'react/prop-types': 'off',             // plain JS project, no PropTypes
      'react/no-unescaped-entities': 'off',  // apostrophes in copy are fine
      'no-unused-vars': ['error', { varsIgnorePattern: '^_', args: 'none', ignoreRestSiblings: true }],
    },
  },
  {
    // Build and test config files run in Node
    files: ['*.config.js', '**/*.test.js'],
    languageOptions: { globals: { ...globals.node } },
  },
];
