// These marks use the same 1254-unit source coordinates as their paper layers.
const marks={
 report:'<g transform="translate(310 355) rotate(-10)"><text>For my visit</text><path d="M0 60H610"/><text class="note-small" x="66" y="170">Reports</text><text class="note-small" x="66" y="305">Medicines</text><text class="note-small" x="66" y="440">Questions</text><path d="M0 130h38v38H0Z M0 265h38v38H0Z M0 400h38v38H0Z"/><path class="note-check" d="m3 143 13 13 27-34 m-40 156 13 13 27-34"/><path d="M0 510H510 M0 590H390"/></g>',
 list:'<g transform="translate(520 340) rotate(9)"><text class="note-list-title">My questions</text><text class="note-small" y="145">Any changes?</text><text class="note-small" y="270">My medicines</text></g>',
 note:'<g transform="translate(430 465) rotate(8)"><path class="note-check note-ready-check" d="m-20 40 100 95 185-230"/><text class="note-ready" x="-40" y="300">Ready</text></g>'
};
export function preparationMarks(composition,layer){
 return composition==='A32'&&Object.hasOwn(marks,layer)?`<g class="preparation-note-content" aria-hidden="true">${marks[layer]}</g>`:'';
}
