export const rand = crypto.randomUUID.bind(crypto);
export const _WeakRef = WeakRef;
export const _Proxy = Proxy;
export const _Promise = Promise;
export const Generator = Object.getPrototypeOf((function* () {})()).constructor;

export const _then = _Promise.prototype.then.call.bind(_Promise.prototype.then);

export const _catch = _Promise.prototype.catch.call.bind(
  _Promise.prototype.catch
);
export const _finally = _Promise.prototype.finally.call.bind(
  _Promise.prototype.finally
);
export const _next = Generator.prototype.next.call.bind(Generator.prototype.next);
export const _throw = Generator.prototype.throw.call.bind(
  Generator.prototype.throw
);
export const _return = Generator.prototype.return.call.bind(
  Generator.prototype.return
);
export const deref: <T extends WeakKey>(ref: WeakRef<T>) => T | undefined =
  WeakRef.prototype.deref.call.bind(WeakRef.prototype.deref) as any;
export const isObject = (a: any): boolean =>
  typeof a === "object" || typeof a === "function" || typeof a === "symbol";
export const array: any = (...args: any[]) => args;
export function* skip<T, A extends T[]>(
  a: A,
  n: number = 0
): Generator<T, void, void> {
  while (n !== a.length) {
    yield a[n];
    n++;
  }
}
export const { set, apply, construct } = Reflect;
export const {freeze} = Object;
export function freezeClass(k: { prototype: any }) {
  freeze(k);
  freeze(k.prototype);
}
export function canonGenerator<T extends Generator<A, B, C>, A, B, C>(g: T): Iterator<A, B, C> {
  return freeze({
    __proto__: null,
    next: (...args: any[]) => _next(g,...args),
    throw: (...args: any[]) => _throw(g,...args),
    return: (...args: any[]) => _return(g,...args),
  })
}