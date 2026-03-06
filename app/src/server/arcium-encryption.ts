/**
 * DEPRECATED -- Do NOT import this module.
 *
 * Bet and vote encryption MUST stay client-side. The browser boundary is the
 * privacy-preserving design: plaintext bet amounts and vote choices never leave
 * the user's browser.
 *
 * Use `app/src/lib/client-encryption.ts` instead:
 *   - encryptBetForMpcClient  -- browser-side bet encryption
 *   - encryptVoteForMpcClient -- browser-side vote encryption
 *
 * This file exists only as a guard against accidental reintroduction of
 * server-side encryption paths. Any import will fail at build time because
 * no functions are exported.
 *
 * @see app/src/lib/client-encryption.ts
 */

throw new Error(
  "[avenir] Server-side Arcium encryption is removed. " +
    "Bet and vote encryption must happen in the browser via " +
    "app/src/lib/client-encryption.ts. " +
    "See Phase 13 for the migration rationale."
);
