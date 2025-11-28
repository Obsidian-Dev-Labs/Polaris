type ObjTy = "object" | "function" | "symbol";
type Core =
  | { local: string; type: ObjTy }
  | { remote: string; remote_type: ObjTy };
type ObjectRefPacket =
  | [0, ObjTy, string]
  | [1, string | number | boolean | null | undefined]
  | [2, ObjTy, string];
type ObjectRefPackets = any[]; //TODO: fix
type Packet =
  | [0, boolean, string]
  | [1, string, ...ObjectRefPacket]
  | [2, string, ...ObjectRefPacket, ...ObjectRefPacket]
  | [3, string, ...ObjectRefPacket, ...ObjectRefPacket, ...ObjectRefPackets];
const rand = crypto.randomUUID.bind(crypto);
const _WeakRef = WeakRef;
const _Proxy = Proxy;
const _Promise = Promise;
const then = _Promise.prototype.then.call.bind(_Promise.prototype.then);
const _catch = _Promise.prototype.catch.call.bind(_Promise.prototype.catch);
const _finally = _Promise.prototype.finally.call.bind(
  _Promise.prototype.finally
);
const deref: <T extends WeakKey>(ref: WeakRef<T>) => T | undefined =
  WeakRef.prototype.deref.call.bind(WeakRef.prototype.deref) as any;
const isObject = (a: any): boolean =>
  typeof a === "object" || typeof a === "function" || typeof a === "symbol";
const array: any = (...args: any[]) => args;
function* skip<T, A extends T[]>(
  a: A,
  n: number = 0
): Generator<T, void, void> {
  while (n !== a.length) {
    yield a[n];
    n++;
  }
}
const { set, apply, construct } = Reflect;

export class Reactor {
  readonly #unsync: boolean;
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
    for (var x of this.#getObjectsFromRef(packet)) return x;
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
    for (var x of this.#proxyPackets(packet)) return x;
  }
  #deferredPromise<T>(a: Promise<T>): Promise<T> {
    return new _Proxy(a, {
      get: (target, p, receiver) =>
        p === "then"
          ? (...args: any[]) => then(p, ...args)
          : this.#deferredPromise(
              then(target, async (v: any) => v[await p]) as Promise<any>
            ),
      apply: (target, self, args) =>
        this.#deferredPromise(
          then(target, async (v: any) =>
            apply(v, await self, args)
          ) as Promise<any>
        ),
      construct: (target, args, new_target) =>
        this.#deferredPromise(
          then(target, async (v: any) =>
            construct(v, args, await new_target)
          ) as Promise<any>
        ),
    });
  }
  #unsyncMap<T>(a: any, f: (a: any) => T): T | Promise<T> {
    if (this.#unsync)
      return this.#deferredPromise(then(a, (a: any) => f(a)) as Promise<T>);
    return f(a);
  }
  #newProxy(a: string, type: ObjTy) {
    const d =
      a in this.#remoteObjects ? deref(this.#remoteObjects[a]) : undefined;
    if (d !== undefined) return d;
    this.#holdRemoteObject(a);
    const proxy = new _Proxy(
      type === "object"
        ? { __proto__: null }
        : ((r) =>
            function (this: any, ...args: any[]) {
              const self = this;
              const target = new.target;
              const packet = r.#socket(
                array(
                  3,
                  a,
                  ...[
                    ...skip(r.#getObjectRef(self)),
                    ...skip(r.#getObjectRef(target)),
                    ...(function* () {
                      for (var arg of skip(args))
                        for (var packet of skip(r.#getObjectRef(arg)))
                          yield packet;
                    })(),
                  ]
                )
              );
              return r.#unsyncMap(packet, (a) => r.#proxyPacket(a));
            })(this),
      {
        get: (target, p, receiver) => {
          const packet: ObjectRefPacket = this.#socket(
            array(1, a, ...this.#getObjectRef(p))
          );
          return this.#unsyncMap(packet, (a) => this.#proxyPacket(a));
        },
        set: (target, p, newValue, reciever) =>
          this.#socket(
            array(
              2,
              a,
              ...[
                ...skip(this.#getObjectRef(p)),
                ...skip(this.#getObjectRef(newValue)),
              ]
            )
          ),
      }
    );
    this.#remoteObjects[a] = new _WeakRef(proxy);
    this.#remoteRegister(proxy, a);
    this.#coreMapSet(proxy, { remote: a, remote_type: type });
    return proxy;
  }
  constructor(
    socket: (msg: Packet) => any,
    { unsync = false }: { unsync?: boolean } = {}
  ) {
    this.#socket = socket;
    this.#unsync = unsync;
  }
  get handler() {
    return (msg: Packet) => {
      switch (msg[0]) {
        case 0:
          (msg[1] ? this.#holdObject : this.#releaseObject)(msg[2]);
          return;
        case 1: {
          const obj = deref(this.#objects[msg[1]]);
          return this.#getObjectRef(
            obj?.[this.#proxyPacket([...skip(msg, 2)] as ObjectRefPacket)]
          );
        }
        case 2: {
          const obj = deref(this.#objects[msg[1]]);
          const [mem, val] = this.#proxyPackets([...skip(msg, 2)]);
          return set(obj, mem, val);
        }
        case 3: {
          const obj = deref(this.#objects[msg[1]]);
          const [self, new_target, ...args] = this.#proxyPackets([
            ...skip(msg, 2),
          ]);
          if (new_target === undefined) {
            return this.#getObjectRef(apply(obj, self, args));
          } else {
            return this.#getObjectRef(construct(obj, args, new_target));
          }
        }
      }
    };
  }
}
