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
  useToast,
} from "@taskly/ui"
import { Grid, Search, Bell, HelpCircle, Plus, Upload } from "lucide-react"
import { api } from "@/app/trpc"
import { useWorkspaceUI } from "@/components/workspace/workspace-ui-provider"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/auth/auth-provider"
import { getFirebaseAuth } from "@/lib/firebase/firebase-client"
import { updateProfile } from "firebase/auth"
import { UserAvatar } from "@/components/user/user-avatar"


function formatNotificationTime(input: { createdAt?: string; createdAtMs?: number }) {
  const ms = Number.isFinite(input.createdAtMs) ? (input.createdAtMs as number) : undefined
  const date = ms ? new Date(ms) : input.createdAt ? new Date(input.createdAt) : null
  if (!date || Number.isNaN(date.getTime())) return ""
  return date.toLocaleString()
}

export function Navbar() {
  const router = useRouter()
  const pathname = usePathname()
  const isDashboardOverview = pathname === "/dashboard" || pathname === "/workspaces"
  const utils = api.useUtils()
  const { toast } = useToast()
  const { workspaces, selectedWorkspaceId, setSelectedWorkspaceId } = useWorkspaceUI()
  const selectedWorkspace = workspaces.find((w) => w.id === selectedWorkspaceId) ?? null
  const { user: firebaseUser, logout } = useAuth()
  const meQuery = api.users.me.useQuery()

  const updateMe = api.users.updateMe.useMutation({
    onSuccess: async () => {
      await utils.users.me.invalidate()
    },
  })

  const setAvatarBackground = api.users.avatar.setInitialsBackground.useMutation({
    onSuccess: async () => {
      await utils.users.me.invalidate()
      await utils.users.byIds.invalidate()
      await utils.users.byId.invalidate()
    },
  })

  const clearAvatar = api.users.avatar.clear.useMutation({
    onSuccess: async () => {
      await utils.users.me.invalidate()
      await utils.users.byIds.invalidate()
      await utils.users.byId.invalidate()
    },
  })

  const createAvatarUpload = api.users.avatar.createUpload.useMutation()
  const completeAvatarUpload = api.users.avatar.completeUpload.useMutation({
    onSuccess: async () => {
      await utils.users.me.invalidate()
      await utils.users.byIds.invalidate()
      await utils.users.byId.invalidate()
      toast({ title: "Photo updated" })
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
  const [avatarOpen, setAvatarOpen] = React.useState(false)
  const [avatarTab, setAvatarTab] = React.useState<"color" | "gradient" | "image" | "upload">("color")
  const [avatarSearch, setAvatarSearch] = React.useState("")

  const avatarSearchValue = avatarSearch.trim()
  const avatarBackgroundsQuery = api.boards.listBackgrounds.useInfiniteQuery(
    {
      type: avatarTab === "upload" ? "color" : avatarTab,
      limit: 12,
      query: avatarTab === "image" && avatarSearchValue ? avatarSearchValue : undefined,
    },
    {
      enabled: avatarOpen && avatarTab !== "upload",
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    },
  )

  const notificationsQuery = api.notifications.list.useQuery({ limit: 6 })
  const unreadCountQuery = api.notifications.unreadCount.useQuery()
  const markRead = api.notifications.markRead.useMutation({
    onSuccess: async () => {
      await utils.notifications.list.invalidate()
      await utils.notifications.unreadCount.invalidate()
    },
  })
  const markAllRead = api.notifications.markAllRead.useMutation({
    onSuccess: async () => {
      await utils.notifications.list.invalidate()
      await utils.notifications.unreadCount.invalidate()
    },
  })

  const notifications = notificationsQuery.data?.items ?? []
  const unreadCount = unreadCountQuery.data?.count ?? 0

  const notificationHref = (n: (typeof notifications)[number]) => {
    const data = n.data ?? {}
    const boardId = typeof data.boardId === "string" ? data.boardId : null
    if (boardId) return `/dashboard/boards/${boardId}`
    const workspaceId = typeof data.workspaceId === "string" ? data.workspaceId : null
    if (workspaceId) return `/dashboard/workspaces/${workspaceId}`
    return null
  }

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
  }, [firebaseUser?.uid, firebaseUser?.displayName])

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

  const me = meQuery.data
  const avatarBackgroundItems = avatarBackgroundsQuery.data?.pages.flatMap((p) => p.items) ?? []
  const avatarUploading = createAvatarUpload.isPending || completeAvatarUpload.isPending

  const onUploadAvatarFile = React.useCallback(
    async (file: File) => {
      let objectPath: string | null = null
      try {
        toast({ title: "Uploading..." })
        const res = await createAvatarUpload.mutateAsync({
          filename: file.name,
          contentType: file.type || "application/octet-stream",
          resumable: false,
        })
        objectPath = res.objectPath
        const putRes = await fetch(res.upload.url, {
          method: res.upload.method,
          headers: res.upload.headers,
          body: file,
        })
        if (!putRes.ok) {
          let bodyText = ""
          try {
            bodyText = await putRes.text()
          } catch {
            // ignore
          }
          throw new Error(`GCS upload failed (${putRes.status}): ${bodyText || putRes.statusText || "Unknown error"}`)
        }
        await completeAvatarUpload.mutateAsync({ objectPath })
        setAvatarOpen(false)
      } catch (err) {
        const error = err as Error
        toast({
          title: "Upload failed",
          description: error.message.includes("client_email")
            ? "GCS credentials not configured"
            : error.message ||
              "Failed to upload file. If you see a CORS error in the console, update bucket CORS for your origin.",
          variant: "destructive",
        })
      }
    },
    [createAvatarUpload, completeAvatarUpload, toast, setAvatarOpen],
  )

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

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative h-8 w-8 text-[#9fadbc] hover:bg-[#a6c5e229] hover:text-[#9fadbc] rounded-full"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 ? (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-[#f87171] text-[10px] font-semibold text-white flex items-center justify-center px-1">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              ) : null}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-96">
            <div className="flex items-center justify-between px-3 py-2">
              <div className="text-sm font-semibold text-[#b6c2cf]">Notifications</div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-[#9fadbc] hover:bg-[#a6c5e229]"
                disabled={unreadCount === 0 || markAllRead.isPending}
                onClick={() => markAllRead.mutate()}
              >
                Tout marquer comme lu
              </Button>
            </div>
            <DropdownMenuSeparator />

            {notificationsQuery.isLoading ? (
              <div className="px-3 py-3 text-sm text-[#9fadbc]">Chargement…</div>
            ) : notifications.length === 0 ? (
              <div className="px-3 py-6 text-sm text-[#9fadbc]">Aucune notification pour le moment.</div>
            ) : (
              <div className="max-h-[360px] overflow-y-auto">
                {notifications.map((n) => {
                  const href = notificationHref(n)
                  const isUnread = !n.readAt
                  return (
                    <DropdownMenuItem
                      key={n.id}
                      className="items-start gap-2 py-2"
                      onSelect={(e) => {
                        e.preventDefault()
                        if (isUnread) markRead.mutate({ id: n.id })
                        if (href) router.push(href)
                      }}
                    >
                      <div className="mt-1 h-2 w-2 rounded-full bg-[#579dff]" style={{ opacity: isUnread ? 1 : 0 }} />
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-[#b6c2cf] truncate">{n.title}</div>
                        {n.body ? <div className="text-xs text-[#9fadbc] line-clamp-2">{n.body}</div> : null}
                        <div className="text-[11px] text-[#7c8a97] mt-1">
                          {formatNotificationTime({ createdAt: n.createdAt, createdAtMs: n.createdAtMs })}
                        </div>
                      </div>
                    </DropdownMenuItem>
                  )
                })}
              </div>
            )}

            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault()
                router.push("/dashboard/notifications")
              }}
            >
              Voir plus
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

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
              className="h-8 w-8 rounded-full text-white hover:opacity-90 overflow-hidden"
              title="Account"
            >
              <UserAvatar user={me ?? { username: firebaseUser?.displayName ?? firebaseUser?.email ?? "User" }} className="h-8 w-8" />
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

                  <div className="flex items-center gap-3">
                    <UserAvatar user={me ?? { username: firebaseUser?.displayName ?? firebaseUser?.email ?? "User" }} className="h-12 w-12" />
                    <div className="flex-1">
                      <div className="text-xs text-[#9fadbc]">Profile photo</div>
                      <Dialog open={avatarOpen} onOpenChange={setAvatarOpen}>
                        <DialogTrigger asChild>
                          <Button variant="trelloGray" size="sm" className="mt-2">
                            Change avatar
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-[#1d2125] border-[#9fadbc29] text-[#b6c2cf] max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Update avatar</DialogTitle>
                          </DialogHeader>

                          <div className="flex flex-wrap items-center gap-2">
                            {(["color", "gradient", "image", "upload"] as const).map((tab) => (
                              <Button
                                key={tab}
                                type="button"
                                variant="ghost"
                                className={[
                                  "text-sm capitalize",
                                  avatarTab === tab ? "bg-[#a6c5e229] text-white" : "",
                                ].join(" ")}
                                onClick={() => setAvatarTab(tab)}
                              >
                                {tab === "image" ? "Unsplash" : tab === "upload" ? "Upload" : tab}
                              </Button>
                            ))}
                            <Button
                              type="button"
                              variant="ghost"
                              className="ml-auto text-sm text-[#9fadbc] hover:text-white"
                              disabled={clearAvatar.isPending}
                              onClick={() => {
                                clearAvatar.mutate()
                                setAvatarOpen(false)
                              }}
                            >
                              Reset
                            </Button>
                          </div>

                          {avatarTab === "image" && (
                            <Input
                              value={avatarSearch}
                              onChange={(e) => setAvatarSearch(e.target.value)}
                              placeholder="Search Unsplash"
                            />
                          )}

                          {avatarTab === "upload" ? (
                            <div className="space-y-3">
                              <div className="text-sm text-[#9fadbc]">
                                Upload a square image (we’ll store it in GCS).
                              </div>
                              <Button
                                variant="trello"
                                disabled={avatarUploading}
                                onClick={() => {
                                  const input = document.createElement("input")
                                  input.type = "file"
                                  input.accept = "image/*"
                                  input.value = ""
                                  input.onchange = async (e) => {
                                    const file = (e.target as HTMLInputElement).files?.[0]
                                    if (!file) return
                                    await onUploadAvatarFile(file)
                                  }
                                  input.click()
                                }}
                              >
                                <Upload className="h-4 w-4 mr-2" />
                                Upload photo
                              </Button>
                            </div>
                          ) : avatarBackgroundsQuery.isLoading ? (
                            <div className="text-sm text-[#9fadbc]">Loading backgrounds…</div>
                          ) : avatarBackgroundItems.length === 0 ? (
                            <div className="text-sm text-[#9fadbc]">No background found.</div>
                          ) : (
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                              {avatarBackgroundItems.map((bg) => (
                                <button
                                  key={`${bg.type}:${bg.type === "image" ? bg.value.id : bg.value}`}
                                  type="button"
                                  className="h-16 rounded-md border border-[#9fadbc29] overflow-hidden focus:outline-none"
                                  style={getBoardBackgroundStyle(bg, { preferThumb: true })}
                                  onClick={() => {
                                    setAvatarBackground.mutate({ background: bg })
                                    setAvatarOpen(false)
                                  }}
                                />
                              ))}
                            </div>
                          )}

                          {avatarTab !== "upload" && avatarBackgroundsQuery.hasNextPage && (
                            <div className="flex justify-center">
                              <Button
                                type="button"
                                variant="ghost"
                                className="text-sm text-[#9fadbc] hover:text-white"
                                onClick={() => avatarBackgroundsQuery.fetchNextPage()}
                                disabled={avatarBackgroundsQuery.isFetchingNextPage}
                              >
                                {avatarBackgroundsQuery.isFetchingNextPage ? "Loading…" : "Load more"}
                              </Button>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs text-[#9fadbc]">Display name</div>
                    <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Display name" />
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

