import axios from "axios";
import { getCsrfToken } from "./auth";
import { ApiResponse } from "@/interface/apiResponse";
import { Document } from "@/interface/document";
// import * as Y from "yjs";
// import { console } from "inspector";

const baseURL = process.env.NEXT_PUBLIC_BASE_URL;

export const createDocument = async (title: string): Promise<any> => {
  try {
    const xsrfToken = await getCsrfToken();
    const response = await axios.post(
      `${baseURL}/api/v1/document`,
      { title },
      {
        headers: {
          "Content-Type": "application/json",
          "X-XSRF-TOKEN": xsrfToken,
        },
        withCredentials: true,
      }
    );
    return response.data;
  } catch (err) {
    console.error("Failed to create document:", err);
    throw err;
  }
};

export const getUserDocuments = async (): Promise<Document[]> => {
  try {
    const xsrfToken = await getCsrfToken();
    const response = await axios.get<ApiResponse<Document[]>>(
      `${baseURL}/api/v1/document/all`,
      {
        headers: {
          "Content-Type": "application/json",
          "X-XSRF-TOKEN": xsrfToken,
        },
        withCredentials: true,
      }
    );

    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    return [];
  } catch (err: any) {
    if (err.response?.status === 404) {
      return [];
    }
    console.error("Failed to fetch documents:", err);
    throw err;
  }
};


// export const getUserDocument = async (
//   documentId: string
// ): Promise<Document> => {
//   try {
//     // ... existing API call logic ...
//     const csrfToken = await getCsrfToken();
//     const response = await axios.get<ApiResponse<Document>>(
//       `${baseURL}/api/v1/document/${documentId}`,
//       {
//         headers: {
//           "Content-Type": "application/json",
//           "X-CSRF-TOKEN": csrfToken,
//         },
//         withCredentials: true,
//       }
//     );
//     // ... end existing API call logic ...

//     if (response.data.success && response.data.data) {
//       const data = response.data.data;
      
//       console.log("Raw document data:", data);
      
//       if (!data.content) {
//         console.log("No content found, returning empty document");
//         return {
//           documentId: data.documentId,
//           title: data.title,
//           content: new Uint8Array(),
//         };
//       }

//       let byteArray = new Uint8Array();
      
//       try {
//         if (typeof data.content === 'string') {
//           console.log("Decoding Base64 content, length:", data.content.length);
          
//           // Decode Base64 string to binary (Uint8Array)
//           const binaryString = atob(data.content);
//           byteArray = new Uint8Array(binaryString.length);
//           for (let i = 0; i < binaryString.length; i++) {
//             byteArray[i] = binaryString.charCodeAt(i);
//           }
          
//           console.log("Decoded byte array length:", byteArray.length);
          
//           // --- BEGIN CRITICAL CONVERSION/VALIDATION LOGIC ---
          
//           const tempYdoc = new Y.Doc();
//           Y.applyUpdate(tempYdoc, byteArray);
          
//           const xmlFragment = tempYdoc.getXmlFragment('default');
//           const textElement = tempYdoc.getText('default');
          
//           // 1. Check if it's the correct XML format first
//           if (xmlFragment.length > 0) {
//             console.log("Content is already in Y.XmlFragment format. Using it.");
//             // Keep the original byteArray
//           } 
//           // 2. Check if it's the old Y.Text format
//           else if (textElement.toString().length > 0) {
//             console.warn("Content is stored as Y.Text (old schema). Converting to Y.XmlFragment...");
            
//             const oldTextContent = textElement.toString();
            
//             // Re-create a new Y.Doc using the correct XML schema
//             const convertedYdoc = new Y.Doc();
//             const convertedXmlFragment = convertedYdoc.getXmlFragment('default');
            
//             // Wrap the plain text content in a Tiptap Document -> Paragraph structure
//             // This is crucial: Tiptap requires block nodes like 'paragraph'
            
//             // Split content by newlines to create multiple paragraphs if necessary
//             const paragraphs = oldTextContent.split('\n').filter(p => p.length > 0);
            
//             if (paragraphs.length === 0) {
//                 // Handle case where old content was just a few spaces/empty
//                 const defaultParagraph = new Y.XmlElement('paragraph');
//                 convertedXmlFragment.insert(0, [defaultParagraph]);
//             } else {
//                 paragraphs.forEach((textLine, index) => {
//                     const paragraph = new Y.XmlElement('paragraph');
//                     // Use Y.XmlText to hold the text content inside the paragraph node
//                     paragraph.insert(0, [new Y.XmlText(textLine)]);
//                     convertedXmlFragment.insert(index, [paragraph]);
//                 });
//             }
            
//             // Encode the new, converted document as the final update
//             byteArray = Y.encodeStateAsUpdate(convertedYdoc);
//             console.log("Conversion complete. New byte array length:", byteArray.length);
//           } else {
//             console.log("Document content is empty after decoding. Using empty Uint8Array.");
//             byteArray = new Uint8Array();
//           }
          
//           // --- END CRITICAL CONVERSION/VALIDATION LOGIC ---
          
//         } else {
//           console.warn("Content is not a string, treating as empty");
//           byteArray = new Uint8Array();
//         }
//       } catch (decodeErr) {
//         console.error("Content processing failed (Base64 decode error or Yjs apply update error):", decodeErr);
//         byteArray = new Uint8Array();
//       }

//       return {
//         documentId: data.documentId,
//         title: data.title,
//         content: byteArray,
//       };
//     }
//     throw new Error("Document not found");
//   } catch (err: any) {
//     console.error("Failed to fetch document content:", err);
//     return {
//       documentId,
//       title: "",
//       content: new Uint8Array(),
//     };
//   }
// };


export const getUserDocument = async(documentId: String): Promise<Document> => {

  try {

    const csrfToken = await getCsrfToken();
    const response = await axios.get<ApiResponse<Document>>(
      `${baseURL}/api/v1/document/${documentId}`,
      {
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-TOKEN": csrfToken,
        },
        withCredentials: true,
      }
    );
    console.log("Fetched document response:", response.data);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error("Document not found");


  } catch(err) {
    throw err;
  }

}

export const deleteDocument = async (documentId: string): Promise<any> => {
  try {
    const xsrfToken = await getCsrfToken();
    const response = await axios.delete(
      `${baseURL}/api/v1/document/${documentId}`,
      {
        headers: {
          "Content-Type": "application/json",
          "X-XSRF-TOKEN": xsrfToken,
        },
        withCredentials: true,
      }
    );
    return response.data;
  } catch (err) {
    console.error("Failed to delete document:", err);
    throw err;
  }
};
