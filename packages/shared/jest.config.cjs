/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  moduleFileExtensions: ['ts', 'js', 'json'],
  // shared 原始碼採 NodeNext（相對匯入帶 .js 副檔名）。測試以 CommonJS 轉譯，
  // 需把 './foo.js' 對映回 './foo'（ts source），否則 jest 找不到模組。
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      { tsconfig: { module: 'commonjs', moduleResolution: 'node', verbatimModuleSyntax: false } },
    ],
  },
};
