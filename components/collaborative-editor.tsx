"use client"

import type React from "react"

import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Placeholder from "@tiptap/extension-placeholder"
import Image from "@tiptap/extension-image"
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight"
import TextAlign from "@tiptap/extension-text-align"
import Underline from "@tiptap/extension-underline"
import TextStyle from "@tiptap/extension-text-style"
import Color from "@tiptap/extension-color"
import * as Y from "yjs"
import Collaboration from "@tiptap/extension-collaboration"
import CollaborationCursor from "@tiptap/extension-collaboration-cursor"
import Highlight from "@tiptap/extension-highlight"
import { WebsocketProvider } from "y-websocket"
import { createLowlight } from "lowlight"
import { useEffect, useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { useTheme } from "next-themes"
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
} from "lucide-react"

// Configure lowlight for code highlighting
import javascript from "highlight.js/lib/languages/javascript"
import typescript from "highlight.js/lib/languages/typescript"
import python from "highlight.js/lib/languages/python"
import css from "highlight.js/lib/languages/css"
import html from "highlight.js/lib/languages/xml"

// Create lowlight instance
const lowlight = createLowlight()

// Register languages
lowlight.register("javascript", javascript)
lowlight.register("typescript", typescript)
lowlight.register("python", python)
lowlight.register("css", css)
lowlight.register("html", html)

interface User {
  id: string
  name: string
  color: string
  avatar: string
}

interface CollaborativeEditorProps {
  documentId: string
  currentUser: User
  onShare: () => void
  onShowUsers: () => void
  onDownload: () => void
  onGenerateAI: () => void
  activeUsers: User[]
  websocketUrl?: string // WebSocket server URL
}

// WebSocket connection status
enum ConnectionStatus {
  CONNECTING = "connecting",
  CONNECTED = "connected",
  DISCONNECTED = "disconnected",
  ERROR = "error"
}

export function CollaborativeEditor({
  documentId,
  currentUser,
  onShare,
  onShowUsers,
  onDownload,
  onGenerateAI,
  activeUsers,
  websocketUrl = "ws://localhost:1234",
}: CollaborativeEditorProps) {
  const [content, setContent] = useState("")
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(ConnectionStatus.CONNECTING)
  const [onlineUsers, setOnlineUsers] = useState<User[]>([currentUser])
  const { theme, setTheme } = useTheme()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Yjs document and provider refs
  const ydocRef = useRef<Y.Doc | null>(null)
  const providerRef = useRef<WebsocketProvider | null>(null)

  // Initialize Yjs document and WebSocket provider
  useEffect(() => {
    // Create new Yjs document
    const ydoc = new Y.Doc()
    ydocRef.current = ydoc

    // Create WebSocket provider
    const provider = new WebsocketProvider(websocketUrl, documentId, ydoc, {
      connect: true,
      // Add authentication if needed
      params: {
        userId: currentUser.id,
        userName: currentUser.name,
        userColor: currentUser.color
      }
    })
    providerRef.current = provider

    // Connection status handlers
    provider.on("status", (event: { status: string }) => {
      console.log("WebSocket status:", event.status)
      switch (event.status) {
        case "connecting":
          setConnectionStatus(ConnectionStatus.CONNECTING)
          break
        case "connected":
          setConnectionStatus(ConnectionStatus.CONNECTED)
          break
        case "disconnected":
          setConnectionStatus(ConnectionStatus.DISCONNECTED)
          break
        default:
          setConnectionStatus(ConnectionStatus.ERROR)
      }
    })

    // Handle connection events
    provider.on("connection-close", () => {
      console.log("WebSocket connection closed")
      setConnectionStatus(ConnectionStatus.DISCONNECTED)
    })

    provider.on("connection-error", (error: any) => {
      console.error("WebSocket connection error:", error)
      
      setConnectionStatus(ConnectionStatus.ERROR)
    })

    // Handle sync events
    provider.on("sync", (isSynced: boolean) => {
      console.log("Document synced:", isSynced)
      if (isSynced) {
        setConnectionStatus(ConnectionStatus.CONNECTED)
      }
    })

    // Handle awareness updates (other users)
    provider.awareness.on("change", () => {
      const states = Array.from(provider.awareness.getStates().entries())
      const users: User[] = states
        .filter(([clientId, state]) => state.user && clientId !== provider.awareness.clientID)
        .map(([clientId, state]) => ({
          id: state.user.id || clientId.toString(),
          name: state.user.name || `User ${clientId}`,
          color: state.user.color || "#000000",
          avatar: state.user.avatar || state.user.name?.[0] || "U"
        }))
      
      setOnlineUsers([currentUser, ...users])
      console.log("Online users updated:", users.length + 1)
    })

    // Set current user in awareness
    provider.awareness.setLocalStateField("user", {
      id: currentUser.id,
      name: currentUser.name,
      color: currentUser.color,
      avatar: currentUser.avatar
    })

    // Cleanup on unmount
    return () => {
      provider.disconnect()
      ydoc.destroy()
    }
  }, [documentId, currentUser, websocketUrl])

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        history: false, // Disable local history, use Yjs history
      }),
      Placeholder.configure({
        placeholder: "Start typing your document...",
      }),
      Image.configure({
        HTMLAttributes: {
          class: "max-w-full h-auto rounded-lg",
        },
      }),
      CodeBlockLowlight.configure({
        lowlight,
        defaultLanguage: "javascript",
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Underline,
      TextStyle,
      Color,
      Collaboration.configure({
        document: ydocRef.current,
      }),
      CollaborationCursor.configure({
        provider: providerRef.current,
        user: {
          name: currentUser.name,
          color: currentUser.color,
        },
      }),
      Highlight.configure({
        multicolor: true,
      }),
    ],
    content: content,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      const text = editor.getText()
      const json = editor.getJSON()

      // Log content updates
      console.log('=== TipTap Content Update ===')
      console.log('HTML:', html)
      console.log('Text:', text)
      console.log('JSON:', json)

      // Save to localStorage as backup
      try {
        localStorage.setItem(`document-${documentId}`, html)
      } catch (error) {
        console.warn("Failed to save to localStorage:", error)
      }

      // Broadcast content change event
      if (providerRef.current) {
        providerRef.current.awareness.setLocalStateField("lastEdit", Date.now())
      }
    },
  }, [ydocRef.current, providerRef.current])

  // Editor event logging
  useEffect(() => {
    if (!editor) return

    const logEditorEvent = (event: string) => {
      console.log(`Editor Event: ${event}`, {
        time: new Date().toISOString(),
        documentId,
        userId: currentUser.id,
        connectionStatus
      })
    }

    editor.on('focus', () => {
      logEditorEvent('focus')
      // Update awareness with focus state
      if (providerRef.current) {
        providerRef.current.awareness.setLocalStateField("focused", true)
      }
    })

    editor.on('blur', () => {
      logEditorEvent('blur')
      // Update awareness with blur state
      if (providerRef.current) {
        providerRef.current.awareness.setLocalStateField("focused", false)
      }
    })

    editor.on('selectionUpdate', () => {
      const selection = editor.state.selection
      const selectedText = editor.state.doc.textBetween(selection.from, selection.to)
      
      console.group('Selection Update')
      console.log('Selection:', selection)
      console.log('Selected Text:', selectedText)
      console.groupEnd()

      // Update cursor position in awareness
      if (providerRef.current) {
        providerRef.current.awareness.setLocalStateField("cursor", {
          from: selection.from,
          to: selection.to,
          selectedText
        })
      }
    })

    return () => {
      editor.off('focus')
      editor.off('blur')
      editor.off('selectionUpdate')
    }
  }, [editor, documentId, currentUser.id])

  // Load content from localStorage on mount (fallback)
  useEffect(() => {
    if (!editor) return

    const savedContent = localStorage.getItem(`document-${documentId}`)
    if (savedContent && connectionStatus === ConnectionStatus.DISCONNECTED) {
      // Only load from localStorage if not connected
      editor.commands.setContent(savedContent)
      setContent(savedContent)
      console.log("Loaded content from localStorage (offline mode)")
    }
  }, [documentId, editor, connectionStatus])

  // Reconnection logic
  const handleReconnect = useCallback(() => {
    if (providerRef.current) {
      console.log("Attempting to reconnect...")
      setConnectionStatus(ConnectionStatus.CONNECTING)
      providerRef.current.connect()
    }
  }, [])

  // Debug function
  const debugContent = () => {
    if (editor) {
      console.group('Editor Debug Info')
      console.log('Current HTML:', editor.getHTML())
      console.log('Current JSON:', editor.getJSON())
      console.log('Connection Status:', connectionStatus)
      console.log('Online Users:', onlineUsers.length)
      console.log('Yjs Document State:', ydocRef.current?.toJSON())
      console.groupEnd()
    }
  }

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && editor) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const src = e.target?.result as string
        editor.chain().focus().setImage({ src }).run()
      }
      reader.readAsDataURL(file)
    }
  }

  const addImage = () => {
    fileInputRef.current?.click()
  }

  // Connection status indicator
  const getConnectionIcon = () => {
    switch (connectionStatus) {
      case ConnectionStatus.CONNECTED:
        return <Wifi className="h-4 w-4 text-green-500" />
      case ConnectionStatus.CONNECTING:
        return <Wifi className="h-4 w-4 text-yellow-500 animate-pulse" />
      default:
        return <WifiOff className="h-4 w-4 text-red-500" />
    }
  }

  const getConnectionText = () => {
    switch (connectionStatus) {
      case ConnectionStatus.CONNECTED:
        return "Connected"
      case ConnectionStatus.CONNECTING:
        return "Connecting..."
      case ConnectionStatus.DISCONNECTED:
        return "Disconnected"
      case ConnectionStatus.ERROR:
        return "Connection Error"
      default:
        return "Unknown"
    }
  }

  if (!editor) {
    return (
      <div className="w-full max-w-5xl mx-auto p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
        <p>Loading collaborative editor...</p>
      </div>
    )
  }

  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* Connection Status Bar */}
      <div className="mb-2 flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          {getConnectionIcon()}
          <span className={`font-medium ${
            connectionStatus === ConnectionStatus.CONNECTED ? 'text-green-600' : 
            connectionStatus === ConnectionStatus.CONNECTING ? 'text-yellow-600' : 
            'text-red-600'
          }`}>
            {getConnectionText()}
          </span>
          {connectionStatus === ConnectionStatus.DISCONNECTED && (
            <Button variant="outline" size="sm" onClick={handleReconnect}>
              Reconnect
            </Button>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={debugContent}>
          Debug Info
        </Button>
      </div>

      {/* Enhanced Toolbar */}
      <Card className="p-3 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          {/* Theme Toggle */}
          <Button variant="outline" size="sm" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
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
                editor.chain().focus().setParagraph().run()
              } else {
                const level = Number.parseInt(value.replace("h", "")) as 1 | 2 | 3
                editor.chain().focus().toggleHeading({ level }).run()
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
            onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
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
            variant={editor.isActive({ textAlign: "left" }) ? "default" : "outline"}
            size="sm"
            onClick={() => editor.chain().focus().setTextAlign("left").run()}
          >
            <AlignLeft className="h-4 w-4" />
          </Button>
          <Button
            variant={editor.isActive({ textAlign: "center" }) ? "default" : "outline"}
            size="sm"
            onClick={() => editor.chain().focus().setTextAlign("center").run()}
          >
            <AlignCenter className="h-4 w-4" />
          </Button>
          <Button
            variant={editor.isActive({ textAlign: "right" }) ? "default" : "outline"}
            size="sm"
            onClick={() => editor.chain().focus().setTextAlign("right").run()}
          >
            <AlignRight className="h-4 w-4" />
          </Button>
          <Button
            variant={editor.isActive({ textAlign: "justify" }) ? "default" : "outline"}
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

          {/* Undo/Redo */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
          >
            <Undo className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
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
      <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />

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
              title={`${user.name} ${user.id === currentUser.id ? "(You)" : ""}`}
            >
              {user.avatar}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}