import { supabase } from "./supabase";

// Sends a raw file to the extract-document edge function (which does the
// per-format parsing and the Claude call) and returns its proposal. Doesn't
// write anything — the caller decides what, if anything, to keep.
export async function extractDocument(file) {
  const form = new FormData();
  form.append("file", file);
  const { data, error } = await supabase.functions.invoke("extract-document", { body: form });
  if (error) {
    const message = (await error.context?.json?.().catch(() => null))?.error || error.message;
    throw new Error(message);
  }
  if (data?.error) throw new Error(data.error);
  return data.extraction;
}
