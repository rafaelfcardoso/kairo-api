export const SYSTEM_IDS = {
  INBOX_PROJECT: '569c363f-1934-4e69-b324-6c2fad28bc59',
} as const;

export const DATABASE_CONFIG = {
  RETRY_ATTEMPTS: 20,
  RETRY_DELAY: 5000,
  CONNECTION_TIMEOUT: 30000,
} as const;

export const PROJECT_DEFAULTS = {
  COLORS: {
    INBOX: '#808080',
    DEFAULT: '#0000FF',
  },
} as const;

export const ENUM_TYPES = {
  TASK_STATUS: 'task_status_enum',
  TASK_PRIORITY: 'task_priority_enum',
  PROJECT_TYPE: 'project_type_enum',
  FOCUS_SESSION_ENERGY: 'focus_session_energylevel_enum',
} as const;

// Type definitions for better type safety
export type TaskStatus =
  | 'not_started'
  | 'in_progress'
  | 'blocked'
  | 'completed';
export type TaskPriority = 'none' | 'low' | 'medium' | 'high';
export type ProjectType = 'inbox' | 'regular' | 'archive';
export type FocusSessionEnergy = 'low' | 'medium' | 'high';
