"use client"

import Document from '@tiptap/extension-document'
import Paragraph from '@tiptap/extension-paragraph'
import Text from '@tiptap/extension-text'
import { EditorContent, useEditor } from '@tiptap/react'
import React, { useEffect, useRef, useState } from 'react'
import { WebsocketProvider } from "y-websocket";
import Collaboration from '@tiptap/extension-collaboration'
import * as Y from 'yjs'
import { getUserDocument } from '@/api/document'

enum ConnectionStatus {
  CONNECTING = "connecting",
  CONNECTED = "connected",
  DISCONNECTED = "disconnected",
  ERROR = "error",
}

const documentId = "c0fb163a-29a2-4615-9675-cd73ec7207b9"
const websocketUrl = "ws://localhost:4003"
const currentUserId = "cbd671e8-dba8-4728-84e7-8260d568d703"
const currentUserName = "sujay"
const currentUserColor = "#ff5733"

// Helper function to decode base64 to Uint8Array
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
  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState(
    ConnectionStatus.CONNECTING
  );
  const editorInstanceRef = useRef<any>(null);

  useEffect(() => {
    let provider: WebsocketProvider | null = null;
    let mounted = true;

    const initializeDocument = async () => {
      try {
        // Create a new Y.Doc
        const doc = new Y.Doc();
        ydocRef.current = doc;

        // Fetch document content
        const response = await getUserDocument(documentId);
        
        // Apply content if it exists
        if (response.content) {
          try {
            const uint8Content = base64ToUint8Array(response.content);
            
            // Apply the update to the Y.Doc
            Y.applyUpdate(doc, uint8Content);
            
            // Verify the structure
            const fragment = doc.getXmlFragment('default');
            console.log("Y.Doc structure after applying update:", {
              fragmentLength: fragment.length,
              fragmentType: fragment.constructor.name
            });
            
          } catch (applyError) {
            console.error("Error applying Y.Doc update:", applyError);
            // Initialize with default structure if content is invalid
            const fragment = doc.getXmlFragment('default');
            const paragraph = new Y.XmlElement('paragraph');
            fragment.insert(0, [paragraph]);
            console.log("Initialized with default structure");
          }
        } else {
          // Initialize empty document with proper structure
          const fragment = doc.getXmlFragment('default');
          const paragraph = new Y.XmlElement('paragraph');
          fragment.insert(0, [paragraph]);
          console.log("Initialized empty document");
        }

        if (!mounted) return;

        // Initialize WebSocket provider
        const params = new URLSearchParams({
          userId: currentUserId,
          userName: currentUserName,
          userColor: encodeURIComponent(currentUserColor),
        });
        const wsBaseUrl = `${websocketUrl}/ws/collaboration/${documentId}?${params.toString()}`;
        
        console.log("Connecting to WebSocket:", wsBaseUrl);
  
        // CRITICAL FIX: Don't pass documentId as second parameter
        // This was causing the double room name issue
        provider = new WebsocketProvider(
          wsBaseUrl,
          documentId, // This is the room name
          doc,
          {
            connect: true,
            WebSocketPolyfill: WebSocket,
            resyncInterval: 30000,
            maxBackoffTime: 30000,
            disableBc: false,
          }
        );
        
        providerRef.current = provider;

        provider.on("status", ({ status }: { status: string }) => {
          console.log("Provider status:", status);
          if (mounted) {
            setConnectionStatus(status as ConnectionStatus);
          }
        });
  
        provider.on("connection-close", () => {
          console.log("Connection closed");
          if (mounted) {
            setConnectionStatus(ConnectionStatus.DISCONNECTED);
          }
        });
  
        provider.on("connection-error", (error: Error) => {
          console.error("Connection error:", error);
          if (mounted) {
            setConnectionStatus(ConnectionStatus.ERROR);
            setError("Failed to connect to collaboration server");
          }
        });
  
        provider.on("sync", (isSynced: boolean) => {
          console.log("Provider synced:", isSynced);
          if (mounted && isSynced) {
            setConnectionStatus(ConnectionStatus.CONNECTED);
          }
        });

        if (mounted) {
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Error initializing document:", error);
        if (mounted) {
          setError(error instanceof Error ? error.message : "Failed to initialize document");
          setIsLoading(false);
        }
      }
    };

    initializeDocument();

    // Cleanup
    return () => {
      mounted = false;
      if (provider) {
        provider.destroy();
      }
      if (editorInstanceRef.current) {
        editorInstanceRef.current.destroy();
        editorInstanceRef.current = null;
      }
      if (ydocRef.current) {
        ydocRef.current.destroy();
        ydocRef.current = null;
      }
    };
  }, []);

  const editor = useEditor({
    extensions: [
      Document,
      Paragraph,
      Text,
      Collaboration.configure({
        document: ydocRef.current!,
        field: 'default', // Explicitly set the field name
      }),
    ],
    immediatelyRender: false,
    editable: true,
  });

  useEffect(() => {
    if (editor) {
      editorInstanceRef.current = editor;
    }
  }, [editor]);

  if (isLoading) {
    return (
      <div style={{ padding: '20px' }}>
        <div>Loading editor...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px' }}>
        <div style={{ color: 'red', marginBottom: '10px', padding: '10px', background: '#fee', borderRadius: '4px' }}>
          Error: {error}
        </div>
        {editor && <EditorContent editor={editor} />}
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ 
        marginBottom: '10px', 
        padding: '8px 12px',
        fontSize: '12px', 
        color: '#666',
        background: '#f5f5f5',
        borderRadius: '4px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span>Connection Status: <strong>{connectionStatus}</strong></span>
        <span>{currentUserName}</span>
      </div>
      <div style={{
        border: '1px solid #ddd',
        borderRadius: '4px',
        padding: '16px',
        minHeight: '400px',
        background: 'white'
      }}>
        {editor ? <EditorContent editor={editor} /> : <div>Editor not initialized</div>}
      </div>
    </div>
  );
}