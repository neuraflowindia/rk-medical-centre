// The phone menu: the inside of the `#menu` dialog. Links as large rows, then the two actions.
import {menuNavigation,navigationCurrent} from '../../../clinic/page-content/shared.mjs';
import {attrs,text} from '../../lib/html.mjs';
import {icon} from '../../icons/icons.mjs';
import {bookingEntry,callButton} from '../button/button.mjs';

/** Contents of `#menu-links`. The current page is marked; the booking row exists only while booking is ON. */
export function menuLinks(ctx){
 const rows=menuNavigation.filter(item=>!item.bookingOnly).map(item=>
  `<li><a${attrs({class:'menu__link',href:item.path,'aria-current':navigationCurrent(item.path,ctx.path)?'page':null})}><span>${text(item.label)}</span>${icon('arrow')}</a></li>`).join('');
 return `<ul class="menu__list">${rows}</ul><div class="menu__actions">${bookingEntry(ctx,{place:'header',className:'menu__book'})}${callButton(ctx,{className:'menu__call'})}</div>`;
}
