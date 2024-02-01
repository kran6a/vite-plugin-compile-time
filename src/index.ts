import path from "path";
import { Plugin } from "vite";
import MagicString from "magic-string";
import { bundleRequire } from "bundle-require";

type MaybePromise<T> = T | Promise<T>;

export type CompileTimeFunctionFirstArg = {
    /** Root directory of the Vite project */
    root: string,
    importer: {
        path: string,
        code: string
    }
}
export type CompileTimeFunctionSecondArg = Record<any, any> | Array<any>;

export type CompileTimeFunctionResult = MaybePromise<{
    /** Get data at compile time */
    data?: any
    /** Generate code at compile time */
    code?: string
    /** Trigger rebuild when watched files change */
    watchFiles?: string[]
}>;

export type CompileTimeFunction = (args: CompileTimeFunctionFirstArg, props?: CompileTimeFunctionSecondArg) => CompileTimeFunctionResult;

const createPlugins = (): Plugin[] => {
    let useSourceMap = false;
    const loadCache: Map<string, { data?: any; code?: string; watchFiles?: string[] }> = new Map();
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
                server.watcher.on("all", (_, id) => {
                    for (const [k, cache] of loadCache) {
                        if (cache.watchFiles?.includes(id)) {
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

                const devalue = await import('devalue');
                const s = new MagicString(code);
                const dir = path.dirname(id);
                for (const item of m) {
                    const start = item.index!;
                    const end = item.index! + item[0].length;
                    const filepath = path.resolve(dir, item[1]);
                    const comptime_first_arg = {root, importer: {path: id, code: ''}};
                    const comptime_second_arg = eval('('+item[2]+')');
                    const cacheKey = filepath;
                    let cache = loadCache.get(cacheKey);
                    if (!cache) {
                        const { mod, dependencies } = await bundleRequire({ filepath });
                        const defaultExport: CompileTimeFunction | undefined = mod.default || mod;
                        cache = (defaultExport && (await defaultExport(comptime_first_arg, comptime_second_arg))) || {};

                        cache.watchFiles = [filepath, ...(cache.watchFiles || []), ...dependencies.map((p) => path.resolve(p))];
                        if (cache.data) {
                            cache.data = devalue.uneval(cache.data);
                        }
                        loadCache.set(cacheKey, cache);
                    }

                    let replacement = "null";
                    if (cache.watchFiles) {
                        cache.watchFiles.forEach((filepath) => this.addWatchFile(filepath));
                    }
                    if (cache.data !== undefined) {
                        replacement = cache.data;
                    } else if (cache.code !== undefined) {
                        replacement = cache.code;
                    }

                    s.overwrite(start, end, replacement);
                }
                return {
                    code: s.toString(),
                    map: useSourceMap ? s.generateMap({ source: id }) : null,
                }
            },
        },
    ]
}

export default createPlugins;
