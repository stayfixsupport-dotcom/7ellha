# 7ellha: Your Learning Solution

you are a arabic senior web designer, UI UX & SEO specialist, you are the best in your promo as a web designer, you know everything about designing ui ux and everything about how illustrations and animations should be put in the webstie
Role: I want you to design a full responsive website ( nammed 7ellha - حلها ) don't connect it with a database just use fake data for now its okey, the website porpes is education and a live platform where the teacher can upload sujets ( sujets can be in pictures or in pdf or in docx ) and a AI scannes this sujets and direct them to its study level and its catigorie for example math or for example phisycs and so on(but the levels put in mind are for algerian education which are for now شهادة البيام و السنة الاولى ثانوي و السنة الثانية ثانوي و شهادة البكالوريا ) you can use the site for any further info https://eddirasa.com/),then the first page as a welcome there should be like a selection role page where there should be vector art or 3d art or something so good like the attach pictures so you will need to generate this pics and use them as webp or svgs, the arabic font should be so good and big and so clear and very beatifull like the 4rth attached picture bro please, before the first page ( the role selection) there should be an intro for the typography 7ellha - حلها with a sound effect and a bouncing letters and then locking in with vibration and enviromental waves ( the intro should be so creative and colorfull and so good in design like every lock in letter there should be a smooth wave of something discribtive for the website for example illustrations svg for teacher moving and typographie like a liquid glass or liquide moving or something so creative like this please) then the first page which is the role selection should be something like the 5rth attached picture but no like it because its like white and has nothing good there should be live illustrations and good colors cause its so bad in desgin please be creative, (also do the best colors for our website that matches with the logo ofc) after the page of selection role, there should be a sign up page or login page that should react as the selected role ofc it should feel like its lively responsive not just a fixed blad old html and css bad design, after sign up there should be a welcome fit to screen swipe-able pages like the 6th to 9th screenshots attached;(it shouldn't be exactly like it in design and typographie but the idea of every page with a color its so good and i really like it but be creative and make it so good and illustratied and animated and so impeccable,then after this welcome page that has notices and illustrations about the website and ofc every role should has his notices and his illustartions;it shouldn't be the same as the other role ofc, then after it for student it should direct him to dashboard homepage of his, but for teacher there should be a form first that is so easy for him to add a profile picture and a name and a last name also a some options should be selected that what he does teaches from the mattieres ( this should appear when the teacher selects the level of study) the level of study ofc, and so on this form should be fit and one screen for mobile view or desktop view and should be swipable like the before page and there should be lieke a 41, so after a teacher scanns the sujet and the ai does his thing, then for the student ofc everything should be managed in their pages even students

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/d46ad81f-9209-4dac-8082-abfd180ba1ce).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Firebase backend setup

Copy the Firebase web-app values from `.env` into the `VITE_FIREBASE_*` variables in your deployment. These Firebase web configuration values identify the project; they are public client configuration, not provider secrets. Keep every AI key server-only and never add a `VITE_` prefix to it. `.env` is ignored by Git; `.env.example` is the template.

Enable Email/Password and Google under Firebase Authentication. Publish [`firestore.rules`](firestore.rules) in Firestore Rules before allowing users to access the app. The application uses this schema:

- `users/{uid}`: requested app role, teacher-request status, display name, email, photo, teacher profile and student level. Role fields are preferences only; teacher access still requires admin approval.
- `users/{uid}/drafts/{sujetId}`: one user's saved answers for a sujet.
- `users/{uid}/corrections/{submissionId}`: private teacher correction drafts; never readable by students.
- `sujets/{id}`: published sujet with immutable `ownerUid` identifying its teacher.
- `submissions/{id}`: answer sheet with `studentUid`, `teacherUid`, and optional `delivery`/`offlinePageCount`; only that student or the approved owner may read it. The `correction` field is written only after publication.
- `submissions/{id}/offlinePages/{pageId}`: one compressed handwritten answer photo per page, readable only by its student and the approved teacher assigned to that submission.
- `teacherAllowlist/{uid}`: admin-managed `{ "approved": true }`; the user may read or delete their own entry but cannot grant approval.

Teacher signup requests do not grant publishing or correction access. After verifying a teacher, create `teacherAllowlist/{uid}` in the Firebase console with `approved: true`; the UID is available in Authentication. This allowlist is the authorization boundary used by Firestore rules, the route gate and the AI scan server function. Never grant it based only on the account's editable profile role.

Set `FIREBASE_WEB_API_KEY` and `FIREBASE_PROJECT_ID` in the server environment so server functions can verify Firebase ID tokens and check teacher approval. Configure AI keys on the server; providers are tried in fallback order: Google AI Studio, Groq, OpenRouter, Cloudflare Workers AI, Ollama Cloud, Requesty, Cohere, then xAI. Cloudflare and Cohere are text-only fallbacks; selectable PDF text is extracted to make them available when image-capable providers fail. Cloudflare requires both `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN`. The xAI key may also be set as `XKIRO_API_KEY`. At least one provider must be configured for sujet scanning; no Lovable AI key is used.

For production, configure the same environment variables in the server hosting the TanStack Start app. Deploy `firestore.rules` before launch; do not use permissive test rules. Account deletion requires recent Firebase reauthentication and removes the user's Firestore records before deleting the Firebase Authentication account.

## Public SEO setup

Set `VITE_PUBLIC_SITE_URL` to the final canonical origin in Netlify's build environment, for example `https://your-domain.example` (without a path). The home page uses it for canonical and social-share URLs. `/robots.txt` and `/sitemap.xml` are served by the app; the sitemap lists only the public landing page, not authenticated dashboards or student data. After deploying to your final domain, verify the sitemap and submit it in Google Search Console. Google controls when and where pages are indexed, so search rankings cannot be guaranteed.
