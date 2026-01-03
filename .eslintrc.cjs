module.exports = {
  "env": {
    "browser": true,
    "es2021": true,
    "node": true,
    "mocha": true,
  },
  "extends": "eslint:recommended",
  "overrides": [
    {
      "env": {
        "node": true,
        "es6": true,
      },
      "files": [".eslintrc.{js,cjs}"],
      "parserOptions": {
        "sourceType": "script",
      },
    },
  ],
  "parserOptions": {
    "ecmaVersion": "latest",
    "sourceType": "module",
  },
  "globals": {
    "process": "readonly",
  },
  "rules": {
    "indent": ["error", 2],
    "quotes": ["error", "double"],
    "semi": ["error", "always"],
  },
};
