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
    splitting: true, // Enable code splitting
    format: "esm", // Use ES modules
    define: {
      global: "globalThis",
      "process.env": JSON.stringify(process.env),
    },
    plugins: [
      {
        name: "node-polyfills",
        setup(build) {
          build.onResolve({ filter: /^(buffer|crypto)$/ }, (args) => {
            return { path: args.path, namespace: "node-polyfill" };
          });
          build.onLoad({ filter: /.*/, namespace: "node-polyfill" }, (args) => {
            if (args.path === "buffer") {
              return { contents: `export * from "buffer/"` };
            }
            if (args.path === "crypto") {
              return { contents: `export * from "crypto-browserify"` };
            }
          });
        },
      },
      // {
      //   name: "fix-arweave-import",
      //   setup(build) {
      //     build.onLoad({ filter: /.*/ }, async (args) => {
      //       try {
      //         const file = Bun.file(args.path);
      //         const exists = await file.exists();

      //         if (!exists) {
      //           console.warn(`File does not exist: ${args.path}`);
      //           return null; // Let Bun handle non-existent files
      //         }

      //         const text = await file.text();

      //         if (typeof text !== "string") {
      //           console.warn(`File content is not a string: ${args.path}`);
      //           return null; // Let Bun handle this file normally
      //         }

      //         const contents = text.replace(
      //           /var arweave = new common\.default\({/g,
      //           "var arweave = new Arweave({",
      //         );

      //         return { contents };
      //       } catch (error) {
      //         console.error(`Error processing file ${args.path}:`, error);
      //         return null; // Let Bun handle this file normally
      //       }
      //     });
      //   },
      // },
    ],
  });

  console.log(result);
  console.log("Build completed successfully!");
} catch (error) {
  console.error("Build failed:", error);
}
