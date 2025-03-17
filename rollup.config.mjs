import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import resolve from "@rollup/plugin-node-resolve";
import typescript from "rollup-plugin-typescript2";

export default {
  input: "./src/extension.ts",
  output: { file: "./out/extension.js", format: "cjs" },
  external: ["vscode"],
  plugins: [
    typescript(
      {
        tsconfig: "tsconfig.json",
      },
    ),
    resolve(),
    commonjs(),
    json(),
  ],
};
