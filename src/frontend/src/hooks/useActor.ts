// Re-export useActor from the platform core-infrastructure package, pre-bound to
// our backend's createActor so all local consumers get a typed Backend instance.
import { useActor as _useActor } from "@caffeineai/core-infrastructure";
import { createActor } from "../backend";
import type { backendInterface } from "../types";

// ExternalBlob stubs — the generated backend.ts requires upload/download file
// callbacks, but the current canister has no object-storage methods so we pass
// no-op implementations.
const _noopUpload = async (): Promise<Uint8Array> => new Uint8Array(0);
const _noopDownload = async () => {
  const { ExternalBlob } = await import("../backend");
  return ExternalBlob.fromBytes(new Uint8Array(0));
};

/**
 * Wrapper around the platform `useActor` hook pre-wired to our backend.
 * Returns `{ actor: backendInterface | null, isFetching: boolean }`.
 *
 * The underlying Backend class currently has an empty interface because no
 * backend methods are bound yet (the IDL is empty). We cast the actor to
 * `backendInterface` so that all call sites can call methods without
 * TypeScript errors — at runtime these will resolve once the canister is
 * deployed with the actual methods.
 */
export function useActor(): {
  actor: backendInterface | null;
  isFetching: boolean;
} {
  const result = _useActor((canisterId, _up, _down, opts) =>
    createActor(canisterId, _noopUpload, _noopDownload, opts),
  );
  return {
    actor: result.actor as unknown as backendInterface | null,
    isFetching: result.isFetching,
  };
}
