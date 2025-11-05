"use client";

import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import { EditorContent, useEditor } from "@tiptap/react";
import React, { useEffect, useRef, useState } from "react";
import { WebsocketProvider } from "y-websocket";
import Collaboration from "@tiptap/extension-collaboration";
import * as Y from "yjs";
import { getUserDocument } from "@/api/document";

enum ConnectionStatus {
  CONNECTING = "connecting",
  CONNECTED = "connected",
  DISCONNECTED = "disconnected",
  ERROR = "error",
}

const documentId = "c0fb163a-29a2-4615-9675-cd73ec7207b9";
const websocketUrl = "ws://localhost:4003";
const currentUserId = "cbd671e8-dba8-4728-84e7-8260d568d703";
const currentUserName = "sujay";
const currentUserColor = "#ff5733";

function base64ToUint8Array(base64: string): Uint8Array {
  try {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  } catch (error) {
    console.error("Error decoding base64:", error);
    throw new Error("Invalid base64 content");
  }
}

export default function CollaborativeEditor() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState(ConnectionStatus.CONNECTING);
  const [editorKey, setEditorKey] = useState(0); // Force re-render key

  // Use state for Y.js objects to ensure reactivity
  const [ydoc, setYdoc] = useState<Y.Doc | null>(null);
  const [provider, setProvider] = useState<WebsocketProvider | null>(null);

  // Initialize everything in one effect
  useEffect(() => {
    let mounted = true;
    let currentProvider: WebsocketProvider | null = null;
    let currentYdoc: Y.Doc | null = null;

    const initialize = async () => {
      try {
        console.log("🔄 Starting initialization...");

        // 1. Create Y.Doc first
        currentYdoc = new Y.Doc();
        console.log("✅ Y.Doc created");

        // 2. Try to load existing content
        try {
          const response = await getUserDocument(documentId);
          if (response?.content) {
            console.log("📥 Loading existing document content");
            const uint8Content = base64ToUint8Array(response.content);
            Y.applyUpdate(currentYdoc, uint8Content);
            console.log("✅ Document content loaded");
          }
        } catch (fetchError) {
          console.log("📄 Starting with new document");
        }

        if (!mounted) return;

        // 3. Create WebSocket provider
        const params = new URLSearchParams({
          userId: currentUserId,
          userName: currentUserName,
          userColor: encodeURIComponent(currentUserColor),
        });

        const wsUrl = `${websocketUrl}?${params.toString()}`;
        console.log("🔌 Connecting to WebSocket...");

        currentProvider = new WebsocketProvider(wsUrl, documentId, currentYdoc, {
          connect: true,
        });

        // 4. Set up event listeners
        currentProvider.on("status", ({ status }: { status: string }) => {
          console.log("📡 WebSocket status:", status);
          if (mounted) {
            setConnectionStatus(status as ConnectionStatus);
          }
        });

        currentProvider.on("sync", (isSynced: boolean) => {
          console.log("🔄 Sync status:", isSynced);
          if (mounted && isSynced) {
            console.log("✅ Fully synced and ready!");
            // Update state to trigger editor creation
            setYdoc(currentYdoc);
            setProvider(currentProvider);
            setIsLoading(false);
          }
        });

        currentProvider.on("connection-error", (error: Error) => {
          console.error("💥 Connection error:", error);
          if (mounted) {
            setConnectionStatus(ConnectionStatus.ERROR);
            setError(error.message);
          }
        });

      } catch (err) {
        console.error("💥 Initialization failed:", err);
        if (mounted) {
          setError(err instanceof Error ? err.message : "Initialization failed");
          setIsLoading(false);
        }
      }
    };

    initialize();

    return () => {
      console.log("🧹 Cleaning up...");
      mounted = false;
      
      if (currentProvider) {
        currentProvider.destroy();
      }
      if (currentYdoc) {
        currentYdoc.destroy();
      }
    };
  }, []);

  // Create editor ONLY when Y.js is ready
  const editor = useEditor({
    extensions: ydoc ? [
      Document,
      Paragraph,
      Text,
      Collaboration.configure({
        document: ydoc,
      }),
    
    ] : [],
    editable: connectionStatus === ConnectionStatus.CONNECTED,
    immediatelyRender: false,
  }, [ydoc, connectionStatus]); // Recreate when ydoc becomes available

  // Debug info
  useEffect(() => {
    console.log("📊 Current state:", {
      isLoading,
      connectionStatus,
      hasYdoc: !!ydoc,
      hasProvider: !!provider,
      hasEditor: !!editor
    });
  }, [isLoading, connectionStatus, ydoc, provider, editor]);

  if (isLoading) {
    return (
      <div style={{ padding: "20px", fontFamily: "system-ui, sans-serif" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "12px",
            background: "#f0f9ff",
            borderRadius: "6px",
            border: "1px solid #0ea5e9",
          }}
        >
          <div
            style={{
              width: "20px",
              height: "20px",
              border: "3px solid #0ea5e9",
              borderTopColor: "transparent",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
            }}
          />
          <span>Setting up collaborative editor...</span>
        </div>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "20px", fontFamily: "system-ui, sans-serif" }}>
        <div
          style={{
            color: "#991b1b",
            marginBottom: "15px",
            padding: "12px",
            background: "#fee2e2",
            borderRadius: "6px",
            border: "1px solid #dc2626",
          }}
        >
          <strong>Error:</strong> {error}
        </div>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: "8px 16px",
            background: "#3b82f6",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "20px",
        fontFamily: "system-ui, sans-serif",
        maxWidth: "900px",
        margin: "0 auto",
      }}
    >
      <div
        style={{
          marginBottom: "15px",
          padding: "12px 16px",
          fontSize: "14px",
          background: "#f9fafb",
          borderRadius: "6px",
          border: "1px solid #e5e7eb",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              color: connectionStatus === ConnectionStatus.CONNECTED ? "#10b981" : 
                     connectionStatus === ConnectionStatus.CONNECTING ? "#f59e0b" : "#ef4444",
              fontSize: "16px",
            }}
          >
            {connectionStatus === ConnectionStatus.CONNECTED ? "●" : 
             connectionStatus === ConnectionStatus.CONNECTING ? "◐" : "○"}
          </span>
          <span style={{ color: "#374151" }}>
            <strong>Status:</strong> {connectionStatus}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span
            style={{
              padding: "4px 8px",
              background: currentUserColor,
              color: "white",
              borderRadius: "4px",
              fontSize: "12px",
              fontWeight: "500",
            }}
          >
            {currentUserName}
          </span>
        </div>
      </div>

      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: "6px",
          padding: "20px",
          minHeight: "500px",
          background: "white",
          boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.1)",
        }}
      >
        {editor ? (
          <EditorContent editor={editor} />
        ) : (
          <div
            style={{
              color: "#6b7280",
              textAlign: "center",
              paddingTop: "40px",
            }}
          >
            Editor is initializing...
          </div>
        )}
      </div>
    </div>
  );
}