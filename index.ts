type ObjTy = "object" | "function" | "symbol";
type Core =
  | { local: string; type: ObjTy }
  | { remote: string; remote_type: ObjTy };
type ObjectRefPacket =
  | [0, ObjTy, string]
  | [1, string | number | boolean | null | undefined]
  | [2, ObjTy, string];
type ObjectRefPackets = any[]; //TODO: fix
type Packet = [0, boolean, string] | [1, string, ...ObjectRefPacket];
const rand = crypto.randomUUID.bind(crypto);
const _WeakRef = WeakRef;
const deref: <T extends WeakKey>(ref: WeakRef<T>) => T | undefined =
  WeakRef.prototype.deref.call.bind(WeakRef.prototype.deref) as any;
const isObject = (a: any): boolean =>
  typeof a === "object" || typeof a === "function" || typeof a === "symbol";
const array: any = (...args: any[]) => args;
function* skip<T, A extends T[]>(a: A, n: number): Generator<T, void, void> {
  while (n !== a.length) {
    yield a[n];
    n++;
  }
}
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
  #remoteObjects: { [a: string]: WeakRef<any> } = Object.create(null);
  #heldObjects: { [a: string]: any } = Object.create(null);
  readonly #holdObject = (a: string) => {
    this.#heldObjects[a] ??= deref(this.#objects[a]);
  };
  readonly #releaseObject = (a: string) => {
    delete this.#heldObjects[a];
  };
  #getObjectRef(a: any): ObjectRefPacket {
    if (isObject(a)) {
      const g = this.#coreMapGet(a);
      if (g) {
        if ("remote" in g) return [2, g.remote_type, g.remote];
        return [0, g.type, g.local];
      }
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
  *#getObjectsFromRef(packet: ObjectRefPackets): Generator<any, void, void> {
    let i = 0;
    while (i != packet.length)
      switch (packet[i]) {
        case 0:
          yield deref(this.#objects[packet[i + 2]]);
          i += 3;
          break;
        case 2:
          yield this.#newProxy(packet[i + 2], packet[i + 1]);
          i += 3;
          break;
        case 1:
          yield packet[i + 1];
          i += 2;
          break;
      }
  }
  #getObjectFromRef(packet: ObjectRefPacket): any {
    return this.#getObjectsFromRef(packet).next().value;
  }
  #holdRemoteObject(a: string) {
    this.#socket([0, true, a]);
  }
  #releaseRemoteObject(a: string) {
    this.#socket([0, false, a]);
  }
  *#proxyPackets(packet: ObjectRefPackets): Generator<any, void, void> {
    let i = 0;
    while (i != packet.length)
      switch (packet[i]) {
        case 0:
          yield this.#newProxy(packet[i + 2], packet[i + 1]);
          i += 3;
          break;
        case 2:
          yield deref(this.#objects[packet[i + 2]]);
          i += 3;
          break;
        case 1:
          yield packet[i + 1];
          i += 2;
          break;
      }
  }
  #proxyPacket(packet: ObjectRefPacket): any {
    return this.#proxyPackets(packet).next().value;
  }
  #newProxy(a: string, type: ObjTy) {
    const d =
      a in this.#remoteObjects ? deref(this.#remoteObjects[a]) : undefined;
    if (d !== undefined) return d;
    this.#holdRemoteObject(a);
    const proxy = new Proxy(
      type === "object"
        ? { __proto__: null }
        : function (this: any, ...args: any[]) {
            const self = this;
            const target = new.target;
          },
      {
        get: (target, p, receiver) => {
          const packet: ObjectRefPacket = this.#socket(
            array(1, a, ...this.#getObjectRef(p))
          );
          return this.#proxyPacket(packet);
        },
      }
    );
    this.#remoteObjects[a] = new _WeakRef(proxy);
    this.#remoteRegister(proxy, a);
    this.#coreMapSet(proxy, { remote: a, remote_type: type });
    return proxy;
  }
  constructor(socket: (msg: Packet) => any) {
    this.#socket = socket;
  }
  get handler() {
    return (msg: Packet) => {
      switch (msg[0]) {
        case 0:
          (msg[1] ? this.#holdObject : this.#releaseObject)(msg[2]);
          return;
        case 1:
          const obj = deref(this.#objects[msg[1]]);
          return this.#getObjectRef(
            obj?.[this.#getObjectFromRef([...skip(msg, 2)] as ObjectRefPacket)]
          );
      }
    };
  }
}
