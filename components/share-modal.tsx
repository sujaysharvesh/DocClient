"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Copy, Check, Globe, Lock, Users } from "lucide-react"
import { Switch } from "@/components/ui/switch"

interface ShareModalProps {
  isOpen: boolean
  onClose: () => void
  documentId: string
}

export function ShareModal({ isOpen, onClose, documentId }: ShareModalProps) {
  const [copied, setCopied] = useState(false)
  const [isPublic, setIsPublic] = useState(true)

  const shareUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/document/${documentId}${isPublic ? "?public=true" : ""}`

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy: ", err)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Document</DialogTitle>
          <DialogDescription>Share this document with others by copying the link below.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            {isPublic ? <Globe className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
            <Label htmlFor="public-toggle">{isPublic ? "Public access" : "Private access"}</Label>
            <Switch id="public-toggle" checked={isPublic} onCheckedChange={setIsPublic} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="share-url">Share link</Label>
            <div className="flex space-x-2">
              <Input id="share-url" value={shareUrl} readOnly className="flex-1" />
              <Button size="sm" onClick={copyToClipboard}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            {isPublic
              ? "Anyone with this link can view and edit the document."
              : "Only people you invite can access this document."}
          </p>

          <div className="space-y-2">
            <Label>Invite collaborators</Label>
            <div className="flex space-x-2">
              <Input placeholder="Enter email address" className="flex-1" />
              <Button size="sm">
                <Users className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Invite people to collaborate on this document</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
