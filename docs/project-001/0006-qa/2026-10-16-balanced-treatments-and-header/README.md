# Balanced treatment overview and appointment header

The two owner-requested refinements are implemented and published through the existing clinic GitHub → Vercel route. Final source: `a77f772fbcf1766ea63353f3fc6a32865ddbf2cb`; implementation checkpoint: `1b1936ee5fb4cb7d2ab5f51b8e5b1ef45af0663c`. [Publication receipt](publication.json), [review record](review-record.md) and [implementation plan](implementation-plan.md) own the exact outcome and its boundaries. No tests or release gates ran.

| Request | Delivered |
|---|---|
| Equal treatment columns | Five entries per doctor; both desktop columns 527.265625px at 1440px. Added period/PCOS and after-childbirth entry points into the existing care detail. Ten opening links retain eight actual topics. |
| Restore appointment header | Brand left, navigation centred, bold appointment action right. Phone/tablet retain the menu and visible Book action. Hover, focus, active marking and sticky behavior remain. |
| Useful current destination | Header action opens real Contact phone choices while the display is OFF; enabled display opens booking. Existing shared refresh/admission rules, other booking links, forms and signed OFF routing are unchanged. |
| Documentation and publication | App README plus client status/README/brief/build notes updated and reviewed. Current versus preserved evidence, true topic/link counts and remaining provider/content inputs are explicit. |

Six existing repository files changed, including README; no dependency, runtime path, hosting-list, shared package or provider addition. The app remains 880 tracked files, with all 26 original review pairs, 26 portraits, 34 scene entries and eight treatment topics. Existing artwork/choreography/reviews/fees/schedules/policies remain.

Work branch: `codex/balanced-treatments-and-header-20261016`. Return branch: `checkpoint/before-balanced-treatments-and-header-20261016` at `b0f98ae61ed001ee37cf623c6f07ac2ecddbb81d`. The preceding complete-page branch and all earlier copies remain intact. Any future revert needs the owner's instruction; do not reset or force-push.

[Current local candidate](http://127.0.0.1:4221/) contains this refinement while its process runs. The preserved comparison at 4220 still shows the preceding b0f98ae release and is not represented as the latest header/overview. Before/after, six-width, menu/focus, selected-care and official captures are in `evidence/`.

Paused at the owner's request while attention returns to Project 004. On return, start with the saved handoff and owner feedback on the live header/overview or the next page. Actual online booking remains OFF, with provider setup unfinished separately. Genuine doctor/facility photos and client factual/photo approval remain later inputs. No real booking, payment, email, message or provider/database mutation occurred in this refinement.
