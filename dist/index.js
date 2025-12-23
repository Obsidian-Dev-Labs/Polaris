import { rand, _Proxy, _WeakRef, _then, isObject, deref, apply, construct, array, set, skip, freezeClass, } from "./utils.js";
export class Promises {
    #promiseObjects = new WeakSet();
    #promiseObjectsHas = this.#promiseObjects.has.bind(this.#promiseObjects);
    #promiseObjectsAdd = this.#promiseObjects.add.bind(this.#promiseObjects);
    #deferredPromise(a) {
        const proxy = new _Proxy(a, {
            get: (target, p, receiver) => p === "then"
                ? target.then
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
export class Reactor {
    #promises;
    #randomizer;
    get promises() {
        return this.#promises;
    }
    #unsync;
    #coreMap = new WeakMap();
    #coreMapGet = this.#coreMap.get.bind(this.#coreMap);
    #coreMapSet = this.#coreMap.set.bind(this.#coreMap);
    #remoteReg = new FinalizationRegistry((a) => this.#releaseRemoteObject(a));
    #remoteRegister = this.#remoteReg.register.bind(this.#remoteReg);
    #socket;
    #objects = Object.create(null);
    #remoteObjects = Object.create(null);
    #heldObjects = Object.create(null);
    #holdObject = (a) => {
        this.#heldObjects[a] ??= deref(this.#objects[a]);
    };
    #releaseObject = (a) => {
        delete this.#heldObjects[a];
    };
    #getObjectRef(a) {
        if (isObject(a)) {
            const g = this.#coreMapGet(a);
            if (g) {
                if ("remote" in g)
                    return [2, g.remote_type, g.remote];
                return [0, g.type, g.local];
            }
            const s = this.#randomizer();
            this.#coreMapSet(a, {
                local: ((this.#objects[s] = new _WeakRef(a)), s),
                type: typeof a,
            });
            return [0, typeof a, s];
        }
        else {
            return [1, a];
        }
    }
    get getObjectRef() {
        return (a) => this.#getObjectRef(a);
    }
    get getObjectFromRef() {
        return (a) => this.#getObjectFromRef(a);
    }
    get proxyPacket() {
        return (a) => this.#proxyPacket(a);
    }
    *#getObjectsFromRef(packet) {
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
    #getObjectFromRef(packet) {
        for (var x of this.#getObjectsFromRef(packet))
            return x;
    }
    #holdRemoteObject(a) {
        this.#socket([0, true, a]);
    }
    #releaseRemoteObject(a) {
        this.#socket([0, false, a]);
    }
    *#proxyPackets(packet) {
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
    #proxyPacket(packet) {
        for (var x of this.#proxyPackets(packet))
            return x;
    }
    #unsyncMap(value, process) {
        if (this.#unsync)
            return this.#promises.deferredPromise(_then(value, (a) => process(a)));
        return process(value);
    }
    #newFuncProxy(a) {
        const r = this;
        return function (...args) {
            const self = this;
            const target = new.target;
            const packet = r.#socket(array(3, a, ...[
                ...skip(r.#getObjectRef(self)),
                ...skip(r.#getObjectRef(target)),
                ...(function* () {
                    for (var arg of skip(args))
                        for (var packet of skip(r.#getObjectRef(arg)))
                            yield packet;
                })(),
            ]));
            return r.#unsyncMap(packet, (a) => r.#proxyPacket(a));
        };
    }
    #newProxy(a, type) {
        const d = a in this.#remoteObjects ? deref(this.#remoteObjects[a]) : undefined;
        if (d !== undefined)
            return d;
        this.#holdRemoteObject(a);
        const proxy = new _Proxy(type === "object" ? { __proto__: null } : this.#newFuncProxy(a), {
            get: (target, p, receiver) => {
                const packet = this.#socket(array(1, a, ...this.#getObjectRef(p)));
                return this.#unsyncMap(packet, (a) => this.#proxyPacket(a));
            },
            set: (target, p, newValue, reciever) => this.#socket(array(2, a, ...[
                ...skip(this.#getObjectRef(p)),
                ...skip(this.#getObjectRef(newValue)),
            ])),
        });
        this.#remoteObjects[a] = new _WeakRef(proxy);
        this.#remoteRegister(proxy, a);
        this.#coreMapSet(proxy, { remote: a, remote_type: type });
        return proxy;
    }
    constructor(socket, { unsync = false, promises = new Promises(), rand: randomizer = rand, } = {}) {
        this.#socket = socket;
        this.#unsync = unsync;
        this.#promises = promises;
        this.#randomizer = randomizer;
    }
    #coreHandler = (msg) => {
        switch (msg[0]) {
            case 0:
                (msg[1] ? this.#holdObject : this.#releaseObject)(msg[2]);
                return;
        }
    };
    handler({ unsync = this.#unsync } = {}) {
        if (unsync) {
            return async (msg) => {
                switch (msg[0]) {
                    case 1: {
                        const obj = deref(this.#objects[msg[1]]);
                        const x = obj?.[this.#proxyPacket([...skip(msg, 2)])];
                        return this.#getObjectRef(isObject(x) && this.#promises.promiseObjectsHas(x) ? await x : x);
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
                        const x = new_target === undefined
                            ? apply(obj, self, args)
                            : construct(obj, args, new_target);
                        return this.#getObjectRef(isObject(x) && this.#promises.promiseObjectsHas(x) ? await x : x);
                    }
                    default:
                        return this.#coreHandler(msg);
                }
            };
        }
        else {
            return (msg) => {
                switch (msg[0]) {
                    case 1: {
                        const obj = deref(this.#objects[msg[1]]);
                        return this.#getObjectRef(obj?.[this.#proxyPacket([...skip(msg, 2)])]);
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
                        }
                        else {
                            return this.#getObjectRef(construct(obj, args, new_target));
                        }
                    }
                    default:
                        return this.#coreHandler(msg);
                }
            };
        }
    }
}
freezeClass(Reactor);
