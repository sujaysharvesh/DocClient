
import axios from "axios";
import { ApiResponse } from "@/interface/apiResponse";


const baseURL = process.env.NEXT_PUBLIC_BASE_URL;


export const getCsrfToken = async (): Promise<string> => {
    try {
        const response = await fetch(`${baseURL}/api/v1/auth/csrf`. {
            method: "GET",
            credentials: "include",
        });

        if (response.ok) {
            const data = await response.json();
            return data.Token?.token
        };
        return "";
    } catch(err) {
        console.error("Error getting CSRF token:", err);
        return "";
    }
}

export const loginUser = async (email: string, password: string): Promise<void> => {
    try {
        const CsrfToken = await getCsrfToken();
        const response = await axios.post<ApiResponse<null>>(
            `${baseURL}/api/v1/auth/login`, 
            {
                emailL: email,
                password: password,
            },
            {
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRF-TOKEN": CsrfToken,
                },
                withCredentials: true,
            }
        );

        if (!response.data.success) {
            throw new Error(response.data.message || "Login failed");
        }
        
    } catch(err) {
        console.error("Error logging in user:", err);
        throw err;
    }
}



