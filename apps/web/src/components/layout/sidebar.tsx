"use client"

import * as React from "react"
import { Button, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, Input, cn } from "@taskly/ui"
import { ChevronLeft, ChevronRight, Trello, Users, Settings, Plus } from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { api } from "@/app/trpc"
import { useWorkspaceUI } from "@/components/workspace/workspace-ui-provider"

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  isCollapsed?: boolean
  onCollapse?: (collapsed: boolean) => void
}

export function Sidebar({ className, isCollapsed: controlledCollapsed, onCollapse, ...props }: SidebarProps) {
  const [isCollapsedInternal, setIsCollapsedInternal] = React.useState(false)
  
  const isCollapsed = controlledCollapsed ?? isCollapsedInternal
  const setIsCollapsed = onCollapse ?? setIsCollapsedInternal

  const pathname = usePathname()
  const router = useRouter()
  const utils = api.useUtils()
  const isDashboardOverview = pathname === "/dashboard" || pathname === "/workspaces"

  const goToWorkspace = (workspaceId: string) => {
    setSelectedWorkspaceId(workspaceId)
    router.push(`/dashboard/workspaces/${workspaceId}`)
  }

  const { workspaces, selectedWorkspaceId, setSelectedWorkspaceId } = useWorkspaceUI()
  const selectedWorkspace = workspaces.find((w) => w.id === selectedWorkspaceId) ?? null

  const boardsQuery = api.workspaces.boards.list.useQuery(
    { workspaceId: selectedWorkspaceId ?? "" },
    { enabled: Boolean(selectedWorkspaceId) },
  )

  const createBoard = api.workspaces.boards.create.useMutation({
    onSuccess: async (board) => {
      await utils.workspaces.boards.list.invalidate({ workspaceId: board.workspaceId })
      router.push(`/dashboard/boards/${board.id}`)
    },
  })

  const [createBoardOpen, setCreateBoardOpen] = React.useState(false)
  const [newBoardTitle, setNewBoardTitle] = React.useState("")

  return (
    <div
      className={cn(
        "relative z-100 flex flex-col border-r border-[#9fadbc29] bg-[#1d2125] bg-opacity-90 backdrop-blur-xl text-[#9fadbc] transition-all duration-300",
        isCollapsed ? "w-12" : "w-64",
        className,
      )}
      style={{ zIndex: 1000 }}
      {...props}
    >
      {/* Collapse Toggle */}
      <div className="absolute -right-3 top-3 z-100">
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
         {!isCollapsed && !isDashboardOverview && (
           <div className="mb-4 flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                 <div className="flex h-8 w-8 items-center justify-center rounded bg-gradient-to-br from-purple-500 to-pink-500 text-white font-bold">
                    {(selectedWorkspace?.title?.[0] ?? "W").toUpperCase()}
                 </div>
                 <div className="flex flex-col">
                    <span className="text-sm font-semibold text-[#b6c2cf]">
                      {selectedWorkspace?.title ?? "No workspace"}
                    </span>
                    <span className="text-xs text-[#9fadbc]">
                      {workspaces.length ? `${workspaces.length} workspace(s)` : "Create your first workspace"}
                    </span>
                 </div>
              </div>
           </div>
         )}
         
         {/* Navigation Links */}
         <nav className="space-y-1">
            {isDashboardOverview ? (
              <NavItem
                icon={<Trello className="h-4 w-4" />}
                label="Workspaces"
                href="/dashboard"
                isCollapsed={isCollapsed}
                active={pathname === "/dashboard" || pathname === "/workspaces"}
              />
            ) : (
              <>
                <NavItem
                  icon={<Trello className="h-4 w-4" />}
                  label="Boards"
                  href="/dashboard"
                  isCollapsed={isCollapsed}
                  active={pathname === "/dashboard" || pathname.startsWith("/dashboard/boards/") || pathname.startsWith("/dashboard/workspaces/")}
                />
                <NavItem
                  icon={<Users className="h-4 w-4" />}
                  label="Members"
                  href="/dashboard/members"
                  isCollapsed={isCollapsed}
                  active={pathname.startsWith("/dashboard/members")}
                />
                <NavItem
                  icon={<Settings className="h-4 w-4" />}
                  label="Settings"
                  href="/dashboard/settings"
                  isCollapsed={isCollapsed}
                  active={pathname.startsWith("/dashboard/settings")}
                />
              </>
            )}
         </nav>

          {/* Your Boards */}
          {!isCollapsed && !isDashboardOverview && (
            <div className="mt-6">
               <div className="flex items-center justify-between px-2 mb-2">
                  <span className="text-xs font-semibold text-[#9fadbc] uppercase">Your boards</span>
                  <Dialog open={createBoardOpen} onOpenChange={setCreateBoardOpen}>
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-[#9fadbc] hover:bg-[#a6c5e229]"
                        disabled={!selectedWorkspaceId}
                        title={selectedWorkspaceId ? "Create board" : "Select a workspace first"}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create board</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-2">
                        <Input
                          value={newBoardTitle}
                          onChange={(e) => setNewBoardTitle(e.target.value)}
                          placeholder="Board title"
                        />
                      </div>
                      <DialogFooter>
                        <Button
                          variant="trello"
                          disabled={!selectedWorkspaceId || !newBoardTitle.trim() || createBoard.isPending}
                          onClick={() => {
                            if (!selectedWorkspaceId) return
                            createBoard.mutate({ workspaceId: selectedWorkspaceId, title: newBoardTitle.trim() })
                            setNewBoardTitle("")
                            setCreateBoardOpen(false)
                          }}
                        >
                          Create
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
               </div>
               <nav className="space-y-1">
                  {boardsQuery.data?.map((b) => (
                    <NavItem
                      key={b.id}
                      icon={<div className="h-2 w-2 rounded-full bg-blue-400" />}
                      label={b.title}
                      href={`/dashboard/boards/${b.id}`}
                      isCollapsed={isCollapsed}
                      active={pathname === `/dashboard/boards/${b.id}`}
                    />
                  ))}
               </nav>
            </div>
         )}

         {/* Workspaces switcher (simple) */}
         {!isCollapsed && !isDashboardOverview && workspaces.length > 1 && (
           <div className="mt-6 px-2">
             <div className="text-xs font-semibold text-[#9fadbc] uppercase mb-2">Workspaces</div>
             <div className="space-y-1">
               {workspaces.map((w) => (
                 <Button
                   key={w.id}
                   variant="ghost"
                   className={cn(
                     "w-full justify-start px-2 h-9 text-[#9fadbc] hover:bg-[#a6c5e229] hover:text-[#b6c2cf]",
                     w.id === selectedWorkspaceId && "bg-[#a6c5e229] text-[#579dff]",
                   )}
                  onClick={() => goToWorkspace(w.id)}
                 >
                   <span className="mr-3 flex h-5 w-5 items-center justify-center rounded bg-[#579dff] text-[#1d2125] text-xs font-bold">
                     {w.title?.[0]?.toUpperCase() ?? "W"}
                   </span>
                   <span className="truncate">{w.title}</span>
                 </Button>
               ))}
             </div>
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
