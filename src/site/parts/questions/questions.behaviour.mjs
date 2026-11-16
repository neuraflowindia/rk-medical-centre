// Native <details name> rows already open one at a time in current browsers. This keeps the same
// promise in a browser without that support: opening one row closes the others of its group.

/** The rows to close when `opened` opens (pure): every other open row with the same name. */
export function rowsToClose(rows,opened){
 const name=opened.getAttribute('name');
 return rows.filter(row=>row!==opened&&row.open&&row.getAttribute('name')===name);
}

export function bindQuestions(root,{signal}={}){
 for(const group of root.querySelectorAll('[data-questions]')){
  const rows=[...group.querySelectorAll('details')];
  for(const row of rows)row.addEventListener('toggle',()=>{if(row.open)for(const other of rowsToClose(rows,row))other.open=false;},{signal});
 }
}
