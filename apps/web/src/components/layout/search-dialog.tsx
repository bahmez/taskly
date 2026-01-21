/**
 * Global Search Dialog Component
 * 
 * Provides a quick search interface for finding workspaces and boards.
 * Features:
 * - Keyboard shortcut (Cmd+K / Ctrl+K) to open
 * - Real-time debounced search
 * - Keyboard navigation (↑↓ Enter Esc)
 * - Visual distinction between workspaces and boards
 */

"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  Input,
} from "@taskly/ui"
import { Search, Briefcase, Layout } from "lucide-react"
import { api } from "@/app/trpc"
import { useTranslation } from "@/lib/i18n"

type SearchResult = {
  id: string
  title: string
  description: string
  type: 'workspace' | 'board'
  workspaceId?: string
  workspaceTitle?: string
}

interface SearchDialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function SearchDialog({ open: controlledOpen, onOpenChange }: SearchDialogProps = {}) {
  const router = useRouter()
  const { t } = useTranslation()
  const [internalOpen, setInternalOpen] = React.useState(false)
  
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen
  const setOpen = onOpenChange || setInternalOpen
  const [query, setQuery] = React.useState("")
  const [debouncedQuery, setDebouncedQuery] = React.useState("")
  const [selectedIndex, setSelectedIndex] = React.useState(0)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const resultsRef = React.useRef<HTMLDivElement>(null)

  // Debounce search query
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim())
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  // Keyboard shortcut to open dialog
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(true)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [setOpen])

  // Search query
  const searchQuery = api.search.all.useQuery(
    { query: debouncedQuery, limit: 20 },
    { enabled: debouncedQuery.length > 0 }
  )

  const results: SearchResult[] = React.useMemo(() => {
    if (!searchQuery.data) return []
    
    const { workspaces, boards } = searchQuery.data
    return [
      ...workspaces,
      ...boards,
    ]
  }, [searchQuery.data])

  // Handler for selecting a result
  const handleSelectResult = React.useCallback((result: SearchResult | undefined) => {
    if (!result) return

    if (result.type === 'workspace') {
      router.push(`/dashboard/workspaces/${result.id}`)
    } else {
      router.push(`/dashboard/boards/${result.id}`)
    }
    
    setOpen(false)
  }, [router, setOpen])

  // Reset selected index when results change
  React.useEffect(() => {
    setSelectedIndex(0)
  }, [results])

  // Keyboard navigation
  React.useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => Math.max(prev - 1, 0))
      } else if (e.key === 'Enter' && results.length > 0) {
        e.preventDefault()
        handleSelectResult(results[selectedIndex])
      } else if (e.key === 'Escape') {
        e.preventDefault()
        setOpen(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, results, selectedIndex, handleSelectResult, setOpen])

  // Scroll selected item into view
  React.useEffect(() => {
    if (!resultsRef.current) return
    
    const selectedElement = resultsRef.current.children[selectedIndex] as HTMLElement
    if (selectedElement) {
      selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [selectedIndex])

  // Focus input when dialog opens
  React.useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    } else {
      setQuery("")
      setDebouncedQuery("")
      setSelectedIndex(0)
    }
  }, [open])

  const getResultIcon = (type: 'workspace' | 'board') => {
    return type === 'workspace' ? Briefcase : Layout
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl p-0 gap-0 bg-[#1d2125] border-[#9fadbc29] overflow-hidden" onEscapeKeyDown={() => setOpen(false)}>
        <div className="flex items-center border-b border-[#9fadbc29] px-4 py-3 pr-14">
          <Search className="h-5 w-5 text-[#9fadbc] mr-3 flex-shrink-0" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`${t('navbar.search_placeholder')} (Cmd+K / Ctrl+K)`}
            className="border-0 bg-transparent text-[#b6c2cf] placeholder:text-[#9fadbc] focus-visible:ring-0 focus-visible:ring-offset-0 h-auto p-0 text-base flex-1"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="ml-2 text-xs text-[#9fadbc] hover:text-white px-2 py-1 rounded bg-[#282e33] hover:bg-[#323940] flex-shrink-0"
            >
              {t('navbar.search_clear')}
            </button>
          )}
        </div>

        <div
          ref={resultsRef}
          className="max-h-[400px] overflow-y-auto p-2"
        >
          {!debouncedQuery ? (
            <div className="px-4 py-8 text-center text-[#9fadbc] text-sm">
              {t('navbar.search_start_typing')}
            </div>
          ) : searchQuery.isLoading ? (
            <div className="px-4 py-8 text-center text-[#9fadbc] text-sm">
              {t('navbar.loading')}...
            </div>
          ) : results.length === 0 ? (
            <div className="px-4 py-8 text-center text-[#9fadbc] text-sm">
              {t('navbar.search_no_results')} &ldquo;{debouncedQuery}&rdquo;
            </div>
          ) : (
            <div className="space-y-1">
              {results.map((result, index) => {
                const Icon = getResultIcon(result.type)
                const isSelected = index === selectedIndex
                
                return (
                  <button
                    key={`${result.type}-${result.id}`}
                    onClick={() => handleSelectResult(result)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`w-full text-left px-3 py-2.5 rounded-md transition-colors ${
                      isSelected
                        ? 'bg-[#579dff] text-white'
                        : 'hover:bg-[#a6c5e229] text-[#b6c2cf]'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${isSelected ? 'text-white' : 'text-[#9fadbc]'}`} />
                      <div className="flex-1 min-w-0">
                        <div className={`font-medium truncate ${isSelected ? 'text-white' : 'text-[#b6c2cf]'}`}>
                          {result.title}
                        </div>
                        {result.description && (
                          <div className={`text-sm truncate mt-0.5 ${isSelected ? 'text-white/80' : 'text-[#9fadbc]'}`}>
                            {result.description}
                          </div>
                        )}
                        {result.type === 'board' && result.workspaceTitle && (
                          <div className={`text-xs mt-1 flex items-center gap-1 ${isSelected ? 'text-white/70' : 'text-[#7c8a97]'}`}>
                            <Briefcase className="h-3 w-3" />
                            {result.workspaceTitle}
                          </div>
                        )}
                      </div>
                      <div className={`text-xs px-2 py-1 rounded flex-shrink-0 ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : result.type === 'workspace'
                            ? 'bg-[#22272b] text-[#9fadbc]'
                            : 'bg-[#22272b] text-[#9fadbc]'
                      }`}>
                        {result.type === 'workspace' ? t('navbar.search_workspace') : t('navbar.search_board')}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {results.length > 0 && (
          <div className="border-t border-[#9fadbc29] px-4 py-2 text-xs text-[#9fadbc] flex items-center justify-between">
            <div className="flex gap-4">
              <span>
                <kbd className="px-1.5 py-0.5 bg-[#22272b] rounded border border-[#9fadbc29]">↑↓</kbd> {t('navbar.search_navigate')}
              </span>
              <span>
                <kbd className="px-1.5 py-0.5 bg-[#22272b] rounded border border-[#9fadbc29]">Enter</kbd> {t('navbar.search_select')}
              </span>
              <span>
                <kbd className="px-1.5 py-0.5 bg-[#22272b] rounded border border-[#9fadbc29]">Esc</kbd> {t('navbar.search_close')}
              </span>
            </div>
            <div>
              {results.length} {results.length === 1 ? t('navbar.search_result') : t('navbar.search_results')}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
