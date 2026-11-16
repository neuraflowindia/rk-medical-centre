// Treatments: the page's own behaviour. The shared parts on the page bind themselves (runtime/parts.mjs).
// Everything added here must stop when `signal` aborts; the file must import cleanly outside a browser.
export function bindTreatments(root,{signal,ctx,services}={}){}
