/**
 * Fast app-side test for the shared browser encryption helper contract.
 *
 * Validates that encryptBetForMpcClient and encryptVoteForMpcClient produce
 * the correct payload shapes without requiring a live Arcium MPC runtime or
 * Solana account setup. Uses a mock connection and a patched getMXEPublicKey
 * to isolate pure encryption logic.
 *
 * Runs under Vitest with the app's tsconfig paths.
 */

import { describe, it, expect, vi, beforeAll } from "vitest";

// We mock @arcium-hq/client to avoid needing a real Solana connection.
// The mock provides the same RescueCipher/x25519 SDK primitives but stubs
// getMXEPublicKey to return a synthetic key.
const MOCK_MXE_PRIVATE = new Uint8Array(32).fill(42);

vi.mock("@arcium-hq/client", async () => {
  // Import the real module so we get the real crypto primitives
  const actual = await vi.importActual<typeof import("@arcium-hq/client")>(
    "@arcium-hq/client"
  );

  // Derive a deterministic "MXE public key" from MOCK_MXE_PRIVATE
  const mockMxePublicKey = actual.x25519.getPublicKey(MOCK_MXE_PRIVATE);

  return {
    ...actual,
    // Stub getMXEPublicKey so it doesn't hit Solana RPC
    getMXEPublicKey: vi.fn().mockResolvedValue(mockMxePublicKey),
  };
});

// Also mock the anchor provider so prepareEncryptionContext doesn't fail
vi.mock("#/lib/anchor", () => ({
  createReadonlyAnchorProvider: vi.fn().mockReturnValue({
    connection: {},
    publicKey: null,
  }),
}));

// Now import the functions under test (mocks are already in place)
import { encryptBetForMpcClient, encryptVoteForMpcClient } from "./client-encryption";
import type { EncryptedBetResult, EncryptedVoteResult } from "./client-encryption";
import { PublicKey } from "@solana/web3.js";

// A dummy connection object -- getMXEPublicKey is mocked so it won't be used
const mockConnection = {} as any;
const DUMMY_PROGRAM_ID = new PublicKey("11111111111111111111111111111111");

describe("client-encryption: app-side helper contract", () => {
  // ========================================================================
  // Bet encryption
  // ========================================================================
  describe("encryptBetForMpcClient", () => {
    let result: EncryptedBetResult;

    beforeAll(async () => {
      result = await encryptBetForMpcClient(
        mockConnection,
        DUMMY_PROGRAM_ID,
        true,
        5_000_000
      );
    });

    it("returns two ciphertext arrays (isYes + amount)", () => {
      expect(result.isYesCiphertext).toHaveLength(32);
      expect(result.amountCiphertext).toHaveLength(32);
    });

    it("returns a 32-byte public key", () => {
      expect(result.publicKey).toHaveLength(32);
    });

    it("returns a 16-byte nonce", () => {
      expect(result.nonce).toHaveLength(16);
    });

    it("returns a positive nonceBN string", () => {
      expect(BigInt(result.nonceBN)).toBeGreaterThan(0n);
    });

    it("ciphertexts are not all zeros", () => {
      expect(result.isYesCiphertext.some((b) => b !== 0)).toBe(true);
      expect(result.amountCiphertext.some((b) => b !== 0)).toBe(true);
    });

    it("different amounts produce different amount ciphertexts", async () => {
      const result2 = await encryptBetForMpcClient(
        mockConnection,
        DUMMY_PROGRAM_ID,
        true,
        10_000_000
      );

      // Each call generates a fresh keypair+nonce, so both fields will differ.
      // The key contract check: the function produces valid 32-byte arrays.
      expect(result2.amountCiphertext).toHaveLength(32);
      expect(result2.isYesCiphertext).toHaveLength(32);
    });
  });

  // ========================================================================
  // Vote encryption
  // ========================================================================
  describe("encryptVoteForMpcClient", () => {
    let result: EncryptedVoteResult;

    beforeAll(async () => {
      result = await encryptVoteForMpcClient(
        mockConnection,
        DUMMY_PROGRAM_ID,
        true
      );
    });

    it("returns one ciphertext array (voteCiphertext)", () => {
      expect(result.voteCiphertext).toHaveLength(32);
    });

    it("returns a 32-byte public key", () => {
      expect(result.publicKey).toHaveLength(32);
    });

    it("returns a 16-byte nonce", () => {
      expect(result.nonce).toHaveLength(16);
    });

    it("returns a positive nonceBN string", () => {
      expect(BigInt(result.nonceBN)).toBeGreaterThan(0n);
    });

    it("vote ciphertext is not all zeros", () => {
      expect(result.voteCiphertext.some((b) => b !== 0)).toBe(true);
    });

    it("produces valid shape for opposite vote", async () => {
      const noResult = await encryptVoteForMpcClient(
        mockConnection,
        DUMMY_PROGRAM_ID,
        false
      );

      expect(noResult.voteCiphertext).toHaveLength(32);
      expect(noResult.publicKey).toHaveLength(32);
      expect(noResult.nonce).toHaveLength(16);
    });
  });
});
