export const rand = crypto.randomUUID.bind(crypto);
export const _WeakRef = WeakRef;
export const _Proxy = Proxy;
export const _Promise = Promise;
export const Generator = Object.getPrototypeOf((function* () { })()).constructor;
export const _then = _Promise.prototype.then.call.bind(_Promise.prototype.then);
export const _catch = _Promise.prototype.catch.call.bind(_Promise.prototype.catch);
export const _finally = _Promise.prototype.finally.call.bind(_Promise.prototype.finally);
export const _next = Generator.prototype.next.call.bind(Generator.prototype.next);
export const _throw = Generator.prototype.throw.call.bind(Generator.prototype.throw);
export const _return = Generator.prototype.return.call.bind(Generator.prototype.return);
export const deref = WeakRef.prototype.deref.call.bind(WeakRef.prototype.deref);
export const isObject = (a) => typeof a === "object" || typeof a === "function" || typeof a === "symbol";
export const array = (...args) => args;
export function* skip(a, n = 0) {
    while (n !== a.length) {
        yield a[n];
        n++;
    }
}
export const { set, apply, construct } = Reflect;
export const { freeze } = Object;
export const { isArray } = Array;
export function freezeClass(k) {
    freeze(k);
    freeze(k.prototype);
}
export function canonGenerator(g) {
    return freeze({
        __proto__: null,
        next: (...args) => _next(g, ...args),
        throw: (...args) => _throw(g, ...args),
        return: (...args) => _return(g, ...args),
    });
}
