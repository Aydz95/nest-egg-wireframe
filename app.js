// Wireframe flow for the prelaunch landing screens: S01 Discovery, S02 Shared nest,
// and S03 Incubation (docs/build-spec/05, 01-player-journey J01-J03, PRELAUNCH-ONBOARDING.md).
// Landing ends at S03. S04 Shared bird and later screens are the live game after hatch,
// and are out of scope for this folder.
// Everything here is a mock: no network calls (the page CSP in index.html forbids them),
// no real X sign-in, no stored data. The reviewer panel picks what the "X" mock answers
// so every alternate state in the spec can be reached by clicking through the real flow,
// or by jumping straight to it.

const TARGET = 2000;          // Illustrative only. The real threshold is still to decide.
const MOCK_CODE = 'WIRE';     // Placeholder for the lightly hidden code in the X post.
const MILESTONES = [0, 20, 40, 60, 80, 100]; // Percent points where the nest visibly grows.
// Illustrative hatch instant only. Duration and the real timestamp are still open.
// 17:00 UTC is 12:00 PM in America/Toronto on this date (EST, UTC-5).
const HATCH_AT = Date.parse('2026-11-15T17:00:00Z');

const $ = (id) => document.getElementById(id);
const ui = {
  card: $('card'), screenId: $('screen-id'), progress: $('progress-text'), barFill: $('bar-fill'),
  count: $('count'), countOut: $('count-out'), account: $('mock-account'), follow: $('mock-follow'),
  phase: $('mock-phase'), notes: $('notes'), jump: $('jump'), stick: $('stick-drop'),
  stageLabel: $('nest-stage-label'), invite: $('invite'), inviteCode: $('invite-code'),
  incubation: $('mock-incubation'), readiness: $('mock-readiness'), egg: $('egg'),
  headline: $('headline'), headlineNote: $('headline-note'), nestCaption: $('nest-caption'),
};

let state = 'code';
let codeValue = '';

// Invitation attribution from the URL, shown as plain text (textContent, never innerHTML)
// because anything in a URL is untrusted input.
const invite = new URLSearchParams(location.search).get('invite');
if (invite) { ui.inviteCode.textContent = invite.slice(0, 24); ui.invite.hidden = false; }

const count = () => Number(ui.count.value);
const fmt = (n) => n.toLocaleString('en-US');
const nestComplete = () => ui.phase.value === 'complete' || count() >= TARGET;

// Small helper so state templates stay readable. Only static strings and numbers go in here.
const msg = (text, kind = '') => `<p class="msg ${kind}" role="${kind === 'error' ? 'alert' : 'status'}">${text}</p>`;
const note = (text) => `<p class="note">${text}</p>`;

const shareBlock = `
  <div class="actions">
    <button type="button" class="secondary" data-act="share">Invite someone to add theirs</button>
    <button type="button" class="secondary" data-act="share-card">See share card stub</button>
    <button type="button" class="secondary" data-act="telegram">Join Telegram for the reveal</button>
  </div>
  <p class="msg" id="share-out" role="status" hidden></p>
  ${note('Share and Telegram are optional. Neither adds a stick or any reward (R02). Personalised share card design is still open.')}`;

// Each state: which screen it belongs to, and the card markup.
const STATES = {
  // S01 Discovery
  'code': { screen: 'S01', label: 'Enter code', html: () => `
    <h2>Got the code?</h2>
    <form data-act="code" novalidate>
      <label for="code-input">Code from the post</label>
      <input type="text" id="code-input" autocomplete="off" autocapitalize="characters" spellcheck="false" value="${escapeAttr(codeValue)}">
      <div class="actions"><button type="submit">Continue</button></div>
    </form>
    ${note('The code links the post to this page. It is not a password or anti-bot check, and sharing it is fine.')}` },

  'code-invalid': { screen: 'S01', label: 'Invalid code', html: () => `
    <h2>Got the code?</h2>
    <form data-act="code" novalidate>
      <label for="code-input">Code from the post</label>
      <input type="text" id="code-input" autocomplete="off" spellcheck="false" aria-invalid="true" aria-describedby="code-err" value="${escapeAttr(codeValue)}">
      <p class="msg error" id="code-err" role="alert">That code does not match. Take another look at the post.</p>
      <div class="actions"><button type="submit">Try again</button></div>
    </form>
    ${note('Tone: a nudge, not a lockout. No attempt limit shown in the wireframe.')}` },

  'signin': { screen: 'S01', label: 'Sign in with X', html: () => `
    <h2>Code accepted</h2>
    <p>Sign in with X to add your stick.</p>
    <div class="actions"><button type="button" data-act="signin">Sign in with X</button></div>
    ${note('Mock. Real build identifies the account by stable X ID, not display name (J01).')}` },

  'follow': { screen: 'S01', label: 'Follow required', html: () => `
    <h2>One more step</h2>
    <p>Follow the account to finish. Then check again here.</p>
    ${followButtons()}
    ${note('Follow is required, locked by Caelan 2026-09-10. How it is verified is still open.')}` },

  'follow-missing': { screen: 'S01', label: 'Follow missing', html: () => `
    <h2>One more step</h2>
    ${msg('We could not see a follow yet. Follow the account, then check again.', 'error')}
    ${followButtons()}` },

  'follow-pending': { screen: 'S01', label: 'Check pending', html: () => `
    <h2>Checking your follow</h2>
    ${msg('This can take a moment. Your stick goes in as soon as the check passes.')}
    <div class="actions"><button type="button" data-act="check">Check again</button></div>
    ${note('Pending never shows as success. Nothing is counted yet (J01 step 4).')}` },

  'follow-unavailable': { screen: 'S01', label: 'Check unavailable', html: () => `
    <h2>We cannot check follows right now</h2>
    ${msg('This is on our side, not yours. Your sign-in is saved. Try again in a few minutes.', 'error')}
    <div class="actions"><button type="button" data-act="check">Try again</button></div>
    ${note('Explains the exact blocker and the recovery action (spec 05 interaction rules).')}` },

  'returning': { screen: 'S01', label: 'Returning account', html: () => `
    <h2>Welcome back</h2>
    ${msg('Your stick is already in. Signing in again does not add another.')}
    <div class="actions"><button type="button" data-act="go-already">See the nest</button></div>` },

  // S02 Shared nest
  'in': { screen: 'S02', label: 'Your stick is in', html: () => `
    <h2>Your stick is in.</h2>
    <p>You are one of ${fmt(count())}. When the nest is finished, you will see what belongs inside.</p>
    ${shareBlock}` },

  'already': { screen: 'S02', label: 'Already contributed', html: () => `
    <h2>Your stick is already in.</h2>
    <p>One stick per account. The nest keeps growing as others join.</p>
    ${shareBlock}` },

  'other-tab': { screen: 'S02', label: 'Completed in another tab', html: () => `
    <h2>The nest is finished.</h2>
    ${msg('It completed while this page was open. Your stick is part of it.')}
    <div class="actions"><button type="button" data-act="go-complete">See what is inside</button></div>
    ${note('Shared state updated elsewhere. The page refreshes the count, never adds a second stick.')}` },

  'late': { screen: 'S02', label: 'Late signup', html: () => `
    <h2>You made it in.</h2>
    ${msg(`The nest was already finished at ${fmt(TARGET)} sticks. Your account is set up and carries into what comes next.`)}
    <div class="actions"><button type="button" data-act="go-complete">See what is inside</button></div>
    ${note('Proposed default (J02): late accounts are created but the frozen completion count does not change. Still open.')}` },

  // Open decision from PRELAUNCH-ONBOARDING.md: whether to create a personalised share card.
  'share-card': { screen: 'S02', label: 'Share card stub', html: () => `
    <h2>Share card (stub)</h2>
    ${msg('Personalised share card treatment is still open. This is a labeled placeholder, not approved art or copy.')}
    <div class="stub-card" aria-hidden="true">
      <div class="stub-card-art">CARD ART PLACEHOLDER</div>
      <p class="stub-card-line">@handle · caretaker #????</p>
      <p class="stub-card-line">Invite link · campaign source</p>
    </div>
    <ul class="rules">
      <li>Not an NFT, mint slot, or payout claim.</li>
      <li>Sharing stays player-initiated. Sign-in does not let the project post for you.</li>
      <li>Final visual treatment, any early-access benefit, and when attribution locks are still to decide.</li>
    </ul>
    <div class="actions">
      <button type="button" class="secondary" data-act="share">Copy invite link (mock)</button>
      <button type="button" data-act="back-nest">Back to nest</button>
    </div>
    <p class="msg" id="share-out" role="status" hidden></p>
    ${note('Missing: approved card layout, artwork, caretaker numbering rules, and download/share treatment.')}` },

  // S03 Incubation. Completion and the egg reveal are one event (J02, R03).
  'egg': { screen: 'S03', label: 'Egg reveal', html: () => incubationBody('motion') },
  'reduced': { screen: 'S03', label: 'Reduced motion', html: () => incubationBody('static') },
  'delayed': { screen: 'S03', label: 'Launch delayed', html: () => incubationBody('delayed') },
  'no-token': { screen: 'S03', label: 'No token yet', html: () => incubationBody('no-token') },

  // Hatch readiness gate (J03 proposed). Landing ends here. Live S04 is not built in this folder.
  'hatch-gate': { screen: 'S03', label: 'Hatch readiness gate', html: () => hatchGateBody() },
};

function followButtons() {
  return `<div class="actions">
    <button type="button" class="secondary" data-act="open-x">Open X to follow</button>
    <button type="button" data-act="check">I followed, check now</button>
  </div>`;
}

function escapeAttr(s) { return String(s).replace(/[&"<>]/g, (c) => ({ '&': '&amp;', '"': '&quot;', '<': '&lt;', '>': '&gt;' })[c]); }

function hatchLabel() {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Toronto',
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  }).format(new Date(HATCH_AT));
}

function countdownText() {
  const ms = HATCH_AT - Date.now();
  if (ms <= 0) return 'The illustrative hatch time has passed. Use the hatch readiness gate to review what happens next.';
  const total = Math.floor(ms / 1000);
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  return days + 'd ' + hours + 'h ' + mins + 'm ' + secs + 's';
}

// Spec 05 canonical examples, labeled so incubation copy is not mistaken for a live offer.
function rulesBlock() {
  return `
    <h3>What this phase is</h3>
    <ul class="rules">
      <li>Your account carries forward. There is no second signup and no extra collection task.</li>
      <li>A stick records participation. It is not a deposit, an allocation, or a payout.</li>
      <li>The hatchling stays hidden until hatch. Trading, care, paid play, and funded draws stay closed until hatch and readiness both pass.</li>
    </ul>
    <h3>Rules you will use after hatch</h3>
    <ul class="rules">
      <li>Care: confirmed buys can become food you feed by hand. Confirmed sells can become waste you remove. Time creates hunger. Buying does not feed the bird.</li>
      <li>Ordinary play, in test units: Stake: 1 test NEST. Win chance: 47.5%. A win returns 2 test NEST total, including your stake. Otherwise the stake is lost.</li>
      <li>Ticket: Each accepted play earns one ticket for the next two egg draws, if they happen before entry closes. A ticket does not guarantee an egg.</li>
      <li>Personal egg funding: This egg appears when the protected nest collects the required amount. The time depends on eligible trading and fee collection.</li>
      <li>Closing rule: New entries are closed. Accepted results and funded claims remain in progress.</li>
    </ul>
    ${note('Those sentences are the canonical examples from spec 05. Test NEST is not a live balance. Final hatch copy is still open.')}`;
}

function scheduleBlock(mode) {
  const when = `<time datetime="2026-11-15T17:00:00Z">${hatchLabel()}</time>`;
  if (mode === 'delayed') {
    return `
      <p>Scheduled hatch time was ${when}.</p>
      ${msg('Launch delayed. Readiness was not met, so this stays in incubation. Trading, care, and paid play stay closed. A new hatch time has to be published before anything opens. The timer alone does not open them.', 'error')}
      ${note('Illustrative time only. This mock does not publish a revised hatch time.')}`;
  }
  return `
    <p>Hatch time: ${when}</p>
    <p>Countdown: <strong id="countdown">${escapeAttr(countdownText())}</strong></p>
    <div class="actions"><button type="button" class="secondary" data-act="go-hatch-gate">Review hatch readiness</button></div>
    ${note('Illustrative only. Incubation length and the real hatch time are not set. Nothing opens on the timer alone.')}`;
}

function incubationBody(mode) {
  const banner = {
    motion: msg('The nest finished, and the egg is here. There is no separate wait before it arrives.'),
    static: msg('Static reveal. The egg is already in the nest. Nothing here depends on animation.'),
    delayed: '',
    'no-token': msg('No token is available yet. You cannot buy, sell, or trade from this screen.', 'error'),
  }[mode];
  const tail = mode === 'static'
    ? note('Reduced motion keeps this static equivalent. The same facts stay on the page (J02, spec 05).')
    : note('Hatchling art stays hidden until hatch (R03). The oval is a placeholder, not approved art.');
  return `
    <h2>The egg is here.</h2>
    ${banner}
    ${scheduleBlock(mode)}
    ${rulesBlock()}
    <div class="actions">
      <button type="button" class="secondary" data-act="telegram">Join Telegram for updates</button>
    </div>
    <p class="msg" id="share-out" role="status" hidden></p>
    ${note('Telegram stays optional. It is not required, and it does not add a stick.')}
    ${tail}`;
}

function hatchGateBody() {
  const ready = ui.readiness.value === 'ready';
  const when = `<time datetime="2026-11-15T17:00:00Z">${hatchLabel()}</time>`;
  if (!ready) {
    return `
      <h2>Hatch readiness (blocked)</h2>
      <p>Scheduled hatch time was ${when}.</p>
      ${msg('Readiness failed. Stay in incubation. Do not show a live-money interface or accept wagers on the timer alone.', 'error')}
      <ul class="rules">
        <li>Mock gates checked: token live, asset config, trading adapter, shared-state service, game capacity, admission controls.</li>
        <li>A revised public hatch time must be published before retry.</li>
        <li>Hatchling appearance stays hidden.</li>
      </ul>
      <div class="actions">
        <button type="button" class="secondary" data-act="go-delayed">Show delayed-launch notice</button>
        <button type="button" data-act="back-egg">Back to egg</button>
      </div>
      ${note('Proposed launch behavior from J03. Real readiness checks and a live hatch timestamp are still open. Landing ends here.')}`;
  }
  return `
    <h2>Hatch readiness (ready)</h2>
    <p>Scheduled hatch time was ${when}.</p>
    ${msg('Mock readiness passed. Trading, care, paid play, and funded draws would open together at hatch (Sept 23 prototype decision).')}
    <ul class="rules">
      <li>Next product screen is S04 Shared bird (live care). It is not part of this landing wireframe.</li>
      <li>This folder stays prelaunch only: S01 Discovery, S02 Shared nest, S03 Incubation.</li>
      <li>Hatchling art, wallet link, and live care UI are deferred to the live build.</li>
    </ul>
    <div class="stub-card" aria-hidden="true">
      <div class="stub-card-art">S04 LIVE CARE PLACEHOLDER</div>
      <p class="stub-card-line">Not built here · see docs/build-spec/05</p>
    </div>
    <div class="actions">
      <button type="button" data-act="back-egg">Back to egg</button>
    </div>
    ${note('Missing for a live handoff: approved hatchling art, wallet connect, shared care scene, and operator readiness panel beyond this stub.')}`;
}

// Click-through uses the reviewer pick. An OS reduced-motion setting also lands on the static state.
function incubationTarget() {
  const pick = ui.incubation.value;
  if (pick === 'delayed' || pick === 'reduced' || pick === 'no-token') return pick;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 'reduced';
  return 'egg';
}

let countdownTimer = 0;
function armCountdown() {
  clearInterval(countdownTimer);
  if (!$('countdown')) return;
  const paint = () => {
    const node = $('countdown');
    if (!node) { clearInterval(countdownTimer); return; }
    node.textContent = countdownText();
  };
  paint();
  countdownTimer = setInterval(paint, 1000);
}

// Draw the nest bands and progress text from the current count.
function drawNest() {
  const onS03 = STATES[state].screen === 'S03';
  const n = Math.min(count(), TARGET);
  const pct = (nestComplete() || onS03) ? 100 : (n / TARGET) * 100;
  let stage = 0;
  document.querySelectorAll('#nest-bands .band').forEach((band) => {
    const on = pct >= Number(band.dataset.at);
    band.classList.toggle('on', on);
    if (on && Number(band.dataset.at) > 0) stage += 1;
  });
  ui.stageLabel.textContent = `milestone ${stage} of 5`;
  ui.barFill.style.width = pct + '%';
  ui.countOut.textContent = fmt(n);
  ui.progress.textContent = onS03
    ? 'Nest complete. Shared egg is in incubation. Hatchling stays hidden.'
    : nestComplete()
      ? `Nest complete. ${fmt(TARGET)} / ${fmt(TARGET)} sticks.`
      : `${fmt(n)} / ${fmt(TARGET)} sticks until the reveal.`;
}

function render({ focus = false, drop = false } = {}) {
  const s = STATES[state];
  const onS03 = s.screen === 'S03';
  ui.screenId.textContent = { S01: 'S01 Discovery', S02: 'S02 Shared nest', S03: 'S03 Incubation' }[s.screen];
  ui.headline.textContent = onS03 ? 'The nest is finished.' : 'Build the nest. Find out what belongs inside.';
  ui.headlineNote.textContent = onS03
    ? 'Wireframe heading. Final wording is still open.'
    : 'Candidate copy from PRELAUNCH-ONBOARDING.md. Final wording open.';
  ui.nestCaption.textContent = onS03
    ? 'Shared egg placeholder in the finished nest. Hatchling appearance stays hidden until hatch.'
    : 'Nest fills visually at milestones (here every 20%). Creature and project details stay hidden in prelaunch.';
  ui.card.innerHTML = s.html();
  ui.egg.classList.remove('show', 'arrive');
  if (onS03) ui.egg.classList.add(state === 'reduced' ? 'show' : 'arrive');
  drawNest();
  armCountdown();
  ui.jump.querySelectorAll('button').forEach((b) => {
    if (b.dataset.state === state) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
  });
  // Replaying the drop: remove then re-add the class on the next frame so the animation restarts.
  ui.stick.classList.remove('drop');
  if (drop) requestAnimationFrame(() => ui.stick.classList.add('drop'));
  // Move keyboard focus to the new step only after a user action, so the reader lands on the change.
  if (focus) { const field = ui.card.querySelector('input[aria-invalid=true]') || ui.card; field.focus(); }
}

function go(next, opts = {}) { state = next; render({ focus: true, ...opts }); }

// The single commit point: activation, one stick and the public count move together (J01 step 5).
function commitStick() {
  if (nestComplete()) { go('late'); return; }
  ui.count.value = String(count() + 1);
  go(count() >= TARGET ? 'other-tab' : 'in', { drop: true });
}

function checkFollow() {
  const result = ui.follow.value;
  if (result === 'ok') commitStick();
  else go({ missing: 'follow-missing', pending: 'follow-pending', unavailable: 'follow-unavailable' }[result]);
}

async function share() {
  const out = $('share-out');
  // Placeholder link. Real invite links and attribution rules live in S09 / referral policy.
  const link = location.origin + '/?invite=K7Q2';
  try { await navigator.clipboard.writeText(link); out.textContent = 'Invite link copied: ' + link; }
  catch { out.textContent = 'Your invite link: ' + link; }
  out.hidden = false;
}

// One delegated listener for all card buttons and the code form.
ui.card.addEventListener('submit', (e) => {
  e.preventDefault();
  codeValue = $('code-input').value;
  go(codeValue.trim().toUpperCase() === MOCK_CODE ? 'signin' : 'code-invalid');
});
ui.card.addEventListener('click', (e) => {
  const act = e.target.closest('[data-act]')?.dataset.act;
  if (!act || e.target.tagName === 'FORM') return;
  const out = $('share-out');
  ({
    signin: () => go(ui.account.value === 'returning' ? 'returning' : 'follow'),
    check: checkFollow,
    'open-x': () => { /* Mock: real build opens the account page on X in a new tab. */ e.target.textContent = 'Opened X (mock)'; },
    'go-already': () => go('already'),
    'go-complete': () => go(incubationTarget()),
    'go-hatch-gate': () => go('hatch-gate'),
    'go-delayed': () => go('delayed'),
    'back-egg': () => go(incubationTarget()),
    'back-nest': () => go(nestComplete() ? 'already' : 'in'),
    'share-card': () => go('share-card'),
    share,
    telegram: () => { out.textContent = 'Mock: opens the Telegram channel link.'; out.hidden = false; },
  })[act]?.();
});

// Reviewer panel wiring.
const GROUPS = { S01: 'S01 Discovery', S02: 'S02 Shared nest', S03: 'S03 Incubation' };
let lastGroup = '';
for (const [key, s] of Object.entries(STATES)) {
  if (s.screen !== lastGroup) { const g = document.createElement('div'); g.className = 'group'; g.textContent = GROUPS[s.screen]; ui.jump.append(g); lastGroup = s.screen; }
  const b = document.createElement('button');
  b.type = 'button'; b.dataset.state = key; b.textContent = s.label;
  b.addEventListener('click', () => { state = key; render(); });
  ui.jump.append(b);
}
ui.count.addEventListener('input', () => render());
ui.phase.addEventListener('change', () => render());
ui.readiness.addEventListener('change', () => { if (state === 'hatch-gate') render(); });
$('other-tab').addEventListener('click', () => {
  // Another tab pushed the count over the line. Contributors see the finished notice;
  // anyone still in S01 becomes a late signup when they finish activating.
  ui.count.value = String(TARGET);
  if (STATES[state].screen === 'S02') go('other-tab'); else render();
});
ui.notes.addEventListener('change', () => document.body.classList.toggle('hide-notes', !ui.notes.checked));
$('reset').addEventListener('click', () => {
  ui.count.value = '843'; ui.phase.value = 'open'; ui.account.value = 'new'; ui.follow.value = 'ok';
  ui.incubation.value = 'scheduled'; ui.readiness.value = 'blocked'; codeValue = '';
  go('code');
});

render();
