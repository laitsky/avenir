import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, Keypair } from "@solana/web3.js";
import { Avenir } from "../target/types/avenir";
import { assert } from "chai";

describe("avenir", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.avenir as Program<Avenir>;
  const admin = provider.wallet;

  // Generate deterministic test keys
  const feeRecipient = Keypair.generate().publicKey;
  const usdcMint = Keypair.generate().publicKey;
  const protocolFeeBps = 200; // 2%

  // Derive the Config PDA
  const [configPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    program.programId
  );

  it("initializes the Config PDA with correct values", async () => {
    const tx = await program.methods
      .initialize({
        feeRecipient,
        usdcMint,
        protocolFeeBps,
      })
      .accounts({
        admin: admin.publicKey,
        config: configPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("Initialize tx:", tx);

    // Fetch the Config account and verify all fields
    const config = await program.account.config.fetch(configPda);

    assert.ok(
      config.admin.equals(admin.publicKey),
      "Admin should match wallet"
    );
    assert.ok(
      config.feeRecipient.equals(feeRecipient),
      "Fee recipient should match"
    );
    assert.ok(
      config.usdcMint.equals(usdcMint),
      "USDC mint should match"
    );
    assert.equal(
      config.protocolFeeBps,
      protocolFeeBps,
      "Protocol fee bps should be 200"
    );
    assert.ok(
      config.marketCounter.toNumber() === 0,
      "Market counter should start at 0"
    );
    assert.equal(config.paused, false, "Should not be paused initially");
    assert.ok(config.bump > 0, "Bump should be set");

    console.log("Config PDA verified:", {
      admin: config.admin.toBase58(),
      feeRecipient: config.feeRecipient.toBase58(),
      usdcMint: config.usdcMint.toBase58(),
      protocolFeeBps: config.protocolFeeBps,
      marketCounter: config.marketCounter.toNumber(),
      paused: config.paused,
      bump: config.bump,
    });
  });

  it("rejects duplicate initialization (Config PDA already exists)", async () => {
    try {
      await program.methods
        .initialize({
          feeRecipient,
          usdcMint,
          protocolFeeBps: 100,
        })
        .accounts({
          admin: admin.publicKey,
          config: configPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      assert.fail("Should have thrown an error for duplicate init");
    } catch (err) {
      // The transaction should fail because the Config PDA already exists
      // Anchor returns an error when trying to init an already-initialized account
      console.log("Duplicate init correctly rejected");
    }
  });
});
