"use client";

import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
  ChangeEvent,
} from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import TextAlign from "@tiptap/extension-text-align";
import * as Y from "yjs";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
import Highlight from "@tiptap/extension-highlight";
import Document from "@tiptap/extension-document"; // REQUIRED FOR Y.XmlFragment SCHEMA
import Paragraph from "@tiptap/extension-paragraph"; // REQUIRED FOR Y.XmlFragment SCHEMA
import Text from "@tiptap/extension-text"; // REQUIRED FOR Y.XmlFragment SCHEMA
import TextStyle from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { WebsocketProvider } from "y-websocket";
import { createLowlight } from "lowlight";
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
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  Share,
  Users,
  Image as ImageIcon,
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
import javascript from "highlight.js/lib/languages/javascript";
import typescript from "highlight.js/lib/languages/typescript";
import python from "highlight.js/lib/languages/python";
import css from "highlight.js/lib/languages/css";
import html from "highlight.js/lib/languages/xml";
import { getUserDocument } from "@/api/document";

// Setup code highlighting
const lowlight = createLowlight();
lowlight.register("javascript", javascript);
lowlight.register("typescript", typescript);
lowlight.register("python", python);
lowlight.register("css", css);
lowlight.register("html", html);

// --- Mock getUserDocument (Kept for compilation safety) ---
interface DocumentData {
  documentId: string;
  title: string;
  content: Uint8Array | null;
  updated_at: string;
}

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
  const [connectionStatus, setConnectionStatus] = useState(
    ConnectionStatus.CONNECTING
  );
  // FIX 2a: Initialize onlineUsers to an empty array. Awareness will populate it.
  const [onlineUsers, setOnlineUsers] = useState<User[]>([]);
  const [isEditorReady, setIsEditorReady] = useState(false);
  const [yjsInitialized, setYjsInitialized] = useState(false);
  const { theme, setTheme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Yjs - use refs to prevent recreation
  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const undoManagerRef = useRef<Y.UndoManager | null>(null);
  const initializingRef = useRef<boolean>(false);

  // Memo current user props
  const currentUserId = useMemo(() => currentUser.id, [currentUser.id]);
  const currentUserName = useMemo(() => currentUser.name, [currentUser.name]);
  const currentUserColor = useMemo(
    () => currentUser.color,
    [currentUser.color]
  );
  const currentUserAvatar = useMemo(
    () => currentUser.avatar,
    [currentUser.avatar]
  );

  // WebSocket provider initialization
  const initializeWebSocketProvider = useCallback(async (ydoc: Y.Doc) =>  {

      const doc = await getUserDocument(documentId);

      ydocRef.current = ydoc;
      // This is where the initial data is loaded into the Y.Doc
      Y.applyUpdate(ydoc, doc);
      console.log("Yjs content update applied successfully.");

      // Cleanup previous provider
      if (providerRef.current) {
        providerRef.current.disconnect();
        providerRef.current.destroy();
        providerRef.current = null;
      }

      // Build params for awareness
      const params = new URLSearchParams({
        userId: currentUserId,
        userName: currentUserName,
        userColor: encodeURIComponent(currentUserColor),
      });
      const wsUrl = `${websocketUrl}/ws/collaboration/${documentId}?${params.toString()}`;

      const provider = new WebsocketProvider(wsUrl, documentId, ydoc, {
        connect: false,
        WebSocketPolyfill: WebSocket,
        resyncInterval: 30000,
        maxBackoffTime: 30000,
        disableBc: false,
      });

      providerRef.current = provider;

      // Set awareness
      provider.awareness.setLocalStateField("user", {
        id: currentUserId,
        name: currentUserName,
        color: currentUserColor,
        avatar: currentUserAvatar,
      });

      // Provider events
      provider.on("status", ({ status }: { status: string }) => {
        console.log("Provider status:", status);
        setConnectionStatus(status as ConnectionStatus);
      });

      provider.on("connection-close", () => {
        console.log("Connection closed");
        setConnectionStatus(ConnectionStatus.DISCONNECTED);
      });

      provider.on("connection-error", (error: Error) => {
        console.error("Connection error:", error);
        setConnectionStatus(ConnectionStatus.ERROR);
      });

      provider.on("sync", (isSynced: boolean) => {
        console.log("Provider synced:", isSynced);
        if (isSynced) {
          setConnectionStatus(ConnectionStatus.CONNECTED);
          // Set ready after sync to prevent race conditions during initial render
          setTimeout(() => setIsEditorReady(true), 100);
        }
      });

      // Awareness updates
      provider.awareness.on("change", () => {
        const states = Array.from(provider.awareness.getStates().values());
        const users: User[] = states
          .filter((state: any) => state.user)
          .map((state: any) => ({
            id: state.user.id,
            name: state.user.name,
            color: state.user.color,
            avatar: state.user.avatar,
          }));

        // Deduplicate users by ID
        const uniqueUsers = Array.from(
          new Map(users.map((user) => [user.id, user])).values()
        );

        // FIX 2b: Rely only on uniqueUsers from awareness, removing manual fallback
        setOnlineUsers(uniqueUsers);
      });

      // Connect provider
      provider.connect();
    },
    [
      documentId,
      websocketUrl,
      currentUserId,
      currentUserName,
      currentUserColor,
      currentUserAvatar,
    ]
  );

  // Load document + initialize Yjs
  useEffect(() => {
    const loadDocumentAndInitialize = async () => {
      // Prevent duplicate initialization
      if (initializingRef.current || ydocRef.current) {
        console.log("Already initializing or initialized, skipping...");
        return;
      }

      initializingRef.current = true;
      console.log("Loading document:", documentId);
      setIsEditorReady(false);
      setYjsInitialized(false);

      try {
        const doc = await getUserDocument(documentId);
        console.log("Document loaded:", doc);

        const ydoc = new Y.Doc();
        ydocRef.current = ydoc;

        // --- FIX 1: Robust Content Loading ---
        if (doc.content && doc.content.length > 0) {
          console.log(
            "Attempting to apply Yjs update, content length:",
            doc.content.length
          );
          try {
            // This is where the initial data is loaded into the Y.Doc
            Y.applyUpdate(ydoc, new Uint8Array(doc.content));
            console.log("Yjs content update applied successfully.");
          } catch (applyError) {
            // FIX 1a: Handle errors when applying the stored update (e.g., corruption)
            console.error(
              "Error applying stored Yjs update (Content may be corrupt/incompatible). Starting with fresh document:",
              applyError
            );
            // If applying fails, the ydoc remains empty, which is a safe fallback.
          }
        }

        // Ensure the fragment exists (Tiptap needs this to initialize)
        // If content was applied, this just gets the existing fragment.
        // If content failed or was empty, this creates a new, empty fragment named 'default'.
        const yXmlFragment = ydoc.getXmlFragment("default");

        // FIX 1b: Removed the manual yXmlFragment.insert(0, [defaultParagraph])
        // as this can cause conflicts if Y.applyUpdate already created a fragment.
        // Collaboration extension handles Tiptap's initial empty state via the Yjs-ProseMirror binding.

        // Create UndoManager for the XML fragment
        undoManagerRef.current = new Y.UndoManager(yXmlFragment);

        // Initialize WebSocket provider
        initializeWebSocketProvider(ydoc);

        setYjsInitialized(true);
        console.log("Yjs initialized successfully");
      } catch (error) {
        console.error("Fatal error during document load:", error);
        // Fallback: create empty doc
        const ydoc = new Y.Doc();
        ydocRef.current = ydoc;
        undoManagerRef.current = new Y.UndoManager(
          ydoc.getXmlFragment("default")
        );
        initializeWebSocketProvider(ydoc);
        setConnectionStatus(ConnectionStatus.ERROR);
        setYjsInitialized(true);
      } finally {
        initializingRef.current = false;
      }
    };

    loadDocumentAndInitialize();

    return () => {
      console.log("Cleaning up editor");
      initializingRef.current = false;
      // Cleanup in correct order
      if (undoManagerRef.current) {
        undoManagerRef.current.destroy();
        undoManagerRef.current = null;
      }
      if (providerRef.current) {
        providerRef.current.disconnect();
        providerRef.current.destroy();
        providerRef.current = null;
      }
      if (ydocRef.current) {
        ydocRef.current.destroy();
        ydocRef.current = null;
      }
      setYjsInitialized(false);
      setIsEditorReady(false);
    };
  }, [documentId, websocketUrl, currentUser, initializeWebSocketProvider]);

  // Compose extensions - only create when Yjs is ready
  const extensions = useMemo(() => {
    console.log("Creating editor extensions, yjsInitialized:", yjsInitialized);

    const baseExtensions: any[] = [
      // 1. Core Schema Nodes (Must be explicitly defined for Y.XmlFragment)
      Document,
      Paragraph,
      Text,

      // 2. Starter Kit (Disable conflicting nodes, especially those related to history/structure)
      StarterKit.configure({
        document: false,
        paragraph: false,
        text: false,
        codeBlock: false,
        history: false, // Disable built-in history since we're using Yjs undo manager
      }),

      // 3. Other Extensions
      Placeholder.configure({ placeholder: "Start typing your document..." }),
      Image.configure({
        HTMLAttributes: { class: "max-w-full h-auto rounded-lg" },
      }),
      CodeBlockLowlight.configure({ lowlight, defaultLanguage: "javascript" }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
    ];

    // 4. Collaboration Extensions (Conditional)
    if (yjsInitialized && ydocRef.current && providerRef.current) {
      console.log("Adding collaboration extensions");
      baseExtensions.push(
        Collaboration.configure({
          document: ydocRef.current,
          field: "default", // Correctly maps to ydoc.getXmlFragment("default")
        }),
        CollaborationCursor.configure({
          provider: providerRef.current,
          user: {
            name: currentUserName,
            color: currentUserColor,
          },
        })
      );
    } else {
      console.log("Collaboration not ready yet. Skipping.");
    }

    return baseExtensions;
  }, [currentUserName, currentUserColor, yjsInitialized]);

  const editor = useEditor(
    {
      extensions,
      editable: true,
      immediatelyRender: false,
      onUpdate: ({ editor }) => {
        if (providerRef.current) {
          providerRef.current.awareness.setLocalStateField(
            "lastEdit",
            Date.now()
          );
        }
      },
      onCreate: ({ editor }) => {
        console.log("Editor created successfully");
      },
      onDestroy: () => {
        console.log("Editor destroyed");
      },
    },
    [extensions]
  );

  // Image upload
  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
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
  const addImage = () => fileInputRef.current?.click();

  // Toolbar connection status
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

  // Reconnect
  const handleReconnect = useCallback(() => {
    if (providerRef.current) {
      setConnectionStatus(ConnectionStatus.CONNECTING);
      providerRef.current.connect();
    }
  }, []);

  // Debug
  const debugContent = useCallback(() => {
    if (editor && ydocRef.current) {
      const yXmlFragment = ydocRef.current.getXmlFragment("default");
      console.group("=== COLLABORATIVE EDITOR DEBUG ===");
      console.log("Editor HTML:", editor.getHTML());
      console.log("Editor JSON:", JSON.stringify(editor.getJSON(), null, 2));
      console.log("Connection Status:", connectionStatus);
      console.log("Online Users:", onlineUsers.length);
      console.log("Yjs XML Fragment Length:", yXmlFragment.length);
      console.log("Yjs Initialized:", yjsInitialized);
      console.log("Editor Ready:", isEditorReady);
      if (providerRef.current) {
        console.log("Provider connected:", providerRef.current.wsconnected);
        console.log("Provider synced:", providerRef.current.synced);
        console.log("Provider URL:", providerRef.current.url);
        console.log(
          "Awareness states:",
          providerRef.current.awareness.getStates().size
        );
      }
      console.groupEnd();
    }
  }, [editor, connectionStatus, onlineUsers, yjsInitialized, isEditorReady]);

  // Force sync
  const forceSync = useCallback(() => {
    if (providerRef.current && ydocRef.current) {
      console.log("Force syncing...");
      // Re-connect forces a sync
      providerRef.current.disconnect();
      setTimeout(() => providerRef.current?.connect(), 100);
    }
  }, []);

  // Editor event logging & awareness
  useEffect(() => {
    if (!editor) return;

    const logEditorEvent = (event: string) => {
      const yXmlFragment = ydocRef.current?.getXmlFragment("default");
      const contentLength = yXmlFragment?.length || 0;
      console.log(`Editor Event: ${event}`, {
        time: new Date().toISOString(),
        documentId,
        userId: currentUserId,
        connectionStatus,
        contentLength,
      });
    };

    editor.on("focus", () => {
      logEditorEvent("focus");
      providerRef.current?.awareness.setLocalStateField("focused", true);
    });

    editor.on("blur", () => {
      logEditorEvent("blur");
      providerRef.current?.awareness.setLocalStateField("focused", false);
    });

    editor.on("selectionUpdate", () => {
      const selection = editor.state.selection;
      providerRef.current?.awareness.setLocalStateField("cursor", {
        from: selection.from,
        to: selection.to,
      });
    });

    return () => {
      editor.off("focus");
      editor.off("blur");
      editor.off("selectionUpdate");
    };
  }, [editor, documentId, currentUserId, connectionStatus]);

  // Render loading state
  if (!editor) {
    return (
      <div className="w-full max-w-5xl mx-auto p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
        <p>Loading collaborative editor...</p>
        <p className="text-sm text-muted-foreground mt-2">
          Connection Status: {getConnectionText()}
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Yjs Initialized: {yjsInitialized ? "Yes" : "No"}
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
            | Yjs: {yjsInitialized ? "✓" : "✗"} | Ready:{" "}
            {isEditorReady ? "✓" : "✗"}
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
              title={`${user.name} ${user.id === currentUserId ? "(You)" : ""}`}
            >
              {/* Ensure the avatar is the first letter of the name if no avatar field exists */}
              {user.avatar || user.name.charAt(0).toUpperCase()}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
