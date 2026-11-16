// Words for the About the clinic page. No markup lives in this file; facts are imported, never retyped.
// (Skeleton: the page head only. The About builder fills in the rest.)
import {locality} from '../model.mjs';
import {practisingSince} from './shared.mjs';

export const aboutPage=Object.freeze({
 runningHead:'About the clinic',
 heading:`A family practice in ${locality} since ${practisingSince()}.`,
 emphasis:`since ${practisingSince()}.`
});
