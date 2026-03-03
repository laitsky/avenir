use anchor_lang::prelude::*;
use arcium_anchor::prelude::*;

use crate::errors::ErrorCode;
use crate::{ArciumSignerAccount, ID, ID_CONST};

use super::hello_world_callback::HelloWorldCallback;

pub fn handler(
    ctx: Context<HelloWorld>,
    computation_offset: u64,
    a_ciphertext: [u8; 32],
    b_ciphertext: [u8; 32],
    pub_key: [u8; 32],
    nonce: u128,
) -> Result<()> {
    let args = ArgBuilder::new()
        .x25519_pubkey(pub_key)
        .plaintext_u128(nonce)
        .encrypted_u64(a_ciphertext)
        .x25519_pubkey(pub_key)
        .plaintext_u128(nonce)
        .encrypted_u64(b_ciphertext)
        .build();

    let callback_ixs = vec![HelloWorldCallback::callback_ix(
        computation_offset,
        &ctx.accounts.mxe_account,
        &[],
    )?];

    queue_computation(
        ctx.accounts,
        computation_offset,
        args,
        callback_ixs,
        1,
        0,
    )?;

    Ok(())
}

#[queue_computation_accounts("hello_world", payer)]
#[derive(Accounts)]
pub struct HelloWorld<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        address = derive_mxe_pda!()
    )]
    pub mxe_account: Account<'info, MXEAccount>,

    #[account(
        mut,
        address = derive_sign_pda!()
    )]
    pub sign_pda_account: Account<'info, ArciumSignerAccount>,

    #[account(
        mut,
        address = derive_mempool_pda!(mxe_account, ErrorCode::ClusterNotSet)
    )]
    /// CHECK: mempool_account, derived from cluster
    pub mempool_account: UncheckedAccount<'info>,

    #[account(
        mut,
        address = derive_execpool_pda!(mxe_account, ErrorCode::ClusterNotSet)
    )]
    /// CHECK: executing_pool, derived from cluster
    pub executing_pool: UncheckedAccount<'info>,

    #[account(mut)]
    /// CHECK: computation_account, initialized by arcium
    pub computation_account: UncheckedAccount<'info>,

    #[account(
        address = derive_comp_def_pda!(comp_def_offset("hello_world"))
    )]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,

    #[account(
        mut,
        address = derive_cluster_pda!(mxe_account, ErrorCode::ClusterNotSet)
    )]
    pub cluster_account: Account<'info, Cluster>,

    #[account(
        mut,
        address = ARCIUM_FEE_POOL_ACCOUNT_ADDRESS,
    )]
    pub pool_account: Account<'info, FeePool>,

    #[account(
        mut,
        address = ARCIUM_CLOCK_ACCOUNT_ADDRESS
    )]
    pub clock_account: Account<'info, ClockAccount>,

    pub system_program: Program<'info, System>,
    pub arcium_program: Program<'info, Arcium>,
}
