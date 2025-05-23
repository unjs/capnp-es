@0xeda41424bfc48a94;

using SimpleInterface = import "simple-interface.capnp".SimpleInterface;

interface ReturnCapability {
    get @0 (index :Int32) -> (capability :SimpleInterface);
}