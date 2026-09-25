# Changelog

Changes to the AI appointment triage prototype, newest first. Numbers such as 6.1 refer to
work packages in the project Gantt chart. The full code changes behind each entry are in the
git history.

## 25 September 2026: Clearer validation and a Patient / Reception switch

### Form validation (supervisor feedback, 7.5)

Before, a form error was a small line of red text at the bottom of the form. It was easy to
miss and didn't say which field was wrong.

- **Fields flash and a pop-up appears:** on submit, every field that needs attention flashes
  red, and a pop-up in the middle of the screen lists each problem. "Show me" scrolls to the
  first field and puts the cursor in it.
- **Messages say what is actually wrong,** for example:
  - "Email is missing an ending after "gmail", such as .com or .com.au."
  - "Email can't contain commas. Did you mean a full stop (.)?"
  - "That looks like a landline. Please enter a mobile number starting with 04."
  - "Please move the slider to choose a number from 0 to 10."
- **Feedback while typing:** email and mobile number are checked as soon as the patient
  leaves the field, not only on submit.
- **Coverage:** every booking step, the contact form, the clinician login and the reason a
  clinician must give when overriding an urgency level.

### Validation gaps found during testing, and fixed

- **Step 1 was less strict than the final submission.** An invalid email such as
  `name@gmail,,,.com` could pass step 1 and was only rejected at the very last step, with a
  generic "some details are missing or invalid" message. Both now use exactly the same rules.
- **When the final submission is rejected,** the pop-up now names the step and the field
  ("Your details: Email can't contain commas"). "Go to Your details" takes the patient
  straight there with the field marked. Once it's fixed, they go straight back to the
  appointment step with their chosen time kept.
- **Mobile numbers:** only Australian mobiles are accepted (starting with 04, 10 digits).
  Before, any 6 characters were accepted.
- **Date of birth:** dates before 1900 are rejected.
- **Severity slider:** it showed a middle value the patient hadn't chosen, then refused to
  continue. It now shows as unanswered until the patient sets it. The system deliberately
  never records a default severity, because a value the patient didn't choose could skew the
  urgency assessment.
- **Description length:** the 1,000-character limit on the concern description is checked on
  that step, not at final submission.

### Patient / Reception view switch (for demonstrations)

- A **Patient | Reception** toggle in both page headers (in the menu on phones) switches
  between the patient website and the reception dashboard in one click. A new booking can
  be shown arriving in the reception queue straight away.
- "Patient" returns to the last patient page visited.
- The password-free switch into Reception only works when running locally for development
  (`npm run dev`). A deployed build still requires the normal login.

### Testing

- 132 automated tests pass, up from 74.
- The full booking journey was run automatically in Chrome: 39 checks passed, including
  layout on a phone-sized screen.
- Type checking and linting are clean.

### Setup

- Fixed the package lockfile so a clean install (`npm ci`) works, and approved the install
  steps npm now requires for the database and build tools.

## 16 September 2026: Integration, testing and evaluation (6.1–6.6)

- **6.1 Error handling:** friendly error pages replace the default crash screen. Patient
  pages repeat the "call 000" advice and state that nothing was submitted. The clinician page
  warns that a failed load must not be read as an empty queue. Adds a custom "page not
  found" page.
- **6.2 Testing:** integration tests run against a real, temporary database. They cover
  submitting a booking, preventing double-booking, and clinician overrides with an audit
  trail. 74 tests, up from 47.
- **6.3 Scenario runs:** `npm run evaluate` runs all 26 simulated patient scenarios through
  the real system and regenerates
  [docs/evaluation-results.md](docs/evaluation-results.md).
- **6.4 Workflow comparison:** the system was scored against two models of conventional
  booking over the same 26 scenarios. Accuracy was 100% for the system, against 19.2%
  (no triage) and 50.0% (keyword triage). Emergency recall was 100%, against 0% and 83.3%.
  See [docs/workflow-comparison.md](docs/workflow-comparison.md).
- **6.5 Accuracy, usability and completeness:** each request captures 8.0 clinical data
  points, against 1.0 for a free-text form. Includes a heuristic usability review. The 100%
  accuracy measures consistency with the author's own scenarios, not clinical validity.
- **6.6 Safety, explainability, privacy and security:**
  [docs/safety-explainability-assessment.md](docs/safety-explainability-assessment.md)
  contains an explainability audit, a 10-item hazard analysis, and privacy and security
  reviews. It notes that the reception role is shown but not enforced, so reception staff can
  currently see a patient's full symptom history.

## 16 September 2026: Rebuilt as a single web application (6.1)

- Replaced the first prototype (6 backend services, 2 front-end apps, Docker) with one
  Next.js application and a SQLite database, which is simpler to run and demonstrate. The
  earlier version is kept in `_archive/careprior-v1/`.
- Follow-up questions now match the chosen complaint category. Before, a severe stomach
  complaint could be asked heart-related questions.
- Answers from a category the patient backed out of are discarded, so they can't set off the
  wrong safety rule (a cardiac warning had fired on an ankle injury).
- Every answer is checked against the question it belongs to. Invalid values, such as a
  severity of 999, are rejected rather than adjusted, because an adjusted answer could lower
  the urgency.
- 47 tests, up from 36.

## 31 July 2026: Doctor, insurance and time selection

- Added doctor, insurance and appointment-time steps to the booking flow, backed by simulated
  scheduling.

## 29 July 2026: First working prototype (CarePrior v1)

- End-to-end version of the case study: adaptive questions, safety rules, simulated AI
  interpretation, prioritisation, staff review and override, and an audit log. Built as six
  backend services, a patient portal and a staff dashboard.
- Fixed demo logins, which strict email checking had been rejecting.

## 27 July 2026: Project started
