"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { User } from "@/interface/user";
import { getCurrentUser } from "@/api/user";
import { createDocument, getUserDocuments } from "@/api/document";
import { Document } from "@/interface/document";

export default function DocumentsPage() {
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [newDocTitle, setNewDocTitle] = useState("");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializePage = async () => {
      try {
        setLoading(true);
        const user = await getCurrentUser();
        setCurrentUser(user);

        if (user) {
          const userDocs = await getUserDocuments();
          setDocuments(userDocs);
        }
      } catch (err: any) {
        if (err.response?.status === 401) {
          setError("Please log in to continue");
        } else {
          setError("Failed to load documents");
        }
      } finally {
        setLoading(false);
      }
    };

    initializePage();
  }, []);

  const handleCreateDocument = async () => {
    if (!newDocTitle.trim()) return;

    try {
      const responseData = await createDocument(newDocTitle);
      const newDoc: Document = {
        id: responseData.data.id,
        title: newDocTitle,
        content: responseData.data.content
        // lastModified: new Date().toISOString(),
      };
      
      setDocuments((prev) => [newDoc, ...prev]);
      setNewDocTitle("");
      
      // Open in new tab
      window.open(`/documents/${responseData.documentId}`, '_blank');
    } catch (err) {
      console.error("Failed to create document:", err);
      alert("Failed to create document. Please try again.");
    }
  };

  const handleOpenDocument = (docId: string) => {

    window.open(`/documents/${docId}`, '_blank');

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

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

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
            <div className="flex gap-2">
              <Input
                placeholder="Document title"
                value={newDocTitle}
                onChange={(e) => setNewDocTitle(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleCreateDocument()}
              />
              <Button
                onClick={handleCreateDocument}
                disabled={!newDocTitle.trim()}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create
              </Button>
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
                    onClick={() => handleOpenDocument(doc.id)}
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-blue-500" />
                      <div>
                        <h3 className="font-medium">{doc.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          Last modified:{" "}
                          {/* {new Date(doc.lastModified).toLocaleDateString()} */}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDocument(doc.id);
                        }}
                      >
                        Open
                      </Button>
                    </div>
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
