"use client"

import * as React from "react"
import Link from "next/link"
import { Button, Header, Input, DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuItem } from "@taskly/ui"
import { Grid, Search, Bell, HelpCircle, User } from "lucide-react"

export function Navbar() {
  return (
    <Header className="h-12 bg-[#1d2125] border-b border-[#9fadbc29] px-4 flex items-center justify-between backdrop-blur-none supports-[backdrop-filter]:bg-[#1d2125]">
      {/* Left Section */}
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-8 w-8 text-[#9fadbc] hover:bg-[#a6c5e229] hover:text-[#9fadbc]">
          <Grid className="h-4 w-4" />
        </Button>
        <Link href="/" className="flex items-center gap-2 px-2 group">
          <div className="flex gap-1 items-center font-bold text-[#9fadbc] group-hover:text-white transition-colors text-lg tracking-tight">
            {/* Simple logo placeholder */}
            <div className="h-5 w-5 bg-[#0055cc] rounded-[2px]" />
            Taskly
          </div>
        </Link>
        
        <div className="hidden md:flex items-center ml-2 gap-1">
           <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 text-[#9fadbc] hover:bg-[#a6c5e229] hover:text-[#9fadbc] font-normal px-3">
                  Workspaces <span className="ml-2 text-xs">▼</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                 <DropdownMenuItem>My Workspace</DropdownMenuItem>
                 <DropdownMenuItem>Create Workspace</DropdownMenuItem>
              </DropdownMenuContent>
           </DropdownMenu>

           <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 text-[#9fadbc] hover:bg-[#a6c5e229] hover:text-[#9fadbc] font-normal px-3">
                  Recent <span className="ml-2 text-xs">▼</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                 <DropdownMenuItem>Board 1</DropdownMenuItem>
                 <DropdownMenuItem>Board 2</DropdownMenuItem>
              </DropdownMenuContent>
           </DropdownMenu>

           <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 text-[#9fadbc] hover:bg-[#a6c5e229] hover:text-[#9fadbc] font-normal px-3">
                  Starred <span className="ml-2 text-xs">▼</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                 <DropdownMenuItem>Important Board</DropdownMenuItem>
              </DropdownMenuContent>
           </DropdownMenu>

            <Button variant="trello" size="sm" className="h-8 ml-2 bg-[#579dff] hover:bg-[#85b8ff] text-[#1d2125] font-semibold">
              Create
            </Button>
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

         <Button variant="ghost" size="icon" className="h-8 w-8 text-[#9fadbc] hover:bg-[#a6c5e229] hover:text-[#9fadbc] rounded-full">
            <Bell className="h-4 w-4" />
         </Button>

         <Button variant="ghost" size="icon" className="h-8 w-8 text-[#9fadbc] hover:bg-[#a6c5e229] hover:text-[#9fadbc] rounded-full">
            <HelpCircle className="h-4 w-4" />
         </Button>
         
         <div className="ml-1">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-[#0055cc] text-white hover:opacity-90">
               <span className="text-xs font-bold">YB</span>
            </Button>
         </div>
      </div>
    </Header>
  )
}

