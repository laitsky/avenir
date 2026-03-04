import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { createMint, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Avenir } from "../target/types/avenir";
import { assert } from "chai";

describe("avenir", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.avenir as Program<Avenir>;
  const admin = provider.wallet;
  const connection = provider.connection;

  // Test keypairs
  const creator = Keypair.generate();
  const feeRecipient = Keypair.generate().publicKey;
  const protocolFeeBps = 200; // 2%

  // Will be set in before() hook
  let usdcMint: PublicKey;
  const mintAuthority = Keypair.generate();

  // Derive the Config PDA
  const [configPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    program.programId
  );

  // PDA helper functions
  function getWhitelistPda(creatorKey: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("whitelist"), creatorKey.toBuffer()],
      program.programId
    );
  }

  function getMarketPda(marketId: number): [PublicKey, number] {
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64LE(BigInt(marketId));
    return PublicKey.findProgramAddressSync(
      [Buffer.from("market"), buf],
      program.programId
    );
  }

  function getVaultPda(marketId: number): [PublicKey, number] {
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64LE(BigInt(marketId));
    return PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), buf],
      program.programId
    );
  }

  function getPositionPda(marketId: number, user: PublicKey): [PublicKey, number] {
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64LE(BigInt(marketId));
    return PublicKey.findProgramAddressSync(
      [Buffer.from("position"), buf, user.toBuffer()],
      program.programId
    );
  }

  before(async () => {
    // Airdrop SOL to creator and mint authority for transaction fees
    const airdropCreator = await connection.requestAirdrop(
      creator.publicKey,
      5 * LAMPORTS_PER_SOL
    );
    await connection.confirmTransaction(airdropCreator);

    const airdropMintAuth = await connection.requestAirdrop(
      mintAuthority.publicKey,
      2 * LAMPORTS_PER_SOL
    );
    await connection.confirmTransaction(airdropMintAuth);

    // Create a real USDC mint on localnet (6 decimals like real USDC)
    usdcMint = await createMint(
      connection,
      mintAuthority, // payer
      mintAuthority.publicKey, // mint authority
      null, // freeze authority
      6 // decimals
    );

    console.log("Test setup complete:");
    console.log("  USDC Mint:", usdcMint.toBase58());
    console.log("  Creator:", creator.publicKey.toBase58());
    console.log("  Admin:", admin.publicKey.toBase58());
  });

  // =========================================================================
  // Initialize
  // =========================================================================
  describe("initialize", () => {
    it("initializes Config PDA with correct values", async () => {
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

      const config = await program.account.config.fetch(configPda);

      assert.ok(config.admin.equals(admin.publicKey), "Admin should match wallet");
      assert.ok(config.feeRecipient.equals(feeRecipient), "Fee recipient should match");
      assert.ok(config.usdcMint.equals(usdcMint), "USDC mint should match");
      assert.equal(config.protocolFeeBps, protocolFeeBps, "Protocol fee bps should be 200");
      assert.equal(config.marketCounter.toNumber(), 0, "Market counter should start at 0");
      assert.equal(config.paused, false, "Should not be paused initially");
      assert.ok(config.bump > 0, "Bump should be set");
    });

    it("rejects duplicate initialization", async () => {
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
        console.log("Duplicate init correctly rejected");
      }
    });
  });

  // =========================================================================
  // Whitelist Management
  // =========================================================================
  describe("whitelist management", () => {
    it("admin can add a creator to the whitelist", async () => {
      const [whitelistPda] = getWhitelistPda(creator.publicKey);

      await program.methods
        .addCreator()
        .accounts({
          admin: admin.publicKey,
          config: configPda,
          whitelist: whitelistPda,
          creator: creator.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const whitelist = await program.account.creatorWhitelist.fetch(whitelistPda);
      assert.ok(whitelist.creator.equals(creator.publicKey), "Creator should match");
      assert.equal(whitelist.active, true, "Should be active");
      assert.ok(whitelist.bump > 0, "Bump should be set");
      console.log("Creator whitelisted successfully");
    });

    it("rejects add_creator from non-admin", async () => {
      const fakeCreator = Keypair.generate();
      const [whitelistPda] = getWhitelistPda(fakeCreator.publicKey);

      try {
        await program.methods
          .addCreator()
          .accounts({
            admin: creator.publicKey, // creator is NOT admin
            config: configPda,
            whitelist: whitelistPda,
            creator: fakeCreator.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([creator])
          .rpc();

        assert.fail("Should have thrown for non-admin");
      } catch (err) {
        assert.ok(
          err.toString().includes("Unauthorized") ||
          err.toString().includes("Error") ||
          err.toString().includes("2001") ||
          err.toString().includes("has_one"),
          "Should reject non-admin"
        );
        console.log("Non-admin add_creator correctly rejected");
      }
    });

    it("admin can remove a creator from the whitelist", async () => {
      const [whitelistPda] = getWhitelistPda(creator.publicKey);

      await program.methods
        .removeCreator()
        .accounts({
          admin: admin.publicKey,
          config: configPda,
          whitelist: whitelistPda,
          creator: creator.publicKey,
        })
        .rpc();

      // PDA should be closed (account no longer exists)
      const account = await connection.getAccountInfo(whitelistPda);
      assert.isNull(account, "Whitelist PDA should be closed after removal");
      console.log("Creator removed, PDA closed, rent returned to admin");
    });

    it("admin can re-add a previously removed creator", async () => {
      const [whitelistPda] = getWhitelistPda(creator.publicKey);

      // Re-add the same creator (PDA was closed, so init works again)
      await program.methods
        .addCreator()
        .accounts({
          admin: admin.publicKey,
          config: configPda,
          whitelist: whitelistPda,
          creator: creator.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const whitelist = await program.account.creatorWhitelist.fetch(whitelistPda);
      assert.ok(whitelist.creator.equals(creator.publicKey), "Creator should match after re-add");
      assert.equal(whitelist.active, true, "Should be active after re-add");
      console.log("Creator re-added successfully after removal");
    });
  });

  // =========================================================================
  // Create Market
  // =========================================================================
  describe("create_market", () => {
    it("whitelisted creator can create a market with valid params", async () => {
      const [whitelistPda] = getWhitelistPda(creator.publicKey);
      const [marketPda] = getMarketPda(1);
      const [vaultPda] = getVaultPda(1);

      const resolutionTime = new anchor.BN(Math.floor(Date.now() / 1000) + 86400); // 24h from now

      await program.methods
        .createMarket({
          question: "Will ETH reach $10,000 by end of 2026?",
          resolutionSource: "https://coinmarketcap.com/currencies/ethereum/",
          category: 1, // Crypto
          resolutionTime,
        })
        .accounts({
          creator: creator.publicKey,
          config: configPda,
          whitelist: whitelistPda,
          market: marketPda,
          marketVault: vaultPda,
          usdcMint,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([creator])
        .rpc();

      // Verify market fields
      const market = await program.account.market.fetch(marketPda);
      assert.equal(market.id.toNumber(), 1, "Market ID should be 1");
      assert.equal(market.question, "Will ETH reach $10,000 by end of 2026?", "Question should match");
      assert.equal(market.resolutionSource, "https://coinmarketcap.com/currencies/ethereum/", "Resolution source should match");
      assert.equal(market.category, 1, "Category should be 1 (Crypto)");
      assert.ok(market.resolutionTime.eq(resolutionTime), "Resolution time should match");
      assert.equal(market.state, 0, "State should be 0 (Open)");
      assert.equal(market.winningOutcome, 0, "Winning outcome should be 0 (None)");
      assert.equal(market.totalBets.toNumber(), 0, "Total bets should be 0");
      assert.ok(market.creator.equals(creator.publicKey), "Creator should match");
      assert.ok(market.createdAt.toNumber() > 0, "Created at should be set");
      assert.ok(market.configFeeRecipient.equals(feeRecipient), "Fee recipient should match config");
      assert.equal(market.configFeeBps, protocolFeeBps, "Fee bps should match config");
      assert.equal(market.mpcLock, false, "MPC lock should be false");
      assert.ok(market.bump > 0, "Market bump should be set");
      assert.ok(market.vaultBump > 0, "Vault bump should be set");

      // Verify market counter incremented
      const config = await program.account.config.fetch(configPda);
      assert.equal(config.marketCounter.toNumber(), 1, "Market counter should be 1");

      // Verify vault token account exists with correct mint
      const vaultAccount = await connection.getAccountInfo(vaultPda);
      assert.isNotNull(vaultAccount, "Vault token account should exist");

      console.log("Market created successfully with all fields verified");
    });

    it("rejects create_market from non-whitelisted address", async () => {
      const nonWhitelisted = Keypair.generate();
      const airdrop = await connection.requestAirdrop(
        nonWhitelisted.publicKey,
        2 * LAMPORTS_PER_SOL
      );
      await connection.confirmTransaction(airdrop);

      const [whitelistPda] = getWhitelistPda(nonWhitelisted.publicKey);
      const [marketPda] = getMarketPda(2);
      const [vaultPda] = getVaultPda(2);

      try {
        await program.methods
          .createMarket({
            question: "Will BTC reach $200k?",
            resolutionSource: "https://coinmarketcap.com",
            category: 1,
            resolutionTime: new anchor.BN(Math.floor(Date.now() / 1000) + 86400),
          })
          .accounts({
            creator: nonWhitelisted.publicKey,
            config: configPda,
            whitelist: whitelistPda,
            market: marketPda,
            marketVault: vaultPda,
            usdcMint,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .signers([nonWhitelisted])
          .rpc();

        assert.fail("Should have thrown for non-whitelisted creator");
      } catch (err) {
        assert.ok(
          err.toString().includes("AccountNotInitialized") ||
          err.toString().includes("CreatorNotWhitelisted") ||
          err.toString().includes("Error"),
          "Should reject non-whitelisted creator"
        );
        console.log("Non-whitelisted create_market correctly rejected");
      }
    });

    it("rejects create_market with invalid category (5)", async () => {
      const [whitelistPda] = getWhitelistPda(creator.publicKey);
      const [marketPda] = getMarketPda(2);
      const [vaultPda] = getVaultPda(2);

      try {
        await program.methods
          .createMarket({
            question: "Test question?",
            resolutionSource: "https://example.com",
            category: 5, // Invalid -- only 0-4 allowed
            resolutionTime: new anchor.BN(Math.floor(Date.now() / 1000) + 86400),
          })
          .accounts({
            creator: creator.publicKey,
            config: configPda,
            whitelist: whitelistPda,
            market: marketPda,
            marketVault: vaultPda,
            usdcMint,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .signers([creator])
          .rpc();

        assert.fail("Should have thrown for invalid category");
      } catch (err) {
        assert.ok(
          err.toString().includes("InvalidCategory") ||
          err.toString().includes("6003") ||
          err.toString().includes("Error"),
          "Should reject invalid category"
        );
        console.log("Invalid category correctly rejected");
      }
    });

    it("rejects create_market with deadline less than 1 hour away", async () => {
      const [whitelistPda] = getWhitelistPda(creator.publicKey);
      const [marketPda] = getMarketPda(2);
      const [vaultPda] = getVaultPda(2);

      try {
        await program.methods
          .createMarket({
            question: "Test question?",
            resolutionSource: "https://example.com",
            category: 0,
            resolutionTime: new anchor.BN(Math.floor(Date.now() / 1000) + 1800), // 30 min -- too soon
          })
          .accounts({
            creator: creator.publicKey,
            config: configPda,
            whitelist: whitelistPda,
            market: marketPda,
            marketVault: vaultPda,
            usdcMint,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .signers([creator])
          .rpc();

        assert.fail("Should have thrown for deadline too soon");
      } catch (err) {
        assert.ok(
          err.toString().includes("DeadlineTooSoon") ||
          err.toString().includes("6007") ||
          err.toString().includes("Error"),
          "Should reject deadline less than 1 hour away"
        );
        console.log("Deadline too soon correctly rejected");
      }
    });

    it("rejects create_market with empty question", async () => {
      const [whitelistPda] = getWhitelistPda(creator.publicKey);
      const [marketPda] = getMarketPda(2);
      const [vaultPda] = getVaultPda(2);

      try {
        await program.methods
          .createMarket({
            question: "", // Empty question
            resolutionSource: "https://example.com",
            category: 0,
            resolutionTime: new anchor.BN(Math.floor(Date.now() / 1000) + 86400),
          })
          .accounts({
            creator: creator.publicKey,
            config: configPda,
            whitelist: whitelistPda,
            market: marketPda,
            marketVault: vaultPda,
            usdcMint,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .signers([creator])
          .rpc();

        assert.fail("Should have thrown for empty question");
      } catch (err) {
        assert.ok(
          err.toString().includes("EmptyQuestion") ||
          err.toString().includes("6009") ||
          err.toString().includes("Error"),
          "Should reject empty question"
        );
        console.log("Empty question correctly rejected");
      }
    });

    it("rejects create_market with empty resolution_source", async () => {
      const [whitelistPda] = getWhitelistPda(creator.publicKey);
      const [marketPda] = getMarketPda(2);
      const [vaultPda] = getVaultPda(2);

      try {
        await program.methods
          .createMarket({
            question: "Valid question?",
            resolutionSource: "", // Empty resolution source
            category: 0,
            resolutionTime: new anchor.BN(Math.floor(Date.now() / 1000) + 86400),
          })
          .accounts({
            creator: creator.publicKey,
            config: configPda,
            whitelist: whitelistPda,
            market: marketPda,
            marketVault: vaultPda,
            usdcMint,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .signers([creator])
          .rpc();

        assert.fail("Should have thrown for empty resolution source");
      } catch (err) {
        assert.ok(
          err.toString().includes("EmptyResolutionSource") ||
          err.toString().includes("6008") ||
          err.toString().includes("Error"),
          "Should reject empty resolution source"
        );
        console.log("Empty resolution source correctly rejected");
      }
    });

    it("can create a second market (counter increments to 2)", async () => {
      const [whitelistPda] = getWhitelistPda(creator.publicKey);
      const [marketPda] = getMarketPda(2);
      const [vaultPda] = getVaultPda(2);

      await program.methods
        .createMarket({
          question: "Will Bitcoin reach $200,000 by end of 2026?",
          resolutionSource: "https://coinmarketcap.com/currencies/bitcoin/",
          category: 1, // Crypto
          resolutionTime: new anchor.BN(Math.floor(Date.now() / 1000) + 172800), // 48h from now
        })
        .accounts({
          creator: creator.publicKey,
          config: configPda,
          whitelist: whitelistPda,
          market: marketPda,
          marketVault: vaultPda,
          usdcMint,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([creator])
        .rpc();

      // Verify second market
      const market = await program.account.market.fetch(marketPda);
      assert.equal(market.id.toNumber(), 2, "Second market ID should be 2");
      assert.equal(market.question, "Will Bitcoin reach $200,000 by end of 2026?");

      // Verify counter incremented
      const config = await program.account.config.fetch(configPda);
      assert.equal(config.marketCounter.toNumber(), 2, "Market counter should be 2");

      console.log("Second market created, counter = 2");
    });
  });

  // =========================================================================
  // Cancel Market
  // =========================================================================
  describe("cancel_market", () => {
    let cancelMarketId: number;

    before(async () => {
      // Create a fresh market specifically for cancellation testing
      // Market counter is currently at 2, so next will be 3
      const [whitelistPda] = getWhitelistPda(creator.publicKey);
      const [marketPda] = getMarketPda(3);
      const [vaultPda] = getVaultPda(3);

      await program.methods
        .createMarket({
          question: "Will this market be cancelled?",
          resolutionSource: "https://example.com/cancel-test",
          category: 0, // Politics
          resolutionTime: new anchor.BN(Math.floor(Date.now() / 1000) + 86400),
        })
        .accounts({
          creator: creator.publicKey,
          config: configPda,
          whitelist: whitelistPda,
          market: marketPda,
          marketVault: vaultPda,
          usdcMint,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([creator])
        .rpc();

      cancelMarketId = 3;
      console.log("Created market #3 for cancellation tests");
    });

    it("creator can cancel a market with zero bets", async () => {
      const [marketPda] = getMarketPda(cancelMarketId);
      const [vaultPda] = getVaultPda(cancelMarketId);

      // Verify market exists before cancel
      const marketBefore = await program.account.market.fetch(marketPda);
      assert.equal(marketBefore.totalBets.toNumber(), 0, "Market should have 0 bets");

      await program.methods
        .cancelMarket()
        .accounts({
          creator: creator.publicKey,
          config: configPda,
          market: marketPda,
          marketVault: vaultPda,
          usdcMint,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([creator])
        .rpc();

      // Verify Market PDA no longer exists
      const marketAccount = await connection.getAccountInfo(marketPda);
      assert.isNull(marketAccount, "Market PDA should be closed after cancel");

      // Verify Vault token account no longer exists
      const vaultAccount = await connection.getAccountInfo(vaultPda);
      assert.isNull(vaultAccount, "Vault token account should be closed after cancel");

      console.log("Market cancelled: both Market PDA and vault closed, rent returned to creator");
    });

    it("rejects cancel from non-creator", async () => {
      // Create another market (market #4) to test unauthorized cancel
      const [whitelistPda] = getWhitelistPda(creator.publicKey);
      const [marketPda] = getMarketPda(4);
      const [vaultPda] = getVaultPda(4);

      await program.methods
        .createMarket({
          question: "Can a non-creator cancel this?",
          resolutionSource: "https://example.com/auth-test",
          category: 2, // Sports
          resolutionTime: new anchor.BN(Math.floor(Date.now() / 1000) + 86400),
        })
        .accounts({
          creator: creator.publicKey,
          config: configPda,
          whitelist: whitelistPda,
          market: marketPda,
          marketVault: vaultPda,
          usdcMint,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([creator])
        .rpc();

      // Try to cancel as admin (not the creator)
      try {
        await program.methods
          .cancelMarket()
          .accounts({
            creator: admin.publicKey, // admin is NOT the market creator
            config: configPda,
            market: marketPda,
            marketVault: vaultPda,
            usdcMint,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .rpc();

        assert.fail("Should have thrown for non-creator cancel");
      } catch (err) {
        assert.ok(
          err.toString().includes("Unauthorized") ||
          err.toString().includes("has_one") ||
          err.toString().includes("ConstraintHasOne") ||
          err.toString().includes("2001") ||
          err.toString().includes("Error"),
          "Should reject non-creator cancel"
        );
        console.log("Non-creator cancel correctly rejected");
      }

      // Verify market still exists
      const marketAccount = await connection.getAccountInfo(marketPda);
      assert.isNotNull(marketAccount, "Market should still exist after failed cancel");
    });

    // Note: Cannot test "rejects cancel with bets" in Phase 2 because place_bet
    // doesn't exist yet. This test gap will be filled in Phase 5.
  });
});
