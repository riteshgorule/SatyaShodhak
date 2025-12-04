export type Verdict = "TRUE" | "FALSE" | "MISLEADING" | "PARTIALLY_TRUE" | "INCONCLUSIVE";

export interface Source {
    title: string;
    snippet: string;
    url: string;
}

export interface VerificationResult {
    id: string;
    verdict: Verdict;
    confidence: number;
    explanation: string;
    sources: Source[];
    claim: string;
    timestamp: Date;
    is_public?: boolean;
    upvotes?: number;
    downvotes?: number;
    user_vote?: number | null;
    comments_count?: number;
    user_id?: string;
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
}

export interface ResultCardProps {
    onDelete?: () => void;
    result: VerificationResult;
    savedResultId?: string;
    onSaveToggle?: () => void;
}

export interface CommentsSectionProps {
    claimId: string;
}

export interface CommentProps {
    id: string;
    content: string;
    userId: string;
    userName: string;
    userAvatar?: string;
    timestamp: Date;
    upvotes: number;
    downvotes: number;
    userVote?: number | null;
    claimId: string;
    onVote?: () => void;
    onDelete?: () => void;
}
