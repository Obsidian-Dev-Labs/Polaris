import {
  rand,
  _Promise,
  _Proxy,
  _WeakRef,
  _catch,
  _finally,
  _then,
  isObject,
  deref,
  apply,
  construct,
  array,
  set,
  skip,
  freezeClass,
} from "./utils";
export class Promises {
  readonly #promiseObjects: WeakSet<Promise<any>> = new WeakSet();
  readonly #promiseObjectsHas: (v: Promise<any>) => boolean =
    this.#promiseObjects.has.bind(this.#promiseObjects);
  readonly #promiseObjectsAdd: (v: Promise<any>) => void =
    this.#promiseObjects.add.bind(this.#promiseObjects);
  #deferredPromise<T>(a: Promise<T>): Promise<T> {
    const proxy = new _Proxy(a, {
      get: (target, p, receiver) =>
        p === "then"
          ? (...args: any[]) => _then(target,...args)
          : this.#deferredPromise(
            _then(target, (v: any) => v[p]) as Promise<any>
          ),
      apply: (target, self, args) =>
        this.#deferredPromise(
          _then(target, (v: any) => apply(v, self, args)) as Promise<any>
        ),
      construct: (target, args, new_target) =>
        this.#deferredPromise(
          _then(target, (v: any) =>
            construct(v, args, new_target)
          ) as Promise<any>
        ),
    });
    this.#promiseObjectsAdd(proxy);
    return proxy;
  }
  get deferredPromise() {
    return <T>(a: Promise<T>) => this.#deferredPromise(a);
  }
  get promiseObjectsHas() {
    return this.#promiseObjectsHas;
  }
  get promiseObjectsAdd() {
    return this.#promiseObjectsAdd;
  }
}

freezeClass(Promises);