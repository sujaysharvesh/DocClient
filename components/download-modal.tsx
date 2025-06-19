"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { FileText, Code, FileDown } from "lucide-react"

interface DownloadModalProps {
  isOpen: boolean
  onClose: () => void
  documentId: string
  editorContent?: string
}

export function DownloadModal({ isOpen, onClose, documentId, editorContent }: DownloadModalProps) {
  const exportAsHTML = () => {
    if (!editorContent) return
    const blob = new Blob([editorContent], { type: "text/html" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `document-${documentId}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportAsMarkdown = () => {
    if (!editorContent) return
    // Simple HTML to Markdown conversion (basic)
    const markdown = editorContent
      .replace(/<h1>(.*?)<\/h1>/g, "# $1\n")
      .replace(/<h2>(.*?)<\/h2>/g, "## $1\n")
      .replace(/<h3>(.*?)<\/h3>/g, "### $1\n")
      .replace(/<strong>(.*?)<\/strong>/g, "**$1**")
      .replace(/<em>(.*?)<\/em>/g, "*$1*")
      .replace(/<p>(.*?)<\/p>/g, "$1\n\n")
      .replace(/<br\s*\/?>/g, "\n")
      .replace(/<[^>]*>/g, "")

    const blob = new Blob([markdown], { type: "text/markdown" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `document-${documentId}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportAsPlainText = () => {
    if (!editorContent) return
    // Convert HTML to plain text
    const tempDiv = document.createElement("div")
    tempDiv.innerHTML = editorContent
    const text = tempDiv.textContent || tempDiv.innerText || ""

    const blob = new Blob([text], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `document-${documentId}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Download Document</DialogTitle>
          <DialogDescription>Export your document in different formats</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 py-4">
          <Button onClick={exportAsHTML} className="flex items-center justify-start gap-2">
            <FileText className="h-5 w-5" />
            <div className="text-left">
              <div className="font-medium">HTML Format</div>
              <div className="text-xs text-muted-foreground">Export with all formatting preserved</div>
            </div>
          </Button>

          <Button onClick={exportAsMarkdown} className="flex items-center justify-start gap-2">
            <Code className="h-5 w-5" />
            <div className="text-left">
              <div className="font-medium">Markdown Format</div>
              <div className="text-xs text-muted-foreground">Export as markdown for compatibility</div>
            </div>
          </Button>

          <Button onClick={exportAsPlainText} className="flex items-center justify-start gap-2">
            <FileDown className="h-5 w-5" />
            <div className="text-left">
              <div className="font-medium">Plain Text</div>
              <div className="text-xs text-muted-foreground">Export as simple text without formatting</div>
            </div>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
