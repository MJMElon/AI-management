// Table + storage names in one place so this module can be namespaced apart
// from future modules sharing the same Supabase database.
const PREFIX = 'ai_management_'

export const T = {
  profiles: PREFIX + 'profiles',
  proposals: PREFIX + 'proposals',
  comments: PREFIX + 'comments',
  history: PREFIX + 'status_history',
  sessions: PREFIX + 'time_sessions',
  attachments: PREFIX + 'attachments',
}

// Storage bucket for proposal attachments (bucket ids use hyphens, not underscores).
export const BUCKET = 'ai-management-attachments'
