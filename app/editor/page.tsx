"use client";

import { useState, useEffect } from "react";
import { CollaborativeEditor } from "@/components/collaborative-editor";
import { ShareModal } from "@/components/share-modal";
import { UsersModal } from "@/components/users-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FileText, Plus } from "lucide-react";
import { DownloadModal } from "@/components/download-modal";
import { AIGenerateModal } from "@/components/ai-generate-modal";
import { Sparkles } from "lucide-react";
import * as dotenv from "dotenv";
import axios from "axios";

interface User {
  id: string;
  name: string;
  color: string;
  avatar: string;
  isOwner?: boolean;
  lastSeen?: string;
}

interface Document {
  id: string;
  title: string;
  lastModified: string;
}

interface DocumentContent {
  content: byte[],
  updated_at: string
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
  error?: string;
}

interface UserData {
  id: string;
  username: string;
  email: string;
}

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
    "#6366f1",
    "#84cc16",
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

export default function EditorPage() {
  const [currentDocument, setCurrentDocument] = useState<string | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [usersModalOpen, setUsersModalOpen] = useState(false);
  const [downloadModalOpen, setDownloadModalOpen] = useState(false);
  const [aiGenerateModalOpen, setAIGenerateModalOpen] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState("");
  const [currentDocumentContent, setCurrentDocumentContent] = useState("");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeUsers, setActiveUsers] = useState<User[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

  const getCsrfToken = async (): Promise<string> => {
    try {
      const response = await fetch(`${baseUrl}/api/v1/auth/csrf`, {
        method: "GET",
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        return data.Token.token || "";
      } else {
        console.warn("Failed to get CSRF token:", response.status);
        return "";
      }
    } catch (err) {
      console.error("Error getting CSRF token:", err);
      return "";
    }
  };

  const fetchCurrentUser = async (): Promise<User | null> => {
    try {
      const csrfToken = await getCsrfToken();

      const response = await axios.get<ApiResponse<UserData>>(
        `${baseUrl}/api/v1/auth/me`,
        {
          headers: {
            "Content-Type": "application/json",
            "X-XSRF-TOKEN": csrfToken,
          },
          withCredentials: true,
        }
      );

      const apiResponse = response.data;
      const userData = apiResponse.data;

      const user: User = {
        id: userData.id,
        name: userData.username,
        color: getRandomColor(),
        avatar: getInitials(userData.username),
        isOwner: true,
        lastSeen: "Active Now",
      };
      return user;
    } catch (err: any) {
      if (err.response?.status === 401) {
        setAuthError("Please log in to continue");
      } else if (err.response?.status === 403) {
        setAuthError("Access forbidden. Please check your permissions.");
      } else {
        setAuthError("Authentication failed");
      }
      console.error("Authentication error:", err);
      return null;
    }
  };

  // Mock active users
  useEffect(() => {
    const initializeUser = async () => {
      setLoading(true);
      const user = await fetchCurrentUser();

      if (user) {
        setCurrentUser(user);

        // Mock additional active users
        const mockUsers: User[] = [
          user, // Current user
          {
            id: "user-2",
            name: "Alice Johnson",
            color: getRandomColor(),
            avatar: getInitials("Alice Johnson"),
            lastSeen: "Active now",
          },
          {
            id: "user-3",
            name: "Bob Smith",
            color: getRandomColor(),
            avatar: getInitials("Bob Smith"),
            lastSeen: "2 minutes ago",
          },
        ];

        setActiveUsers(mockUsers);
      }
      setLoading(false);
    };

    initializeUser();
  }, []);

  const getUserDocuments = async (): Promise<Document[]> => {
    try {
      const xsrfToken = await getCsrfToken();
      const response = await axios.get<ApiResponse<Document[]>>(
        `${baseUrl}/api/v1/document/all`,
        {
          headers: {
            "Content-Type": "application/json",
            "X-XSRF-TOKEN": xsrfToken,
          },
          withCredentials: true,
        }
      );
      const apiResponse = response.data;
      if (apiResponse.success && apiResponse.data) {
        return apiResponse.data;
      }
    } catch (err: any) {
      console.log("Something went wrong while fetching user documents", err);
      if (err.response?.status === 401) {
        setAuthError("Authentication required to fetch documents");
      } else if (err.response?.status === 403) {
        setAuthError("Access forbidden. Please check your permissions.");
      } else if (err.response?.status === 404) {
        console.log("No documents found for user");
        return [];
      } else {
        console.error(
          "Failed to fetch documents:",
          err.response?.data?.message || err.message
        );
      }
      return [];
    }
    return [];
  };

  const getDocumentContent = async (documentId: String): Promise<string> => {
    try {
      const xsrfToken = await getCsrfToken();
      const response = await axios.get<ApiResponse<{ content: string }>>(
        `${baseUrl}/api/v1/document/${documentId}`, { 
          headers: {
            "Content-Type": "application/json",
            "X-XSRF-TOKEN": xsrfToken,
          },
          withCredentials: true,
        });
      const apiResponse = response.data;
      console.log("Document Content:", apiResponse)
      if (apiResponse.success && apiResponse.data) {
        return apiResponse.data.content;
      }
      return "";
    } catch (err) {
      console.error("Failed to fetch document content:", err);
      if (err.response?.status === 401) {
        setAuthError("Authentication required to fetch document content");
      } else if (err.response?.status === 403) {
        setAuthError("Access forbidden. Please check your permissions.");
      } else if (err.response?.status === 404) {
        console.log("Document content not found");
      }
      return "";
    }
  };
  // Load documents
  useEffect(() => {
    const loadDocument = async () => {
      if (currentUser) {
        try {
          const userDocument = await getUserDocuments();
          setDocuments(userDocument);
        } catch (err) {
          console.error("Failed to load documents:", err);
        }
      }
    };
    loadDocument();
  }, [currentUser]);

  // Save documents to localStorage
  useEffect(() => {
    localStorage.setItem("documents", JSON.stringify(documents));
  }, [documents]);

  const openDocument = async (docId: string) => {
    setCurrentDocument(docId);

    try {
       const content = await getDocumentContent(docId);
       console.log("Document conente", content)
       setCurrentDocumentContent(content)

       if(content) {
        localStorage.setItem(`document-${docId}`, content);
       }
    } catch(err) {
      console.error("Failed to load document content:", err);
      const savedContent = localStorage.getItem(`document-${docId}`);
    if (savedContent) {
      setCurrentDocumentContent(savedContent);
      console.log("Loaded content from localStorage as fallback");
    }
    }
  };

  // Load current document content
  useEffect(() => {
    const loadDocumentContent = async () => {
      if (currentDocument) {
        const content = await getDocumentContent(currentDocument);

        if(content) {
          setCurrentDocumentContent(content)
        } else {
          const content = localStorage.getItem(`document-${currentDocument}`);
           setCurrentDocumentContent(content || "");
        }
      } 
    };
    loadDocumentContent();
  }, [currentDocument]);

  const createNewDocument = () => {
    if (!newDocTitle.trim()) return;

    const newDoc: Document = {
      id: `doc-${Date.now()}`,
      title: newDocTitle,
      lastModified: new Date().toISOString(),
    };

    setDocuments((prev) => [newDoc, ...prev]);
    setCurrentDocument(newDoc.id);
    setNewDocTitle("");
  };

  const handleAIGenerate = (content: string) => {
    if (currentDocument) {
      localStorage.setItem(`document-${currentDocument}`, content);
      setCurrentDocumentContent(content);
      // Force a page refresh to update the editor content
      window.location.reload();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!currentDocument) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">
              Collaborative Document Editor
            </h1>
            <p className="text-muted-foreground">
              Welcome, {currentUser?.name}! Create and edit documents with
              real-time collaboration
            </p>
          </div>

          {/* Create new document */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Create New Document</CardTitle>
              <CardDescription>
                Start a new collaborative document
              </CardDescription>
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
                  <Button
                    onClick={createNewDocument}
                    disabled={!newDocTitle.trim()}
                  >
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
                        createNewDocument();
                        setTimeout(() => setAIGenerateModalOpen(true), 100);
                      } else {
                        alert("Please enter a document title first");
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
                  {documents.map((doc, id) => (
                    <div
                      key={id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent cursor-pointer"
                      onClick={() => openDocument(doc.id)}
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-blue-500" />
                        <div>
                          <h3 className="font-medium">{doc.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            Last modified:{" "}
                            {new Date(doc.lastModified).toLocaleDateString()}
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
    );
  }

  const currentDoc = documents.find((doc) => doc.id === currentDocument);
  // In your EditorPage component, before the return statement with CollaborativeEditor:
  if (!currentUser || !activeUsers) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading editor...</p>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Button
              variant="outline"
              onClick={() => setCurrentDocument(null)}
              className="mb-2"
            >
              ← Back to Documents
            </Button>
            <h1 className="text-2xl font-bold">
              {currentDoc?.title || "Untitled Document"}
            </h1>
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

        <ShareModal
          isOpen={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
          documentId={currentDocument}
        />

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
          currentUserId={currentUser?.id}
        />
      </div>
    </div>
  );
}
