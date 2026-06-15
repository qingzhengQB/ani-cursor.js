const resolve = require("@rollup/plugin-node-resolve").default;
const commonjs = require("@rollup/plugin-commonjs");
const typescript = require("@rollup/plugin-typescript");
const terser = require("@rollup/plugin-terser");

const sharedPlugins = [
  resolve({ browser: true, preferBuiltins: false }),
  commonjs(),
  typescript({
    tsconfig: "./tsconfig.json",
    declaration: false,
    emitDeclarationOnly: false,
    noEmit: false,
    sourceMap: true,
  }),
];

module.exports = [
  {
    input: "src/ani-cursor.ts",
    output: {
      file: "dist/ani-cursor.esm.js",
      format: "esm",
      sourcemap: true,
      exports: "named",
    },
    plugins: sharedPlugins,
  },
  {
    input: "src/ani-cursor.ts",
    output: {
      file: "dist/ani-cursor.umd.js",
      format: "umd",
      name: "AniCursor",
      sourcemap: true,
      exports: "named",
    },
    plugins: sharedPlugins,
  },
  {
    input: "src/ani-cursor.ts",
    output: {
      file: "dist/ani-cursor.umd.min.js",
      format: "umd",
      name: "AniCursor",
      sourcemap: true,
      exports: "named",
    },
    plugins: [...sharedPlugins, terser()],
  },
];