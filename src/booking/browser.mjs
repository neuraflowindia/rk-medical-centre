import {createBookingBrowser} from '../../appointment-system/browser/booking/index.mjs';
import {productState} from '../clinic/product-state.mjs';
const profile=__BOOKING_PROFILE__;

export const bookingBrowser=createBookingBrowser({version:1,
  installation_id:profile.installation_id,environment:profile.environment,
  legacy_callbacks:[],legacy_receipts:[],
  payment:{name:profile.label,description:'Doctor appointment',color:'#17675e'}
},{product:productState});
