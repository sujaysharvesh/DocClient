"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function RootPage() {
  const router = useRouter()

  useEffect(() => {
    router.push("/home")
  }, [router])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p>Loading editor...</p>
      </div>
    </div>
  )
}
;

import { useState } from "react"
import { CollaborativeEditor } from "@/components/collaborative-editor"
import { ShareModal } from "@/components/share-modal"
import { UsersModal } from "@/components/users-modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
// Add the import for the DownloadModal and FileDown icon
import { FileText, Plus } from "lucide-react"
import { DownloadModal } from "@/components/download-modal"
import { AIGenerateModal } from "@/components/ai-generate-modal"
import { Sparkles } from "lucide-react"

interface User {
  id: string
  name: string
  color: string
  avatar: string
  isOwner?: boolean
  lastSeen?: string
}

interface Document {
  id: string
  title: string
  lastModified: string
}

export function DocumentEditor() {
  const [currentDocument, setCurrentDocument] = useState<string | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [usersModalOpen, setUsersModalOpen] = useState(false)
  // Add a state for the download modal
  const [downloadModalOpen, setDownloadModalOpen] = useState(false)
  const [aiGenerateModalOpen, setAIGenerateModalOpen] = useState(false)
  const [newDocTitle, setNewDocTitle] = useState("")
  const [currentDocumentContent, setCurrentDocumentContent] = useState("")

  // Mock current user
  const currentUser: User = {
    id: "user-1",
    name: "You",
    color: "#3b82f6",
    avatar: "Y",
    isOwner: true,
  }

  // Mock active users
  const [activeUsers, setActiveUsers] = useState<User[]>([
    currentUser,
    {
      id: "user-2",
      name: "Alice Johnson",
      color: "#ef4444",
      avatar: "A",
      lastSeen: "Active now",
    },
    {
      id: "user-3",
      name: "Bob Smith",
      color: "#10b981",
      avatar: "B",
      lastSeen: "2 minutes ago",
    },
  ])

  // Load documents from localStorage
  useEffect(() => {
    const savedDocs = localStorage.getItem("documents")
    if (savedDocs) {
      setDocuments(JSON.parse(savedDocs))
    }
  }, [])

  // Save documents to localStorage
  useEffect(() => {
    localStorage.setItem("documents", JSON.stringify(documents))
  }, [documents])

  // Load current document content
  useEffect(() => {
    if (currentDocument) {
      const content = localStorage.getItem(`document-${currentDocument}`)
      setCurrentDocumentContent(content || "")
    }
  }, [currentDocument])

  const createNewDocument = () => {
    if (!newDocTitle.trim()) return

    const newDoc: Document = {
      id: `doc-${Date.now()}`,
      title: newDocTitle,
      lastModified: new Date().toISOString(),
    }

    setDocuments((prev) => [newDoc, ...prev])
    setCurrentDocument(newDoc.id)
    setNewDocTitle("")
  }

  const openDocument = (docId: string) => {
    setCurrentDocument(docId)
  }

  const handleAIGenerate = (content: string) => {
    if (currentDocument) {
      localStorage.setItem(`document-${currentDocument}`, content)
      setCurrentDocumentContent(content)
      // Force a page refresh to update the editor content
      window.location.reload()
    }
  }

  if (!currentDocument) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Collaborative Document Editor</h1>
            <p className="text-muted-foreground">Create and edit documents with real-time collaboration</p>
          </div>

          {/* Create new document */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Create New Document</CardTitle>
              <CardDescription>Start a new collaborative document</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Document title"
                    value={newDocTitle}
                    onChange={(e) => setNewDocTitle(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && createNewDocument()}
                  />
                  <Button onClick={createNewDocument} disabled={!newDocTitle.trim()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create
                  </Button>
                </div>

                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">or</p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (newDocTitle.trim()) {
                        createNewDocument()
                        setTimeout(() => setAIGenerateModalOpen(true), 100)
                      } else {
                        alert("Please enter a document title first")
                      }
                    }}
                    disabled={!newDocTitle.trim()}
                    className="w-full text-purple-600 border-purple-200 hover:bg-purple-50 dark:text-purple-400 dark:border-purple-800 dark:hover:bg-purple-950"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Create with AI Content
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent documents */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Documents</CardTitle>
              <CardDescription>Your recently edited documents</CardDescription>
            </CardHeader>
            <CardContent>
              {documents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No documents yet. Create your first document above.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent cursor-pointer"
                      onClick={() => openDocument(doc.id)}
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-blue-500" />
                        <div>
                          <h3 className="font-medium">{doc.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            Last modified: {new Date(doc.lastModified).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        Open
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const currentDoc = documents.find((doc) => doc.id === currentDocument)

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Button variant="outline" onClick={() => setCurrentDocument(null)} className="mb-2">
              ← Back to Documents
            </Button>
            <h1 className="text-2xl font-bold">{currentDoc?.title || "Untitled Document"}</h1>
          </div>
        </div>

        <CollaborativeEditor
          documentId={currentDocument}
          currentUser={currentUser}
          activeUsers={activeUsers}
          onShare={() => setShareModalOpen(true)}
          onShowUsers={() => setUsersModalOpen(true)}
          onDownload={() => setDownloadModalOpen(true)}
          onGenerateAI={() => setAIGenerateModalOpen(true)}
        />

        <ShareModal isOpen={shareModalOpen} onClose={() => setShareModalOpen(false)} documentId={currentDocument} />

        <DownloadModal
          isOpen={downloadModalOpen}
          onClose={() => setDownloadModalOpen(false)}
          documentId={currentDocument}
          editorContent={currentDocumentContent}
        />

        <AIGenerateModal
          isOpen={aiGenerateModalOpen}
          onClose={() => setAIGenerateModalOpen(false)}
          documentTitle={currentDoc?.title || "Untitled Document"}
          onGenerate={handleAIGenerate}
        />

        <UsersModal
          isOpen={usersModalOpen}
          onClose={() => setUsersModalOpen(false)}
          activeUsers={activeUsers}
          currentUserId={currentUser.id}
        />
      </div>
    </div>
  )
}
