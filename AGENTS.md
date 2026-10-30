<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Project rules
- Firebase Authentication owns identity; app profiles, published sujets, submissions, and per-user drafts sync through Firestore in `src/lib/store.ts`. Local storage is only used to remember the signup role choice before authentication.
- Teacher capabilities require an admin-managed `teacherAllowlist/{uid}` document. Publish `firestore.rules`; never treat the editable profile role as authorization. The root route gate and Firestore rules both enforce the role boundary.
- Sujet scanning runs in `src/lib/scan.functions.ts`, verifies Firebase ID tokens and teacher approval, and falls back across server-only Google AI Studio, OpenRouter, Groq, Cloudflare Workers AI, Ollama Cloud, Requesty, and xAI keys. Do not restore the Lovable AI gateway or expose provider keys to the client.
- Teacher correction drafts are stored under `users/{uid}/corrections/{submissionId}`; only published corrections belong on student-readable submissions.
- Offline handwritten answer scans are stored as size-limited page records under `submissions/{submissionId}/offlinePages`; rules grant access only to the submitting student and the approved assigned teacher.
- Button sounds come from one global handler in `__root.tsx`; use `data-sfx="none"` when a button plays its own sound and `data-sfx="back"` for back/close buttons, so sounds never stack.
- Render exam mathematics through MathText with untrusted KaTeX disabled; centralized legacy normalization keeps previously saved scans readable.
- Store draft and published corrections on submissions and normalize question scores centrally; students only see published evaluations.
- Export exam sections through browser-only PDF capture using print-safe sRGB paper tokens and compressed PNG pages with question-aware pagination to avoid unsupported canvas color fills and JPEG transparency artifacts; prepare blobs before a separate download click for mobile activation. The printer button invokes native printing synchronously with a paper stylesheet, never a hidden PDF iframe, because mobile PDF viewers cannot reliably print embedded files. Generated downloads exclude browser-added headers and URLs.
- Handle mobile keyboard visibility once through MobileKeyboard and visual-viewport CSS overrides, so every form shares the behavior without altering desktop layouts.
- Dashboard detail pages use shared ActivityPages with separate flat leaf routes; teacher sujet viewing uses the read-only SujetPreview, including legacy solve links, to keep teacher visits from creating student drafts.
