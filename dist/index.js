"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  default: () => src_default
});
module.exports = __toCommonJS(src_exports);
var import_path = __toESM(require("path"));
var import_magic_string = __toESM(require("magic-string"));
var import_bundle_require = require("bundle-require");
var createPlugins = () => {
  let useSourceMap = false;
  const loadCache = /* @__PURE__ */ new Map();
  let root = process.cwd();
  return [
    {
      name: "compile-time",
      enforce: "pre",
      configResolved(config) {
        useSourceMap = !!config.build.sourcemap;
        root = config.root;
      },
      configureServer(server) {
        server.watcher.on("all", (_, id2) => {
          for (const [k, cache2] of loadCache) {
            if (cache2.watchFiles?.includes(id2)) {
              loadCache.delete(k);
            }
          }
        });
      },
      async transform(code, id) {
        if (id.includes("node_modules") || !/\.(js|ts|jsx|tsx|mjs|vue|svelte)$/.test(id))
          return;
        const m = [...code.matchAll(/import\.meta\.compileTime(?:<[\w]*>)?\(['"`]([^'"`]+)['"`][,\s]*(.*[}\]])?\)+/g)];
        if (m.length === 0)
          return;
        const devalue = await import("devalue");
        const s = new import_magic_string.default(code);
        const dir = import_path.default.dirname(id);
        for (const item of m) {
          const start = item.index;
          const end = item.index + item[0].length;
          const filepath = import_path.default.resolve(dir, item[1]);
          const comptime_first_arg = { root, importer: { path: id, code: "" } };
          const comptime_second_arg = eval("(" + item[2] + ")");
          const cacheKey = filepath;
          let cache = loadCache.get(cacheKey);
          if (!cache) {
            const { mod, dependencies } = await (0, import_bundle_require.bundleRequire)({ filepath });
            const defaultExport = mod.default || mod;
            cache = defaultExport && await defaultExport(comptime_first_arg, comptime_second_arg) || {};
            cache.watchFiles = [filepath, ...cache.watchFiles || [], ...dependencies.map((p) => import_path.default.resolve(p))];
            if (cache.data) {
              cache.data = devalue.uneval(cache.data);
            }
            loadCache.set(cacheKey, cache);
          }
          let replacement = "null";
          if (cache.watchFiles) {
            cache.watchFiles.forEach((filepath2) => this.addWatchFile(filepath2));
          }
          if (cache.data !== void 0) {
            replacement = cache.data;
          } else if (cache.code !== void 0) {
            replacement = cache.code;
          }
          s.overwrite(start, end, replacement);
        }
        return {
          code: s.toString(),
          map: useSourceMap ? s.generateMap({ source: id }) : null
        };
      }
    }
  ];
};
var src_default = createPlugins;
