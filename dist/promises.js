import { _Proxy, _then, apply, construct, freezeClass, } from "./utils.js";
export class Promises {
    #promiseObjects = new WeakSet();
    #promiseObjectsHas = this.#promiseObjects.has.bind(this.#promiseObjects);
    #promiseObjectsAdd = this.#promiseObjects.add.bind(this.#promiseObjects);
    #deferredPromise(a) {
        const proxy = new _Proxy(a, {
            get: (target, p, receiver) => p === "then"
                ? (...args) => _then(target, ...args)
                : this.#deferredPromise(_then(target, (v) => v[p])),
            apply: (target, self, args) => this.#deferredPromise(_then(target, (v) => apply(v, self, args))),
            construct: (target, args, new_target) => this.#deferredPromise(_then(target, (v) => construct(v, args, new_target))),
        });
        this.#promiseObjectsAdd(proxy);
        return proxy;
    }
    get deferredPromise() {
        return (a) => this.#deferredPromise(a);
    }
    get promiseObjectsHas() {
        return this.#promiseObjectsHas;
    }
    get promiseObjectsAdd() {
        return this.#promiseObjectsAdd;
    }
}
freezeClass(Promises);
