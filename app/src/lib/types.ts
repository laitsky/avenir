import { PublicKey } from '@solana/web3.js'
import type { BN } from '@coral-xyz/anchor'

export interface OnChainMarket {
  publicKey: PublicKey
  id: number
  question: string
  resolutionSource: string
  category: number // 0=Politics, 1=Crypto, 2=Sports, 3=Culture, 4=Economics
  resolutionTime: number // Unix timestamp
  state: number // 0=Open, 1=Locked, 2=Resolved, 3=Disputed, 4=Finalized
  winningOutcome: number // 0=None, 1=Yes, 2=No
  sentiment: number // 0=Unknown, 1=LeaningYes, 2=Even, 3=LeaningNo
  totalBets: number
  creator: PublicKey
  createdAt: number
  mpcLock: boolean
  revealedYesPool: number
  revealedNoPool: number
}

export interface OnChainPosition {
  publicKey: PublicKey
  marketId: number
  user: PublicKey
  yesAmount: number
  noAmount: number
  claimed: boolean
}

export const CATEGORY_MAP: Record<number, string> = {
  0: 'Politics',
  1: 'Crypto',
  2: 'Sports',
  3: 'Culture',
  4: 'Economics',
}

export const CATEGORY_REVERSE_MAP: Record<string, number> = {
  Politics: 0,
  Crypto: 1,
  Sports: 2,
  Culture: 3,
  Economics: 4,
}

export const SENTIMENT_MAP: Record<number, string> = {
  0: 'Unknown',
  1: 'Leaning Yes',
  2: 'Even',
  3: 'Leaning No',
}

export const STATE_MAP: Record<number, string> = {
  0: 'Open',
  1: 'Locked',
  2: 'Resolved',
  3: 'Disputed',
  4: 'Finalized',
}

/**
 * Maps a raw Anchor-decoded Market account to the typed OnChainMarket interface.
 * This is the single conversion point from raw Anchor BN data to typed frontend data.
 */
export function mapMarketAccount(
  publicKey: PublicKey,
  account: {
    id: BN
    question: string
    resolutionSource: string
    category: number
    resolutionTime: BN
    state: number
    winningOutcome: number
    sentiment: number
    totalBets: BN
    creator: PublicKey
    createdAt: BN
    mpcLock: boolean
    revealedYesPool: BN
    revealedNoPool: BN
  },
): OnChainMarket {
  return {
    publicKey,
    id: account.id.toNumber(),
    question: account.question,
    resolutionSource: account.resolutionSource,
    category: account.category,
    resolutionTime: account.resolutionTime.toNumber(),
    state: account.state,
    winningOutcome: account.winningOutcome,
    sentiment: account.sentiment,
    totalBets: account.totalBets.toNumber(),
    creator: account.creator,
    createdAt: account.createdAt.toNumber(),
    mpcLock: account.mpcLock,
    revealedYesPool: account.revealedYesPool.toNumber(),
    revealedNoPool: account.revealedNoPool.toNumber(),
  }
}

/**
 * Maps a raw Anchor-decoded UserPosition account to the typed OnChainPosition interface.
 */
export function mapPositionAccount(
  publicKey: PublicKey,
  account: {
    marketId: BN
    user: PublicKey
    yesAmount: BN
    noAmount: BN
    claimed: boolean
  },
): OnChainPosition {
  return {
    publicKey,
    marketId: account.marketId.toNumber(),
    user: account.user,
    yesAmount: account.yesAmount.toNumber(),
    noAmount: account.noAmount.toNumber(),
    claimed: account.claimed,
  }
}
