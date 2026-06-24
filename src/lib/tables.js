// Table names live in one place so this module can be namespaced apart from
// future modules sharing the same Supabase database. Change the prefix here
// and the whole app follows.
const PREFIX = 'ai_management_'

export const T = {
  profiles: PREFIX + 'profiles',
  proposals: PREFIX + 'proposals',
  comments: PREFIX + 'comments',
  history: PREFIX + 'status_history',
  sessions: PREFIX + 'time_sessions',
}
