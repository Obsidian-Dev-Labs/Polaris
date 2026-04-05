export declare const rand: () => `${string}-${string}-${string}-${string}-${string}`;
export declare const _WeakRef: WeakRefConstructor;
export declare const _Proxy: ProxyConstructor;
export declare const _Promise: PromiseConstructor;
export declare const Generator: any;
export declare const _then: (thisArg: unknown, ...args: any[]) => unknown;
export declare const _catch: (thisArg: unknown, ...args: any[]) => unknown;
export declare const _finally: (thisArg: unknown, ...args: any[]) => unknown;
export declare const _next: any;
export declare const _throw: any;
export declare const _return: any;
export declare const deref: <T extends WeakKey>(ref: WeakRef<T>) => T | undefined;
export declare const isObject: (a: any) => boolean;
export declare const array: any;
export declare function skip<T, A extends T[]>(a: A, n?: number): Generator<T, void, void>;
export declare const set: typeof Reflect.set, apply: typeof Reflect.apply, construct: typeof Reflect.construct;
export declare const freeze: {
    <T extends Function>(f: T): T;
    <T extends {
        [idx: string]: U | null | undefined | object;
    }, U extends string | bigint | number | boolean | symbol>(o: T): Readonly<T>;
    <T>(o: T): Readonly<T>;
};
export declare function freezeClass(k: {
    prototype: any;
}): void;
export declare function canonGenerator<T extends Generator<A, B, C>, A, B, C>(g: T): Iterator<A, B, C>;
