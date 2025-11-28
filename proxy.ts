type ObjTy = "object" | "function";
type Core = { local: string; type: ObjTy };
type ObjectRefPacket =
  | [0, ObjTy, string]
  | [1, string | number | boolean | null | undefined];
type Packet = [0, boolean, string];
const rand = crypto.randomUUID.bind(crypto);
const _WeakRef = WeakRef;
const deref: <T extends WeakKey>(ref: WeakRef<T>) => T | undefined =
  WeakRef.prototype.deref.call.bind(WeakRef.prototype.deref) as any;
export class Reactor {
  readonly #coreMap: WeakMap<WeakKey, Core> = new WeakMap();
  readonly #coreMapGet: (a: WeakKey) => Core | undefined =
    this.#coreMap.get.bind(this.#coreMap);
  readonly #coreMapSet: (a: WeakKey, c: Core) => void = this.#coreMap.set.bind(
    this.#coreMap
  );
  readonly #remoteReg = new FinalizationRegistry<string>((a) =>
    this.#releaseRemoteObject(a)
  );
  readonly #remoteRegister: (a: WeakKey, x: string) => void =
    this.#remoteReg.register.bind(this.#remoteReg);
  #socket: (msg: any) => any;
  #objects: { [a: string]: WeakRef<any> } = Object.create(null);
  #heldObjects: { [a: string]: any } = Object.create(null);
  #holdObject(a: string) {
    this.#heldObjects[a] ??= deref(this.#objects[a]);
  }
  #releaseObject(a: string) {
    delete this.#heldObjects[a];
  }
  #getObjectRef(a: any): ObjectRefPacket {
    if (typeof a === "object" || typeof a === "function") {
      const g = this.#coreMapGet(a);
      if (g) return [0, g.type, g.local];
      const s = rand();
      this.#coreMapSet(a, {
        local: ((this.#objects[s] = new _WeakRef(a)), s),
        type: typeof a as ObjTy,
      });
      return [0, typeof a as ObjTy, s];
    } else {
      return [1, a];
    }
  }
  #getObjectFromRef(p: ObjectRefPacket): any {
    switch (p[0]) {
      case 0:
        return deref(this.#objects[p[1]]);
      case 1:
        return p[1];
    }
  }
  #holdRemoteObject(a: string) {
    this.#socket([0, true, a]);
  }
  #releaseRemoteObject(a: string) {
    this.#socket([0, false, a]);
  }
  #newProxy(a: string, type: ObjTy) {
    this.#holdRemoteObject(a);
    const proxy = new Proxy(
      type === "object"
        ? { __proto__: null }
        : function (this: any, ...args: any[]) {
            const self = this;
            const target = new.target;
          },
      {}
    );
    this.#remoteRegister(proxy, a);
    return proxy;
  }
  constructor(socket: (msg: Packet) => any) {
    this.#socket = socket;
  }
  get handler() {
    return (msg: Packet) => {};
  }
}
