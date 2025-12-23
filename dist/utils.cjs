"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.construct = exports.apply = exports.set = exports.array = exports.isObject = exports.deref = exports._finally = exports._catch = exports._then = exports._Promise = exports._Proxy = exports._WeakRef = exports.rand = void 0;
exports.skip = skip;
exports.freezeClass = freezeClass;
exports.rand = crypto.randomUUID.bind(crypto);
exports._WeakRef = WeakRef;
exports._Proxy = Proxy;
exports._Promise = Promise;
exports._then = exports._Promise.prototype.then.call.bind(exports._Promise.prototype.then);
exports._catch = exports._Promise.prototype.catch.call.bind(exports._Promise.prototype.catch);
exports._finally = exports._Promise.prototype.finally.call.bind(exports._Promise.prototype.finally);
exports.deref = WeakRef.prototype.deref.call.bind(WeakRef.prototype.deref);
const isObject = (a) => typeof a === "object" || typeof a === "function" || typeof a === "symbol";
exports.isObject = isObject;
const array = (...args) => args;
exports.array = array;
function* skip(a, n = 0) {
    while (n !== a.length) {
        yield a[n];
        n++;
    }
}
exports.set = Reflect.set, exports.apply = Reflect.apply, exports.construct = Reflect.construct;
function freezeClass(k) {
    Object.freeze(k);
    Object.freeze(k.prototype);
}
