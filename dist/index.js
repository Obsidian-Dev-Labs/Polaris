import { Promises } from "./promises.js";
import { rand, _Promise, _Proxy, _WeakRef, _then, isObject, deref, apply, construct, array, set, skip, freezeClass, freeze, } from "./utils.js";
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
    #releaseObject = (a) => {
        delete this.#objects[a];
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
            this.#coreMapSet(a, freeze({
                __proto__: null,
                local: ((this.#objects[s] = new _WeakRef(a)), s),
                type: typeof a,
            }));
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
    #releaseRemoteObject(a) {
        this.#socket([0, a]);
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
        if (this.#unsync && value instanceof _Promise)
            return this.#promises.deferredPromise(_then(value, (a) => process(a)));
        return process(value);
    }
    #newFuncProxy(a) {
        const r = this;
        const f = function (...args) {
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
        f.__proto__ = null;
        return f;
    }
    #newProxy(a, type) {
        const d = a in this.#remoteObjects ? deref(this.#remoteObjects[a]) : undefined;
        if (d !== undefined)
            return d;
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
        this.#coreMapSet(proxy, freeze({ __proto__: null, remote: a, remote_type: type }));
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
                this.#releaseObject(msg[1]);
                return;
            default:
                throw `unknown packet type`;
        }
    };
    handler({ unsync = this.#unsync } = {}) {
        if (unsync) {
            return async (msg) => {
                switch (msg[0]) {
                    case 1: {
                        const obj = this.#objects[msg[1]];
                        const x = obj?.[this.#proxyPacket([...skip(msg, 2)])];
                        return this.#getObjectRef(isObject(x) && this.#promises.promiseObjectsHas(x) ? await x : x);
                    }
                    case 2: {
                        const obj = this.#objects[msg[1]];
                        const [mem, val] = this.#proxyPackets([...skip(msg, 2)]);
                        return set(obj, mem, val);
                    }
                    case 3: {
                        const obj = this.#objects[msg[1]];
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
                        const obj = this.#objects[msg[1]];
                        return this.#getObjectRef(obj?.[this.#proxyPacket([...skip(msg, 2)])]);
                    }
                    case 2: {
                        const obj = this.#objects[msg[1]];
                        const [mem, val] = this.#proxyPackets([...skip(msg, 2)]);
                        return set(obj, mem, val);
                    }
                    case 3: {
                        const obj = this.#objects[msg[1]];
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
