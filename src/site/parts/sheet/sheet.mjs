// Sheets: the look every dialog shares (menu, call sheet and call panel, reader, viewer).
// The dialogs themselves live in index.html after `#app`; their insides are drawn by script.
import {text} from '../../lib/html.mjs';

/** A plain message inside a sheet's body. */
export function sheetNote(words){return `<p class="sheet__note">${text(words)}</p>`;}
