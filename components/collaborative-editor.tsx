"use client";

import type React from "react";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";
import Document from '@tiptap/extension-document'
import Paragraph from '@tiptap/extension-paragraph'
import Text from '@tiptap/extension-text'
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import TextStyle from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import History from "@tiptap/extension-history";
import * as Y from "yjs";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
import Highlight from "@tiptap/extension-highlight";
import { WebsocketProvider } from "y-websocket";
import { createLowlight } from "lowlight";
import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useTheme } from "next-themes";
import {
  Bold,
  Italic,
  UnderlineIcon,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  Share,
  Users,
  ImageIcon,
  Code,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Highlighter,
  Moon,
  Sun,
  FileDown,
  Sparkles,
  Wifi,
  WifiOff,
} from "lucide-react";

// Configure lowlight for code highlighting
import javascript from "highlight.js/lib/languages/javascript";
import typescript from "highlight.js/lib/languages/typescript";
import python from "highlight.js/lib/languages/python";
import css from "highlight.js/lib/languages/css";
import html from "highlight.js/lib/languages/xml";

// Create lowlight instance
const lowlight = createLowlight();

// Register languages
lowlight.register("javascript", javascript);
lowlight.register("typescript", typescript);
lowlight.register("python", python);
lowlight.register("css", css);
lowlight.register("html", html);

interface User {
  id: string;
  name: string;
  color: string;
  avatar: string;
}

interface CollaborativeEditorProps {
  documentId: string;
  currentUser: User;
  onShare: () => void;
  onShowUsers: () => void;
  onDownload: () => void;
  onGenerateAI: () => void;
  activeUsers: User[];
  websocketUrl?: string;
}

// WebSocket connection status
enum ConnectionStatus {
  CONNECTING = "connecting",
  CONNECTED = "connected",
  DISCONNECTED = "disconnected",
  ERROR = "error",
}

export function CollaborativeEditor({
  documentId,
  currentUser,
  onShare,
  onShowUsers,
  onDownload,
  onGenerateAI,
  activeUsers,
  websocketUrl = "ws://localhost:4003",
}: CollaborativeEditorProps) {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(
    ConnectionStatus.CONNECTING
  );
  const [onlineUsers, setOnlineUsers] = useState<User[]>([currentUser]);
  const [isEditorReady, setIsEditorReady] = useState(false);
  const { theme, setTheme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Yjs document and provider refs
  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const undoManagerRef = useRef<Y.UndoManager | null>(null);

  // Memoize current user values to prevent unnecessary re-renders
  const currentUserId = useMemo(() => currentUser.id, [currentUser.id]);
  const currentUserName = useMemo(() => currentUser.name, [currentUser.name]);
  const currentUserColor = useMemo(() => currentUser.color, [currentUser.color]);
  const currentUserAvatar = useMemo(() => currentUser.avatar, [currentUser.avatar]);

  // Initialize Yjs document and WebSocket provider
  useEffect(() => {
    console.log(`Initializing collaboration for document: ${documentId}`);

    // Clean up existing connections first
    if (providerRef.current) {
      console.log("Cleaning up existing provider");
      providerRef.current.disconnect();
      providerRef.current.destroy();
      providerRef.current = null;
    }
    
    if (ydocRef.current) {
      console.log("Cleaning up existing ydoc");
      ydocRef.current.destroy();
      ydocRef.current = null;
    }

    if (undoManagerRef.current) {
      undoManagerRef.current.destroy();
      undoManagerRef.current = null;
    }

    // Reset editor ready state
    setIsEditorReady(false);

    // Create new Yjs document
    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;
    console.log("Created new Y.Doc");

    // Create undo manager for the shared text
    const yText = ydoc.getText('default');
    const undoManager = new Y.UndoManager(yText);
    undoManagerRef.current = undoManager;
    console.log("Created undo manager");

    // Build WebSocket URL with user parameters
    const params = new URLSearchParams({
      userId: currentUserId,
      userName: currentUserName,
      userColor: encodeURIComponent(currentUserColor),
    });

    const wsUrl = `${websocketUrl}/ws/collaboration/${documentId}?${params.toString()}`;
    console.log("WebSocket URL:", wsUrl);

    // Create WebSocket provider
    const provider = new WebsocketProvider(wsUrl, documentId, ydoc, {
      connect: false,
      WebSocketPolyfill: WebSocket,
      resyncInterval: 30000,
      maxBackoffTime: 30000,
      disableBc: false,
    });

    providerRef.current = provider;
    console.log("Created WebSocket provider");

    // Set user metadata in awareness
    provider.awareness.setLocalStateField("user", {
      id: currentUserId,
      name: currentUserName,
      color: currentUserColor,
      avatar: currentUserAvatar,
    });

    // Connection status handlers
    provider.on("status", (event: { status: string }) => {
      console.log("WebSocket status changed:", event.status);
      switch (event.status) {
        case "connecting":
          setConnectionStatus(ConnectionStatus.CONNECTING);
          break;
        case "connected":
          setConnectionStatus(ConnectionStatus.CONNECTED);
          break;
        case "disconnected":
          setConnectionStatus(ConnectionStatus.DISCONNECTED);
          break;
        default:
          setConnectionStatus(ConnectionStatus.ERROR);
      }
    });

    // Handle connection events
    provider.on("connection-close", (event: any) => {
      console.log("WebSocket connection closed:", event);
      setConnectionStatus(ConnectionStatus.DISCONNECTED);
    });

    provider.on("connection-error", (error: any) => {
      console.error("WebSocket connection error:", error);
      setConnectionStatus(ConnectionStatus.ERROR);
    });

    // Handle sync events - CRITICAL for editor readiness
    provider.on("sync", (isSynced: boolean) => {
      console.log("Document sync status changed:", isSynced);
      if (isSynced) {
        setConnectionStatus(ConnectionStatus.CONNECTED);
        // Delay setting editor ready to ensure sync is complete
        setTimeout(() => {
          console.log("Setting editor ready to true");
          setIsEditorReady(true);
        }, 100);
      }
    });

    // Handle awareness updates (other users)
    provider.awareness.on("change", () => {
      const states = Array.from(provider.awareness.getStates().entries());
      const users: User[] = states
        .filter(
          ([clientId, state]) =>
            state.user && clientId !== provider.awareness.clientID
        )
        .map(([clientId, state]) => ({
          id: state.user.id || clientId.toString(),
          name: state.user.name || `User ${clientId}`,
          color: state.user.color || "#000000",
          avatar: state.user.avatar || state.user.name?.[0] || "U",
        }));

      setOnlineUsers([{
        id: currentUserId,
        name: currentUserName,
        color: currentUserColor,
        avatar: currentUserAvatar
      }, ...users]);
      console.log("Online users updated:", users.length + 1);
    });

    // Add Yjs document change listener for debugging
    yText.observe((event) => {
      console.log("Yjs text changed:", {
        length: yText.length,
        content: yText.toString().substring(0, 100) + (yText.length > 100 ? '...' : ''),
        delta: event.delta
      });
    });

    // Start connection
    console.log("Starting WebSocket connection...");
    provider.connect();

    // Cleanup on unmount
    return () => {
      console.log("Cleaning up collaboration effect");
      if (providerRef.current) {
        providerRef.current.disconnect();
        providerRef.current.destroy();
      }
      if (ydocRef.current) {
        ydocRef.current.destroy();
      }
      if (undoManagerRef.current) {
        undoManagerRef.current.destroy();
        undoManagerRef.current = null;
      }
    };
  }, [documentId, currentUserId, currentUserName, currentUserColor, currentUserAvatar, websocketUrl]);

  // Create extensions with proper dependency tracking
  const extensions = useMemo(() => {
    console.log("Creating editor extensions, isEditorReady:", isEditorReady);
    
    const baseExtensions: any[] = [
      StarterKit.configure({ 
        codeBlock: false, 
        history: false, // Disable built-in history since we're using Yjs undo manager
        document: false, // We'll use our own document extension
        paragraph: false, // We'll use our own paragraph extension  
        text: false, // We'll use our own text extension
      }),
      Document,
      Paragraph,
      Text,
      Placeholder.configure({ placeholder: "Start typing your document..." }),
      Image.configure({ HTMLAttributes: { class: "max-w-full h-auto rounded-lg" } }),
      CodeBlockLowlight.configure({ lowlight, defaultLanguage: "javascript" }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
    ];
    
    // Only add collaboration extensions when everything is ready
    if (ydocRef.current && providerRef.current && isEditorReady) {
      console.log("Adding collaboration extensions");
      baseExtensions.push(
        Collaboration.configure({ 
          document: ydocRef.current,
          field: 'default',
        }),
        CollaborationCursor.configure({
          provider: providerRef.current,
          user: { 
            name: currentUserName, 
            color: currentUserColor 
          },
        })
      );
    } else {
      console.log("Collaboration not ready yet:", {
        hasYdoc: !!ydocRef.current,
        hasProvider: !!providerRef.current,
        isEditorReady
      });
    }

    return baseExtensions;
  }, [currentUserName, currentUserColor, isEditorReady]);
  
  const editor = useEditor({
    extensions,
    editable: true,
    onUpdate: ({ editor }) => {
      console.log("Editor content updated");
      
      // Update awareness with last edit timestamp
      if (providerRef.current) {
        providerRef.current.awareness.setLocalStateField(
          "lastEdit",
          Date.now()
        );
      }
    },
    onCreate: ({ editor }) => {
      console.log("Editor created successfully");
      
      // Force a content check after editor creation
      setTimeout(() => {
        if (ydocRef.current) {
          const yText = ydocRef.current.getText('default');
          const existingContent = yText.toString();
          
          console.log("Checking for existing content:", {
            yTextLength: yText.length,
            content: existingContent.substring(0, 200),
            editorHTML: editor.getHTML()
          });
          
          // If there's content in Yjs but not in editor, try to sync
          if (existingContent && existingContent.length > 0 && editor.getHTML() === '<p></p>') {
            console.log("Found desync, attempting to refresh editor content");
            // Force editor to re-read from Yjs
            editor.commands.focus();
          }
        }
      }, 500);
    },
    onDestroy: () => {
      console.log("Editor destroyed");
    }
  }, [extensions]);

  // Editor event logging and awareness updates
  useEffect(() => {
    if (!editor) return;

    const logEditorEvent = (event: string) => {
      console.log(`Editor Event: ${event}`, {
        time: new Date().toISOString(),
        documentId,
        userId: currentUserId,
        connectionStatus,
      });
    };

    editor.on("focus", () => {
      logEditorEvent("focus");
      if (providerRef.current) {
        providerRef.current.awareness.setLocalStateField("focused", true);
      }
    });

    editor.on("blur", () => {
      logEditorEvent("blur");
      if (providerRef.current) {
        providerRef.current.awareness.setLocalStateField("focused", false);
      }
    });

    editor.on("selectionUpdate", () => {
      const selection = editor.state.selection;
      if (providerRef.current) {
        providerRef.current.awareness.setLocalStateField("cursor", {
          from: selection.from,
          to: selection.to,
        });
      }
    });

    return () => {
      editor.off("focus");
      editor.off("blur");
      editor.off("selectionUpdate");
    };
  }, [editor, documentId, currentUserId, connectionStatus]);

  // Reconnection logic
  const handleReconnect = useCallback(() => {
    if (providerRef.current) {
      console.log("Attempting to reconnect...");
      setConnectionStatus(ConnectionStatus.CONNECTING);
      providerRef.current.connect();
    }
  }, []);

  // Enhanced debug function
  const debugContent = useCallback(() => {
    if (editor && ydocRef.current) {
      console.group("=== COLLABORATIVE EDITOR DEBUG ===");
      
      // Editor state
      console.log("Editor HTML:", editor.getHTML());
      console.log("Editor JSON:", JSON.stringify(editor.getJSON(), null, 2));
      console.log("Editor is editable:", editor.isEditable);
      console.log("Editor is focused:", editor.isFocused);
      
      // Connection state
      console.log("Connection Status:", connectionStatus);
      console.log("Editor Ready:", isEditorReady);
      console.log("Online Users:", onlineUsers.length);
      
      // Yjs document state
      const yText = ydocRef.current.getText('default');
      console.log("Yjs Text Content:", yText.toString());
      console.log("Yjs Text Length:", yText.length);
      console.log("Yjs Document clientID:", ydocRef.current.clientID);
      
      // Provider state
      if (providerRef.current) {
        console.log("Provider connected:", providerRef.current.wsconnected);
        console.log("Provider synced:", providerRef.current.synced);
        console.log("Provider URL:", providerRef.current.url);
        console.log("Awareness states:", providerRef.current.awareness.getStates().size);
      }
      
      // Extension state
      console.log("Collaboration extension active:", editor.extensionManager.extensions.find(ext => ext.name === 'collaboration'));
      
      console.groupEnd();
    }
  }, [editor, connectionStatus, onlineUsers, isEditorReady]);

  // Force sync function for troubleshooting
  const forceSync = useCallback(() => {
    if (providerRef.current && ydocRef.current) {
      console.log("Forcing synchronization...");
      
      // Disconnect and reconnect
      providerRef.current.disconnect();
      setTimeout(() => {
        providerRef.current?.connect();
      }, 100);
    }
  }, []);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && editor) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const src = e.target?.result as string;
        editor.chain().focus().setImage({ src }).run();
      };
      reader.readAsDataURL(file);
    }
  };

  const addImage = () => {
    fileInputRef.current?.click();
  };

  // Connection status indicator
  const getConnectionIcon = () => {
    switch (connectionStatus) {
      case ConnectionStatus.CONNECTED:
        return <Wifi className="h-4 w-4 text-green-500" />;
      case ConnectionStatus.CONNECTING:
        return <Wifi className="h-4 w-4 text-yellow-500 animate-pulse" />;
      default:
        return <WifiOff className="h-4 w-4 text-red-500" />;
    }
  };

  const getConnectionText = () => {
    switch (connectionStatus) {
      case ConnectionStatus.CONNECTED:
        return "Connected";
      case ConnectionStatus.CONNECTING:
        return "Connecting...";
      case ConnectionStatus.DISCONNECTED:
        return "Disconnected";
      case ConnectionStatus.ERROR:
        return "Connection Error";
      default:
        return "Unknown";
    }
  };

  if (!editor) {
    return (
      <div className="w-full max-w-5xl mx-auto p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
        <p>Loading collaborative editor...</p>
        <p className="text-sm text-muted-foreground mt-2">
          Connection Status: {getConnectionText()}
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Editor Ready: {isEditorReady ? "Yes" : "No"}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* Enhanced Connection Status Bar */}
      <div className="mb-2 flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          {getConnectionIcon()}
          <span
            className={`font-medium ${
              connectionStatus === ConnectionStatus.CONNECTED
                ? "text-green-600"
                : connectionStatus === ConnectionStatus.CONNECTING
                ? "text-yellow-600"
                : "text-red-600"
            }`}
          >
            {getConnectionText()}
          </span>
          <span className="text-muted-foreground">
            | Ready: {isEditorReady ? "✓" : "✗"}
          </span>
          {connectionStatus === ConnectionStatus.DISCONNECTED && (
            <Button variant="outline" size="sm" onClick={handleReconnect}>
              Reconnect
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={forceSync}>
            Force Sync
          </Button>
          <Button variant="ghost" size="sm" onClick={debugContent}>
            Debug Info
          </Button>
        </div>
      </div>

      {/* Enhanced Toolbar */}
      <Card className="p-3 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          {/* Theme Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>

          {/* AI Generate Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={onGenerateAI}
            className="text-purple-600 border-purple-200 hover:bg-purple-50 dark:text-purple-400 dark:border-purple-800 dark:hover:bg-purple-950"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            AI Generate
          </Button>

          <Separator orientation="vertical" className="h-6" />

          {/* Headings */}
          <Select
            value={
              editor.isActive("heading", { level: 1 })
                ? "h1"
                : editor.isActive("heading", { level: 2 })
                ? "h2"
                : editor.isActive("heading", { level: 3 })
                ? "h3"
                : "paragraph"
            }
            onValueChange={(value) => {
              if (value === "paragraph") {
                editor.chain().focus().setParagraph().run();
              } else {
                const level = Number.parseInt(value.replace("h", "")) as
                  | 1
                  | 2
                  | 3;
                editor.chain().focus().toggleHeading({ level }).run();
              }
            }}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="paragraph">Paragraph</SelectItem>
              <SelectItem value="h1">Heading 1</SelectItem>
              <SelectItem value="h2">Heading 2</SelectItem>
              <SelectItem value="h3">Heading 3</SelectItem>
            </SelectContent>
          </Select>

          <Separator orientation="vertical" className="h-6" />

          {/* Text Formatting */}
          <Button
            variant={editor.isActive("bold") ? "default" : "outline"}
            size="sm"
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            variant={editor.isActive("italic") ? "default" : "outline"}
            size="sm"
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button
            variant={editor.isActive("underline") ? "default" : "outline"}
            size="sm"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          >
            <UnderlineIcon className="h-4 w-4" />
          </Button>

          {/* Text Color */}
          <input
            type="color"
            className="w-8 h-8 rounded border cursor-pointer"
            onChange={(e) =>
              editor.chain().focus().setColor(e.target.value).run()
            }
            title="Text Color"
          />

          {/* Highlight */}
          <Button
            variant={editor.isActive("highlight") ? "default" : "outline"}
            size="sm"
            onClick={() => editor.chain().focus().toggleHighlight().run()}
          >
            <Highlighter className="h-4 w-4" />
          </Button>

          <Separator orientation="vertical" className="h-6" />

          {/* Text Alignment */}
          <Button
            variant={
              editor.isActive({ textAlign: "left" }) ? "default" : "outline"
            }
            size="sm"
            onClick={() => editor.chain().focus().setTextAlign("left").run()}
          >
            <AlignLeft className="h-4 w-4" />
          </Button>
          <Button
            variant={
              editor.isActive({ textAlign: "center" }) ? "default" : "outline"
            }
            size="sm"
            onClick={() => editor.chain().focus().setTextAlign("center").run()}
          >
            <AlignCenter className="h-4 w-4" />
          </Button>
          <Button
            variant={
              editor.isActive({ textAlign: "right" }) ? "default" : "outline"
            }
            size="sm"
            onClick={() => editor.chain().focus().setTextAlign("right").run()}
          >
            <AlignRight className="h-4 w-4" />
          </Button>
          <Button
            variant={
              editor.isActive({ textAlign: "justify" }) ? "default" : "outline"
            }
            size="sm"
            onClick={() => editor.chain().focus().setTextAlign("justify").run()}
          >
            <AlignJustify className="h-4 w-4" />
          </Button>

          <Separator orientation="vertical" className="h-6" />

          {/* Lists */}
          <Button
            variant={editor.isActive("bulletList") ? "default" : "outline"}
            size="sm"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={editor.isActive("orderedList") ? "default" : "outline"}
            size="sm"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            <ListOrdered className="h-4 w-4" />
          </Button>
          <Button
            variant={editor.isActive("blockquote") ? "default" : "outline"}
            size="sm"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
          >
            <Quote className="h-4 w-4" />
          </Button>

          <Separator orientation="vertical" className="h-6" />

          {/* Code Block */}
          <Button
            variant={editor.isActive("codeBlock") ? "default" : "outline"}
            size="sm"
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          >
            <Code className="h-4 w-4" />
          </Button>

          {/* Image */}
          <Button variant="outline" size="sm" onClick={addImage}>
            <ImageIcon className="h-4 w-4" />
          </Button>

          <Separator orientation="vertical" className="h-6" />

          {/* Undo/Redo - Using Yjs UndoManager */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (undoManagerRef.current) {
                undoManagerRef.current.undo();
              }
            }}
            disabled={!undoManagerRef.current}
            title="Undo"
          >
            <Undo className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (undoManagerRef.current) {
                undoManagerRef.current.redo();
              }
            }}
            disabled={!undoManagerRef.current}
            title="Redo"
          >
            <Redo className="h-4 w-4" />
          </Button>

          <div className="flex-1" />

          {/* Right side controls */}
          <Button variant="outline" size="sm" onClick={onShowUsers}>
            <Users className="h-4 w-4 mr-2" />
            {onlineUsers.length}
          </Button>
          <Button variant="outline" size="sm" onClick={onShare}>
            <Share className="h-4 w-4 mr-2" />
            Share
          </Button>
          <Button variant="outline" size="sm" onClick={onDownload}>
            <FileDown className="h-4 w-4 mr-2" />
            Download
          </Button>
        </div>
      </Card>

      {/* Hidden file input for image upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageUpload}
        accept="image/*"
        className="hidden"
      />

      {/* Editor */}
      <Card className="p-6">
        <EditorContent
          editor={editor}
          className="prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[500px] dark:prose-invert"
        />
      </Card>

      {/* Online Users Indicator */}
      <div className="flex items-center gap-2 mt-4">
        <span className="text-sm text-muted-foreground">
          Online users ({onlineUsers.length}):
        </span>
        <div className="flex -space-x-2">
          {onlineUsers.map((user) => (
            <div
              key={user.id}
              className="w-8 h-8 rounded-full border-2 border-white dark:border-gray-800 flex items-center justify-center text-white text-xs font-medium"
              style={{ backgroundColor: user.color }}
              title={`${user.name} ${
                user.id === currentUserId ? "(You)" : ""
              }`}
            >
              {user.avatar}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}