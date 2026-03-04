import { PublicKey } from '@solana/web3.js'

export const PROGRAM_ID = new PublicKey('PjLEXWGmgCA78MTaK9fN1k4muUiis2gdkUkrXRHRUkN')

// Devnet USDC mint -- replace with mainnet mint for production
export const USDC_MINT = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU')

// Default to devnet; can be overridden via env var
export const RPC_ENDPOINT =
  import.meta.env.VITE_RPC_ENDPOINT || 'https://api.devnet.solana.com'

export const CATEGORIES = [
  'All',
  'Politics',
  'Crypto',
  'Sports',
  'Culture',
  'Economics',
] as const
