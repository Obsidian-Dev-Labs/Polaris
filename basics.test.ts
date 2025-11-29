

import { expect, test } from 'vitest'
import { Reactor,Packet } from './index.ts'
function spinUp(): [Reactor,Reactor]{
    let r1,r2,h1: (packet: Packet) => any,h2: (packet: Packet) => any;
    r1 = new Reactor(m => h2(m));
    r2 = new Reactor(m => h1(m));
    h1 = r1.handler();
    h2 = r2.handler();
    return [r1,r2];
}
test('should connect to itself',({}) => {
    const [host,guest] = spinUp();
})