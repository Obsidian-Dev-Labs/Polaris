# Polaris
IPC system for JS types based on [worker-ipc](https://github.com/portal-co/worker-ipc)

## Getting Started

Step 1: create a `Reactor` with a `postMessage` function that also returns a reply (`worker-ipc` is an example of this)
Step 2: add its `handler` into your event listener, also allowing replies
Step 3: Perform steps 1 and 2 on the other side
Step 4: On the side you want to expose APIs, call `getObjectRef` to get an object reference and send it over
Step 5: On the side you want to consume APIs, call `proxyPacket` to convert the object reference to an object

## TODO

- Implement over-the-wire interception
- Implement the rest of the traps
