export type Horizon = 'inbox' | 'day' | 'week' | 'month' | 'year';
export type ItemStatus = 'incomplete' | 'complete' | 'cancelled';
export type WeekDay = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface ItemRow {
  id: string;
  user_id: string;
  parent_id: string | null;
  title: string;
  description: string | null;
  horizon: Horizon;
  period_start: string | null;
  period_end: string | null;
  time: string | null;
  area_id: string | null;
  weight: number;
  status: ItemStatus;
  is_manually_completed: boolean;
  sort_order: number;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AreaRow {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  color_token: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface UserPreferencesRow {
  user_id: string;
  first_day_of_week: WeekDay;
  created_at: string;
  updated_at: string;
}

export interface ItemNode extends ItemRow {
  progress: number; // 0 to 100
  children: ItemNode[];
}
