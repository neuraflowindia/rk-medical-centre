// Words around the booking screens: the page heads and the "unavailable" panel. No markup lives
// in this file; facts are imported, never retyped. (Skeleton: today's words. The booking builder
// fills in the rest. The booking steps' own sentences stay inside the booking island.)
export const bookingPage=Object.freeze({
 heading:'Book your visit',
 intro:'Choose your doctor and an available appointment.'
});
export const bookingDetailsPage=Object.freeze({
 heading:'Find your booking'
});
/** The panel shown instead of the booking screens while booking cannot be opened. */
export const bookingUnavailableWords=Object.freeze({
 opening:'Opening appointment booking…',
 checking:'Checking appointment booking…',
 unavailable:'Online booking is currently unavailable',
 error:'We could not open the booking form',
 help:'You can call the clinic to arrange your visit.',
 retry:'Check again'
});
