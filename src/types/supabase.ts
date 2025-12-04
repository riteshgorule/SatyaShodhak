import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/integrations/supabase/types";

export type TypedSupabaseClient = SupabaseClient<Database>;

declare module "@supabase/supabase-js" {
    interface SupabaseClient<Database = any, SchemaName = string & {}, RelationName = string & {}> {
        rpc<T = any>(
            fn: string,
            params?: Record<string, unknown>,
            options?: {
                head?: boolean;
                count?: 'exact' | 'planned' | 'estimated';
            }
        ): Promise<{
            data: T | null;
            error: any;
        }>;
    }
}
