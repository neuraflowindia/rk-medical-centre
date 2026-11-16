// Words around the booking screens: the page heads and the panel shown while the screens cannot
// be used. No markup lives in this file; facts are imported, never retyped. (The booking steps'
// own sentences travel with the steps, in src/booking/booking-steps.mjs.)
import {bookingPaths} from './shared.mjs';

/** `/booking`. `emphasis` is the one phrase of the heading set in italics. */
export const bookingPage=Object.freeze({
 heading:'Book your visit.',
 emphasis:'your visit.'
});
/** `/booking-details` (and the older `/booking-help`). */
export const bookingDetailsPage=Object.freeze({
 heading:'Find your booking.',
 emphasis:'your booking.',
 bookNew:Object.freeze({label:'Book a new appointment',path:bookingPaths.book})
});
/**
 * The panel shown instead of the booking screens while they cannot be used.
 *   opening      the screens are being loaded
 *   checking     the booking state is being read
 *   unavailable  the clinic has online booking switched off
 *   error        the screens could not be loaded
 * `kept` is added when booking stops while someone is in the middle of the steps.
 */
export const bookingUnavailableWords=Object.freeze({
 opening:'Opening appointment booking…',
 checking:'Checking appointment booking…',
 unavailable:'Online booking is currently unavailable',
 error:'We could not open the booking form',
 help:'You can call the clinic to arrange your visit.',
 kept:'Your details are kept while this page stays open.',
 retry:'Check again'
});
