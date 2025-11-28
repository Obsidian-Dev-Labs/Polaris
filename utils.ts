export const rand = crypto.randomUUID.bind(crypto);
export const _WeakRef = WeakRef;
export const _Proxy = Proxy;
export const _Promise = Promise;
export const then = _Promise.prototype.then.call.bind(_Promise.prototype.then);
export const _catch = _Promise.prototype.catch.call.bind(
  _Promise.prototype.catch
);
export const _finally = _Promise.prototype.finally.call.bind(
  _Promise.prototype.finally
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
