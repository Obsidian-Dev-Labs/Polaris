export declare class Promises {
    #private;
    get deferredPromise(): <T>(a: Promise<T>) => Promise<T>;
    get promiseObjectsHas(): (v: Promise<any>) => boolean;
    get promiseObjectsAdd(): (v: Promise<any>) => void;
}
