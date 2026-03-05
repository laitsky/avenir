import { useState, useRef, useEffect, useCallback } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { Search, X } from 'lucide-react'
import { useMarkets } from '#/hooks/useMarkets'
import { cn } from '#/lib/utils'
import { CATEGORY_MAP, STATE_MAP } from '#/lib/types'
import type { OnChainMarket } from '#/lib/types'

function getStatusBadge(state: number) {
  switch (state) {
    case 0:
      return (
        <span className="flex items-center gap-1 text-[10px] text-emerald-400/80">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Live
        </span>
      )
    case 1:
      return (
        <span className="text-[10px] text-muted-foreground/60">
          {STATE_MAP[1] ?? 'Locked'}
        </span>
      )
    case 2:
      return (
        <span className="text-[10px] text-muted-foreground/60">Resolved</span>
      )
    case 3:
      return (
        <span className="text-[10px] text-purple-400/80">In Dispute</span>
      )
    case 4:
      return (
        <span className="text-[10px] text-muted-foreground/60">Finalized</span>
      )
    default:
      return null
  }
}

function filterMarkets(markets: OnChainMarket[], query: string): OnChainMarket[] {
  const q = query.toLowerCase()
  const filtered = markets.filter((market) => {
    return (
      market.question.toLowerCase().includes(q) ||
      market.resolutionSource.toLowerCase().includes(q) ||
      (CATEGORY_MAP[market.category]?.toLowerCase().includes(q) ?? false)
    )
  })

  // Sort: open markets first (state 0), then by totalBets descending
  filtered.sort((a, b) => {
    if (a.state === 0 && b.state !== 0) return -1
    if (a.state !== 0 && b.state === 0) return 1
    return b.totalBets - a.totalBets
  })

  return filtered.slice(0, 8)
}

export function SearchBar() {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  const { data: markets = [] } = useMarkets()

  const results = query.length >= 1 ? filterMarkets(markets, query) : []

  const close = useCallback(() => {
    setIsOpen(false)
    setSelectedIndex(-1)
  }, [])

  const clearQuery = useCallback(() => {
    setQuery('')
    close()
    inputRef.current?.focus()
  }, [close])

  // Click outside to close
  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        close()
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [close])

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
    setQuery(value)
    setSelectedIndex(-1)
    setIsOpen(value.length >= 1)
  }

  function handleFocus() {
    if (query.length >= 1) {
      setIsOpen(true)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!isOpen) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex((prev) =>
          results.length === 0 ? -1 : (prev + 1) % results.length
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex((prev) =>
          results.length === 0
            ? -1
            : prev <= 0
              ? results.length - 1
              : prev - 1
        )
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && results[selectedIndex]) {
          const market = results[selectedIndex]
          void navigate({ to: '/market/$id', params: { id: String(market.id) } })
          close()
          setQuery('')
        }
        break
      case 'Escape':
        close()
        inputRef.current?.blur()
        break
    }
  }

  function handleResultClick() {
    close()
    setQuery('')
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-xs">
      {/* Input */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground/50 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder="Search markets..."
          className={cn(
            'w-full bg-secondary/50 border-0 rounded-lg px-3 py-1.5 pl-8 text-[13px] text-foreground',
            'placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/20',
            'transition-all',
            query ? 'pr-7' : ''
          )}
        />
        {query && (
          <button
            type="button"
            onClick={clearQuery}
            className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer text-muted-foreground/50 hover:text-muted-foreground transition-colors"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && query.length >= 1 && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-card border border-border rounded-xl shadow-lg shadow-black/20 overflow-hidden">
          {results.length === 0 ? (
            <div className="px-4 py-3 text-[12px] text-muted-foreground/60 text-center">
              No markets found for &quot;{query}&quot;
            </div>
          ) : (
            <ul>
              {results.map((market, index) => (
                <li key={market.publicKey.toBase58()}>
                  <Link
                    to="/market/$id"
                    params={{ id: String(market.id) }}
                    onClick={handleResultClick}
                    className={cn(
                      'flex flex-col gap-0.5 px-4 py-2.5 transition-colors no-underline',
                      'hover:bg-secondary/50',
                      selectedIndex === index && 'bg-secondary/70'
                    )}
                  >
                    <span className="font-serif italic text-sm text-foreground line-clamp-1">
                      {market.question}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase tracking-wider text-primary/50">
                        {CATEGORY_MAP[market.category] ?? 'Unknown'}
                      </span>
                      {getStatusBadge(market.state)}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
