import { build } from "bun";
import { cpSync, mkdirSync, rmSync, existsSync } from "fs";
import { resolve, dirname, join } from "path";

const rootDir = resolve(process.cwd());

console.log("Deleting existing dist directory...");
rmSync(join(rootDir, "dist"), { recursive: true, force: true });

mkdirSync(join(rootDir, "dist"), { recursive: true });

const filesToCopy = [
  { from: "src/index.html", to: "dist/index.html" },
  { from: "src/styles.css", to: "dist/styles.css" },
];

filesToCopy.forEach((file) => {
  const fromPath = join(rootDir, file.from);
  const toPath = join(rootDir, file.to);
  if (existsSync(fromPath)) {
    const destinationDir = dirname(toPath);
    mkdirSync(destinationDir, { recursive: true });
    cpSync(fromPath, toPath, { recursive: true });
    console.log(`Copied ${file.from} to ${file.to}`);
  } else {
    console.warn(`Warning: ${file.from} does not exist and was not copied.`);
  }
});

try {
  let result = await build({
    entrypoints: [join(rootDir, "src/index.js")],
    outdir: join(rootDir, "dist/"),
    minify: false,
    target: "browser",
    splitting: false, // Enable code splitting
    format: "esm", // Use ES modules
    define: {
      global: "globalThis",
      "process.env": JSON.stringify(process.env),
    },
    plugins: [
      {
        name: "node-polyfills",
        setup(build) {
          build.onResolve({ filter: /^(buffer|crypto|path)$/ }, (args) => {
            return { path: require.resolve(args.path), namespace: "node-polyfill" };
          });

          build.onLoad({ filter: /.*/, namespace: "node-polyfill" }, (args) => {
            if (args.path === require.resolve("buffer")) {
              return { contents: `export * from "buffer/"` };
            }
            if (args.path === require.resolve("crypto")) {
              return { contents: `export * from "crypto-browserify"` };
            }
            if (args.path === require.resolve("path")) {
              return { contents: `export * from "path-browserify"` };
            }
          });
        },
      },
      {
        name: "commonjs",
        setup(build) {
          build.onResolve({ filter: /^arweave$/ }, (args) => {
            return { path: require.resolve('arweave/web'), namespace: 'commonjs' };
          });

          build.onLoad({ filter: /.*/, namespace: 'commonjs' }, async (args) => {
            const contents = await Bun.file(args.path).text();
            return {
              contents,
              loader: 'js',
            };
          });
        },
      },
    ],
  });

  console.log(result);
  console.log("Build completed successfully!");
} catch (error) {
  console.error("Build failed:", error);
}
