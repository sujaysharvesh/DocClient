
import axios from "axios";
import { getCsrfToken } from "./auth";
import { ApiResponse } from "@/interface/apiResponse";
import { Document } from "@/interface/document";

const baseURL = process.env.NEXT_PUBLIC_BASE_URL;


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

export const createDocument = async (title: string): Promise<any> => {
    try {
      const xsrfToken = await getCsrfToken();
      const response = await axios.post(
        `${baseURL}/api/v1/document`,
        { title },
        {
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-TOKEN": xsrfToken,
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

  export const getUserDocument = async (documentId: string): Promise<Document> => {
    try {
      const csrfToken = await getCsrfToken();
      const token = localStorage.getItem("authToken");
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
      
      if (response.data.success && response.data.data) {
        const data = response.data.data;
        const byteArray = data.content ? new Uint8Array(data.content) : new Uint8Array();
  
        return {
          documentId: data.documentId,
          title: data.title,
          content: byteArray, 
        };
      }
      throw new Error("Document not found");
    } catch (err: any) {
      console.error("Failed to fetch document content:", err);
      throw err;
    }
  };
  

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
  }

