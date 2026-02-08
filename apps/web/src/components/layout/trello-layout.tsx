"use client"

import { Navbar } from "@/components/layout/navbar"
import { Sidebar } from "@/components/layout/sidebar"
import { Shell } from "@taskly/ui"
import { useState, useEffect } from "react"

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`)
    setIsMobile(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [breakpoint])
  return isMobile
}

export default function TrelloLayout({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // Auto-collapse sidebar on mobile
  useEffect(() => {
    if (isMobile) setSidebarCollapsed(true)
  }, [isMobile])

  return (
    <Shell className="bg-gradient-to-r from-blue-600 to-blue-500 overflow-hidden">
      <Navbar />
      <div className="flex flex-1 overflow-hidden relative">
        {/* Mobile overlay when sidebar is open */}
        {isMobile && !sidebarCollapsed && (
          <div
            className="fixed inset-0 z-40 bg-black/50"
            onClick={() => setSidebarCollapsed(true)}
          />
        )}
        <Sidebar
          isCollapsed={sidebarCollapsed}
          onCollapse={setSidebarCollapsed}
          className={
            isMobile && !sidebarCollapsed
              ? "fixed left-0 top-12 bottom-0 z-50 shrink-0"
              : "shrink-0"
          }
        />
        <main className="flex-1 min-w-0 overflow-x-auto overflow-y-hidden relative">
          {children}
        </main>
      </div>
    </Shell>
  )
}

