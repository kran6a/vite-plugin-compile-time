import { Plugin } from 'vite';

type MaybePromise<T> = T | Promise<T>;
type CompileTimeFunctionFirstArg = {
    /** Root directory of the Vite project */
    root: string;
    importer: {
        path: string;
        code: string;
    };
};
type CompileTimeFunctionSecondArg = Record<any, any> | Array<any>;
type CompileTimeFunctionResult = MaybePromise<{
    /** Get data at compile time */
    data?: any;
    /** Generate code at compile time */
    code?: string;
    /** Trigger rebuild when watched files change */
    watchFiles?: string[];
}>;
type CompileTimeFunction = (args: CompileTimeFunctionFirstArg, props?: CompileTimeFunctionSecondArg) => CompileTimeFunctionResult;
declare const createPlugins: () => Plugin[];

export { CompileTimeFunction, CompileTimeFunctionFirstArg, CompileTimeFunctionResult, CompileTimeFunctionSecondArg, createPlugins as default };
