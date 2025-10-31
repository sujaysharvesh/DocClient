
import axios from "axios";
import { getCsrfToken } from "./auth";
import { ApiResponse } from "@/interface/apiResponse";

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

  export const getDocumentContent = async (documentId: string): Promise<string> => {
    try {
      const csrfToken = await getCsrfToken();
      const token = localStorage.getItem("authToken");
      const response = await axios.get<ApiResponse<{ content: string }>>(
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
        return response.data.data.content;
      }
      return "";
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

