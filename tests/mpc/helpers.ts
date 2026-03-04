import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {
  PublicKey,
  Keypair,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { createMint, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Avenir } from "../../target/types/avenir";
import {
  RescueCipher,
  x25519,
  getArciumEnv,
  getMXEPublicKey,
  getComputationAccAddress,
  getClusterAccAddress,
  getMXEAccAddress,
  getMempoolAccAddress,
  getExecutingPoolAccAddress,
  getCompDefAccAddress,
  getCompDefAccOffset,
  awaitComputationFinalization,
  deserializeLE,
  getFeePoolAccAddress,
  getClockAccAddress,
  getArciumProgramId,
} from "@arcium-hq/client";
import { randomBytes } from "crypto";

// ============================================================================
// Types
// ============================================================================

export interface ArciumContext {
  arciumEnv: ReturnType<typeof getArciumEnv>;
  mxePublicKey: Uint8Array;
  arciumProgramId: PublicKey;
  mxeAccountAddress: PublicKey;
  clusterOffset: anchor.BN;
  clusterAccountAddress: PublicKey;
  mempoolAccountAddress: PublicKey;
  executingPoolAddress: PublicKey;
  feePoolAddress: PublicKey;
  clockAddress: PublicKey;
  signPdaAccount: PublicKey;
}

export interface EncryptedBetInput {
  isYesCiphertext: Uint8Array;
  amountCiphertext: Uint8Array;
  publicKey: Uint8Array;
  nonce: Buffer;
  nonceBN: anchor.BN;
  computationOffset: anchor.BN;
}

export interface TestMarketResult {
  marketPda: PublicKey;
  marketPoolPda: PublicKey;
  vaultPda: PublicKey;
  marketId: number;
}

export interface ArciumAccounts {
  computationAccount: PublicKey;
  clusterAccount: PublicKey;
  mxeAccount: PublicKey;
  mempoolAccount: PublicKey;
  executingPool: PublicKey;
  compDefAccount: PublicKey;
  signPdaAccount: PublicKey;
  poolAccount: PublicKey;
  clockAccount: PublicKey;
  arciumProgram: PublicKey;
}

// ============================================================================
// setupArciumContext
// ============================================================================

/**
 * Initializes the Arcium environment context required for all MPC operations.
 *
 * Returns addresses for MXE, cluster, mempool, executing pool, fee pool,
 * clock, and the ArciumSignerAccount PDA. Also fetches the MXE public key
 * required for encryption.
 */
export async function setupArciumContext(
  provider: anchor.AnchorProvider,
  programId: PublicKey
): Promise<ArciumContext> {
  const arciumEnv = getArciumEnv();
  const arciumProgramId = getArciumProgramId();

  const mxePublicKey = await getMXEPublicKey(provider, programId);
  if (!mxePublicKey) {
    throw new Error("Failed to get MXE public key -- is the Arcium localnet running?");
  }

  const mxeAccountAddress = getMXEAccAddress(programId);
  const clusterOffset = arciumEnv.arciumClusterOffset;
  const clusterAccountAddress = getClusterAccAddress(clusterOffset);
  const mempoolAccountAddress = getMempoolAccAddress(clusterOffset);
  const executingPoolAddress = getExecutingPoolAccAddress(clusterOffset);
  const feePoolAddress = getFeePoolAccAddress();
  const clockAddress = getClockAccAddress();

  const [signPdaAccount] = PublicKey.findProgramAddressSync(
    [Buffer.from("ArciumSignerAccount")],
    programId
  );

  return {
    arciumEnv,
    mxePublicKey,
    arciumProgramId,
    mxeAccountAddress,
    clusterOffset,
    clusterAccountAddress,
    mempoolAccountAddress,
    executingPoolAddress,
    feePoolAddress,
    clockAddress,
    signPdaAccount,
  };
}

// ============================================================================
// encryptBetInput
// ============================================================================

/**
 * Encrypts a bet input for submission to the update_pool MPC computation.
 *
 * Generates an x25519 keypair, derives a shared secret with the MXE,
 * creates a RescueCipher, and encrypts isYes (as BigInt 0/1) and amount.
 * Also generates a random computation offset for the computation account PDA.
 */
export function encryptBetInput(
  mxePublicKey: Uint8Array,
  isYes: boolean,
  amount: number
): EncryptedBetInput {
  // Generate x25519 keypair for this encryption
  const privateKey = x25519.utils.randomPrivateKey();
  const publicKey = x25519.getPublicKey(privateKey);

  // Derive shared secret with MXE
  const sharedSecret = x25519.getSharedSecret(privateKey, mxePublicKey);
  const cipher = new RescueCipher(sharedSecret);

  // Encrypt BetInput fields
  const nonce = randomBytes(16);
  const isYesCiphertext = cipher.encrypt([BigInt(isYes ? 1 : 0)], nonce);
  const amountCiphertext = cipher.encrypt([BigInt(amount)], nonce);

  // Random computation offset
  const computationOffset = new anchor.BN(randomBytes(8), "hex");

  return {
    isYesCiphertext: isYesCiphertext[0],
    amountCiphertext: amountCiphertext[0],
    publicKey,
    nonce,
    nonceBN: new anchor.BN(deserializeLE(nonce).toString()),
    computationOffset,
  };
}

// ============================================================================
// awaitAndVerifyCallback
// ============================================================================

/**
 * Waits for an MPC computation to finalize and the callback to execute.
 *
 * Uses awaitComputationFinalization from @arcium-hq/client with a 2-minute
 * timeout. Returns the callback transaction signature.
 */
export async function awaitAndVerifyCallback(
  provider: anchor.AnchorProvider,
  computationOffset: anchor.BN,
  programId: PublicKey,
  timeoutMs: number = 120_000
): Promise<string> {
  const callbackTx = await awaitComputationFinalization(
    provider,
    computationOffset,
    programId,
    "confirmed",
    timeoutMs
  );

  return callbackTx;
}

// ============================================================================
// createTestMarket
// ============================================================================

/**
 * Creates a market with standard test parameters.
 *
 * Handles the full setup: initialize Config (if not already), whitelist the
 * creator, and call create_market. Returns the market and pool PDAs.
 *
 * If configPda is provided, assumes Config is already initialized and skips
 * that step. If whitelistPda is provided, assumes creator is already whitelisted.
 */
export async function createTestMarket(
  program: Program<Avenir>,
  admin: anchor.Wallet,
  creator: Keypair,
  usdcMint: PublicKey,
  configPda: PublicKey,
  expectedMarketId: number,
  options?: {
    question?: string;
    category?: number;
    resolutionSource?: string;
    resolutionTime?: number;
  }
): Promise<TestMarketResult> {
  const marketId = expectedMarketId;
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt(marketId));

  const [marketPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("market"), buf],
    program.programId
  );
  const [vaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), buf],
    program.programId
  );
  const [marketPoolPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("market_pool"), buf],
    program.programId
  );
  const [whitelistPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("whitelist"), creator.publicKey.toBuffer()],
    program.programId
  );

  // Resolution time: default 2 hours from now
  const now = Math.floor(Date.now() / 1000);
  const resolutionTime = options?.resolutionTime ?? now + 7200;

  await program.methods
    .createMarket({
      question: options?.question ?? "Will BTC exceed $100k by end of month?",
      resolutionSource: options?.resolutionSource ?? "https://coingecko.com/btc",
      category: options?.category ?? 1, // Crypto
      resolutionTime: new anchor.BN(resolutionTime),
    })
    .accounts({
      creator: creator.publicKey,
      config: configPda,
      whitelist: whitelistPda,
      market: marketPda,
      marketVault: vaultPda,
      marketPool: marketPoolPda,
      usdcMint: usdcMint,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .signers([creator])
    .rpc({ commitment: "confirmed" });

  return { marketPda, marketPoolPda, vaultPda, marketId };
}

// ============================================================================
// getArciumAccounts
// ============================================================================

/**
 * Returns the standard set of Arcium accounts needed for every queue_computation call.
 *
 * Derives the computation account, comp_def account, and includes the standard
 * cluster, MXE, mempool, executing pool, fee pool, and clock accounts.
 */
export function getArciumAccounts(
  programId: PublicKey,
  arciumCtx: ArciumContext,
  computationOffset: anchor.BN,
  compDefName: string
): ArciumAccounts {
  const compDefIndex = Buffer.from(getCompDefAccOffset(compDefName)).readUInt32LE(0);
  const compDefAccount = getCompDefAccAddress(programId, compDefIndex);
  const computationAccount = getComputationAccAddress(
    arciumCtx.clusterOffset,
    computationOffset
  );

  return {
    computationAccount,
    clusterAccount: arciumCtx.clusterAccountAddress,
    mxeAccount: arciumCtx.mxeAccountAddress,
    mempoolAccount: arciumCtx.mempoolAccountAddress,
    executingPool: arciumCtx.executingPoolAddress,
    compDefAccount,
    signPdaAccount: arciumCtx.signPdaAccount,
    poolAccount: arciumCtx.feePoolAddress,
    clockAccount: arciumCtx.clockAddress,
    arciumProgram: arciumCtx.arciumProgramId,
  };
}

// ============================================================================
// initCompDef
// ============================================================================

/**
 * Initializes a computation definition for a given circuit name.
 *
 * Calls the appropriate program.methods.init{Name}CompDef() based on compDefName.
 * Handles "already initialized" errors gracefully.
 */
export async function initCompDef(
  program: Program<Avenir>,
  payer: Keypair,
  compDefName: string,
  arciumCtx: ArciumContext
): Promise<void> {
  const compDefIndex = Buffer.from(getCompDefAccOffset(compDefName)).readUInt32LE(0);

  // Derive comp_def PDA
  const [compDefPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("ComputationDefinitionAccount"),
      program.programId.toBuffer(),
      Buffer.from(getCompDefAccOffset(compDefName)),
    ],
    arciumCtx.arciumProgramId
  );

  // Address lookup table PDA
  const [addressLookupTable] = PublicKey.findProgramAddressSync(
    [arciumCtx.mxeAccountAddress.toBuffer(), Buffer.alloc(8)],
    new PublicKey("AddressLookupTab1e1111111111111111111111111")
  );

  const accounts = {
    payer: payer.publicKey,
    mxeAccount: arciumCtx.mxeAccountAddress,
    compDefAccount: compDefPda,
    addressLookupTable: addressLookupTable,
    lutProgram: new PublicKey("AddressLookupTab1e1111111111111111111111111"),
    arciumProgram: arciumCtx.arciumProgramId,
    systemProgram: SystemProgram.programId,
  };

  try {
    // Map compDefName to the appropriate method call
    switch (compDefName) {
      case "init_pool":
        await program.methods
          .initPoolCompDef()
          .accountsPartial(accounts)
          .rpc({ skipPreflight: true, commitment: "confirmed" });
        break;
      case "update_pool":
        await program.methods
          .initUpdatePoolCompDef()
          .accountsPartial(accounts)
          .rpc({ skipPreflight: true, commitment: "confirmed" });
        break;
      case "hello_world":
        await program.methods
          .initHelloWorldCompDef()
          .accountsPartial(accounts)
          .rpc({ skipPreflight: true, commitment: "confirmed" });
        break;
      case "compute_payouts":
        await program.methods
          .initComputePayoutsCompDef()
          .accountsPartial(accounts)
          .rpc({ skipPreflight: true, commitment: "confirmed" });
        break;
      default:
        throw new Error(`Unknown comp_def name: ${compDefName}`);
    }
    console.log(`  Initialized comp_def: ${compDefName}`);
  } catch (err: any) {
    if (
      err.toString().includes("already in use") ||
      err.toString().includes("initialized")
    ) {
      console.log(`  Comp_def ${compDefName} already initialized, continuing...`);
    } else {
      throw err;
    }
  }
}

// ============================================================================
// PDA Helpers
// ============================================================================

/**
 * Derives the Market PDA for a given market ID.
 */
export function getMarketPda(
  marketId: number,
  programId: PublicKey
): [PublicKey, number] {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt(marketId));
  return PublicKey.findProgramAddressSync(
    [Buffer.from("market"), buf],
    programId
  );
}

/**
 * Derives the MarketPool PDA for a given market ID.
 */
export function getMarketPoolPda(
  marketId: number,
  programId: PublicKey
): [PublicKey, number] {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt(marketId));
  return PublicKey.findProgramAddressSync(
    [Buffer.from("market_pool"), buf],
    programId
  );
}

/**
 * Derives the Config PDA.
 */
export function getConfigPda(programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    programId
  );
}
