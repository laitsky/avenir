export interface MockMarket {
  id: string
  question: string
  description: string
  category: 'Politics' | 'Crypto' | 'Sports' | 'Culture' | 'Economics'
  deadline: Date
  resolutionSource: string
  sentiment: 'Leaning Yes' | 'Even' | 'Leaning No'
  poolTotal: string
  betCount: number
  status: 'live' | 'resolved'
  outcome?: 'yes' | 'no'
}

function futureDate(days: number, hours = 0): Date {
  const d = new Date()
  d.setDate(d.getDate() + days)
  d.setHours(d.getHours() + hours)
  return d
}

function pastDate(days: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d
}

export const MOCK_MARKETS: MockMarket[] = [
  {
    id: 'mkt-001',
    question: 'Will Bitcoin exceed $150,000 by end of Q2 2026?',
    description:
      'Resolves YES if Bitcoin (BTC) trades at or above $150,000 on any major exchange before July 1, 2026.',
    category: 'Crypto',
    deadline: futureDate(45),
    resolutionSource: 'CoinGecko aggregate price',
    sentiment: 'Leaning Yes',
    poolTotal: '48,200 USDC',
    betCount: 312,
    status: 'live',
  },
  {
    id: 'mkt-002',
    question: 'Will the US Federal Reserve cut rates in March 2026?',
    description:
      'Resolves YES if the Federal Reserve announces a rate cut at the March 2026 FOMC meeting.',
    category: 'Economics',
    deadline: futureDate(14),
    resolutionSource: 'Federal Reserve press release',
    sentiment: 'Even',
    poolTotal: '31,500 USDC',
    betCount: 247,
    status: 'live',
  },
  {
    id: 'mkt-003',
    question: 'Will Manchester City win the 2025-26 Champions League?',
    description:
      'Resolves YES if Manchester City wins the UEFA Champions League final in the 2025-26 season.',
    category: 'Sports',
    deadline: futureDate(90),
    resolutionSource: 'UEFA official results',
    sentiment: 'Leaning No',
    poolTotal: '18,750 USDC',
    betCount: 189,
    status: 'live',
  },
  {
    id: 'mkt-004',
    question: 'Will a Studio Ghibli film win the 2026 Academy Award for Best Animated Feature?',
    description:
      'Resolves YES if any Studio Ghibli production wins Best Animated Feature at the 98th Academy Awards.',
    category: 'Culture',
    deadline: futureDate(7, 12),
    resolutionSource: 'Academy of Motion Picture Arts and Sciences',
    sentiment: 'Leaning Yes',
    poolTotal: '5,400 USDC',
    betCount: 78,
    status: 'live',
  },
  {
    id: 'mkt-005',
    question: 'Will Solana TVL surpass $20B before April 2026?',
    description:
      'Resolves YES if total value locked on Solana exceeds $20 billion on DefiLlama before April 1, 2026.',
    category: 'Crypto',
    deadline: futureDate(28),
    resolutionSource: 'DefiLlama Solana TVL',
    sentiment: 'Leaning No',
    poolTotal: '12,300 USDC',
    betCount: 156,
    status: 'live',
  },
  {
    id: 'mkt-006',
    question: 'Will the 2026 midterm voter turnout exceed 50%?',
    description:
      'Resolves YES if US midterm election voter turnout exceeds 50% of eligible voters.',
    category: 'Politics',
    deadline: futureDate(120),
    resolutionSource: 'US Election Project',
    sentiment: 'Even',
    poolTotal: '22,100 USDC',
    betCount: 203,
    status: 'live',
  },
  {
    id: 'mkt-007',
    question: 'Did Ethereum merge to PoS successfully?',
    description:
      'Resolved YES -- Ethereum successfully transitioned to Proof of Stake on September 15, 2022.',
    category: 'Crypto',
    deadline: pastDate(30),
    resolutionSource: 'Ethereum Foundation',
    sentiment: 'Leaning Yes',
    poolTotal: '52,800 USDC',
    betCount: 421,
    status: 'resolved',
    outcome: 'yes',
  },
  {
    id: 'mkt-008',
    question: 'Would the EU ban proof-of-work mining by 2025?',
    description:
      'Resolved NO -- The European Union did not pass legislation banning proof-of-work mining by end of 2025.',
    category: 'Politics',
    deadline: pastDate(60),
    resolutionSource: 'European Commission',
    sentiment: 'Leaning No',
    poolTotal: '34,600 USDC',
    betCount: 287,
    status: 'resolved',
    outcome: 'no',
  },
  {
    id: 'mkt-009',
    question: 'Will global GDP growth exceed 3.5% in 2026?',
    description:
      'Resolves YES if the IMF World Economic Outlook reports global real GDP growth above 3.5% for 2026.',
    category: 'Economics',
    deadline: futureDate(60),
    resolutionSource: 'IMF World Economic Outlook',
    sentiment: 'Leaning Yes',
    poolTotal: '8,900 USDC',
    betCount: 94,
    status: 'live',
  },
  {
    id: 'mkt-010',
    question: 'Will a new Grand Theft Auto title release before July 2026?',
    description:
      'Resolves YES if Rockstar Games releases GTA VI or any new GTA title before July 1, 2026.',
    category: 'Culture',
    deadline: futureDate(3, 6),
    resolutionSource: 'Rockstar Games official announcement',
    sentiment: 'Leaning No',
    poolTotal: '680 USDC',
    betCount: 15,
    status: 'live',
  },
]
