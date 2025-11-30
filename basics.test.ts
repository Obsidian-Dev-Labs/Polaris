import { expect, Mock, test, vi } from "vitest";
import { Reactor, Packet } from "./index.ts";
function spinUp(): {
  host: Reactor;
  guest: Reactor;
  host_handler: Mock<(packet: Packet) => any>;
  guest_handler: Mock<(packet: Packet) => any>;
  readonly i: number;
} {
  let host,
    guest,
    host_handler: Mock<(packet: Packet) => any>,
    guest_handler: Mock<(packet: Packet) => any>;
  let i = 0;
  const rand = () => `rand$${i++}`;
  host = new Reactor((m) => guest_handler(m), { rand });
  guest = new Reactor((m) => host_handler(m), { rand });
  host_handler = vi.fn(host.handler());
  guest_handler = vi.fn(guest.handler());
  return Object.freeze({
    host,
    guest,
    host_handler,
    guest_handler,
    get i() {
      return i;
    },
  });
}
test("should connect to itself", ({}) => {
  const { host, guest, host_handler, guest_handler } = spinUp();
});
