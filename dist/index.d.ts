import { Promises } from "./promises.js";
export type ObjTy = "object" | "function" | "symbol";
export type ObjectRefPacket = [0, ObjTy, string] | [1, string | number | boolean | null | undefined] | [2, ObjTy, string];
export type ObjectRefPackets = any[];
export type Packet = [0, string] | [1, string, ...ObjectRefPacket] | [2, string, ...ObjectRefPacket, ...ObjectRefPacket] | [3, string, ...ObjectRefPacket, ...ObjectRefPacket, ...ObjectRefPackets];
export declare class Reactor {
    #private;
    get promises(): Promises;
    get getObjectRef(): (a: any) => ObjectRefPacket;
    get getObjectFromRef(): (a: ObjectRefPacket) => any;
    get proxyPacket(): (a: ObjectRefPacket) => any;
    constructor(socket: (msg: Packet) => any, { unsync, promises, rand: randomizer, }?: {
        unsync?: boolean;
        promises?: Promises;
        rand?: () => string;
    });
    handler({ unsync }?: {
        unsync?: boolean;
    }): ((msg: Packet) => Promise<boolean | void | ObjectRefPacket>) | ((msg: Packet) => boolean | void | ObjectRefPacket);
}
