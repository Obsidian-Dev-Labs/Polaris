import { expect, Mock, test, vi } from "vitest";
import { Reactor, Packet } from "./index.ts";
function spinUp(): {
  host: Reactor;
  guest: Reactor;
  host_handler: Mock<(packet: Packet) => any>;
  guest_handler: Mock<(packet: Packet) => any>;
  readonly i: number;
} {
  let r1,
    r2,
    h1: Mock<(packet: Packet) => any>,
    h2: Mock<(packet: Packet) => any>;
  let i = 0;
  const rand = () => `rand$${i++}`;
  r1 = new Reactor((m) => h2(m), { rand });
  r2 = new Reactor((m) => h1(m), { rand });
  h1 = vi.fn(r1.handler());
  h2 = vi.fn(r2.handler());
  return Object.freeze({
    host: r1,
    guest: r2,
    host_handler: h1,
    guest_handler: h2,
    get i() {
      return i;
    },
  });
}
test("should connect to itself", ({}) => {
  const { host, guest, host_handler, guest_handler } = spinUp();
});
