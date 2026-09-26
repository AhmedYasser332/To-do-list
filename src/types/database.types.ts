export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      areas: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          icon: string;
          color_token: string | null;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          icon?: string;
          color_token?: string | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          icon?: string;
          color_token?: string | null;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      items: {
        Row: {
          id: string;
          user_id: string;
          parent_id: string | null;
          title: string;
          description: string | null;
          horizon: 'inbox' | 'day' | 'week' | 'month' | 'year';
          period_start: string | null;
          period_end: string | null;
          time: string | null;
          area_id: string | null;
          weight: number;
          status: 'incomplete' | 'complete' | 'cancelled';
          is_manually_completed: boolean;
          sort_order: number;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          parent_id?: string | null;
          title: string;
          description?: string | null;
          horizon?: 'inbox' | 'day' | 'week' | 'month' | 'year';
          period_start?: string | null;
          period_end?: string | null;
          time?: string | null;
          area_id?: string | null;
          weight?: number;
          status?: 'incomplete' | 'complete' | 'cancelled';
          is_manually_completed?: boolean;
          sort_order?: number;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          parent_id?: string | null;
          title?: string;
          description?: string | null;
          horizon?: 'inbox' | 'day' | 'week' | 'month' | 'year';
          period_start?: string | null;
          period_end?: string | null;
          time?: string | null;
          area_id?: string | null;
          weight?: number;
          status?: 'incomplete' | 'complete' | 'cancelled';
          is_manually_completed?: boolean;
          sort_order?: number;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'items_area_id_fkey';
            columns: ['area_id'];
            isOneToOne: false;
            referencedRelation: 'areas';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'items_parent_id_fkey';
            columns: ['parent_id'];
            isOneToOne: false;
            referencedRelation: 'items';
            referencedColumns: ['id'];
          },
        ];
      };
      user_preferences: {
        Row: {
          user_id: string;
          first_day_of_week: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          first_day_of_week?: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          first_day_of_week?: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
