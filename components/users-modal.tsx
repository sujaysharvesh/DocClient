"use client"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { UserPlus, Crown } from "lucide-react"

interface User {
  id: string
  name: string
  color: string
  avatar: string
  isOwner?: boolean
  lastSeen?: string
}

interface UsersModalProps {
  isOpen: boolean
  onClose: () => void
  activeUsers: User[]
  currentUserId?: string
}

export function UsersModal({ isOpen, onClose, activeUsers, currentUserId }: UsersModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Document Collaborators</DialogTitle>
          <DialogDescription>People currently working on this document.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invite-email">Invite by email</Label>
            <div className="flex space-x-2">
              <Input id="invite-email" placeholder="Enter email address" className="flex-1" />
              <Button size="sm">
                <UserPlus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <Label>Active Users ({activeUsers.length})</Label>
            <div className="space-y-2">
              {activeUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-2 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
                      style={{ backgroundColor: user.color }}
                    >
                      {user.avatar}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{user.name}</span>
                        {user.isOwner && <Crown className="h-4 w-4 text-yellow-500" />}
                        {user.id === currentUserId && (
                          <Badge variant="secondary" className="text-xs">
                            You
                          </Badge>
                        )}
                      </div>
                      <span className="text-sm text-muted-foreground">{user.lastSeen || "Active now"}</span>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
