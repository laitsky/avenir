/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/avenir.json`.
 */
export type Avenir = {
  "address": "PjLEXWGmgCA78MTaK9fN1k4muUiis2gdkUkrXRHRUkN",
  "metadata": {
    "name": "avenir",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "addCreator",
      "discriminator": [
        120,
        140,
        147,
        174,
        149,
        203,
        237,
        81
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true,
          "relations": [
            "config"
          ]
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "whitelist",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  119,
                  104,
                  105,
                  116,
                  101,
                  108,
                  105,
                  115,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "creator"
              }
            ]
          }
        },
        {
          "name": "creator"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "addDisputeVoteCallback",
      "discriminator": [
        253,
        109,
        207,
        16,
        164,
        229,
        86,
        101
      ],
      "accounts": [
        {
          "name": "arciumProgram",
          "address": "Arcj82pX7HxYKLR92qvgZUAd7vGS1k4hQvAFcPATFdEQ"
        },
        {
          "name": "compDefAccount"
        },
        {
          "name": "mxeAccount"
        },
        {
          "name": "computationAccount"
        },
        {
          "name": "clusterAccount"
        },
        {
          "name": "instructionsSysvar",
          "address": "Sysvar1nstructions1111111111111111111111111"
        },
        {
          "name": "disputeTally",
          "docs": [
            "The DisputeTally PDA to write updated encrypted vote state into."
          ],
          "writable": true
        },
        {
          "name": "dispute",
          "docs": [
            "The Dispute PDA to clear mpc_lock on completion."
          ],
          "writable": true
        }
      ],
      "args": [
        {
          "name": "output",
          "type": {
            "defined": {
              "name": "signedComputationOutputs",
              "generics": [
                {
                  "kind": "type",
                  "type": {
                    "defined": {
                      "name": "addDisputeVoteOutput"
                    }
                  }
                }
              ]
            }
          }
        }
      ]
    },
    {
      "name": "addTiebreaker",
      "discriminator": [
        188,
        233,
        196,
        136,
        188,
        159,
        229,
        151
      ],
      "accounts": [
        {
          "name": "payer",
          "docs": [
            "Anyone can trigger tiebreaker addition."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "dispute",
          "docs": [
            "The Dispute PDA -- validates status and tiebreaker state."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  105,
                  115,
                  112,
                  117,
                  116,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "dispute.market_id",
                "account": "dispute"
              }
            ]
          }
        },
        {
          "name": "market",
          "docs": [
            "The Market account -- validates state is Disputed (3)."
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "market.id",
                "account": "market"
              }
            ]
          }
        },
        {
          "name": "resolverRegistry",
          "docs": [
            "The ResolverRegistry for juror selection."
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  115,
                  111,
                  108,
                  118,
                  101,
                  114,
                  95,
                  114,
                  101,
                  103,
                  105,
                  115,
                  116,
                  114,
                  121
                ]
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "approveResolver",
      "discriminator": [
        130,
        92,
        50,
        130,
        120,
        216,
        52,
        26
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "resolver",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  115,
                  111,
                  108,
                  118,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "resolver.wallet",
                "account": "resolver"
              }
            ]
          }
        },
        {
          "name": "resolverRegistry",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  115,
                  111,
                  108,
                  118,
                  101,
                  114,
                  95,
                  114,
                  101,
                  103,
                  105,
                  115,
                  116,
                  114,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "cancelMarket",
      "discriminator": [
        205,
        121,
        84,
        210,
        222,
        71,
        150,
        11
      ],
      "accounts": [
        {
          "name": "creator",
          "writable": true,
          "signer": true,
          "relations": [
            "market"
          ]
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "market",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "market.id",
                "account": "market"
              }
            ]
          }
        },
        {
          "name": "marketVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "market.id",
                "account": "market"
              }
            ]
          }
        },
        {
          "name": "usdcMint"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": []
    },
    {
      "name": "castVote",
      "discriminator": [
        20,
        212,
        15,
        189,
        69,
        180,
        69,
        151
      ],
      "accounts": [
        {
          "name": "juror",
          "writable": true,
          "signer": true
        },
        {
          "name": "dispute",
          "docs": [
            "The Dispute PDA -- validates status, juror eligibility, voting window, MPC lock."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  105,
                  115,
                  112,
                  117,
                  116,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "dispute.market_id",
                "account": "dispute"
              }
            ]
          }
        },
        {
          "name": "disputeTally",
          "docs": [
            "The DisputeTally PDA containing encrypted vote state."
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  105,
                  115,
                  112,
                  117,
                  116,
                  101,
                  95,
                  116,
                  97,
                  108,
                  108,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "dispute_tally.market_id",
                "account": "disputeTally"
              }
            ]
          }
        },
        {
          "name": "market",
          "docs": [
            "The Market account -- validates state is Disputed (3)."
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "market.id",
                "account": "market"
              }
            ]
          }
        },
        {
          "name": "resolver",
          "docs": [
            "The Resolver PDA for the juror -- provides stake weight."
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  115,
                  111,
                  108,
                  118,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "juror"
              }
            ]
          }
        },
        {
          "name": "mxeAccount"
        },
        {
          "name": "signPdaAccount",
          "writable": true
        },
        {
          "name": "mempoolAccount",
          "writable": true
        },
        {
          "name": "executingPool",
          "writable": true
        },
        {
          "name": "computationAccount",
          "writable": true
        },
        {
          "name": "compDefAccount"
        },
        {
          "name": "clusterAccount",
          "writable": true
        },
        {
          "name": "poolAccount",
          "writable": true,
          "address": "G2sRWJvi3xoyh5k2gY49eG9L8YhAEWQPtNb1zb1GXTtC"
        },
        {
          "name": "clockAccount",
          "writable": true,
          "address": "7EbMUTLo5DjdzbN7s8BXeZwXzEwNQb1hScfRvWg8a6ot"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "arciumProgram",
          "address": "Arcj82pX7HxYKLR92qvgZUAd7vGS1k4hQvAFcPATFdEQ"
        }
      ],
      "args": [
        {
          "name": "computationOffset",
          "type": "u64"
        },
        {
          "name": "voteCiphertext",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "pubKey",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "nonce",
          "type": "u128"
        }
      ]
    },
    {
      "name": "claimPayout",
      "discriminator": [
        127,
        240,
        132,
        62,
        227,
        198,
        146,
        133
      ],
      "accounts": [
        {
          "name": "winner",
          "signer": true
        },
        {
          "name": "market",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "market.id",
                "account": "market"
              }
            ]
          }
        },
        {
          "name": "userPosition",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "market.id",
                "account": "market"
              },
              {
                "kind": "account",
                "path": "winner"
              }
            ]
          }
        },
        {
          "name": "marketVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "market.id",
                "account": "market"
              }
            ]
          }
        },
        {
          "name": "winnerTokenAccount",
          "writable": true
        },
        {
          "name": "feeRecipientTokenAccount",
          "writable": true
        },
        {
          "name": "usdcMint"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": []
    },
    {
      "name": "computePayouts",
      "discriminator": [
        161,
        59,
        190,
        177,
        227,
        166,
        68,
        169
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "market",
          "docs": [
            "The Market account -- validates Resolved state, manages mpc_lock."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "market.id",
                "account": "market"
              }
            ]
          }
        },
        {
          "name": "marketPool",
          "docs": [
            "The MarketPool PDA containing encrypted pool state."
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "market_pool.market_id",
                "account": "marketPool"
              }
            ]
          }
        },
        {
          "name": "mxeAccount"
        },
        {
          "name": "signPdaAccount",
          "writable": true
        },
        {
          "name": "mempoolAccount",
          "writable": true
        },
        {
          "name": "executingPool",
          "writable": true
        },
        {
          "name": "computationAccount",
          "writable": true
        },
        {
          "name": "compDefAccount"
        },
        {
          "name": "clusterAccount",
          "writable": true
        },
        {
          "name": "poolAccount",
          "writable": true,
          "address": "G2sRWJvi3xoyh5k2gY49eG9L8YhAEWQPtNb1zb1GXTtC"
        },
        {
          "name": "clockAccount",
          "writable": true,
          "address": "7EbMUTLo5DjdzbN7s8BXeZwXzEwNQb1hScfRvWg8a6ot"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "arciumProgram",
          "address": "Arcj82pX7HxYKLR92qvgZUAd7vGS1k4hQvAFcPATFdEQ"
        }
      ],
      "args": [
        {
          "name": "computationOffset",
          "type": "u64"
        }
      ]
    },
    {
      "name": "computePayoutsCallback",
      "discriminator": [
        38,
        148,
        170,
        135,
        138,
        77,
        216,
        196
      ],
      "accounts": [
        {
          "name": "arciumProgram",
          "address": "Arcj82pX7HxYKLR92qvgZUAd7vGS1k4hQvAFcPATFdEQ"
        },
        {
          "name": "compDefAccount"
        },
        {
          "name": "mxeAccount"
        },
        {
          "name": "computationAccount"
        },
        {
          "name": "clusterAccount"
        },
        {
          "name": "instructionsSysvar",
          "address": "Sysvar1nstructions1111111111111111111111111"
        },
        {
          "name": "market",
          "docs": [
            "The Market account to write revealed pool totals and transition to Finalized."
          ],
          "writable": true
        }
      ],
      "args": [
        {
          "name": "output",
          "type": {
            "defined": {
              "name": "signedComputationOutputs",
              "generics": [
                {
                  "kind": "type",
                  "type": {
                    "defined": {
                      "name": "computePayoutsOutput"
                    }
                  }
                }
              ]
            }
          }
        }
      ]
    },
    {
      "name": "createMarket",
      "discriminator": [
        103,
        226,
        97,
        235,
        200,
        188,
        251,
        254
      ],
      "accounts": [
        {
          "name": "creator",
          "writable": true,
          "signer": true
        },
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "whitelist",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  119,
                  104,
                  105,
                  116,
                  101,
                  108,
                  105,
                  115,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "creator"
              }
            ]
          }
        },
        {
          "name": "market",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "config.market_counter.checked_add(1)",
                "account": "config"
              }
            ]
          }
        },
        {
          "name": "marketVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "config.market_counter.checked_add(1)",
                "account": "config"
              }
            ]
          }
        },
        {
          "name": "marketPool",
          "docs": [
            "MarketPool PDA -- fixed-layout account for encrypted pool state.",
            "Created alongside Market so init_pool can write to it via callback."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "config.market_counter.checked_add(1)",
                "account": "config"
              }
            ]
          }
        },
        {
          "name": "usdcMint"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "createMarketParams"
            }
          }
        }
      ]
    },
    {
      "name": "finalizeDispute",
      "discriminator": [
        190,
        211,
        17,
        122,
        247,
        157,
        27,
        223
      ],
      "accounts": [
        {
          "name": "payer",
          "docs": [
            "Anyone can trigger finalization once quorum is reached."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "dispute",
          "docs": [
            "The Dispute PDA -- validates status, quorum, MPC lock."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  105,
                  115,
                  112,
                  117,
                  116,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "dispute.market_id",
                "account": "dispute"
              }
            ]
          }
        },
        {
          "name": "disputeTally",
          "docs": [
            "The DisputeTally PDA containing encrypted vote state."
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  105,
                  115,
                  112,
                  117,
                  116,
                  101,
                  95,
                  116,
                  97,
                  108,
                  108,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "dispute_tally.market_id",
                "account": "disputeTally"
              }
            ]
          }
        },
        {
          "name": "market",
          "docs": [
            "The Market account -- validates state is Disputed (3)."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "market.id",
                "account": "market"
              }
            ]
          }
        },
        {
          "name": "mxeAccount"
        },
        {
          "name": "signPdaAccount",
          "writable": true
        },
        {
          "name": "mempoolAccount",
          "writable": true
        },
        {
          "name": "executingPool",
          "writable": true
        },
        {
          "name": "computationAccount",
          "writable": true
        },
        {
          "name": "compDefAccount"
        },
        {
          "name": "clusterAccount",
          "writable": true
        },
        {
          "name": "poolAccount",
          "writable": true,
          "address": "G2sRWJvi3xoyh5k2gY49eG9L8YhAEWQPtNb1zb1GXTtC"
        },
        {
          "name": "clockAccount",
          "writable": true,
          "address": "7EbMUTLo5DjdzbN7s8BXeZwXzEwNQb1hScfRvWg8a6ot"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "arciumProgram",
          "address": "Arcj82pX7HxYKLR92qvgZUAd7vGS1k4hQvAFcPATFdEQ"
        }
      ],
      "args": [
        {
          "name": "computationOffset",
          "type": "u64"
        }
      ]
    },
    {
      "name": "finalizeDisputeCallback",
      "discriminator": [
        49,
        125,
        48,
        239,
        135,
        84,
        129,
        130
      ],
      "accounts": [
        {
          "name": "arciumProgram",
          "address": "Arcj82pX7HxYKLR92qvgZUAd7vGS1k4hQvAFcPATFdEQ"
        },
        {
          "name": "compDefAccount"
        },
        {
          "name": "mxeAccount"
        },
        {
          "name": "computationAccount"
        },
        {
          "name": "clusterAccount"
        },
        {
          "name": "instructionsSysvar",
          "address": "Sysvar1nstructions1111111111111111111111111"
        },
        {
          "name": "market",
          "docs": [
            "The Market account to resolve based on dispute outcome."
          ],
          "writable": true
        },
        {
          "name": "dispute",
          "docs": [
            "The Dispute account to update status and clear MPC lock."
          ],
          "writable": true
        }
      ],
      "args": [
        {
          "name": "output",
          "type": {
            "defined": {
              "name": "signedComputationOutputs",
              "generics": [
                {
                  "kind": "type",
                  "type": {
                    "defined": {
                      "name": "finalizeDisputeOutput"
                    }
                  }
                }
              ]
            }
          }
        }
      ]
    },
    {
      "name": "helloWorld",
      "discriminator": [
        11,
        235,
        52,
        244,
        76,
        66,
        25,
        71
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "mxeAccount"
        },
        {
          "name": "signPdaAccount",
          "writable": true
        },
        {
          "name": "mempoolAccount",
          "writable": true
        },
        {
          "name": "executingPool",
          "writable": true
        },
        {
          "name": "computationAccount",
          "writable": true
        },
        {
          "name": "compDefAccount"
        },
        {
          "name": "clusterAccount",
          "writable": true
        },
        {
          "name": "poolAccount",
          "writable": true,
          "address": "G2sRWJvi3xoyh5k2gY49eG9L8YhAEWQPtNb1zb1GXTtC"
        },
        {
          "name": "clockAccount",
          "writable": true,
          "address": "7EbMUTLo5DjdzbN7s8BXeZwXzEwNQb1hScfRvWg8a6ot"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "arciumProgram",
          "address": "Arcj82pX7HxYKLR92qvgZUAd7vGS1k4hQvAFcPATFdEQ"
        }
      ],
      "args": [
        {
          "name": "computationOffset",
          "type": "u64"
        },
        {
          "name": "aCiphertext",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "bCiphertext",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "pubKey",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "nonce",
          "type": "u128"
        }
      ]
    },
    {
      "name": "helloWorldCallback",
      "discriminator": [
        38,
        81,
        4,
        167,
        198,
        99,
        175,
        202
      ],
      "accounts": [
        {
          "name": "arciumProgram",
          "address": "Arcj82pX7HxYKLR92qvgZUAd7vGS1k4hQvAFcPATFdEQ"
        },
        {
          "name": "compDefAccount"
        },
        {
          "name": "mxeAccount"
        },
        {
          "name": "computationAccount"
        },
        {
          "name": "clusterAccount"
        },
        {
          "name": "instructionsSysvar",
          "address": "Sysvar1nstructions1111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "output",
          "type": {
            "defined": {
              "name": "signedComputationOutputs",
              "generics": [
                {
                  "kind": "type",
                  "type": {
                    "defined": {
                      "name": "helloWorldOutput"
                    }
                  }
                }
              ]
            }
          }
        }
      ]
    },
    {
      "name": "initAddDisputeVoteCompDef",
      "discriminator": [
        209,
        124,
        124,
        202,
        106,
        28,
        42,
        156
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "mxeAccount",
          "writable": true
        },
        {
          "name": "compDefAccount",
          "docs": [
            "Can't check it here as it's not initialized yet."
          ],
          "writable": true
        },
        {
          "name": "addressLookupTable",
          "writable": true
        },
        {
          "name": "lutProgram"
        },
        {
          "name": "arciumProgram",
          "address": "Arcj82pX7HxYKLR92qvgZUAd7vGS1k4hQvAFcPATFdEQ"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "initComputePayoutsCompDef",
      "discriminator": [
        180,
        137,
        221,
        52,
        217,
        26,
        202,
        93
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "mxeAccount",
          "writable": true
        },
        {
          "name": "compDefAccount",
          "docs": [
            "Can't check it here as it's not initialized yet."
          ],
          "writable": true
        },
        {
          "name": "addressLookupTable",
          "writable": true
        },
        {
          "name": "lutProgram"
        },
        {
          "name": "arciumProgram",
          "address": "Arcj82pX7HxYKLR92qvgZUAd7vGS1k4hQvAFcPATFdEQ"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "initDisputeTally",
      "discriminator": [
        69,
        161,
        224,
        227,
        240,
        138,
        107,
        245
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "dispute",
          "docs": [
            "The Dispute PDA -- validates status is Voting."
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  105,
                  115,
                  112,
                  117,
                  116,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "dispute.market_id",
                "account": "dispute"
              }
            ]
          }
        },
        {
          "name": "disputeTally",
          "docs": [
            "The DisputeTally PDA that will receive the encrypted vote state in the callback.",
            "Must already be initialized by open_dispute."
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  105,
                  115,
                  112,
                  117,
                  116,
                  101,
                  95,
                  116,
                  97,
                  108,
                  108,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "dispute_tally.market_id",
                "account": "disputeTally"
              }
            ]
          }
        },
        {
          "name": "mxeAccount"
        },
        {
          "name": "signPdaAccount",
          "writable": true
        },
        {
          "name": "mempoolAccount",
          "writable": true
        },
        {
          "name": "executingPool",
          "writable": true
        },
        {
          "name": "computationAccount",
          "writable": true
        },
        {
          "name": "compDefAccount"
        },
        {
          "name": "clusterAccount",
          "writable": true
        },
        {
          "name": "poolAccount",
          "writable": true,
          "address": "G2sRWJvi3xoyh5k2gY49eG9L8YhAEWQPtNb1zb1GXTtC"
        },
        {
          "name": "clockAccount",
          "writable": true,
          "address": "7EbMUTLo5DjdzbN7s8BXeZwXzEwNQb1hScfRvWg8a6ot"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "arciumProgram",
          "address": "Arcj82pX7HxYKLR92qvgZUAd7vGS1k4hQvAFcPATFdEQ"
        }
      ],
      "args": [
        {
          "name": "computationOffset",
          "type": "u64"
        }
      ]
    },
    {
      "name": "initDisputeTallyCallback",
      "discriminator": [
        82,
        158,
        236,
        248,
        235,
        35,
        27,
        72
      ],
      "accounts": [
        {
          "name": "arciumProgram",
          "address": "Arcj82pX7HxYKLR92qvgZUAd7vGS1k4hQvAFcPATFdEQ"
        },
        {
          "name": "compDefAccount"
        },
        {
          "name": "mxeAccount"
        },
        {
          "name": "computationAccount"
        },
        {
          "name": "clusterAccount"
        },
        {
          "name": "instructionsSysvar",
          "address": "Sysvar1nstructions1111111111111111111111111"
        },
        {
          "name": "disputeTally",
          "docs": [
            "The DisputeTally PDA to write encrypted zero state into."
          ],
          "writable": true
        }
      ],
      "args": [
        {
          "name": "output",
          "type": {
            "defined": {
              "name": "signedComputationOutputs",
              "generics": [
                {
                  "kind": "type",
                  "type": {
                    "defined": {
                      "name": "initDisputeTallyOutput"
                    }
                  }
                }
              ]
            }
          }
        }
      ]
    },
    {
      "name": "initDisputeTallyCompDef",
      "discriminator": [
        102,
        39,
        82,
        228,
        155,
        178,
        176,
        121
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "mxeAccount",
          "writable": true
        },
        {
          "name": "compDefAccount",
          "docs": [
            "Can't check it here as it's not initialized yet."
          ],
          "writable": true
        },
        {
          "name": "addressLookupTable",
          "writable": true
        },
        {
          "name": "lutProgram"
        },
        {
          "name": "arciumProgram",
          "address": "Arcj82pX7HxYKLR92qvgZUAd7vGS1k4hQvAFcPATFdEQ"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "initFinalizeDisputeCompDef",
      "discriminator": [
        251,
        22,
        72,
        63,
        251,
        69,
        169,
        194
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "mxeAccount",
          "writable": true
        },
        {
          "name": "compDefAccount",
          "docs": [
            "Can't check it here as it's not initialized yet."
          ],
          "writable": true
        },
        {
          "name": "addressLookupTable",
          "writable": true
        },
        {
          "name": "lutProgram"
        },
        {
          "name": "arciumProgram",
          "address": "Arcj82pX7HxYKLR92qvgZUAd7vGS1k4hQvAFcPATFdEQ"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "initHelloWorldCompDef",
      "discriminator": [
        83,
        248,
        165,
        251,
        82,
        210,
        110,
        237
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "mxeAccount",
          "writable": true
        },
        {
          "name": "compDefAccount",
          "docs": [
            "Can't check it here as it's not initialized yet."
          ],
          "writable": true
        },
        {
          "name": "addressLookupTable",
          "writable": true
        },
        {
          "name": "lutProgram"
        },
        {
          "name": "arciumProgram",
          "address": "Arcj82pX7HxYKLR92qvgZUAd7vGS1k4hQvAFcPATFdEQ"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "initPool",
      "discriminator": [
        116,
        233,
        199,
        204,
        115,
        159,
        171,
        36
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "marketPool",
          "docs": [
            "The MarketPool PDA that will receive the encrypted pool state in the callback.",
            "Must already be initialized by create_market."
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "market_pool.market_id",
                "account": "marketPool"
              }
            ]
          }
        },
        {
          "name": "mxeAccount"
        },
        {
          "name": "signPdaAccount",
          "writable": true
        },
        {
          "name": "mempoolAccount",
          "writable": true
        },
        {
          "name": "executingPool",
          "writable": true
        },
        {
          "name": "computationAccount",
          "writable": true
        },
        {
          "name": "compDefAccount"
        },
        {
          "name": "clusterAccount",
          "writable": true
        },
        {
          "name": "poolAccount",
          "writable": true,
          "address": "G2sRWJvi3xoyh5k2gY49eG9L8YhAEWQPtNb1zb1GXTtC"
        },
        {
          "name": "clockAccount",
          "writable": true,
          "address": "7EbMUTLo5DjdzbN7s8BXeZwXzEwNQb1hScfRvWg8a6ot"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "arciumProgram",
          "address": "Arcj82pX7HxYKLR92qvgZUAd7vGS1k4hQvAFcPATFdEQ"
        }
      ],
      "args": [
        {
          "name": "computationOffset",
          "type": "u64"
        }
      ]
    },
    {
      "name": "initPoolCallback",
      "discriminator": [
        52,
        113,
        171,
        48,
        175,
        188,
        120,
        140
      ],
      "accounts": [
        {
          "name": "arciumProgram",
          "address": "Arcj82pX7HxYKLR92qvgZUAd7vGS1k4hQvAFcPATFdEQ"
        },
        {
          "name": "compDefAccount"
        },
        {
          "name": "mxeAccount"
        },
        {
          "name": "computationAccount"
        },
        {
          "name": "clusterAccount"
        },
        {
          "name": "instructionsSysvar",
          "address": "Sysvar1nstructions1111111111111111111111111"
        },
        {
          "name": "marketPool",
          "docs": [
            "The MarketPool PDA to write encrypted zero state into."
          ],
          "writable": true
        }
      ],
      "args": [
        {
          "name": "output",
          "type": {
            "defined": {
              "name": "signedComputationOutputs",
              "generics": [
                {
                  "kind": "type",
                  "type": {
                    "defined": {
                      "name": "initPoolOutput"
                    }
                  }
                }
              ]
            }
          }
        }
      ]
    },
    {
      "name": "initPoolCompDef",
      "discriminator": [
        44,
        112,
        204,
        250,
        111,
        243,
        243,
        189
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "mxeAccount",
          "writable": true
        },
        {
          "name": "compDefAccount",
          "docs": [
            "Can't check it here as it's not initialized yet."
          ],
          "writable": true
        },
        {
          "name": "addressLookupTable",
          "writable": true
        },
        {
          "name": "lutProgram"
        },
        {
          "name": "arciumProgram",
          "address": "Arcj82pX7HxYKLR92qvgZUAd7vGS1k4hQvAFcPATFdEQ"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "initUpdatePoolCompDef",
      "discriminator": [
        73,
        179,
        220,
        105,
        133,
        202,
        176,
        228
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "mxeAccount",
          "writable": true
        },
        {
          "name": "compDefAccount",
          "docs": [
            "Can't check it here as it's not initialized yet."
          ],
          "writable": true
        },
        {
          "name": "addressLookupTable",
          "writable": true
        },
        {
          "name": "lutProgram"
        },
        {
          "name": "arciumProgram",
          "address": "Arcj82pX7HxYKLR92qvgZUAd7vGS1k4hQvAFcPATFdEQ"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "initialize",
      "discriminator": [
        175,
        175,
        109,
        31,
        13,
        152,
        155,
        237
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "initializeParams"
            }
          }
        }
      ]
    },
    {
      "name": "openDispute",
      "discriminator": [
        137,
        25,
        99,
        119,
        23,
        223,
        161,
        42
      ],
      "accounts": [
        {
          "name": "escalator",
          "docs": [
            "The market participant escalating to dispute (pays for PDA creation)"
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "market",
          "docs": [
            "The market being disputed"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "market.id",
                "account": "market"
              }
            ]
          }
        },
        {
          "name": "userPosition",
          "docs": [
            "Caller's position on this market (proves they are a participant)"
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "market.id",
                "account": "market"
              },
              {
                "kind": "account",
                "path": "escalator"
              }
            ]
          }
        },
        {
          "name": "resolverRegistry",
          "docs": [
            "Registry of approved resolvers (read-only, for juror selection)"
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  115,
                  111,
                  108,
                  118,
                  101,
                  114,
                  95,
                  114,
                  101,
                  103,
                  105,
                  115,
                  116,
                  114,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "dispute",
          "docs": [
            "Dispute PDA to be created"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  105,
                  115,
                  112,
                  117,
                  116,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "market.id",
                "account": "market"
              }
            ]
          }
        },
        {
          "name": "disputeTally",
          "docs": [
            "DisputeTally PDA to be created (fixed-layout for MPC)"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  105,
                  115,
                  112,
                  117,
                  116,
                  101,
                  95,
                  116,
                  97,
                  108,
                  108,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "market.id",
                "account": "market"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "placeBet",
      "discriminator": [
        222,
        62,
        67,
        220,
        63,
        166,
        126,
        33
      ],
      "accounts": [
        {
          "name": "bettor",
          "writable": true,
          "signer": true
        },
        {
          "name": "market",
          "docs": [
            "The Market account -- validates state, deadline, lock, stores pending bet data."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "market.id",
                "account": "market"
              }
            ]
          }
        },
        {
          "name": "marketPool",
          "docs": [
            "The MarketPool PDA containing encrypted pool state."
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "market_pool.market_id",
                "account": "marketPool"
              }
            ]
          }
        },
        {
          "name": "userPosition",
          "docs": [
            "Per-user, per-market position tracking.",
            "Created via init_if_needed because Arcium callbacks cannot create accounts."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "market.id",
                "account": "market"
              },
              {
                "kind": "account",
                "path": "bettor"
              }
            ]
          }
        },
        {
          "name": "userTokenAccount",
          "docs": [
            "Bettor's USDC token account (source for bet transfer)."
          ],
          "writable": true
        },
        {
          "name": "marketVault",
          "docs": [
            "Market vault token account (destination for bet transfer)."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "market.id",
                "account": "market"
              }
            ]
          }
        },
        {
          "name": "pendingBettorTokenAccount",
          "docs": [
            "when timeout recovery triggers. When no timeout, this account is unused."
          ],
          "writable": true
        },
        {
          "name": "usdcMint",
          "docs": [
            "USDC mint for token account constraints."
          ]
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "mxeAccount"
        },
        {
          "name": "signPdaAccount",
          "writable": true
        },
        {
          "name": "mempoolAccount",
          "writable": true
        },
        {
          "name": "executingPool",
          "writable": true
        },
        {
          "name": "computationAccount",
          "writable": true
        },
        {
          "name": "compDefAccount"
        },
        {
          "name": "clusterAccount",
          "writable": true
        },
        {
          "name": "poolAccount",
          "writable": true,
          "address": "G2sRWJvi3xoyh5k2gY49eG9L8YhAEWQPtNb1zb1GXTtC"
        },
        {
          "name": "clockAccount",
          "writable": true,
          "address": "7EbMUTLo5DjdzbN7s8BXeZwXzEwNQb1hScfRvWg8a6ot"
        },
        {
          "name": "arciumProgram",
          "address": "Arcj82pX7HxYKLR92qvgZUAd7vGS1k4hQvAFcPATFdEQ"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "isYes",
          "type": "bool"
        },
        {
          "name": "computationOffset",
          "type": "u64"
        },
        {
          "name": "isYesCiphertext",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "amountCiphertext",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "pubKey",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "nonce",
          "type": "u128"
        }
      ]
    },
    {
      "name": "registerResolver",
      "discriminator": [
        76,
        101,
        253,
        229,
        153,
        242,
        212,
        230
      ],
      "accounts": [
        {
          "name": "resolverWallet",
          "writable": true,
          "signer": true
        },
        {
          "name": "resolver",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  115,
                  111,
                  108,
                  118,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "resolverWallet"
              }
            ]
          }
        },
        {
          "name": "resolverVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  115,
                  111,
                  108,
                  118,
                  101,
                  114,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "resolverWallet"
              }
            ]
          }
        },
        {
          "name": "userTokenAccount",
          "writable": true
        },
        {
          "name": "usdcMint"
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "removeCreator",
      "discriminator": [
        125,
        152,
        5,
        6,
        49,
        239,
        31,
        166
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true,
          "relations": [
            "config"
          ]
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "whitelist",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  119,
                  104,
                  105,
                  116,
                  101,
                  108,
                  105,
                  115,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "creator"
              }
            ]
          }
        },
        {
          "name": "creator"
        }
      ],
      "args": []
    },
    {
      "name": "resolveMarket",
      "discriminator": [
        155,
        23,
        80,
        173,
        46,
        74,
        23,
        239
      ],
      "accounts": [
        {
          "name": "creator",
          "signer": true
        },
        {
          "name": "market",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "market.id",
                "account": "market"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "winningOutcome",
          "type": "u8"
        }
      ]
    },
    {
      "name": "settleDisputeRewards",
      "discriminator": [
        129,
        201,
        135,
        237,
        136,
        0,
        157,
        30
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "dispute",
          "docs": [
            "The Dispute account (read-only for juror list and votes_submitted)."
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  105,
                  115,
                  112,
                  117,
                  116,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "dispute.market_id",
                "account": "dispute"
              }
            ]
          }
        },
        {
          "name": "market",
          "docs": [
            "The Market account -- validates Resolved state."
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "market.id",
                "account": "market"
              }
            ]
          }
        },
        {
          "name": "resolver",
          "docs": [
            "The Resolver PDA for the juror being settled."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  115,
                  111,
                  108,
                  118,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "resolver.wallet",
                "account": "resolver"
              }
            ]
          }
        },
        {
          "name": "resolverVault",
          "docs": [
            "The Resolver's staked USDC vault."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  115,
                  111,
                  108,
                  118,
                  101,
                  114,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "resolver.wallet",
                "account": "resolver"
              }
            ]
          }
        },
        {
          "name": "rewardRecipient",
          "docs": [
            "Recipient token account for slashed funds (voter reward distribution).",
            "For v1, this is the caller-specified recipient for slashed USDC."
          ],
          "writable": true
        },
        {
          "name": "usdcMint"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "jurorIndex",
          "type": "u8"
        }
      ]
    },
    {
      "name": "stakeResolver",
      "discriminator": [
        81,
        248,
        206,
        93,
        116,
        223,
        41,
        81
      ],
      "accounts": [
        {
          "name": "resolverWallet",
          "writable": true,
          "signer": true
        },
        {
          "name": "resolver",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  115,
                  111,
                  108,
                  118,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "resolverWallet"
              }
            ]
          }
        },
        {
          "name": "resolverVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  115,
                  111,
                  108,
                  118,
                  101,
                  114,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "resolverWallet"
              }
            ]
          }
        },
        {
          "name": "userTokenAccount",
          "writable": true
        },
        {
          "name": "usdcMint"
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "updatePool",
      "discriminator": [
        239,
        214,
        170,
        78,
        36,
        35,
        30,
        34
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "market",
          "docs": [
            "The Market account -- used for mpc_lock check/set."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "market.id",
                "account": "market"
              }
            ]
          }
        },
        {
          "name": "marketPool",
          "docs": [
            "The MarketPool PDA containing encrypted pool state.",
            "Must have been initialized by init_pool callback before update_pool is called."
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "market_pool.market_id",
                "account": "marketPool"
              }
            ]
          }
        },
        {
          "name": "userPosition",
          "docs": [
            "UserPosition PDA (needed for callback account matching)."
          ],
          "writable": true
        },
        {
          "name": "marketVault",
          "docs": [
            "Market vault token account (needed for callback account matching)."
          ],
          "writable": true
        },
        {
          "name": "bettorTokenAccount",
          "docs": [
            "Bettor's token account (needed for callback account matching)."
          ],
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "mxeAccount"
        },
        {
          "name": "signPdaAccount",
          "writable": true
        },
        {
          "name": "mempoolAccount",
          "writable": true
        },
        {
          "name": "executingPool",
          "writable": true
        },
        {
          "name": "computationAccount",
          "writable": true
        },
        {
          "name": "compDefAccount"
        },
        {
          "name": "clusterAccount",
          "writable": true
        },
        {
          "name": "poolAccount",
          "writable": true,
          "address": "G2sRWJvi3xoyh5k2gY49eG9L8YhAEWQPtNb1zb1GXTtC"
        },
        {
          "name": "clockAccount",
          "writable": true,
          "address": "7EbMUTLo5DjdzbN7s8BXeZwXzEwNQb1hScfRvWg8a6ot"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "arciumProgram",
          "address": "Arcj82pX7HxYKLR92qvgZUAd7vGS1k4hQvAFcPATFdEQ"
        }
      ],
      "args": [
        {
          "name": "computationOffset",
          "type": "u64"
        },
        {
          "name": "isYesCiphertext",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "amountCiphertext",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "pubKey",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "nonce",
          "type": "u128"
        }
      ]
    },
    {
      "name": "updatePoolCallback",
      "discriminator": [
        183,
        21,
        59,
        112,
        78,
        29,
        170,
        198
      ],
      "accounts": [
        {
          "name": "arciumProgram",
          "address": "Arcj82pX7HxYKLR92qvgZUAd7vGS1k4hQvAFcPATFdEQ"
        },
        {
          "name": "compDefAccount"
        },
        {
          "name": "mxeAccount"
        },
        {
          "name": "computationAccount"
        },
        {
          "name": "clusterAccount"
        },
        {
          "name": "instructionsSysvar",
          "address": "Sysvar1nstructions1111111111111111111111111"
        },
        {
          "name": "marketPool",
          "docs": [
            "The MarketPool PDA to write updated encrypted pool state into."
          ],
          "writable": true
        },
        {
          "name": "market",
          "docs": [
            "The Market account to update sentiment, mpc_lock, pending fields, and total_bets."
          ],
          "writable": true
        },
        {
          "name": "userPosition",
          "docs": [
            "The UserPosition PDA to accumulate bet amounts on success.",
            "Pre-created in place_bet with init_if_needed."
          ],
          "writable": true
        },
        {
          "name": "marketVault",
          "docs": [
            "The market vault holding USDC -- source for failure refund."
          ],
          "writable": true
        },
        {
          "name": "bettorTokenAccount",
          "docs": [
            "The bettor's token account -- destination for failure refund."
          ],
          "writable": true
        },
        {
          "name": "tokenProgram",
          "docs": [
            "SPL Token program for transfer CPI on failure refund."
          ],
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "output",
          "type": {
            "defined": {
              "name": "signedComputationOutputs",
              "generics": [
                {
                  "kind": "type",
                  "type": {
                    "defined": {
                      "name": "updatePoolOutput"
                    }
                  }
                }
              ]
            }
          }
        }
      ]
    },
    {
      "name": "withdrawResolver",
      "discriminator": [
        108,
        84,
        197,
        144,
        49,
        232,
        216,
        140
      ],
      "accounts": [
        {
          "name": "resolverWallet",
          "writable": true,
          "signer": true
        },
        {
          "name": "resolver",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  115,
                  111,
                  108,
                  118,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "resolverWallet"
              }
            ]
          }
        },
        {
          "name": "resolverVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  115,
                  111,
                  108,
                  118,
                  101,
                  114,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "resolverWallet"
              }
            ]
          }
        },
        {
          "name": "userTokenAccount",
          "writable": true
        },
        {
          "name": "resolverRegistry",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  115,
                  111,
                  108,
                  118,
                  101,
                  114,
                  95,
                  114,
                  101,
                  103,
                  105,
                  115,
                  116,
                  114,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "usdcMint"
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "execute",
          "type": "bool"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "arciumSignerAccount",
      "discriminator": [
        214,
        157,
        122,
        114,
        117,
        44,
        214,
        74
      ]
    },
    {
      "name": "clockAccount",
      "discriminator": [
        152,
        171,
        158,
        195,
        75,
        61,
        51,
        8
      ]
    },
    {
      "name": "cluster",
      "discriminator": [
        236,
        225,
        118,
        228,
        173,
        106,
        18,
        60
      ]
    },
    {
      "name": "computationDefinitionAccount",
      "discriminator": [
        245,
        176,
        217,
        221,
        253,
        104,
        172,
        200
      ]
    },
    {
      "name": "config",
      "discriminator": [
        155,
        12,
        170,
        224,
        30,
        250,
        204,
        130
      ]
    },
    {
      "name": "creatorWhitelist",
      "discriminator": [
        61,
        53,
        122,
        51,
        66,
        98,
        43,
        131
      ]
    },
    {
      "name": "dispute",
      "discriminator": [
        36,
        49,
        241,
        67,
        40,
        36,
        241,
        74
      ]
    },
    {
      "name": "disputeTally",
      "discriminator": [
        218,
        187,
        147,
        112,
        137,
        80,
        174,
        156
      ]
    },
    {
      "name": "feePool",
      "discriminator": [
        172,
        38,
        77,
        146,
        148,
        5,
        51,
        242
      ]
    },
    {
      "name": "mxeAccount",
      "discriminator": [
        103,
        26,
        85,
        250,
        179,
        159,
        17,
        117
      ]
    },
    {
      "name": "market",
      "discriminator": [
        219,
        190,
        213,
        55,
        0,
        227,
        198,
        154
      ]
    },
    {
      "name": "marketPool",
      "discriminator": [
        180,
        105,
        154,
        232,
        165,
        224,
        174,
        203
      ]
    },
    {
      "name": "resolver",
      "discriminator": [
        108,
        125,
        211,
        206,
        52,
        124,
        132,
        79
      ]
    },
    {
      "name": "resolverRegistry",
      "discriminator": [
        231,
        42,
        169,
        32,
        93,
        212,
        252,
        251
      ]
    },
    {
      "name": "userPosition",
      "discriminator": [
        251,
        248,
        209,
        245,
        83,
        234,
        17,
        27
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "invalidMint",
      "msg": "Invalid USDC mint address"
    },
    {
      "code": 6001,
      "name": "unauthorized",
      "msg": "Unauthorized: caller is not the admin"
    },
    {
      "code": 6002,
      "name": "marketNotOpen",
      "msg": "Market is not in Open state"
    },
    {
      "code": 6003,
      "name": "invalidCategory",
      "msg": "Invalid category value (must be 0-4)"
    },
    {
      "code": 6004,
      "name": "questionTooLong",
      "msg": "Question exceeds maximum length of 200 characters"
    },
    {
      "code": 6005,
      "name": "protocolPaused",
      "msg": "Protocol is paused"
    },
    {
      "code": 6006,
      "name": "creatorNotWhitelisted",
      "msg": "Creator is not whitelisted"
    },
    {
      "code": 6007,
      "name": "deadlineTooSoon",
      "msg": "Market deadline must be at least 1 hour in the future"
    },
    {
      "code": 6008,
      "name": "emptyResolutionSource",
      "msg": "Resolution source cannot be empty"
    },
    {
      "code": 6009,
      "name": "emptyQuestion",
      "msg": "Question cannot be empty"
    },
    {
      "code": 6010,
      "name": "marketHasBets",
      "msg": "Market has bets and cannot be cancelled"
    },
    {
      "code": 6011,
      "name": "clusterNotSet",
      "msg": "Arcium cluster not set on MXE account"
    },
    {
      "code": 6012,
      "name": "mpcLocked",
      "msg": "Market MPC computation is in progress"
    },
    {
      "code": 6013,
      "name": "betTooSmall",
      "msg": "Bet amount must be at least 1 USDC (1,000,000 token units)"
    },
    {
      "code": 6014,
      "name": "marketExpired",
      "msg": "Market deadline has passed"
    },
    {
      "code": 6015,
      "name": "wrongSide",
      "msg": "Cannot bet on opposite side of existing position"
    },
    {
      "code": 6016,
      "name": "insufficientBalance",
      "msg": "Insufficient token balance"
    },
    {
      "code": 6017,
      "name": "marketNotResolved",
      "msg": "Market is not in Resolved state"
    },
    {
      "code": 6018,
      "name": "marketNotFinalized",
      "msg": "Market is not in Finalized state"
    },
    {
      "code": 6019,
      "name": "noWinningPosition",
      "msg": "No winning position to claim"
    },
    {
      "code": 6020,
      "name": "alreadyClaimed",
      "msg": "Payout has already been claimed"
    },
    {
      "code": 6021,
      "name": "notMarketCreator",
      "msg": "Caller is not the market creator"
    },
    {
      "code": 6022,
      "name": "marketNotExpired",
      "msg": "Market deadline has not passed yet"
    },
    {
      "code": 6023,
      "name": "invalidOutcome",
      "msg": "Invalid winning outcome (must be 1=Yes or 2=No)"
    },
    {
      "code": 6024,
      "name": "stakeTooLow",
      "msg": "Resolver stake must be at least 500 USDC"
    },
    {
      "code": 6025,
      "name": "resolverNotApproved",
      "msg": "Resolver is not approved"
    },
    {
      "code": 6026,
      "name": "resolverAlreadyApproved",
      "msg": "Resolver is already approved"
    },
    {
      "code": 6027,
      "name": "registryFull",
      "msg": "Resolver registry is full"
    },
    {
      "code": 6028,
      "name": "activeDisputeExists",
      "msg": "Cannot withdraw while active in a dispute"
    },
    {
      "code": 6029,
      "name": "cooldownNotElapsed",
      "msg": "7-day withdrawal cooldown has not elapsed"
    },
    {
      "code": 6030,
      "name": "withdrawalNotRequested",
      "msg": "No pending withdrawal request"
    },
    {
      "code": 6031,
      "name": "insufficientStake",
      "msg": "Withdrawal would leave stake below minimum"
    },
    {
      "code": 6032,
      "name": "gracePeriodExpired",
      "msg": "48-hour grace period has expired; market must resolve via dispute"
    },
    {
      "code": 6033,
      "name": "notMarketParticipant",
      "msg": "Caller has no position on this market"
    },
    {
      "code": 6034,
      "name": "marketAlreadyDisputed",
      "msg": "Market is already in dispute"
    },
    {
      "code": 6035,
      "name": "gracePeriodNotExpired",
      "msg": "48-hour grace period has not expired yet"
    },
    {
      "code": 6036,
      "name": "notEnoughResolvers",
      "msg": "Not enough approved resolvers for jury selection"
    },
    {
      "code": 6037,
      "name": "notSelectedJuror",
      "msg": "Caller is not a selected juror for this dispute"
    },
    {
      "code": 6038,
      "name": "alreadyVoted",
      "msg": "Juror has already submitted a vote"
    },
    {
      "code": 6039,
      "name": "votingWindowClosed",
      "msg": "Dispute voting window has closed"
    },
    {
      "code": 6040,
      "name": "disputeNotVoting",
      "msg": "Dispute is not in voting state"
    },
    {
      "code": 6041,
      "name": "quorumNotReached",
      "msg": "Not enough votes to finalize dispute"
    },
    {
      "code": 6042,
      "name": "tiebreakerAlreadyAdded",
      "msg": "Tiebreaker juror has already been added"
    },
    {
      "code": 6043,
      "name": "disputeNotSettled",
      "msg": "Dispute is not settled"
    }
  ],
  "types": [
    {
      "name": "activation",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "activationEpoch",
            "type": {
              "defined": {
                "name": "epoch"
              }
            }
          },
          {
            "name": "deactivationEpoch",
            "type": {
              "defined": {
                "name": "epoch"
              }
            }
          }
        ]
      }
    },
    {
      "name": "addDisputeVoteOutput",
      "docs": [
        "The output of the callback instruction. Provided as a struct with ordered fields",
        "as anchor does not support tuples and tuple structs yet."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "field0",
            "type": {
              "defined": {
                "name": "mxeEncryptedStruct",
                "generics": [
                  {
                    "kind": "const",
                    "value": "2"
                  }
                ]
              }
            }
          }
        ]
      }
    },
    {
      "name": "arciumSignerAccount",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "bn254g2blsPublicKey",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "array": [
              "u8",
              64
            ]
          }
        ]
      }
    },
    {
      "name": "circuitSource",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "local",
            "fields": [
              {
                "defined": {
                  "name": "localCircuitSource"
                }
              }
            ]
          },
          {
            "name": "onChain",
            "fields": [
              {
                "defined": {
                  "name": "onChainCircuitSource"
                }
              }
            ]
          },
          {
            "name": "offChain",
            "fields": [
              {
                "defined": {
                  "name": "offChainCircuitSource"
                }
              }
            ]
          }
        ]
      }
    },
    {
      "name": "clockAccount",
      "docs": [
        "An account storing the current network epoch"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "startEpoch",
            "type": {
              "defined": {
                "name": "epoch"
              }
            }
          },
          {
            "name": "currentEpoch",
            "type": {
              "defined": {
                "name": "epoch"
              }
            }
          },
          {
            "name": "startEpochTimestamp",
            "type": {
              "defined": {
                "name": "timestamp"
              }
            }
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "cluster",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "tdInfo",
            "type": {
              "option": {
                "defined": {
                  "name": "nodeMetadata"
                }
              }
            }
          },
          {
            "name": "authority",
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "clusterSize",
            "type": "u16"
          },
          {
            "name": "activation",
            "type": {
              "defined": {
                "name": "activation"
              }
            }
          },
          {
            "name": "maxCapacity",
            "type": "u64"
          },
          {
            "name": "cuPrice",
            "type": "u64"
          },
          {
            "name": "cuPriceProposals",
            "type": {
              "array": [
                "u64",
                32
              ]
            }
          },
          {
            "name": "lastUpdatedEpoch",
            "type": {
              "defined": {
                "name": "epoch"
              }
            }
          },
          {
            "name": "nodes",
            "type": {
              "vec": {
                "defined": {
                  "name": "nodeRef"
                }
              }
            }
          },
          {
            "name": "pendingNodes",
            "type": {
              "vec": "u32"
            }
          },
          {
            "name": "blsPublicKey",
            "type": {
              "defined": {
                "name": "setUnset",
                "generics": [
                  {
                    "kind": "type",
                    "type": {
                      "defined": {
                        "name": "bn254g2blsPublicKey"
                      }
                    }
                  }
                ]
              }
            }
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "computationDefinitionAccount",
      "docs": [
        "An account representing a [ComputationDefinition] in a MXE."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "finalizationAuthority",
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "cuAmount",
            "type": "u64"
          },
          {
            "name": "definition",
            "type": {
              "defined": {
                "name": "computationDefinitionMeta"
              }
            }
          },
          {
            "name": "circuitSource",
            "type": {
              "defined": {
                "name": "circuitSource"
              }
            }
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "computationDefinitionMeta",
      "docs": [
        "A computation definition for execution in a MXE."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "circuitLen",
            "type": "u32"
          },
          {
            "name": "signature",
            "type": {
              "defined": {
                "name": "computationSignature"
              }
            }
          }
        ]
      }
    },
    {
      "name": "computationSignature",
      "docs": [
        "The signature of a computation defined in a [ComputationDefinition]."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "parameters",
            "type": {
              "vec": {
                "defined": {
                  "name": "parameter"
                }
              }
            }
          },
          {
            "name": "outputs",
            "type": {
              "vec": {
                "defined": {
                  "name": "output"
                }
              }
            }
          }
        ]
      }
    },
    {
      "name": "computePayoutsOutput",
      "docs": [
        "The output of the callback instruction. Provided as a struct with ordered fields",
        "as anchor does not support tuples and tuple structs yet."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "field0",
            "type": {
              "defined": {
                "name": "computePayoutsOutputStruct0"
              }
            }
          }
        ]
      }
    },
    {
      "name": "computePayoutsOutputStruct0",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "field0",
            "type": "u64"
          },
          {
            "name": "field1",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "config",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "admin",
            "docs": [
              "The admin authority that can update protocol settings"
            ],
            "type": "pubkey"
          },
          {
            "name": "feeRecipient",
            "docs": [
              "The address that receives protocol fees"
            ],
            "type": "pubkey"
          },
          {
            "name": "usdcMint",
            "docs": [
              "The USDC mint address used for all bets"
            ],
            "type": "pubkey"
          },
          {
            "name": "protocolFeeBps",
            "docs": [
              "Protocol fee in basis points (e.g., 200 = 2%)"
            ],
            "type": "u16"
          },
          {
            "name": "marketCounter",
            "docs": [
              "Auto-incrementing counter for market IDs"
            ],
            "type": "u64"
          },
          {
            "name": "paused",
            "docs": [
              "Emergency pause flag for the protocol"
            ],
            "type": "bool"
          },
          {
            "name": "bump",
            "docs": [
              "PDA bump seed"
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "createMarketParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "question",
            "type": "string"
          },
          {
            "name": "resolutionSource",
            "type": "string"
          },
          {
            "name": "category",
            "type": "u8"
          },
          {
            "name": "resolutionTime",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "creatorWhitelist",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "creator",
            "docs": [
              "The whitelisted creator's public key"
            ],
            "type": "pubkey"
          },
          {
            "name": "active",
            "docs": [
              "Always true while PDA exists (closed on removal)"
            ],
            "type": "bool"
          },
          {
            "name": "bump",
            "docs": [
              "PDA bump seed"
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "dispute",
      "docs": [
        "Per-market dispute PDA tracking juror panel, voting state, and dispute lifecycle.",
        "Seeds: [b\"dispute\", market_id.to_le_bytes()]"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "marketId",
            "docs": [
              "Market ID this dispute belongs to"
            ],
            "type": "u64"
          },
          {
            "name": "status",
            "docs": [
              "Dispute status: 0=Voting, 1=Finalizing, 2=Settled"
            ],
            "type": "u8"
          },
          {
            "name": "jurors",
            "docs": [
              "Selected juror wallet pubkeys (7 initial + 1 optional tiebreaker = 8 max)"
            ],
            "type": {
              "vec": "pubkey"
            }
          },
          {
            "name": "jurorStakes",
            "docs": [
              "Stake weight snapshot for each juror (same index as jurors Vec)"
            ],
            "type": {
              "vec": "u64"
            }
          },
          {
            "name": "votesSubmitted",
            "docs": [
              "Which jurors have voted (bitfield: bit N = juror N has voted)"
            ],
            "type": "u8"
          },
          {
            "name": "voteCount",
            "docs": [
              "Total votes cast so far"
            ],
            "type": "u8"
          },
          {
            "name": "quorum",
            "docs": [
              "Required votes for quorum (initially 5, increases with tiebreaker)"
            ],
            "type": "u8"
          },
          {
            "name": "votingStart",
            "docs": [
              "Unix timestamp when voting window opens"
            ],
            "type": "i64"
          },
          {
            "name": "votingEnd",
            "docs": [
              "Unix timestamp when voting window closes (initially voting_start + 172800)"
            ],
            "type": "i64"
          },
          {
            "name": "tiebreakerAdded",
            "docs": [
              "Whether a tiebreaker juror has been added"
            ],
            "type": "bool"
          },
          {
            "name": "escalator",
            "docs": [
              "The wallet that triggered the dispute escalation"
            ],
            "type": "pubkey"
          },
          {
            "name": "mpcLock",
            "docs": [
              "Sequential MPC lock for dispute vote processing"
            ],
            "type": "bool"
          },
          {
            "name": "lockTimestamp",
            "docs": [
              "Timestamp when mpc_lock was set"
            ],
            "type": "i64"
          },
          {
            "name": "bump",
            "docs": [
              "PDA bump seed"
            ],
            "type": "u8"
          },
          {
            "name": "tallyBump",
            "docs": [
              "Associated DisputeTally PDA bump seed"
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "disputeTally",
      "docs": [
        "Fixed-layout account for encrypted dispute vote accumulators, used as MPC read/write target.",
        "",
        "This follows the MarketPool pattern exactly -- fixed-layout fields only, no variable-length data.",
        "The MPC circuit reads/writes encrypted vote accumulators at known byte offsets.",
        "",
        "Byte offsets for ArgBuilder.account():",
        "- yes_votes_encrypted offset: 8 (discriminator) + 8 (market_id) = 16 bytes",
        "- no_votes_encrypted offset: 16 + 32 = 48 bytes",
        "- Total ciphertext length: 64 bytes (32 yes_votes + 32 no_votes)",
        "",
        "PDA seeds: [b\"dispute_tally\", market_id.to_le_bytes()]"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "marketId",
            "docs": [
              "Market ID this tally belongs to"
            ],
            "type": "u64"
          },
          {
            "name": "yesVotesEncrypted",
            "docs": [
              "Encrypted yes-weighted vote accumulator"
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "noVotesEncrypted",
            "docs": [
              "Encrypted no-weighted vote accumulator"
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "nonce",
            "docs": [
              "Arcium nonce for MXE ciphertext"
            ],
            "type": "u128"
          },
          {
            "name": "bump",
            "docs": [
              "PDA bump seed"
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "epoch",
      "docs": [
        "The network epoch"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          "u64"
        ]
      }
    },
    {
      "name": "feePool",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "finalizeDisputeOutput",
      "docs": [
        "The output of the callback instruction. Provided as a struct with ordered fields",
        "as anchor does not support tuples and tuple structs yet."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "field0",
            "type": {
              "defined": {
                "name": "finalizeDisputeOutputStruct0"
              }
            }
          }
        ]
      }
    },
    {
      "name": "finalizeDisputeOutputStruct0",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "field0",
            "type": "u64"
          },
          {
            "name": "field1",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "helloWorldOutput",
      "docs": [
        "The output of the callback instruction. Provided as a struct with ordered fields",
        "as anchor does not support tuples and tuple structs yet."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "field0",
            "type": {
              "defined": {
                "name": "mxeEncryptedStruct",
                "generics": [
                  {
                    "kind": "const",
                    "value": "1"
                  }
                ]
              }
            }
          }
        ]
      }
    },
    {
      "name": "initDisputeTallyOutput",
      "docs": [
        "The output of the callback instruction. Provided as a struct with ordered fields",
        "as anchor does not support tuples and tuple structs yet."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "field0",
            "type": {
              "defined": {
                "name": "mxeEncryptedStruct",
                "generics": [
                  {
                    "kind": "const",
                    "value": "2"
                  }
                ]
              }
            }
          }
        ]
      }
    },
    {
      "name": "initPoolOutput",
      "docs": [
        "The output of the callback instruction. Provided as a struct with ordered fields",
        "as anchor does not support tuples and tuple structs yet."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "field0",
            "type": {
              "defined": {
                "name": "mxeEncryptedStruct",
                "generics": [
                  {
                    "kind": "const",
                    "value": "2"
                  }
                ]
              }
            }
          }
        ]
      }
    },
    {
      "name": "initializeParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "feeRecipient",
            "type": "pubkey"
          },
          {
            "name": "usdcMint",
            "type": "pubkey"
          },
          {
            "name": "protocolFeeBps",
            "type": "u16"
          }
        ]
      }
    },
    {
      "name": "localCircuitSource",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "mxeKeygen"
          },
          {
            "name": "mxeKeyRecoveryInit"
          },
          {
            "name": "mxeKeyRecoveryFinalize"
          }
        ]
      }
    },
    {
      "name": "mxeAccount",
      "docs": [
        "A MPC Execution Environment."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "cluster",
            "type": {
              "option": "u32"
            }
          },
          {
            "name": "keygenOffset",
            "type": "u64"
          },
          {
            "name": "keyRecoveryInitOffset",
            "type": "u64"
          },
          {
            "name": "mxeProgramId",
            "type": "pubkey"
          },
          {
            "name": "authority",
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "utilityPubkeys",
            "type": {
              "defined": {
                "name": "setUnset",
                "generics": [
                  {
                    "kind": "type",
                    "type": {
                      "defined": {
                        "name": "utilityPubkeys"
                      }
                    }
                  }
                ]
              }
            }
          },
          {
            "name": "lutOffsetSlot",
            "type": "u64"
          },
          {
            "name": "computationDefinitions",
            "type": {
              "vec": "u32"
            }
          },
          {
            "name": "status",
            "type": {
              "defined": {
                "name": "mxeStatus"
              }
            }
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "mxeEncryptedStruct",
      "generics": [
        {
          "kind": "const",
          "name": "len",
          "type": "usize"
        }
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "nonce",
            "type": "u128"
          },
          {
            "name": "ciphertexts",
            "type": {
              "array": [
                {
                  "array": [
                    "u8",
                    32
                  ]
                },
                {
                  "generic": "len"
                }
              ]
            }
          }
        ]
      }
    },
    {
      "name": "market",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "id",
            "docs": [
              "Unique market identifier (auto-incremented from Config.market_counter)"
            ],
            "type": "u64"
          },
          {
            "name": "question",
            "docs": [
              "Market question, max 200 characters (tweet-length)"
            ],
            "type": "string"
          },
          {
            "name": "resolutionSource",
            "docs": [
              "Resolution source URL or reference -- required, immutable after creation"
            ],
            "type": "string"
          },
          {
            "name": "category",
            "docs": [
              "Category: 0=Politics, 1=Crypto, 2=Sports, 3=Culture, 4=Economics"
            ],
            "type": "u8"
          },
          {
            "name": "resolutionTime",
            "docs": [
              "Unix timestamp when the market should be resolved"
            ],
            "type": "i64"
          },
          {
            "name": "state",
            "docs": [
              "Market state: 0=Open, 1=Locked, 2=Resolved, 3=Disputed, 4=Finalized"
            ],
            "type": "u8"
          },
          {
            "name": "winningOutcome",
            "docs": [
              "Winning outcome: 0=None, 1=Yes, 2=No"
            ],
            "type": "u8"
          },
          {
            "name": "sentiment",
            "docs": [
              "Sentiment bucket: 0=Unknown, 1=LeaningYes, 2=Even, 3=LeaningNo"
            ],
            "type": "u8"
          },
          {
            "name": "totalBets",
            "docs": [
              "Total number of bets placed on this market"
            ],
            "type": "u64"
          },
          {
            "name": "creator",
            "docs": [
              "The address that created this market"
            ],
            "type": "pubkey"
          },
          {
            "name": "createdAt",
            "docs": [
              "Unix timestamp when the market was created"
            ],
            "type": "i64"
          },
          {
            "name": "configFeeRecipient",
            "docs": [
              "Snapshot of config fee_recipient at market creation"
            ],
            "type": "pubkey"
          },
          {
            "name": "configFeeBps",
            "docs": [
              "Snapshot of config protocol_fee_bps at market creation"
            ],
            "type": "u16"
          },
          {
            "name": "mpcLock",
            "docs": [
              "Sequential MPC lock - prevents concurrent bet processing"
            ],
            "type": "bool"
          },
          {
            "name": "lockTimestamp",
            "docs": [
              "Unix timestamp when mpc_lock was set (for 60s timeout detection)"
            ],
            "type": "i64"
          },
          {
            "name": "pendingBettor",
            "docs": [
              "Pubkey of the user whose bet is currently being processed by MPC"
            ],
            "type": "pubkey"
          },
          {
            "name": "pendingAmount",
            "docs": [
              "USDC amount of the pending bet (for refund on failure/timeout)"
            ],
            "type": "u64"
          },
          {
            "name": "pendingIsYes",
            "docs": [
              "Which side the pending bet is on (for callback to update correct side of UserPosition)"
            ],
            "type": "bool"
          },
          {
            "name": "revealedYesPool",
            "docs": [
              "Revealed yes pool total (set by compute_payouts_callback at Finalized state)"
            ],
            "type": "u64"
          },
          {
            "name": "revealedNoPool",
            "docs": [
              "Revealed no pool total (set by compute_payouts_callback at Finalized state)"
            ],
            "type": "u64"
          },
          {
            "name": "bump",
            "docs": [
              "PDA bump seed for the market account"
            ],
            "type": "u8"
          },
          {
            "name": "vaultBump",
            "docs": [
              "PDA bump seed for the market vault token account",
              "Vault seeds: [b\"vault\", market_id.to_le_bytes()]",
              "Vault authority: this Market PDA (token::authority = market)"
            ],
            "type": "u8"
          },
          {
            "name": "marketPoolBump",
            "docs": [
              "PDA bump seed for the associated MarketPool account",
              "MarketPool seeds: [b\"market_pool\", market_id.to_le_bytes()]"
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "marketPool",
      "docs": [
        "Fixed-layout account for encrypted pool state, used as MPC read/write target.",
        "",
        "This account exists separately from Market because Market has variable-length",
        "String fields (question, resolution_source) that make byte offsets non-deterministic.",
        "MarketPool has ONLY fixed-size fields, so ArgBuilder.account() can always read",
        "ciphertext at a known byte offset:",
        "- yes_pool_encrypted offset: 8 (discriminator) + 8 (market_id) = 16 bytes",
        "- no_pool_encrypted offset: 16 + 32 = 48 bytes",
        "",
        "PDA seeds: [b\"market_pool\", market_id.to_le_bytes()]"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "marketId",
            "docs": [
              "Market ID this pool belongs to"
            ],
            "type": "u64"
          },
          {
            "name": "yesPoolEncrypted",
            "docs": [
              "Encrypted Yes pool ciphertext (Arcium MXE-owned)"
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "noPoolEncrypted",
            "docs": [
              "Encrypted No pool ciphertext (Arcium MXE-owned)"
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "nonce",
            "docs": [
              "Arcium nonce for MXE ciphertext (required for decryption in subsequent MPC calls)"
            ],
            "type": "u128"
          },
          {
            "name": "bump",
            "docs": [
              "PDA bump seed"
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "mxeStatus",
      "docs": [
        "The status of an MXE."
      ],
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "active"
          },
          {
            "name": "recovery"
          }
        ]
      }
    },
    {
      "name": "nodeMetadata",
      "docs": [
        "location as [ISO 3166-1 alpha-2](https://www.iso.org/iso-3166-country-codes.html) country code"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "ip",
            "type": {
              "array": [
                "u8",
                4
              ]
            }
          },
          {
            "name": "peerId",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "location",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "nodeRef",
      "docs": [
        "A reference to a node in the cluster.",
        "The offset is to derive the Node Account.",
        "The current_total_rewards is the total rewards the node has received so far in the current",
        "epoch."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "offset",
            "type": "u32"
          },
          {
            "name": "currentTotalRewards",
            "type": "u64"
          },
          {
            "name": "vote",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "offChainCircuitSource",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "source",
            "type": "string"
          },
          {
            "name": "hash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          }
        ]
      }
    },
    {
      "name": "onChainCircuitSource",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "isCompleted",
            "type": "bool"
          },
          {
            "name": "uploadAuth",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "output",
      "docs": [
        "An output of a computation.",
        "We currently don't support encrypted outputs yet since encrypted values are passed via",
        "data objects."
      ],
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "plaintextBool"
          },
          {
            "name": "plaintextU8"
          },
          {
            "name": "plaintextU16"
          },
          {
            "name": "plaintextU32"
          },
          {
            "name": "plaintextU64"
          },
          {
            "name": "plaintextU128"
          },
          {
            "name": "ciphertext"
          },
          {
            "name": "arcisX25519Pubkey"
          },
          {
            "name": "plaintextFloat"
          },
          {
            "name": "plaintextPoint"
          },
          {
            "name": "plaintextI8"
          },
          {
            "name": "plaintextI16"
          },
          {
            "name": "plaintextI32"
          },
          {
            "name": "plaintextI64"
          },
          {
            "name": "plaintextI128"
          }
        ]
      }
    },
    {
      "name": "parameter",
      "docs": [
        "A parameter of a computation.",
        "We differentiate between plaintext and encrypted parameters and data objects.",
        "Plaintext parameters are directly provided as their value.",
        "Encrypted parameters are provided as an offchain reference to the data.",
        "Data objects are provided as a reference to the data object account."
      ],
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "plaintextBool"
          },
          {
            "name": "plaintextU8"
          },
          {
            "name": "plaintextU16"
          },
          {
            "name": "plaintextU32"
          },
          {
            "name": "plaintextU64"
          },
          {
            "name": "plaintextU128"
          },
          {
            "name": "ciphertext"
          },
          {
            "name": "arcisX25519Pubkey"
          },
          {
            "name": "arcisSignature"
          },
          {
            "name": "plaintextFloat"
          },
          {
            "name": "plaintextI8"
          },
          {
            "name": "plaintextI16"
          },
          {
            "name": "plaintextI32"
          },
          {
            "name": "plaintextI64"
          },
          {
            "name": "plaintextI128"
          },
          {
            "name": "plaintextPoint"
          }
        ]
      }
    },
    {
      "name": "resolver",
      "docs": [
        "Per-resolver PDA tracking stake, approval status, and withdrawal state.",
        "Seeds: [b\"resolver\", resolver_wallet.key().as_ref()]"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "wallet",
            "docs": [
              "Resolver's wallet address"
            ],
            "type": "pubkey"
          },
          {
            "name": "stakedAmount",
            "docs": [
              "Current USDC stake amount (in token units, 6 decimals)"
            ],
            "type": "u64"
          },
          {
            "name": "approved",
            "docs": [
              "Whether admin has approved this resolver"
            ],
            "type": "bool"
          },
          {
            "name": "activeDisputes",
            "docs": [
              "Number of disputes this resolver is currently serving as juror on"
            ],
            "type": "u8"
          },
          {
            "name": "withdrawalRequestedAt",
            "docs": [
              "Unix timestamp of last withdrawal request (0 if none pending)"
            ],
            "type": "i64"
          },
          {
            "name": "withdrawalAmount",
            "docs": [
              "Amount requested for withdrawal"
            ],
            "type": "u64"
          },
          {
            "name": "bump",
            "docs": [
              "PDA bump seed"
            ],
            "type": "u8"
          },
          {
            "name": "vaultBump",
            "docs": [
              "Resolver vault token account bump",
              "Vault seeds: [b\"resolver_vault\", resolver_wallet.key().as_ref()]"
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "resolverRegistry",
      "docs": [
        "Singleton PDA containing the list of active, approved resolver wallet pubkeys.",
        "Seeds: [b\"resolver_registry\"]"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "resolvers",
            "docs": [
              "Active, approved resolver wallet pubkeys"
            ],
            "type": {
              "vec": "pubkey"
            }
          },
          {
            "name": "bump",
            "docs": [
              "PDA bump seed"
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "setUnset",
      "docs": [
        "Utility struct to store a value that needs to be set by a certain number of participants (keys",
        "in our case). Once all participants have set the value, the value is considered set and we only",
        "store it once."
      ],
      "generics": [
        {
          "kind": "type",
          "name": "t"
        }
      ],
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "set",
            "fields": [
              {
                "generic": "t"
              }
            ]
          },
          {
            "name": "unset",
            "fields": [
              {
                "generic": "t"
              },
              {
                "vec": "bool"
              }
            ]
          }
        ]
      }
    },
    {
      "name": "signedComputationOutputs",
      "generics": [
        {
          "kind": "type",
          "name": "o"
        }
      ],
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "success",
            "fields": [
              {
                "generic": "o"
              },
              {
                "array": [
                  "u8",
                  64
                ]
              }
            ]
          },
          {
            "name": "failure"
          },
          {
            "name": "markerForIdlBuildDoNotUseThis",
            "fields": [
              {
                "generic": "o"
              }
            ]
          }
        ]
      }
    },
    {
      "name": "timestamp",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "timestamp",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "updatePoolOutput",
      "docs": [
        "The output of the callback instruction. Provided as a struct with ordered fields",
        "as anchor does not support tuples and tuple structs yet."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "field0",
            "type": {
              "defined": {
                "name": "updatePoolOutputStruct0"
              }
            }
          }
        ]
      }
    },
    {
      "name": "updatePoolOutputStruct0",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "field0",
            "type": {
              "defined": {
                "name": "mxeEncryptedStruct",
                "generics": [
                  {
                    "kind": "const",
                    "value": "2"
                  }
                ]
              }
            }
          },
          {
            "name": "field1",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "userPosition",
      "docs": [
        "Per-user, per-market position tracking",
        "PDA seeds: [b\"position\", market_id.to_le_bytes(), user.key()]"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "marketId",
            "docs": [
              "The market this position belongs to"
            ],
            "type": "u64"
          },
          {
            "name": "user",
            "docs": [
              "The user who owns this position"
            ],
            "type": "pubkey"
          },
          {
            "name": "yesAmount",
            "docs": [
              "Amount bet on Yes outcome (in USDC lamports)"
            ],
            "type": "u64"
          },
          {
            "name": "noAmount",
            "docs": [
              "Amount bet on No outcome (in USDC lamports)"
            ],
            "type": "u64"
          },
          {
            "name": "claimed",
            "docs": [
              "Whether the user has claimed their payout"
            ],
            "type": "bool"
          },
          {
            "name": "bump",
            "docs": [
              "PDA bump seed"
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "utilityPubkeys",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "x25519Pubkey",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "ed25519VerifyingKey",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "elgamalPubkey",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "pubkeyValidityProof",
            "type": {
              "array": [
                "u8",
                64
              ]
            }
          }
        ]
      }
    }
  ]
};
