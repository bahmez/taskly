"use client"

import { Navbar } from "@/components/layout/navbar"
import { Sidebar } from "@/components/layout/sidebar"
import { Shell } from "@taskly/ui"
import { useState } from "react"

export default function TrelloLayout({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <Shell className="bg-gradient-to-r from-blue-600 to-blue-500 overflow-hidden">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar isCollapsed={sidebarCollapsed} onCollapse={setSidebarCollapsed} className="shrink-0" />
        <main className="flex-1 overflow-x-auto overflow-y-hidden relative">
          {children}
        </main>
      </div>
    </Shell>
  )
}

