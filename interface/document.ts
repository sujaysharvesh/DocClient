

export interface Document {
    documentId?: string;
    title?: string;
    content?: string; 
    updated_at?: string;
  }

export interface DocumentContent {
    content: Uint8Array; // represents raw binary data (like byte[])
    updated_at: string;  
  }

