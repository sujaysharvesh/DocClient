import * as Y from 'yjs';

/**
 * Creates a base64-encoded Y.Doc update with proper TipTap structure
 * This generates content that's compatible with TipTap's Collaboration extension
 */
export function createTipTapYDocContent(text: string = ""): string {
  const doc = new Y.Doc();
  const fragment = doc.getXmlFragment('default'); // Must use 'default' for TipTap
  
  // Create a paragraph element (TipTap uses XML structure)
  const paragraph = new Y.XmlElement('paragraph');
  
  // If there's text, add it as an XmlText node
  if (text) {
    const textNode = new Y.XmlText();
    textNode.insert(0, text);
    paragraph.insert(0, [textNode]);
  }
  
  // Insert the paragraph into the fragment
  fragment.insert(0, [paragraph]);
  
  // Get the state as an update
  const update = Y.encodeStateAsUpdate(doc);
  
  // Convert to base64
  const base64 = btoa(String.fromCharCode(...update));
  
  console.log("Generated TipTap-compatible Y.Doc content:", {
    text,
    base64,
    updateLength: update.length,
    fragmentLength: fragment.length
  });
  
  doc.destroy(); // Clean up
  
  return base64;
}

/**
 * Creates content with multiple paragraphs
 */
export function createTipTapYDocWithParagraphs(paragraphs: string[]): string {
  const doc = new Y.Doc();
  const fragment = doc.getXmlFragment('default');
  
  paragraphs.forEach((text) => {
    const paragraph = new Y.XmlElement('paragraph');
    
    if (text) {
      const textNode = new Y.XmlText();
      textNode.insert(0, text);
      paragraph.insert(0, [textNode]);
    }
    
    fragment.push([paragraph]);
  });
  
  const update = Y.encodeStateAsUpdate(doc);
  const base64 = btoa(String.fromCharCode(...update));
  
  doc.destroy();
  
  return base64;
}

/**
 * Validates if a base64 string is valid TipTap Y.Doc content
 */
export function validateTipTapYDocContent(base64Content: string): {
  valid: boolean;
  error?: string;
  details?: any;
} {
  try {
    const doc = new Y.Doc();
    const binaryString = atob(base64Content);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    Y.applyUpdate(doc, bytes);
    
    const fragment = doc.getXmlFragment('default');
    
    // Check if fragment has proper structure
    if (fragment.length === 0) {
      doc.destroy();
      return {
        valid: false,
        error: "Fragment is empty - no content found"
      };
    }
    
    // Check if first element is valid
    const firstElement = fragment.get(0);
    if (!(firstElement instanceof Y.XmlElement)) {
      doc.destroy();
      return {
        valid: false,
        error: "First element is not an XmlElement"
      };
    }
    
    const details = {
      fragmentLength: fragment.length,
      firstElementType: firstElement.constructor.name,
      firstElementName: firstElement.nodeName,
      hasContent: firstElement.length > 0
    };
    
    console.log("Validation successful:", details);
    
    doc.destroy();
    
    return {
      valid: true,
      details
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Unknown validation error"
    };
  }
}

/**
 * Extracts text content from a Y.Doc base64 string
 */
export function extractTextFromYDoc(base64Content: string): string {
  try {
    const doc = new Y.Doc();
    const binaryString = atob(base64Content);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    Y.applyUpdate(doc, bytes);
    
    const fragment = doc.getXmlFragment('default');
    let text = '';
    
    // Extract text from all elements
    fragment.forEach((item) => {
      if (item instanceof Y.XmlElement) {
        item.forEach((child) => {
          if (child instanceof Y.XmlText) {
            text += child.toString();
          }
        });
        // Add newline between paragraphs
        text += '\n';
      }
    });
    
    doc.destroy();
    
    return text.trim();
  } catch (error) {
    console.error("Error extracting text:", error);
    return '';
  }
}

/**
 * Converts a Y.Doc instance to base64 (for saving to database)
 */
export function yDocToBase64(doc: Y.Doc): string {
  const update = Y.encodeStateAsUpdate(doc);
  return btoa(String.fromCharCode(...update));
}

/**
 * Gets the current state of the editor as base64 for saving
 */
export function getEditorContentAsBase64(ydoc: Y.Doc): string {
  return yDocToBase64(ydoc);
}

// Example usage and tests:

// Test 1: Create empty document
export function testEmptyDocument() {
  const base64 = createTipTapYDocContent();
  console.log("Empty document:", base64);
  const validation = validateTipTapYDocContent(base64);
  console.log("Validation:", validation);
}

// Test 2: Create document with text
export function testDocumentWithText() {
  const base64 = createTipTapYDocContent("Hello World");
  console.log("Document with text:", base64);
  const extracted = extractTextFromYDoc(base64);
  console.log("Extracted text:", extracted);
}

// Test 3: Create document with multiple paragraphs
export function testMultipleParagraphs() {
  const base64 = createTipTapYDocWithParagraphs([
    "First paragraph",
    "Second paragraph",
    "Third paragraph"
  ]);
  console.log("Multiple paragraphs:", base64);
  const extracted = extractTextFromYDoc(base64);
  console.log("Extracted text:", extracted);
}

// Test 4: Validate your existing content
export function testYourContent() {
  const yourContent = "AQGVmPK9DwAEAQdkZWZhdWx0C0hlbGxvIFdvcmxkAA==";
  const validation = validateTipTapYDocContent(yourContent);
  console.log("Your content validation:", validation);
  
  if (validation.valid) {
    const text = extractTextFromYDoc(yourContent);
    console.log("Your content text:", text);
  }
}

/**
 * Migration helper: Converts old content format to TipTap format
 */
export function migrateContentToTipTapFormat(oldBase64: string): string | null {
  try {
    // Try to extract text from old format
    const text = extractTextFromYDoc(oldBase64);
    
    if (text) {
      // Create new format with extracted text
      return createTipTapYDocContent(text);
    }
    
    return null;
  } catch (error) {
    console.error("Migration failed:", error);
    return null;
  }
}