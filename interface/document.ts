

export interface Document {
    documentId?: string;
    title?: string;
    content?: Uint8Array;
}

export interface DocumentContent {
    content: Uint8Array; // represents raw binary data (like byte[])
    updated_at: string;  
  }

