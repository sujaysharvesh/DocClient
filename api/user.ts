
import axios from "axios";
import { getCsrfToken } from "./auth";
import { ApiResponse } from "@/interface/apiResponse";
import { User, UserData } from "@/interface/user";


const baseURL = process.env.NEXT_PUBLIC_BASE_URL;


const getRandomColor = (): string => {
    const colors = [
        "#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4",
        "#3b82f6", "#8b5cf6", "#ec4899", "#10b981", "#f59e0b",
        "#6366f1", "#84cc16",
    ];

    return colors[Math.floor(Math.random() * colors.length)];

} 

const getInitials = (name: string): string => {
    if (!name) return "";
    return name
    .trim()
    .split(/\s+/) 
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);
}



export const getCurrentUser = async (): Promise<User | null> => {
    try {
        const CsrfToken = await getCsrfToken();
        const response = await axios.get<ApiResponse<UserData>>(
            `${baseURL}/api/v1/auth/me`, 
            {
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRF-TOKEN": CsrfToken,
                },
                withCredentials: true,
            }
        );

        const userData = response.data.data;
        return {
            id: userData.id,
            name: userData.username,
            color: getRandomColor(),
            avatar: getInitials(userData.username),
            isOwner: true,
        }
    } catch(err) {
        console.error("Error fetching current user:", err);
        throw err;
    }
}


