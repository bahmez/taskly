"use client"

import * as React from "react"
import Link from "next/link"
import {
  Button,
  Header,
  Input,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuItem,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Textarea,
} from "@taskly/ui"
import { Grid, Search, Bell, HelpCircle, Plus } from "lucide-react"
import { api } from "@/app/trpc"
import { useWorkspaceUI } from "@/components/workspace/workspace-ui-provider"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/auth/auth-provider"
import { getFirebaseAuth } from "@/lib/firebase/firebase-client"
import { updateProfile } from "firebase/auth"

function initialsFrom(s: string) {
  const parts = (s ?? "").trim().split(/\s+/).filter(Boolean)
  const a = parts[0]?.[0] ?? "?"
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] : ""
  return (a + b).toUpperCase()
}

export function Navbar() {
  const router = useRouter()
  const pathname = usePathname()
  const isDashboardOverview = pathname === "/dashboard" || pathname === "/workspaces"
  const utils = api.useUtils()
  const { workspaces, selectedWorkspaceId, setSelectedWorkspaceId } = useWorkspaceUI()
  const selectedWorkspace = workspaces.find((w) => w.id === selectedWorkspaceId) ?? null
  const { user: firebaseUser, logout } = useAuth()
  const meQuery = api.users.me.useQuery()

  const updateMe = api.users.updateMe.useMutation({
    onSuccess: async () => {
      await utils.users.me.invalidate()
    },
  })

  const deleteMe = api.users.deleteMe.useMutation({
    onSuccess: async () => {
      await logout()
      router.replace("/login")
    },
  })

  const [profileOpen, setProfileOpen] = React.useState(false)
  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const [deleteConfirm, setDeleteConfirm] = React.useState("")
  const [username, setUsername] = React.useState("")
  const [firstName, setFirstName] = React.useState("")
  const [lastName, setLastName] = React.useState("")
  const [description, setDescription] = React.useState("")

  const [displayName, setDisplayName] = React.useState("")
  const [photoURL, setPhotoURL] = React.useState("")

  React.useEffect(() => {
    const me = meQuery.data
    if (!me) return
    setUsername(me.username ?? "")
    setFirstName(me.first_name ?? "")
    setLastName(me.last_name ?? "")
    setDescription(me.description ?? "")
  }, [meQuery.data])

  React.useEffect(() => {
    setDisplayName(firebaseUser?.displayName ?? "")
    setPhotoURL(firebaseUser?.photoURL ?? "")
  }, [firebaseUser?.uid, firebaseUser?.displayName, firebaseUser?.photoURL])

  const goToWorkspace = (workspaceId: string) => {
    setSelectedWorkspaceId(workspaceId)
    router.push(`/dashboard/workspaces/${workspaceId}`)
  }

  const createWorkspace = api.workspaces.create.useMutation({
    onSuccess: async (ws) => {
      await utils.workspaces.list.invalidate()
      setSelectedWorkspaceId(ws.id)
    },
  })

  const createBoard = api.workspaces.boards.create.useMutation({
    onSuccess: async (board) => {
      await utils.workspaces.boards.list.invalidate({ workspaceId: board.workspaceId })
      router.push(`/dashboard/boards/${board.id}`)
    },
  })

  const [createWorkspaceOpen, setCreateWorkspaceOpen] = React.useState(false)
  const [wsTitle, setWsTitle] = React.useState("")
  const [wsDesc, setWsDesc] = React.useState("")

  const [createBoardOpen, setCreateBoardOpen] = React.useState(false)
  const [boardTitle, setBoardTitle] = React.useState("")

  return (
    <Header className="h-12 bg-[#1d2125] border-b border-[#9fadbc29] px-4 flex items-center justify-between backdrop-blur-none supports-[backdrop-filter]:bg-[#1d2125]">
      {/* Left Section */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-[#9fadbc] hover:bg-[#a6c5e229] hover:text-[#9fadbc]"
        >
          <Grid className="h-4 w-4" />
        </Button>

        <Link href="/dashboard" className="flex items-center gap-2 px-2 group">
          <div className="flex gap-1 items-center font-bold text-[#9fadbc] group-hover:text-white transition-colors text-lg tracking-tight">
            <div className="h-5 w-5 bg-[#0055cc] rounded-[2px]" />
            Taskly
          </div>
        </Link>

        <div className="hidden md:flex items-center ml-2 gap-1">
          <Button asChild variant="ghost" className="h-8 text-[#9fadbc] hover:bg-[#a6c5e229] hover:text-[#9fadbc] font-normal px-3">
            <Link href="/dashboard">Workspaces</Link>
          </Button>
          <Button
            variant="ghost"
            className="h-8 text-[#9fadbc] hover:bg-[#a6c5e229] hover:text-[#9fadbc] font-normal px-3"
            onClick={() => router.push("/dashboard?archived=1")}
          >
            Archived
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-8 text-[#9fadbc] hover:bg-[#a6c5e229] hover:text-[#9fadbc] font-normal px-3"
              >
                {selectedWorkspace?.title ?? "Workspaces"} <span className="ml-2 text-xs">▼</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {workspaces.map((w) => (
                <DropdownMenuItem key={w.id} onClick={() => goToWorkspace(w.id)}>
                  {w.title}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <Dialog open={createWorkspaceOpen} onOpenChange={setCreateWorkspaceOpen}>
                <DialogTrigger asChild>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <span className="flex items-center gap-2">
                      <Plus className="h-4 w-4" /> Create workspace
                    </span>
                  </DropdownMenuItem>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create workspace</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    <Input
                      value={wsTitle}
                      onChange={(e) => setWsTitle(e.target.value)}
                      placeholder="Workspace title"
                    />
                    <Textarea
                      value={wsDesc}
                      onChange={(e) => setWsDesc(e.target.value)}
                      placeholder="Description (optional)"
                    />
                  </div>
                  <DialogFooter>
                    <Button
                      variant="trello"
                      disabled={!wsTitle.trim() || createWorkspace.isPending}
                      onClick={() => {
                        createWorkspace.mutate({ title: wsTitle.trim(), description: wsDesc.trim() || undefined })
                        setWsTitle("")
                        setWsDesc("")
                        setCreateWorkspaceOpen(false)
                      }}
                    >
                      Create
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </DropdownMenuContent>
          </DropdownMenu>

          {!isDashboardOverview && (
            <Dialog open={createBoardOpen} onOpenChange={setCreateBoardOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="trello"
                  size="sm"
                  className="h-8 ml-2 bg-[#579dff] hover:bg-[#85b8ff] text-[#1d2125] font-semibold"
                  disabled={!selectedWorkspaceId}
                >
                  Create
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create board</DialogTitle>
                </DialogHeader>
                <div className="space-y-2">
                  <Input value={boardTitle} onChange={(e) => setBoardTitle(e.target.value)} placeholder="Board title" />
                </div>
                <DialogFooter>
                  <Button
                    variant="trello"
                    disabled={!selectedWorkspaceId || !boardTitle.trim() || createBoard.isPending}
                    onClick={() => {
                      if (!selectedWorkspaceId) return
                      createBoard.mutate({ workspaceId: selectedWorkspaceId, title: boardTitle.trim() })
                      setBoardTitle("")
                      setCreateBoardOpen(false)
                    }}
                  >
                    Create
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-1">
        <div className="relative hidden sm:block mr-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9fadbc]" />
          <Input
            placeholder="Search"
            className="h-8 w-56 bg-[#22272b] border-[#9fadbc29] pl-8 text-[#9fadbc] placeholder:text-[#9fadbc] hover:bg-[#2c333a] focus:bg-white focus:text-black focus:placeholder:text-gray-500 transition-all"
          />
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-[#9fadbc] hover:bg-[#a6c5e229] hover:text-[#9fadbc] rounded-full"
        >
          <Bell className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-[#9fadbc] hover:bg-[#a6c5e229] hover:text-[#9fadbc] rounded-full"
        >
          <HelpCircle className="h-4 w-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full bg-[#0055cc] text-white hover:opacity-90 overflow-hidden"
              title="Account"
            >
              {firebaseUser?.photoURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={firebaseUser.photoURL} alt="avatar" className="h-8 w-8 object-cover" />
              ) : (
                <span className="text-xs font-bold">
                  {initialsFrom(meQuery.data?.username || firebaseUser?.displayName || firebaseUser?.email || "User")}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <div className="px-3 py-2">
              <div className="text-sm font-semibold text-[#b6c2cf] truncate">{meQuery.data?.username ?? "User"}</div>
              <div className="text-xs text-[#9fadbc] truncate">{firebaseUser?.email ?? firebaseUser?.uid ?? ""}</div>
            </div>
            <DropdownMenuSeparator />

            <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
              <DialogTrigger asChild>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>Profile</DropdownMenuItem>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Profile</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="rounded-md border border-[#9fadbc29] p-3">
                    <div className="text-xs text-[#9fadbc]">Account</div>
                    <div className="text-sm text-[#b6c2cf] mt-1">Email: {firebaseUser?.email ?? "-"}</div>
                    <div className="text-sm text-[#b6c2cf]">ID: {firebaseUser?.uid ?? "-"}</div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs text-[#9fadbc]">Display name</div>
                    <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Display name" />
                  </div>
                  <div className="space-y-2">
                    <div className="text-xs text-[#9fadbc]">Photo URL</div>
                    <Input value={photoURL} onChange={(e) => setPhotoURL(e.target.value)} placeholder="https://..." />
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs text-[#9fadbc]">Username</div>
                    <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="username" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <div className="text-xs text-[#9fadbc]">First name</div>
                      <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First name" />
                    </div>
                    <div className="space-y-2">
                      <div className="text-xs text-[#9fadbc]">Last name</div>
                      <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last name" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-xs text-[#9fadbc]">Description</div>
                    <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="About you…" />
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    variant="trelloGray"
                    onClick={() => {
                      const me = meQuery.data
                      if (me) {
                        setUsername(me.username ?? "")
                        setFirstName(me.first_name ?? "")
                        setLastName(me.last_name ?? "")
                        setDescription(me.description ?? "")
                      }
                      setDisplayName(firebaseUser?.displayName ?? "")
                      setPhotoURL(firebaseUser?.photoURL ?? "")
                    }}
                  >
                    Reset
                  </Button>
                  <Button
                    variant="trello"
                    disabled={updateMe.isPending}
                    onClick={async () => {
                      // 1) backend profile
                      updateMe.mutate({
                        username: username.trim() || undefined,
                        first_name: firstName.trim() || undefined,
                        last_name: lastName.trim() || undefined,
                        description,
                      })

                      // 2) firebase profile (best-effort)
                      const auth = getFirebaseAuth()
                      const u = auth?.currentUser
                      if (u) {
                        try {
                          await updateProfile(u, {
                            displayName: displayName.trim() || null,
                            photoURL: photoURL.trim() || null,
                          })
                        } catch {
                          // ignore firebase update errors for now
                        }
                      }
                      setProfileOpen(false)
                    }}
                  >
                    Save
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <DropdownMenuItem
              onClick={async () => {
                await logout()
                router.replace("/login")
              }}
            >
              Logout
            </DropdownMenuItem>

            <DropdownMenuSeparator />
            <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
              <DialogTrigger asChild>
                <DropdownMenuItem
                  className="text-red-500 focus:text-red-500"
                  onSelect={(e) => e.preventDefault()}
                >
                  Delete account
                </DropdownMenuItem>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete account</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <p className="text-sm text-[#9fadbc]">
                    This action is irreversible. To confirm, type <span className="text-[#b6c2cf] font-semibold">DELETE</span>.
                  </p>
                  <Input
                    value={deleteConfirm}
                    onChange={(e) => setDeleteConfirm(e.target.value)}
                    placeholder="Type DELETE"
                  />
                </div>
                <DialogFooter>
                  <Button
                    variant="ghost"
                    className="text-[#9fadbc] hover:bg-[#a6c5e229]"
                    onClick={() => {
                      setDeleteOpen(false)
                      setDeleteConfirm("")
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    disabled={deleteMe.isPending || deleteConfirm.trim().toUpperCase() !== "DELETE"}
                    onClick={() => {
                      deleteMe.mutate()
                      setDeleteOpen(false)
                      setDeleteConfirm("")
                    }}
                  >
                    Delete
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Header>
  )
}

