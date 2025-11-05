"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { CollaborativeEditor } from "@/components/collaborative-editor";
import { ShareModal } from "@/components/share-modal";
import { UsersModal } from "@/components/users-modal";
import { DownloadModal } from "@/components/download-modal";
import { AIGenerateModal } from "@/components/ai-generate-modal";
import { Button } from "@/components/ui/button";
import { User } from "@/interface/user";
import { getCurrentUser } from "@/api/user";
import { getUserDocument } from "@/api/document";
import { Document } from "@/interface/document";

const getRandomColor = (): string => {
  const colors = [
    "#ef4444",
    "#f97316",
    "#eab308",
    "#22c55e",
    "#06b6d4",
    "#3b82f6",
    "#8b5cf6",
    "#ec4899",
    "#10b981",
    "#f59e0b",
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

const getInitials = (name: string): string => {
  if (!name) return "";
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);
};

export default function DocumentEditorPage() {
  const router = useRouter();
  const params = useParams();
  const documentId = params.documentId as string;

  const [currentDocument, setCurrentDocument] = useState<Document | null>(null);
  const [documentContent, setDocumentContent] = useState<Uint8Array>(
    new Uint8Array()
  );
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeUsers, setActiveUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [usersModalOpen, setUsersModalOpen] = useState(false);
  const [downloadModalOpen, setDownloadModalOpen] = useState(false);
  const [aiGenerateModalOpen, setAIGenerateModalOpen] = useState(false);

  useEffect(() => {
    const initializeEditor = async () => {
      try {
        setLoading(true);

        // Fetch current user
        const user = await getCurrentUser();
        if (!user) {
          setError("Authentication required");
          return;
        }
        setCurrentUser(user);

        // Mock additional active users
        const mockUsers: User[] = [
          {
            ...user,
          },
          {
            id: "user-2",
            name: "Alice Johnson",
            color: getRandomColor(),
            avatar: getInitials("Alice Johnson"),
            isOwner: false,
            lastSeen: "Active now",
          },
          {
            id: "user-3",
            name: "Bob Smith",
            color: getRandomColor(),
            avatar: getInitials("Bob Smith"),
            isOwner: false,
            lastSeen: "2 minutes ago",
          },
        ];
        setActiveUsers(mockUsers);

        const documentData = await getUserDocument(documentId);
        // const doc = documents.find((d) => d.id === documentId);

        if (!documentData) {
          setError("Document not found");
          return;
        }
        setCurrentDocument(documentData);

        try {
          const byteContent = documentData.content
            ? new Uint8Array(documentData.content)
            : new Uint8Array();

          //   const content = await getDocumentContent(documentId);
          //   const safeContent = content || "";
          setDocumentContent(byteContent);
          // Cache content in localStorage
          if (byteContent) {
            localStorage.setItem(`document-${documentId}`, byteContent);
          }
        } catch (err) {
          // Fallback to localStorage if API fails
          const cachedContent = localStorage.getItem(`document-${documentId}`);
          if (cachedContent) {
            setDocumentContent(cachedContent);
            console.log("Loaded content from localStorage as fallback");
          }
        }
      } catch (err: any) {
        if (err.response?.status === 401) {
          setError("Please log in to continue");
        } else {
          setError("Failed to load document");
        }
        console.error("Error initializing editor:", err);
      } finally {
        setLoading(false);
      }
    };

    if (documentId) {
      initializeEditor();
    }
  }, [documentId]);

  const handleAIGenerate = (content: string) => {
    if (documentId) {
      localStorage.setItem(`document-${documentId}`, content);
      setDocumentContent(content);
      window.location.reload();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading editor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={() => router.push("/documents")}>
            Back to Documents
          </Button>
        </div>
      </div>
    );
  }

  //   if (!currentUser || !currentDocument) {
  //     return null;
  //   }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Button
              variant="outline"
              onClick={() => router.push("/documents")}
              className="mb-2"
            >
              ← Back to Documents
            </Button>
            <h1 className="text-2xl font-bold">
              {currentDocument?.title || "Untitled Document"}
            </h1>
          </div>
        </div>

        <CollaborativeEditor
          documentId={documentId}
          currentUser={currentUser}
          activeUsers={activeUsers}
          onShare={() => setShareModalOpen(true)}
          onShowUsers={() => setUsersModalOpen(true)}
          onDownload={() => setDownloadModalOpen(true)}
          onGenerateAI={() => setAIGenerateModalOpen(true)}
        />

        <ShareModal
          isOpen={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
          documentId={documentId}
        />

        <DownloadModal
          isOpen={downloadModalOpen}
          onClose={() => setDownloadModalOpen(false)}
          documentId={documentId}
          editorContent={documentContent}
        />

        <AIGenerateModal
          isOpen={aiGenerateModalOpen}
          onClose={() => setAIGenerateModalOpen(false)}
          documentTitle={currentDocument?.title || "Untitled Document"}
          onGenerate={handleAIGenerate}
        />

        <UsersModal
          isOpen={usersModalOpen}
          onClose={() => setUsersModalOpen(false)}
          activeUsers={activeUsers}
          currentUserId={currentUser?.id}
        />
      </div>
    </div>
  );
}
