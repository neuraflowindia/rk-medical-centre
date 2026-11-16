// The laptop call panel. "Call" on a laptop must not be a dead end: it opens a small panel with
// both numbers in large tabular digits, each labelled by need. It is the same dialog and the
// same content as the phone call sheet; this part gives it its laptop form.
import {callSheet} from '../action-bar/action-bar.mjs';

/** Contents of the call panel: the call sheet's rows. */
export function callPanel(ctx){return callSheet(ctx);}
