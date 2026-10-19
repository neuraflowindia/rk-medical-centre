> Dated GitHub handoff copy, 19 October 2026. The original working document is recorded in manifest.json. Relative links have been adapted for this repository; any unavailable local-only evidence is identified explicitly.

> **Historical design/planning reference — reviewed 19 October 2026.** Read [current status](../PROJECT-STATUS.md) and the current 18 October plan/delivery first. The text below records its original proposal/source state; its older “current”, “not started” or out-of-scope statements are date-bound. Preserve original/current/new comparisons and use current source before further edits.

# Project 001 — how the pages should read, look and move

13 October 2026. Strengthening pass complete. This is the plain-language guide for the proposed design. It works alongside [the comparison plan](11-comparison-and-richer-visual-plan.md), [image briefs](12-generated-image-briefs.md), [movement details](13-motion-and-background-spec.md) and [design values](DESIGN_SYSTEM.md). The owner approved this direction; the eight-page local study and comparison are now built. See the delivered review guide (local workspace reference: `03-client-projects/001-doctors/0006-qa/2026-10-13-comparison-build/README.md`).

## The main idea

The website should help someone answer three questions: **What care is available? Which doctor should I read about? How do I arrange a visit?**

Pictures should make the page easier to understand or more welcoming. Movement should help the page come together, then let people read. A section does not earn its place just because it can hold another picture or animation.

Keep the supplied clinic name and logo. Keep the navy and teal identity. Finish the design without invented rooms, people or large empty spaces waiting for photographs. The clinic facts already in the supplied website remain subject to owner confirmation; do not add claims about results, qualifications, equipment ownership or availability.

## What this pass changed

| What was weak | Stronger decision | Why |
| --- | --- | --- |
| Home showed service cards and another section explaining the same services. | One service section on Home. Detailed browsing belongs on Treatments. | People should not read the same explanation twice before reaching the doctors. |
| Several proposed images were different arrangements of the same instruments, cloth and notebooks. | Mix clear instrument pictures with two matching paper illustrations. | The website needs variety without looking like an equipment shop. |
| Baby booties made pregnancy care look like a newborn-product advert. | Use a clearly drawn paper illustration of pregnancy, with no real-looking person or baby. | It represents care during pregnancy, without suggesting only childbirth or a promised outcome. |
| Too many pastel backgrounds competed for attention. | Navy, warm white and pale blue lead. Mint supports a few sections; peach stays inside small image details. | The pages look related and more grown-up. |
| Doctor initials were becoming large badges. | Names and areas of care lead; any initials stay small. | Visitors should notice the doctor, not a decorative badge. |
| Three long entrance sequences had similar weight. | Strong opening, lighter service entrance, clear step-by-step visit sequence. | The page has variety and does not feel like the same trick repeated. |
| Moving selected treatments or step numbers could resemble loading or booking progress. | Those remain steady. Only the opening artwork gets a slow decorative loop. | A decorative effect must not imply that the website is processing something. |
| Some example copy talked about layouts, previews and how the website was built. | Put review notes in the comparison tool. Write the intended website copy for the person visiting the clinic. | The public-facing page should speak to its visitor. The private review still clearly explains that it cannot make bookings or send messages. |

## Home: one clear order

### 1. Introduce the clinic

**Heading:** “Doctor consultations in Lucknow.”

**Supporting words:** “Women's health, pregnancy care, ultrasound scans and general health concerns. Read about the doctors and treatments before you book.”

**Buttons:** “Book an appointment” and “See treatments.”

Use the generated stethoscope as one complete object, with a pale-blue background shape and one supporting care line. Do not surround it with floating service icons, orbiting dots or several decorative circles. The opening assembles in four overlapping parts over about **2 seconds** on a computer and **1.4 seconds** on a phone. The heading and buttons are available immediately.

On a phone, show the words first and the picture below. Do not shrink the words to force everything into one screen. The supplied logo remains recognizable, and Book stays available beside the menu.

### 2. Show the four areas of care

**Heading:** “Treatments at the clinic.”

**Supporting words:** “Choose a treatment to read more and see which doctor provides it.”

| Card heading | Short explanation | Link |
| --- | --- | --- |
| Women's health | Consultations for menstrual health and other gynaecology concerns. | Read about women's health |
| Pregnancy care | Check-ups and care during pregnancy. | Read about pregnancy care |
| Ultrasound scans | Information about the clinic's listed ultrasound services. | Read about ultrasound scans |
| General health | Doctor consultations and diabetes care. | Read about general health |

The four image areas come into place over about **1.4 seconds**. Card titles and links stay still and readable. Nothing changes category by itself. Each link opens the matching treatment on the Treatments page. Do not place another large service explanation below these cards.

On narrow phones, use four compact picture-and-text rows instead of squeezing the words into two thin columns. Each picture is about 96–112px square; the text keeps the remaining width. A short visible **“View treatment”** link can be used in these rows, with the treatment named in its spoken label. At wider phone/tablet sizes, two columns work; larger computers can show four. Pictures must survive that square crop without losing their meaning. On a narrow phone, each picture enters when its own row comes into view; do not finish the lower rows' animation before the reader reaches them.

Keep this same care order on Home, Treatments and About. Reserve numbered circles for the booking instructions, not for independent treatment cards.

The short descriptions above restate broad areas from the supplied catalogue; they do not add diagnoses, treatment promises or new clinical advice. The review notes identify the catalogue as unconfirmed client content.

### 3. Introduce both doctors

**Heading:** “Meet the doctors.”

**Supporting words:** “Read about each doctor's area of care before choosing your appointment.”

Show Dr. Parul Gupta and Dr. Sanjay Gupta with equal space and clear names. Use “Women's health and pregnancy care” and “General health and diabetes care” as the plain descriptions of their existing listed roles. Keep formal titles available where useful; do not make people decode them to understand the page.

Use a navy section with readable light text and two quiet summaries. Names lead; small initials may support them. The main action on each summary is **“Read doctor profile.”** Another Book button on every summary is unnecessary because the shared header already provides it.

This section gets a short introduction, not another large assembly. No fake photographs, invented awards or oversized “verified” badges.

### 4. Explain how to arrange a visit

**Heading:** “How to book an appointment.”

| Step | Words |
| --- | --- |
| 1. Choose a doctor | Read the doctor profiles and choose the care you need. |
| 2. Choose your visit | Select a date and time, then enter your details. |
| 3. Review your appointment | Check the details before you continue. |

The supporting notebook image, connecting line and three numbered circles assemble over about **1.8 seconds**. Words remain readable throughout. The line connects these steps only; it must not imply that the four independent treatments are a treatment sequence.

Afterwards, the line and numbers stay still. A small highlight on a number when hovered is enough. The instructions are not fake clickable cards. On phones the three steps run down the page, with the line clear of the words.

These are intended booking-page instructions. The local study remains clearly labelled as unable to book; it must not invent a successful reservation, charge or receipt.

### 5. Let people read patient feedback

**Heading:** “What patients have shared.”

Show a readable quotation, the supplied name and a **“Read full review”** action when the complete account needs more room. Do not move quotations across the page or rotate them while someone is reading.

Use only content already supplied for Project 001, preserve the actual quotation and identify its unverified status in the private review notes. Do not borrow approved reviews from Project 004, invent new feedback or add ratings. The new design is not proof that any review is genuine.

### 6. Help people take the next step

**Heading:** “Have a question before booking?”

**Supporting words:** “Find the clinic's contact details and directions.”

**Main action:** “Contact the clinic.” A smaller “Book an appointment” link may support it.

Use a pale-blue closing band with calm spacing. Do not repeat another image-heavy sales section or add another dark block directly against the footer. Keep the footer short and readable.

## Treatments page

Order: **what is available → choose a category → read the selected care → find the relevant doctor or book.**

- Heading: **“Treatments at the clinic.”** Introduction: “Choose a treatment to see what it covers and which doctor provides it.”
- All treatments shows four concise picture-and-text summaries. A chosen category opens one larger, readable detail view in the same area. Do not show both a complete duplicate card and a second explanation of it below.
- Detail headings say exactly what they contain: **“What this covers”**, **“Which doctor to see”** and **“Have a question?”** Only include information supported by the supplied catalogue; medical details still need owner approval before publication.
- Keep the same four category meanings and destinations everywhere. A plain label may say “General health and diabetes”; it still points to the existing physician category.
- A change of category takes about **a quarter of a second**. It keeps the chosen item clear and gives the words enough room. Do not rotate or reshuffle the categories automatically.
- The picture is useful, but the page is about care rather than equipment. Do not add a gallery of different instrument angles merely to fill space.

## About the clinic

Order: **what the clinic offers → who provides the care → where to find practical details.**

Headings: **“About R. K. Medical Centre”**, **“Care available at the clinic”**, **“The doctors you can meet”**, **“Before your visit.”**

Use one supporting image and a small care illustration. List the four care areas without repeating four large service cards. Introduce the two doctors briefly and link to their profiles. End with contact/directions information.

No invented room photographs, facility tours, grand claims or extra statistics. A useful page does not need a pretend building to feel finished. Keep movement to a short image/illustration entrance; the words remain still.

## Doctors page

Order: **choose a doctor → understand the area of care → open the profile.**

Heading: **“Meet the doctors.”** Supporting words: “Read about their areas of care before choosing your appointment.”

Use two equal summaries with readable names, role explanations and **“Read doctor profile.”** Do not place large empty portrait panels above them. If initials are used, they are small supporting details. A brief treatment link can help someone who is unsure which doctor to read about.

Do not repeat the Home review section here just to make the page longer. Short, useful content is preferable to repeated content.

## Both doctor profiles

Order: **name and role → area of care → relevant treatments → supplied feedback → appointment/contact action.**

Headings: the doctor's name, **“What this doctor can help with”**, **“Related treatments”**, **“What patients have shared”**, **“Arrange a visit.”**

The name, role and words give each profile its identity. Use a small related illustration only where it adds something. Do not replace a missing face with a giant initials panel. Degrees, years of experience and affiliations must be confirmed before they become public claims.

Keep feedback easy to read in full. Any switching is controlled by the reader. Both profiles follow the same structure; no unrelated visual style for one doctor.

## Contact

Order: **contact details and address → directions → ask a question.**

Headings: **“Contact the clinic”**, **“Phone and address”**, **“Get directions”**, **“Send a question.”**

Use the supplied address and contact information as provisional review content. The intended directions action uses a real destination. A decorative map must never look like an accurate location map. No made-up building, staff video or fake response-time promise.

Keep the contact form in its own white area, with clear labels and a **“Send message”** action. Preserve the existing name, email, phone and message fields; the supplied Contact form makes phone optional. This review does not change its field requirements or quietly copy the Booking form's rules. In the local study, submission is unavailable and explained by the review tool; no successful-delivery message is fabricated. Background decoration is static.

## Booking

Order: **choose doctor/date/time and enter details → review → real confirmation when a real booking service exists.**

Heading: **“Book an appointment.”** Supporting words: “Choose your doctor, date and time, then enter your details.”

Use clear labels such as **“Full name”**, **“Email address”**, **“Phone number”**, **“Choose a doctor”**, **“Date”** and **“Time.”** The supplied Project 001 form requires name, email and phone. This visual plan does not silently make any of them optional or remove them. Keep other existing visit fields represented; future operational changes need separate agreement.

Use a pale-blue outer area, white form and steady selected-date/time marks. The same teal action style belongs here. No floating instrument, moving step number, glowing appointment slot or background loop beside fields.

The study lets the owner inspect example selections, but it collects no patient/card data, makes no reservation and produces no receipt. That limitation is clearly stated in the private review interface and standalone preview notice. Do not fill the intended website text with explanations of how software is built.

## Shared header, footer and comparison tool

Keep the existing clinic name/logo and one consistent navigation: **Home, Treatments, About the clinic, Doctors, Contact, Book an appointment.** Profile pages make Doctors look selected. Selected links are clear before hover. On a phone, retain a short Book action and a clear menu; allow the clinic name to use two sensible lines at narrow widths.

The footer repeats useful navigation and the supplied contact details. Do not fill it with badges or social links that only open a platform's generic homepage. Legal text and client facts still need the relevant approval before publication; no new policy claims are written in this visual plan.

The comparison tool should be simpler than the website: **Page**, **Screen size**, **Show both / Enlarge earlier / Enlarge new**. Put section jumps and detailed animation controls under **More controls**. Use **“Earlier website”** and **“New design”** as the pane labels. **“Replay animation,” “Pause,” “Show finished layout”** are clearer than technical playback terms.

Only show animation controls when the chosen new section has an animation. Neither page should reload merely because the owner enlarges a pane. Both phone and computer comparisons use the same screen size on each side. Preserve the original unchanged, including its old imagery; a comparison is not permission to tidy the reference.

## Final wording and design checks

For every section, ask: **Can someone tell what this is from its heading? Does the first sentence add useful information? Does the button say where it goes? Does the picture help? Does the movement finish without delaying reading?**

Replace vague lines such as “Your path to personalized wellness,” “Care, explained simply,” “Know who you'll be speaking with,” or “Find the care you're looking for” with the direct headings above. Keep medical terms only where they identify a service, and explain them in ordinary words. Do not add Hindi merely as decoration or change the English-language choice without discussion.

The plan has been checked for repeated sections, picture meaning, colour balance, small-screen layout, consistent names/buttons, movement conflicts and truthful preview limits. The pictures, revised pages and comparison are implemented and have focused visual/behavior evidence. The next step is owner review of the actual comparison, then any specific corrections and a separately agreed application/publication programme.
