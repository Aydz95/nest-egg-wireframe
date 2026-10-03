// Wireframe flow for S01 Discovery and S02 Shared nest (docs/build-spec/05, PRELAUNCH-ONBOARDING.md).
// Everything here is a mock: no network calls (the page CSP in index.html forbids them), no real X sign-in,
// no stored data. The reviewer panel picks what the "X" mock answers so every alternate state
// in the spec can be reached by clicking through the real flow, or by jumping straight to it.

const TARGET = 2000;          // Illustrative only. The real threshold is still to decide.
const MOCK_CODE = 'WIRE';     // Placeholder for the lightly hidden code in the X post.
const MILESTONES = [0, 20, 40, 60, 80, 100]; // Percent points where the nest visibly grows.

const $ = (id) => document.getElementById(id);
const ui = {
  card: $('card'), screenId: $('screen-id'), progress: $('progress-text'), barFill: $('bar-fill'),
  count: $('count'), countOut: $('count-out'), account: $('mock-account'), follow: $('mock-follow'),
  phase: $('mock-phase'), notes: $('notes'), jump: $('jump'), stick: $('stick-drop'),
  stageLabel: $('nest-stage-label'), invite: $('invite'), inviteCode: $('invite-code'),
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
    <button type="button" class="secondary" data-act="telegram">Join Telegram for the reveal</button>
  </div>
  <p class="msg" id="share-out" role="status" hidden></p>
  ${note('Both optional. Neither adds a stick or any reward (R02). Share card design still open.')}`;

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

  // S03 stub so the hand-off point is visible. Not designed here.
  'complete': { screen: 'S03', label: 'Hand-off to incubation', html: () => `
    <h2>[ S03 Incubation ]</h2>
    <p>Completion and the egg reveal are one event. The egg, project explanation and hatch countdown live on S03.</p>
    ${note('Out of scope for this wireframe. Hatchling stays hidden until hatch (R03).')}` },
};

function followButtons() {
  return `<div class="actions">
    <button type="button" class="secondary" data-act="open-x">Open X to follow</button>
    <button type="button" data-act="check">I followed, check now</button>
  </div>`;
}

function escapeAttr(s) { return String(s).replace(/[&"<>]/g, (c) => ({ '&': '&amp;', '"': '&quot;', '<': '&lt;', '>': '&gt;' })[c]); }

// Draw the nest bands and progress text from the current count.
function drawNest() {
  const n = Math.min(count(), TARGET);
  const pct = nestComplete() ? 100 : (n / TARGET) * 100;
  let stage = 0;
  document.querySelectorAll('#nest-bands .band').forEach((band) => {
    const on = pct >= Number(band.dataset.at);
    band.classList.toggle('on', on);
    if (on && Number(band.dataset.at) > 0) stage += 1;
  });
  ui.stageLabel.textContent = `milestone ${stage} of 5`;
  ui.barFill.style.width = pct + '%';
  ui.countOut.textContent = fmt(n);
  ui.progress.textContent = nestComplete()
    ? `Nest complete. ${fmt(TARGET)} / ${fmt(TARGET)} sticks.`
    : `${fmt(n)} / ${fmt(TARGET)} sticks until the reveal.`;
}

function render({ focus = false, drop = false } = {}) {
  const s = STATES[state];
  ui.screenId.textContent = { S01: 'S01 Discovery', S02: 'S02 Shared nest', S03: 'S03 Incubation (stub)' }[s.screen];
  ui.card.innerHTML = s.html();
  drawNest();
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
    'go-complete': () => go('complete'),
    share,
    telegram: () => { out.textContent = 'Mock: opens the Telegram channel link.'; out.hidden = false; },
  })[act]?.();
});

// Reviewer panel wiring.
const GROUPS = { S01: 'S01 Discovery', S02: 'S02 Shared nest', S03: 'Hand-off' };
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
$('other-tab').addEventListener('click', () => {
  // Another tab pushed the count over the line. Contributors see the finished notice;
  // anyone still in S01 becomes a late signup when they finish activating.
  ui.count.value = String(TARGET);
  if (STATES[state].screen === 'S02') go('other-tab'); else render();
});
ui.notes.addEventListener('change', () => document.body.classList.toggle('hide-notes', !ui.notes.checked));
$('reset').addEventListener('click', () => {
  ui.count.value = '843'; ui.phase.value = 'open'; ui.account.value = 'new'; ui.follow.value = 'ok'; codeValue = '';
  go('code');
});

render();
