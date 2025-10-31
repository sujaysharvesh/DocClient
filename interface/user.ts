export interface User {
    id: string;
    name: string;
    color: string;
    avatar: string;
    isOwner: boolean;
    lastSeen?: string;
    
}

export interface UserData {
    id: string;
    username: string;
    email: string;
}
