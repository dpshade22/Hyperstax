import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

// Dynamically import the plugins
const CopyWebpackPlugin = await import("copy-webpack-plugin").then(
  (module) => module.default,
);
const NodePolyfillPlugin = await import("node-polyfill-webpack-plugin").then(
  (module) => module.default,
);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname);

const distDir = path.join(rootDir, "dist");
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(distDir, { recursive: true });

export default {
  entry: path.join(rootDir, "src/index.js"),
  output: {
    path: distDir,
    filename: "bundle.js",
    libraryTarget: "module",
  },
  mode: "development",
  target: "web",
  experiments: {
    outputModule: true,
  },
  resolve: {
    fallback: {
      buffer: "buffer/",
      crypto: "crypto-browserify",
      path: "path-browserify",
    },
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        { from: "src/index.html", to: "index.html" },
        { from: "src/styles.css", to: "styles.css" },
        { from: "src/fonts", to: "fonts" },
      ],
    }),
    new NodePolyfillPlugin(),
  ],
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: ["@babel/preset-env"],
          },
        },
      },
    ],
  },
};
