import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {
  PublicKey,
  Keypair,
  LAMPORTS_PER_SOL,
  SystemProgram,
} from "@solana/web3.js";
import { Avenir } from "../../target/types/avenir";
import { assert } from "chai";
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

const RUN_ARCIUM_INTEGRATION_TESTS =
  process.env.ARCIUM_INTEGRATION_TESTS === "1";

(RUN_ARCIUM_INTEGRATION_TESTS ? describe : describe.skip)(
  "hello-world MPC circuit",
  () => {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const program = anchor.workspace.avenir as Program<Avenir>;
    const payer = (provider.wallet as anchor.Wallet).payer;
    const connection = provider.connection;

    // Arcium environment
    const arciumEnv = getArciumEnv();
    const arciumProgramId = getArciumProgramId();

    // Derived Arcium accounts
    const mxeAccountAddress = getMXEAccAddress(program.programId);
    const clusterOffset = arciumEnv.arciumClusterOffset;
    const clusterAccountAddress = getClusterAccAddress(clusterOffset);
    const mempoolAccountAddress = getMempoolAccAddress(clusterOffset);
    const executingPoolAddress = getExecutingPoolAccAddress(clusterOffset);
    const feePoolAddress = getFeePoolAccAddress();
    const clockAddress = getClockAccAddress();

    // Computation definition offset for hello_world
    const compDefOffset = Buffer.from(
      getCompDefAccOffset("hello_world")
    ).readUInt32LE(0);
    const compDefAccountAddress = getCompDefAccAddress(
      program.programId,
      compDefOffset
    );

    // Sign PDA (ArciumSignerAccount)
    const [signPdaAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from("ArciumSignerAccount")],
      program.programId
    );

    // Computation definition PDA
    const [compDefPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("ComputationDefinitionAccount"),
        program.programId.toBuffer(),
        Buffer.from(getCompDefAccOffset("hello_world")),
      ],
      arciumProgramId
    );

    // Address lookup table PDA for comp_def init
    const [addressLookupTable] = PublicKey.findProgramAddressSync(
      [mxeAccountAddress.toBuffer(), Buffer.alloc(8)], // slot = 0
      new PublicKey("AddressLookupTab1e1111111111111111111111111")
    );

    it("initializes hello_world computation definition", async () => {
      try {
        const tx = await program.methods
          .initHelloWorldCompDef()
          .accountsPartial({
            payer: payer.publicKey,
            mxeAccount: mxeAccountAddress,
            compDefAccount: compDefPda,
            addressLookupTable: addressLookupTable,
            lutProgram: new PublicKey(
              "AddressLookupTab1e1111111111111111111111111"
            ),
            arciumProgram: arciumProgramId,
            systemProgram: SystemProgram.programId,
          })
          .rpc({ skipPreflight: true, commitment: "confirmed" });

        console.log("  Init comp_def tx:", tx);
      } catch (err) {
        // If comp_def already initialized, that's ok
        if (
          err.toString().includes("already in use") ||
          err.toString().includes("initialized")
        ) {
          console.log("  Comp_def already initialized, continuing...");
        } else {
          throw err;
        }
      }
    });

    it("queues hello_world computation and awaits finalization", async () => {
      // Generate x25519 keypair for encryption
      const privateKey = x25519.utils.randomPrivateKey();
      const publicKey = x25519.getPublicKey(privateKey);

      // Get MXE public key for shared secret derivation
      const mxePublicKey = await getMXEPublicKey(provider, program.programId);
      assert.isNotNull(mxePublicKey, "MXE public key should be available");

      // Derive shared secret and create cipher
      const sharedSecret = x25519.getSharedSecret(privateKey, mxePublicKey!);
      const cipher = new RescueCipher(sharedSecret);

      // Encrypt two u64 values: 5 and 7 (expected sum: 12)
      const a = BigInt(5);
      const b = BigInt(7);
      const nonce = randomBytes(16);

      // Encrypt each value separately (each is an Enc<Shared, u64>)
      const aCiphertext = cipher.encrypt([a], nonce);
      const bCiphertext = cipher.encrypt([b], nonce);

      // Generate a unique computation offset
      const computationOffset = new anchor.BN(randomBytes(8), "hex");

      // Derive computation account address
      const computationAccountAddress = getComputationAccAddress(
        clusterOffset,
        computationOffset
      );

      console.log("  Encrypted values: a=5, b=7");
      console.log("  Computation offset:", computationOffset.toString());
      console.log(
        "  Computation account:",
        computationAccountAddress.toBase58()
      );

      // Queue the computation
      const tx = await program.methods
        .helloWorld(
          computationOffset,
          aCiphertext[0] as unknown as number[],
          bCiphertext[0] as unknown as number[],
          Array.from(publicKey) as unknown as number[],
          new anchor.BN(deserializeLE(nonce).toString())
        )
        .accountsPartial({
          payer: payer.publicKey,
          mxeAccount: mxeAccountAddress,
          signPdaAccount: signPdaAccount,
          mempoolAccount: mempoolAccountAddress,
          executingPool: executingPoolAddress,
          computationAccount: computationAccountAddress,
          compDefAccount: compDefAccountAddress,
          clusterAccount: clusterAccountAddress,
          poolAccount: feePoolAddress,
          clockAccount: clockAddress,
          systemProgram: SystemProgram.programId,
          arciumProgram: arciumProgramId,
        })
        .rpc({ skipPreflight: true, commitment: "confirmed" });

      console.log("  Queue tx:", tx);

      // Wait for MPC finalization (callback execution)
      console.log("  Awaiting computation finalization...");
      const callbackTx = await awaitComputationFinalization(
        provider,
        computationOffset,
        program.programId,
        "confirmed",
        120_000 // 2 minute timeout
      );

      console.log("  Callback tx:", callbackTx);

      // Verify the callback executed by checking transaction logs
      const txInfo = await connection.getTransaction(callbackTx, {
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0,
      });

      assert.isNotNull(txInfo, "Callback transaction should exist");

      const logs = txInfo?.meta?.logMessages || [];
      const hasResult = logs.some(
        (log) =>
          log.includes("Hello World MPC result") ||
          log.includes("hello_world_callback")
      );
      assert.isTrue(
        hasResult,
        "Callback logs should contain hello_world result"
      );

      console.log("  Hello-world MPC circuit lifecycle complete!");
      console.log("  Full cycle: encrypt -> queue -> MPC execute -> callback");
    });
  }
);
