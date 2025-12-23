export declare const rand: any;
export declare const _WeakRef: WeakRefConstructor;
export declare const _Proxy: ProxyConstructor;
export declare const _Promise: PromiseConstructor;
export declare const _then: any;
export declare const _catch: any;
export declare const _finally: any;
export declare const deref: <T extends WeakKey>(ref: WeakRef<T>) => T | undefined;
export declare const isObject: (a: any) => boolean;
export declare const array: any;
export declare function skip<T, A extends T[]>(a: A, n?: number): Generator<T, void, void>;
export declare const set: typeof Reflect.set, apply: typeof Reflect.apply, construct: typeof Reflect.construct;
export declare function freezeClass(k: {
    prototype: any;
}): void;
