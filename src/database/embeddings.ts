import { supabase } from '../lib/supabase';

// Production-ready client helper: request server to embed and update the row.
// This calls a Supabase Edge Function named 'embed_entry'. The function should:
//  - validate the user's JWT
//  - call Google Gemini with a server-side API key
//  - normalize and store the embedding in public.journal_entries.embedding
export async function requestEmbeddingUpdate(clientId: number, title: string, content: string): Promise<void> {
  const { error } = await supabase.functions.invoke('embed_entry', {
    body: {
      client_id: clientId,
      title,
      content,
    },
  });
  if (error) throw error;
}
