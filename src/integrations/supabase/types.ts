// src/integrations/supabase/types.ts

export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export type Database = {
    __InternalSupabase: {
        PostgrestVersion: "13.0.5"
    }

    // Define the RPC functions
    Functions: {
        handle_verification_vote: {
            Args: {
                p_verification_id: string
                p_user_id: string
                p_vote: number
            }
            Returns: void
        }
        handle_comment_vote: {
            Args: {
                p_comment_id: string
                p_user_id: string
                p_vote: number
            }
            Returns: void
        }
        get_comments_with_votes: {
            Args: {
                p_claim_id: string
            }
            Returns: Array<{
                id: string
                content: string
                user_id: string
                user_name: string
                user_avatar: string | null
                created_at: string
                upvotes: number
                downvotes: number
                user_vote: number | null
            }>
        }
        delete_comment: {
            Args: {
                p_comment_id: string
            }
            Returns: void
        }
    }

    public: {
        Tables: {
            profiles: {
                Row: {
                    id: string
                    email: string
                    full_name: string | null
                    avatar_url: string | null
                    created_at: string | null
                    updated_at: string | null
                }
                Insert: {
                    id: string
                    email: string
                    full_name?: string | null
                    avatar_url?: string | null
                    created_at?: string | null
                    updated_at?: string | null
                }
                Update: {
                    id?: string
                    email?: string
                    full_name?: string | null
                    avatar_url?: string | null
                    created_at?: string | null
                    updated_at?: string | null
                }
                Relationships: []
            }
            verification_results: {
                Row: {
                    id: string
                    claim: string
                    verdict: string
                    confidence: number
                    explanation: string
                    sources: Json
                    created_at: string | null
                    updated_at: string | null
                    user_id: string
                    is_public: boolean
                    is_saved: boolean
                    notes: string | null
                    tags: string[]
                }
                Insert: {
                    id?: string
                    claim: string
                    verdict: string
                    confidence: number
                    explanation: string
                    sources: Json
                    created_at?: string | null
                    updated_at?: string | null
                    user_id: string
                    is_public?: boolean
                    is_saved?: boolean
                    notes?: string | null
                    tags?: string[]
                }
                Update: {
                    id?: string
                    claim?: string
                    verdict?: string
                    confidence?: number
                    explanation?: string
                    sources?: Json
                    created_at?: string | null
                    updated_at?: string | null
                    user_id?: string
                    is_public?: boolean
                    is_saved?: boolean
                    notes?: string | null
                    tags?: string[]
                }
                Relationships: []
            }
            comments: {
                Row: {
                    id: string
                    claim_id: string
                    user_id: string
                    content: string
                    created_at: string
                    updated_at: string | null
                    user_name: string
                    user_avatar: string | null
                }
                Insert: {
                    id?: string
                    claim_id: string
                    user_id: string
                    content: string
                    created_at?: string
                    updated_at?: string | null
                    user_name: string
                    user_avatar?: string | null
                }
                Update: {
                    id?: string
                    claim_id?: string
                    user_id?: string
                    content?: string
                    created_at?: string
                    updated_at?: string | null
                    user_name?: string
                    user_avatar?: string | null
                }
                Relationships: Array<{
                    foreignKeyName: "comments_claim_id_fkey" | "comments_user_id_fkey"
                    columns: [string, string]
                    referencedRelation: "verification_results" | "profiles"
                    referencedColumns: ["id"]
                }>
            }
            comment_votes: {
                Row: {
                    id: string
                    comment_id: string
                    user_id: string
                    vote: number
                    created_at: string
                }
                Insert: {
                    id?: string
                    comment_id: string
                    user_id: string
                    vote: number
                    created_at?: string
                }
                Update: {
                    id?: string
                    comment_id?: string
                    user_id?: string
                    vote?: number
                    created_at?: string
                }
                Relationships: Array<{
                    foreignKeyName: "comment_votes_comment_id_fkey" | "comment_votes_user_id_fkey"
                    columns: [string, string]
                    referencedRelation: "comments" | "profiles"
                    referencedColumns: ["id"]
                }>
            }
            verification_votes: {
                Row: {
                    id: string
                    verification_id: string
                    user_id: string
                    vote: number
                    created_at: string
                }
                Insert: {
                    id?: string
                    verification_id: string
                    user_id: string
                    vote: number
                    created_at?: string
                }
                Update: {
                    id?: string
                    verification_id?: string
                    user_id?: string
                    vote?: number
                    created_at?: string
                }
                Relationships: Array<{
                    foreignKeyName: "verification_votes_verification_id_fkey" | "verification_votes_user_id_fkey"
                    columns: [string, string]
                    referencedRelation: "verification_results" | "profiles"
                    referencedColumns: ["id"]
                }>
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            [_ in never]: never
        }
        Enums: {
            [_ in never]: never
        }
        CompositeTypes: {
            [_ in never]: never
        }
    }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

export const Constants = {
    public: {
        Enums: {},
    },
} as const
