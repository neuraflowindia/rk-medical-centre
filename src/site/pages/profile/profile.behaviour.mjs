// A doctor's profile: the page's own behaviour. The shared parts on the page bind themselves
// (runtime/parts.mjs): the essentials strip paints the clinic's live state, the shelves move, the
// certificates open the viewer. The page adds nothing of its own.
// Everything added here must stop when `signal` aborts; the file must import cleanly outside a browser.
export function bindProfile(root,{signal,ctx,services}={}){}
