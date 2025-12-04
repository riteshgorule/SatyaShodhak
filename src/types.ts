import { Tables } from "@/integrations/supabase/types";

export type Verdict = "TRUE" | "FALSE" | "MISLEADING" | "PARTIALLY_TRUE" | "INCONCLUSIVE";

export interface Source {
    title: string;
    snippet: string;
    url: string;
}

// Base interface without the Omit to avoid type conflicts
export interface VerificationResult {
    id: string;
    verdict: Verdict | string;  // Allow string for backward compatibility
    confidence: number;
    explanation: string;
    sources: Source[] | any;  // Allow any for flexibility in parsing
    claim: string;
    created_at?: string | Date;
    updated_at?: string | Date;
    timestamp?: string | Date;  // Alias for created_at
    is_public?: boolean;
    is_saved?: boolean;
    upvotes?: number;
    downvotes?: number;
    user_vote?: number | null;
    comments_count?: number;
    user_id?: string;
    notes?: string | null;
    tags?: string[] | null;
    user?: {
        id: string;
        email: string;
        full_name: string | null;
        avatar_url: string | null;
    };
}

export interface CommentType {
    id: string;
    content: string;
    user_id: string;
    user_name: string;
    user_avatar?: string;
    created_at: string;
    upvotes: number;
    downvotes: number;
    user_vote?: number | null;
    claim_id: string;
}

export interface ResultCardProps {
    onDelete?: () => void;
    result: VerificationResult;
    savedResultId?: string;
    onSaveToggle?: () => void;
    onReVerify?: () => Promise<VerificationResult | void>;
    onCommentCountChange?: (count: number) => void;
}

export interface CommentsSectionProps {
    claimId: string;
    onCommentChange?: (count: number) => void;
}

export interface CommentProps {
    id: string;
    content: string;
    userId: string;
    userName: string;
    userAvatar?: string;
    timestamp: string | Date;
    upvotes: number;
    downvotes: number;
    userVote?: number | null;
    claimId: string;
    onVote?: () => void;
    onDelete?: () => void;
}

export interface DashboardProps {
    // Add any dashboard-specific props here
}
