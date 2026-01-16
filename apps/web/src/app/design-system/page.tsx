/**
 * Design System Showcase Page
 *
 * Interactive demonstration of all UI components and design system patterns.
 * Shows:
 * - Board layout with columns and cards
 * - Button variants and sizes
 * - Dialog and dropdown menus
 * - Form inputs and textarea
 * - Card components
 * - Toast notifications
 * - Trello-like board interface mockup
 *
 * Useful for:
 * - Component library reference
 * - UI consistency verification
 * - Component interaction testing
 * - Designer/developer collaboration
 */

"use client";

import { 
  Button, 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  Input,
  Textarea,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  useToast,
  Toaster
} from "@taskly/ui";
import { Plus, MoreHorizontal, Calendar, Paperclip, AlignLeft, CheckSquare } from "lucide-react";
import { useState } from "react";
import TrelloLayout from "@/components/layout/trello-layout";

/**
 * Design system showcase component.
 * Renders a Trello-like board interface with interactive components.
 *
 * @returns The design system page with component examples
 */
export default function DesignSystemPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  /**
   * Shows a toast notification example.
   * Demonstrates the toast system usage.
   */
  const handleShowToast = () => {
    toast({
      title: "Notification",
      description: "This is a notification message.",
    });
  };

  return (
    <TrelloLayout>
      {/* Global toast container */}
      <Toaster />
      <div className="h-full w-full p-4 overflow-x-auto">
        <div className="mb-6 flex items-center justify-between text-white">
          <div className="flex items-center gap-4">
             <h1 className="text-xl font-bold bg-[#ffffff3d] px-4 py-1.5 rounded-md backdrop-blur-sm">Board Name</h1>
             <Button variant="secondary" size="sm" className="bg-[#ffffff3d] text-white hover:bg-[#ffffff52] border-none h-8">
               <span className="mr-2">★</span>
             </Button>
              <div className="h-6 w-px bg-[#ffffff3d] mx-2" />
             <div className="flex items-center -space-x-2">
                <div className="h-7 w-7 rounded-full bg-red-500 border-2 border-transparent" title="User 1"></div>
                <div className="h-7 w-7 rounded-full bg-blue-500 border-2 border-transparent" title="User 2"></div>
                <div className="h-7 w-7 rounded-full bg-yellow-500 border-2 border-transparent flex items-center justify-center text-xs font-bold text-black cursor-pointer bg-[#dfe1e6]" title="More...">+2</div>
             </div>
             <Button variant="secondary" size="sm" className="bg-[#dfe1e6] text-[#172b4d] hover:bg-white border-none h-8 ml-2">
                Share
             </Button>
          </div>
          
          <div className="flex items-center gap-2">
             <Button variant="secondary" size="sm" className="bg-[#ffffff3d] text-white hover:bg-[#ffffff52] border-none h-8">
               ... Show Menu
             </Button>
          </div>
        </div>

        <div className="flex gap-4 items-start h-[calc(100%-60px)]">
          {/* List 1: To Do */}
          <div className="w-[272px] shrink-0 max-h-full flex flex-col">
            <Card className="bg-[#f1f2f4] border-none shadow-sm max-h-full flex flex-col">
              <CardHeader className="p-3 pb-0 flex flex-row justify-between items-start space-y-0 shrink-0">
                <CardTitle className="text-sm font-semibold text-[#172b4d] px-2 py-1">To Do</CardTitle>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-[#626f86] hover:bg-[#dcdfe4]">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>List Actions</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>Add card...</DropdownMenuItem>
                    <DropdownMenuItem>Copy list...</DropdownMenuItem>
                    <DropdownMenuItem>Move list...</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-red-600">Archive this list</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent className="p-2 flex flex-col gap-2 overflow-y-auto">
                {/* Card Item */}
                <div className="group relative bg-white p-2 rounded-lg shadow-sm hover:ring-2 hover:ring-[#388bff] cursor-pointer" onClick={handleShowToast}>
                  <p className="text-sm text-[#172b4d] mb-2">Research design systems (Click me for toast)</p>
                  <div className="flex gap-2 items-center text-xs text-[#626f86]">
                     <span className="flex items-center gap-1 hover:bg-[#dcdfe4] px-1 py-0.5 rounded">
                      <Paperclip className="h-3 w-3" /> 2
                    </span>
                  </div>
                </div>

                 {/* Card Item with Label */}
                 <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                   <DialogTrigger asChild>
                      <div className="group relative bg-white p-2 rounded-lg shadow-sm hover:ring-2 hover:ring-[#388bff] cursor-pointer">
                        <div className="w-10 h-2 bg-green-500 rounded-full mb-1"></div>
                        <p className="text-sm text-[#172b4d]">Create initial components</p>
                        <div className="mt-1 flex gap-2 items-center text-xs text-[#626f86]">
                          <span className="flex items-center gap-1">
                            <AlignLeft className="h-3 w-3" />
                          </span>
                        </div>
                      </div>
                   </DialogTrigger>
                   <DialogContent className="max-w-3xl h-[80vh] flex flex-col gap-0 p-0 overflow-hidden bg-[#f4f5f7]">
                      <div className="flex-1 overflow-y-auto p-6">
                        <DialogHeader className="mb-6">
                          <DialogTitle className="text-xl text-[#172b4d] flex items-start gap-3">
                             <CheckSquare className="h-6 w-6 mt-1 text-[#44546f]" />
                             <div className="flex flex-col items-start gap-1">
                               <span>Create initial components</span>
                               <span className="text-xs font-normal text-[#626f86]">in list <span className="underline decoration-1 cursor-pointer">To Do</span></span>
                             </div>
                          </DialogTitle>
                        </DialogHeader>

                        <div className="grid grid-cols-[1fr_168px] gap-8">
                           <div className="space-y-6">
                              {/* Description Section */}
                              <div>
                                 <div className="flex items-center gap-3 mb-2">
                                    <AlignLeft className="h-6 w-6 text-[#44546f]" />
                                    <h3 className="font-semibold text-[#172b4d]">Description</h3>
                                 </div>
                                 <div className="ml-9">
                                    <Textarea 
                                      placeholder="Add a more detailed description..." 
                                      className="min-h-[100px] resize-none bg-[#091e420f] border-none hover:bg-[#091e4214] focus:bg-white focus:ring-2 focus:ring-[#388bff] transition-all"
                                    />
                                    <div className="mt-2 flex gap-2">
                                       <Button variant="trello" size="sm">Save</Button>
                                       <Button variant="ghost" size="sm">Cancel</Button>
                                    </div>
                                 </div>
                              </div>

                               {/* Activity Section */}
                              <div>
                                 <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-3">
                                      <div className="h-6 w-6 rounded-full bg-[#dfe1e6] flex items-center justify-center text-xs font-bold text-[#172b4d]">Y</div>
                                      <h3 className="font-semibold text-[#172b4d]">Activity</h3>
                                    </div>
                                    <Button variant="secondary" size="sm" className="bg-[#091e420f] hover:bg-[#091e4214] text-[#172b4d]">Show Details</Button>
                                 </div>
                                 <div className="ml-9">
                                    <div className="relative">
                                       <Input 
                                        placeholder="Write a comment..." 
                                        className="bg-white border-[#dfe1e6] shadow-sm hover:shadow-md transition-shadow" 
                                      />
                                    </div>
                                 </div>
                              </div>
                           </div>

                           {/* Sidebar Actions */}
                           <div className="space-y-4">
                              <div>
                                 <h4 className="text-xs font-bold text-[#626f86] uppercase mb-2">Add to card</h4>
                                 <div className="flex flex-col gap-2">
                                    <Button variant="secondary" className="justify-start bg-[#091e420f] hover:bg-[#091e4214] text-[#172b4d] h-8 font-normal">
                                       <span className="mr-2">👤</span> Members
                                    </Button>
                                    <Button variant="secondary" className="justify-start bg-[#091e420f] hover:bg-[#091e4214] text-[#172b4d] h-8 font-normal">
                                       <span className="mr-2">🏷️</span> Labels
                                    </Button>
                                    <Button variant="secondary" className="justify-start bg-[#091e420f] hover:bg-[#091e4214] text-[#172b4d] h-8 font-normal">
                                       <span className="mr-2">✅</span> Checklist
                                    </Button>
                                    <Button variant="secondary" className="justify-start bg-[#091e420f] hover:bg-[#091e4214] text-[#172b4d] h-8 font-normal">
                                       <span className="mr-2">📅</span> Dates
                                    </Button>
                                 </div>
                              </div>

                              <div>
                                 <h4 className="text-xs font-bold text-[#626f86] uppercase mb-2">Actions</h4>
                                 <div className="flex flex-col gap-2">
                                    <Select>
                                      <SelectTrigger className="w-full bg-[#091e420f] border-none hover:bg-[#091e4214] text-[#172b4d] h-8 font-normal justify-between">
                                        <SelectValue placeholder="Move" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="todo">To Do</SelectItem>
                                        <SelectItem value="progress">In Progress</SelectItem>
                                        <SelectItem value="done">Done</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <Button variant="secondary" className="justify-start bg-[#091e420f] hover:bg-[#091e4214] text-[#172b4d] h-8 font-normal">
                                       <span className="mr-2">📋</span> Copy
                                    </Button>
                                    <Button variant="secondary" className="justify-start bg-[#091e420f] hover:bg-[#091e4214] text-[#172b4d] h-8 font-normal">
                                       <span className="mr-2">👁️</span> Watch
                                    </Button>
                                    <div className="h-px bg-[#091e4221] my-1" />
                                    <Button variant="secondary" className="justify-start bg-[#091e420f] hover:bg-[#091e4214] text-[#172b4d] h-8 font-normal">
                                       <span className="mr-2">🗑️</span> Archive
                                    </Button>
                                 </div>
                              </div>
                           </div>
                        </div>
                      </div>
                   </DialogContent>
                 </Dialog>

                {/* Add Card Input */}
                <div className="pt-1">
                   <Button variant="ghost" className="w-full justify-start text-[#44546f] hover:bg-[#dcdfe4] px-2 h-8">
                    <Plus className="h-4 w-4 mr-2" />
                    Add a card
                   </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* List 2: In Progress */}
          <div className="w-[272px] shrink-0 max-h-full flex flex-col">
            <Card className="bg-[#f1f2f4] border-none shadow-sm max-h-full flex flex-col">
               <CardHeader className="p-3 pb-0 flex flex-row justify-between items-start space-y-0 shrink-0">
                <CardTitle className="text-sm font-semibold text-[#172b4d] px-2 py-1">In Progress</CardTitle>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-[#626f86] hover:bg-[#dcdfe4]">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="p-2 flex flex-col gap-2 overflow-y-auto">
                 {/* Card Item */}
                 <div className="group relative bg-white p-2 rounded-lg shadow-sm hover:ring-2 hover:ring-[#388bff] cursor-pointer">
                  <p className="text-sm text-[#172b4d] mb-2">Setup Monorepo</p>
                  <div className="flex gap-2 items-center text-xs text-[#626f86]">
                     <span className="flex items-center gap-1 bg-[#eef6fc] text-[#172b4d] px-1 py-0.5 rounded">
                      <Calendar className="h-3 w-3" /> Today
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* List 3: Add new list */}
           <div className="w-[272px] shrink-0">
              <div className="bg-[#ffffff3d] rounded-xl p-2 hover:bg-[#ffffff52] transition-colors cursor-pointer">
                 <Button variant="ghost" className="w-full justify-start text-white hover:bg-transparent font-semibold h-9">
                    <Plus className="h-4 w-4 mr-2" />
                    Add another list
                 </Button>
              </div>
           </div>
        </div>
      </div>
    </TrelloLayout>
  );
}
