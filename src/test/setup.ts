// Real IndexedDB semantics (transactions, indexes) in Node via fake-indexeddb.
import "fake-indexeddb/auto";

// getDb() guards against server rendering by checking for `window`.
(globalThis as { window?: unknown }).window ??= globalThis;
