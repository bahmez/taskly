"use client"

import * as React from "react"
import { Button, Collapsible, CollapsibleTrigger, CollapsibleContent, cn } from "@taskly/ui"
import { ChevronLeft, ChevronRight, Trello, Users, Settings, Plus, Layout } from "lucide-react"
import Link from "next/link"

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  isCollapsed?: boolean
  onCollapse?: (collapsed: boolean) => void
}

export function Sidebar({ className, isCollapsed: controlledCollapsed, onCollapse, ...props }: SidebarProps) {
  const [isCollapsedInternal, setIsCollapsedInternal] = React.useState(false)
  
  const isCollapsed = controlledCollapsed ?? isCollapsedInternal
  const setIsCollapsed = onCollapse ?? setIsCollapsedInternal

  return (
    <div className={cn(
      "relative flex flex-col border-r border-[#9fadbc29] bg-[#1d2125] bg-opacity-90 backdrop-blur-xl text-[#9fadbc] transition-all duration-300", 
      isCollapsed ? "w-12" : "w-64",
      className
    )} {...props}>
      {/* Collapse Toggle */}
      <div className="absolute -right-3 top-3 z-10">
         <Button 
          variant="outline" 
          size="icon" 
          className="h-6 w-6 rounded-full border-[#9fadbc29] bg-[#1d2125] hover:bg-[#22272b] text-[#9fadbc] shadow-sm p-0"
          onClick={() => setIsCollapsed(!isCollapsed)}
         >
            {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
         </Button>
      </div>

      {/* Content */}
      <div className={cn("flex-1 overflow-y-auto py-3", isCollapsed ? "px-2" : "px-3")}>
         {/* Workspace Section */}
         {!isCollapsed && (
           <div className="mb-4 flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                 <div className="flex h-8 w-8 items-center justify-center rounded bg-gradient-to-br from-purple-500 to-pink-500 text-white font-bold">
                    T
                 </div>
                 <div className="flex flex-col">
                    <span className="text-sm font-semibold text-[#b6c2cf]">Taskly Workspace</span>
                    <span className="text-xs text-[#9fadbc]">Free</span>
                 </div>
              </div>
           </div>
         )}
         
         {/* Navigation Links */}
         <nav className="space-y-1">
            <NavItem icon={<Trello className="h-4 w-4" />} label="Boards" href="/boards" isCollapsed={isCollapsed} active />
            <NavItem icon={<Users className="h-4 w-4" />} label="Members" href="/members" isCollapsed={isCollapsed} />
            <NavItem icon={<Settings className="h-4 w-4" />} label="Settings" href="/settings" isCollapsed={isCollapsed} />
         </nav>

         {/* Workspace Views (Collapsible) */}
         {!isCollapsed && (
            <div className="mt-6">
               <div className="flex items-center justify-between px-2 mb-2">
                  <span className="text-xs font-semibold text-[#9fadbc] uppercase">Workspace views</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-[#9fadbc] hover:bg-[#a6c5e229]">
                     <Plus className="h-3 w-3" />
                  </Button>
               </div>
               <nav className="space-y-1">
                  <NavItem icon={<Layout className="h-4 w-4" />} label="Table" href="/views/table" isCollapsed={isCollapsed} />
                  <NavItem icon={<CalendarIcon />} label="Calendar" href="/views/calendar" isCollapsed={isCollapsed} />
               </nav>
            </div>
         )}

          {/* Your Boards */}
          {!isCollapsed && (
            <div className="mt-6">
               <div className="flex items-center justify-between px-2 mb-2">
                  <span className="text-xs font-semibold text-[#9fadbc] uppercase">Your boards</span>
                   <Button variant="ghost" size="icon" className="h-6 w-6 text-[#9fadbc] hover:bg-[#a6c5e229]">
                     <Plus className="h-3 w-3" />
                  </Button>
               </div>
               <nav className="space-y-1">
                   <NavItem 
                      icon={<div className="h-2 w-2 rounded-full bg-blue-400" />} 
                      label="Taskly Development" 
                      href="/b/1" 
                      isCollapsed={isCollapsed} 
                    />
                     <NavItem 
                      icon={<div className="h-2 w-2 rounded-full bg-green-400" />} 
                      label="Design System" 
                      href="/b/2" 
                      isCollapsed={isCollapsed} 
                    />
               </nav>
            </div>
         )}
      </div>
    </div>
  )
}

function NavItem({ icon, label, href, isCollapsed, active }: { icon: React.ReactNode, label: string, href: string, isCollapsed: boolean, active?: boolean }) {
   if (isCollapsed) {
      return (
         <Button 
            variant="ghost" 
            className={cn(
               "w-full justify-center px-0 h-9 text-[#9fadbc] hover:bg-[#a6c5e229] hover:text-[#b6c2cf]",
               active && "bg-[#a6c5e229] text-[#579dff]"
            )}
            asChild
         >
            <Link href={href}>
               {icon}
            </Link>
         </Button>
      )
   }

   return (
      <Button 
         variant="ghost" 
         className={cn(
            "w-full justify-start px-2 h-9 text-[#9fadbc] hover:bg-[#a6c5e229] hover:text-[#b6c2cf]",
            active && "bg-[#a6c5e229] text-[#579dff]"
         )}
         asChild
      >
         <Link href={href}>
            <span className="mr-3">{icon}</span>
            <span className="truncate">{label}</span>
         </Link>
      </Button>
   )
}

function CalendarIcon() {
   return (
      <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
   )
}

