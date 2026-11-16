// Review shelf behaviour. (Skeleton: the pure decisions; tabs, arrows and the reader arrive with
// the finished shelf.)

/** Which tab an arrow key moves to (pure). */
export function nextTab(index,key,count){
 if(count<=0)return -1;
 if(key==='ArrowRight')return (index+1)%count;
 if(key==='ArrowLeft')return (index-1+count)%count;
 if(key==='Home')return 0;
 if(key==='End')return count-1;
 return index;
}

export function bindReviewShelf(root,{signal,services}={}){}
