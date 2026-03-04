use anchor_lang::prelude::*;

use crate::errors::AvenirError;
use crate::state::{Config, Resolver, ResolverRegistry, MAX_RESOLVERS};

pub fn handler(ctx: Context<ApproveResolver>) -> Result<()> {
    let resolver = &mut ctx.accounts.resolver;

    // Validate resolver is not already approved
    require!(!resolver.approved, AvenirError::ResolverAlreadyApproved);

    // Validate registry is not full
    let registry = &mut ctx.accounts.resolver_registry;
    require!(
        registry.resolvers.len() < MAX_RESOLVERS,
        AvenirError::RegistryFull
    );

    // Approve resolver
    resolver.approved = true;

    // Add to registry
    registry.resolvers.push(resolver.wallet);

    msg!(
        "Resolver approved - wallet={}, registry_count={}",
        resolver.wallet,
        registry.resolvers.len()
    );

    Ok(())
}

#[derive(Accounts)]
pub struct ApproveResolver<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        mut,
        seeds = [b"resolver", resolver.wallet.as_ref()],
        bump = resolver.bump,
    )]
    pub resolver: Account<'info, Resolver>,

    #[account(
        init_if_needed,
        payer = admin,
        space = 8 + ResolverRegistry::INIT_SPACE,
        seeds = [b"resolver_registry"],
        bump,
    )]
    pub resolver_registry: Account<'info, ResolverRegistry>,

    #[account(
        seeds = [b"config"],
        bump = config.bump,
        constraint = config.admin == admin.key() @ AvenirError::Unauthorized,
    )]
    pub config: Account<'info, Config>,

    pub system_program: Program<'info, System>,
}
