// Isolated headless-browser checks. All API data is a local fixture: no user account is read or changed.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const base = process.env.UI_BASE ?? "http://localhost:3000";
const browserExe = process.env.UI_BROWSER ?? "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const output = mkdtempSync(join(tmpdir(), "ufam-study-ui-"));
const browser = spawn(browserExe, ["--headless=new", "--no-first-run", "--no-default-browser-check", "--remote-debugging-port=0", `--user-data-dir=${join(output, "profile")}`, "about:blank"], { windowsHide: true, stdio: "ignore" });
const profile = { courseId: "course", curriculumId: "curriculum", courseCode: "FT05", courseName: "Engenharia da Computação", admissionYear: 2023, admissionTerm: 2 };
const subject = (id, code, name, hours, days, hour) => ({ id, code, name, workloadHours: hours, disciplineId: id, offeringCourse: null, sectionLabel: "CO1", academicTerm: "2026/2", source: "ECAMPUS_ENROLLMENT", category: "MANDATORY", status: "IN_PROGRESS", countAsElective: false, catalogMatched: true, inCurriculum: true, courseContext: null, meetings: days.map((weekday) => ({ id: `${id}-${weekday}`, weekday, startHour: hour, endHour: hour + 2 })), absences: [] });
const subjects = [
  subject("one", "FTL042", "ELETRÔNICA DIGITAL II", 60, [1, 3], 8),
  subject("two", "ICC901", "INTRODUÇÃO À PROGRAMAÇÃO DE COMPUTADORES", 60, [2, 4], 18),
  subject("three", "FTE030", "LABORATÓRIO DE SISTEMA DE CONTROLE", 30, [5], 10),
  subject("four", "FTL334", "ORGANIZAÇÃO E ADMINISTRAÇÃO INDUSTRIAL", 60, [3, 5], 14),
];
subjects[0].courseContext = { code: "FT05", name: "Engenharia da Computação", unitName: "Faculdade de Tecnologia", unitAbbreviation: "FT", relation: "CURRICULUM" };
subjects[1].courseContext = { code: "IE08", name: "Ciência da Computação", unitName: "Instituto de Computação", unitAbbreviation: "ICOMP", relation: "OFFERING" };
subjects[2].courseContext = subjects[0].courseContext;
const summary = { ...profile, profileCompleted: true, studentName: "Pessoa de teste", currentPeriod: 6, curriculumCode: "FT05-2009-1", progressAvailable: true };
const fixture = `(() => {
  const nativeFetch = window.fetch.bind(window);
  const subjects = ${JSON.stringify(subjects)};
  window.__uiWrites = [];
  window.fetch = async (input, init = {}) => {
    const path = new URL(typeof input === 'string' ? input : input.url, location.origin).pathname;
    if (!path.includes('/api/v1/')) return nativeFetch(input, init);
    const route = path.split('/api/v1')[1];
    let result;
    if (route === '/users/me') result = { id: 'fixture', name: 'Pessoa de teste', username: 'teste', email: 'ui@example.invalid', role: 'USER' };
    else if (route === '/academic-profile/me') result = ${JSON.stringify(profile)};
    else if (route === '/dashboard/summary') result = ${JSON.stringify(summary)};
    else if (route === '/progress/me/completed') result = { completedCodes: [] };
    else if (route === '/catalog/courses') result = [{ id: 'course', code: 'FT05', name: 'Engenharia da Computação', campus: 'Manaus', unitAbbreviation: 'FT', unitName: 'Faculdade de Tecnologia' }];
    else if (route === '/study/me/subjects') result = subjects;
    else if (route.endsWith('/absences') && init.method === 'POST') {
      const data = JSON.parse(init.body); window.__uiWrites.push({ route, data });
      result = { id: 'fixture-absence', note: null, ...data };
    } else return new Response(JSON.stringify({ detail: 'Unrecognized UI fixture route: ' + route }), { status: 400 });
    return new Response(JSON.stringify(result), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
})();`;

let socket;
let seq = 0;
const pending = new Map();
const exceptions = [];
function command(method, params = {}) {
  const id = ++seq;
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 15000);
    pending.set(id, { resolve, reject, timeout });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const response = await command("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.text);
  return response.result.value;
}
async function until(expression) {
  for (let i = 0; i < 200; i++) { if (await evaluate(expression)) return; await delay(150); }
  throw new Error(`UI condition not met: ${expression}`);
}
async function navigate(path, ready) {
  await command("Page.navigate", { url: base + path });
  await until(ready);
  await delay(550);
}
async function screenshot(name) {
  const { data } = await command("Page.captureScreenshot", { format: "png" });
  writeFileSync(join(output, name + ".png"), Buffer.from(data, "base64"));
}

async function assertViewportDialog() {
  await until("!!document.querySelector('[role=dialog]')?.matches(':modal')");
  const bounds = await evaluate("(() => { const dialog = document.querySelector('[role=dialog]'); const box = dialog.querySelector('[data-dialog-panel]').getBoundingClientRect(); const close = dialog.querySelector('[aria-label=Fechar]'); const rect = close.getBoundingClientRect(); const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2); return { top: box.top, bottom: box.bottom, left: box.left, right: box.right, height: innerHeight, width: innerWidth, closeVisible: close === hit || close.contains(hit), locked: document.body.style.overflow === 'hidden' }; })()");
  assert.ok(bounds.top >= 8 && bounds.bottom <= bounds.height - 8, `Dialog is vertically clipped: ${JSON.stringify(bounds)}`);
  assert.ok(bounds.left >= 8 && bounds.right <= bounds.width - 8, "Dialog must stay within viewport width");
  assert.equal(bounds.closeVisible, true, "Close button must not be behind the app header");
  assert.equal(bounds.locked, true, "Background page must not scroll while the dialog is open");
}

try {
  const portFile = join(output, "profile", "DevToolsActivePort");
  let port;
  for (let i = 0; !port && i < 100; i++) {
    try {
      if (existsSync(portFile)) {
        const candidate = readFileSync(portFile, "utf8").split(/\r?\n/)[0];
        if (/^\d+$/.test(candidate)) port = candidate;
      }
    } catch (error) { if (!["EBUSY", "ENOENT"].includes(error.code)) throw error; }
    if (!port) await delay(100);
  }
  assert.ok(port, "Headless browser did not start");
  const tabs = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  socket = new WebSocket(tabs.find((tab) => tab.type === "page").webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    if (message.id && pending.has(message.id)) {
      const item = pending.get(message.id); pending.delete(message.id); clearTimeout(item.timeout);
      if (message.error) item.reject(new Error(message.error.message)); else item.resolve(message.result);
    }
    if (message.method === "Runtime.exceptionThrown") exceptions.push(message.params.exceptionDetails.text);
  };
  await command("Page.enable"); await command("Runtime.enable");
  await command("Emulation.setTimezoneOverride", { timezoneId: "America/Manaus" });
  await command("Page.addScriptToEvaluateOnNewDocument", { source: fixture });
  await command("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });

  await navigate("/dashboard", "document.body.innerText.includes('Atualizar meus documentos')");
  assert.equal(await evaluate("Array.from(document.querySelectorAll('main a[href=\"/importar\"]')).length"), 1);
  await screenshot("dashboard-desktop");

  await navigate("/frequencia", "document.querySelectorAll('article').length === 4");
  const card = await evaluate("(() => { const el = document.querySelector('article'); return { height: el.getBoundingClientRect().height, inputCount: el.querySelectorAll('input, select').length, fontSize: getComputedStyle(el.querySelector('button')).fontSize }; })()");
  assert.ok(card.height < 310, `Attendance card is too tall: ${card.height}`);
  assert.equal(card.inputCount, 0); assert.equal(card.fontSize, "12px");
  assert.equal(await evaluate("document.querySelectorAll('main a[href^=\"https://\"]').length"), 0);
  await screenshot("attendance-desktop");
  await evaluate("document.querySelector('article button').click()");
  await until("!!document.querySelector('[role=dialog]')");
  await assertViewportDialog();
  assert.equal(await evaluate("document.querySelectorAll('[role=dialog] input[type=date], [role=dialog] select').length"), 0);
  const lessonDates = await evaluate("Array.from(document.querySelectorAll('[role=dialog] [data-class-date]')).map(b => ({ date: b.getAttribute('data-class-date'), selected: b.getAttribute('aria-pressed') === 'true', disabled: b.disabled }))");
  const today = await evaluate("new Date().toLocaleDateString('en-CA', { timeZone: 'America/Manaus' })");
  assert.ok(lessonDates.length > 0 && lessonDates.every(({ date }) => [1, 3].includes(new Date(date + 'T12:00:00Z').getUTCDay()) && date <= today), "Only past or current dates on the subject schedule may appear");
  assert.equal(lessonDates.filter((date) => date.selected && !date.disabled).length, 1, "Opening should select an available class date");
  await evaluate("document.querySelector('[aria-label=\"Mês anterior\"]').click()");
  await until("document.querySelector('[role=dialog] button[type=submit]').disabled");
  await evaluate("Array.from(document.querySelectorAll('[role=dialog] button')).find(b => b.textContent === 'Aula mais recente').click()");
  await until("!document.querySelector('[role=dialog] button[type=submit]').disabled");
  await delay(250); await screenshot("attendance-calendar");
  await evaluate("Array.from(document.querySelectorAll('[role=dialog] button')).find(b => b.textContent.includes('Confirmar 2 h')).click()");
  await until("document.body.innerText.includes('2 h de falta registradas')");
  assert.equal(await evaluate("window.__uiWrites[0].data.missedHours"), 2);
  await evaluate("document.querySelector('article button').click()");
  await assertViewportDialog();
  const savedDate = await evaluate("window.__uiWrites[0].data.missedOn");
  if (!await evaluate(`!!document.querySelector('[data-class-date="${savedDate}"]')`)) {
    await evaluate("document.querySelector('[aria-label=\"Próximo mês\"]').click()");
    await until(`!!document.querySelector('[data-class-date="${savedDate}"]')`);
  }
  assert.equal(await evaluate(`document.querySelector('[data-class-date="${savedDate}"]').disabled`), true, "The recorded class date must be locked");
  await command("Emulation.setDeviceMetricsOverride", { width: 320, height: 568, deviceScaleFactor: 1, mobile: true });
  await delay(200); await assertViewportDialog();
  assert.equal(await evaluate("Array.from(document.querySelectorAll('[data-class-date]')).every(button => button.scrollWidth <= button.clientWidth)"), true, "Class dates must not overflow on a narrow screen");
  await screenshot("attendance-class-dates-mobile");
  await evaluate("document.querySelector('[aria-label=Fechar]').click()");
  await command("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await screenshot("attendance-mobile");
  assert.equal(await evaluate("document.documentElement.scrollWidth <= window.innerWidth"), true, "Mobile attendance overflows horizontally");

  await command("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await navigate("/planejamento", "document.body.innerText.includes('Disciplinas deste semestre')");
  assert.equal(await evaluate("document.body.innerText.includes('Todos os períodos') || document.body.innerText.includes('Curso não informado')"), false);
  assert.equal(await evaluate("document.querySelectorAll('main button[aria-label^=\"Remover\"]').length"), 0);
  await screenshot("schedule-desktop");
  await evaluate("document.querySelector('[data-semester-subject]').parentElement.parentElement.scrollIntoView({ block: 'center' })");
  await delay(200);
  const columns = await evaluate("Array.from(document.querySelectorAll('[data-semester-subject]')).map(row => ({ section: row.querySelector('[data-subject-section]').getBoundingClientRect().x, times: row.querySelector('[data-subject-times]').getBoundingClientRect().x }))");
  assert.ok(columns.every((column) => Math.abs(column.section - columns[0].section) < 1 && Math.abs(column.times - columns[0].times) < 1), "All section and meeting columns must align");
  assert.equal(await evaluate("document.querySelector('[data-semester-subject=one]').innerText.includes('Faculdade de Tecnologia')"), true);
  assert.equal(await evaluate("document.querySelector('[data-semester-subject=two]').innerText.includes('Oferta:') && document.querySelector('[data-semester-subject=two]').innerText.includes('Instituto de Computação')"), true);
  assert.equal(await evaluate("document.querySelector('[data-semester-subject=four]').innerText.includes('Na sua matriz:') || document.querySelector('[data-semester-subject=four]').innerText.includes('Oferta:')"), false);
  await screenshot("schedule-aligned-list");
  for (const width of [390, 320]) {
    await command("Emulation.setDeviceMetricsOverride", { width, height: 844, deviceScaleFactor: 1, mobile: true });
    await delay(200);
    await evaluate("document.querySelector('[data-semester-subject]').parentElement.parentElement.scrollIntoView({ block: 'start' }); window.scrollBy(0, -100)");
    assert.equal(await evaluate("document.documentElement.scrollWidth <= window.innerWidth"), true, `Schedule list overflows at ${width}px`);
    assert.equal(await evaluate("Array.from(document.querySelectorAll('[data-semester-subject]')).every(row => row.scrollWidth <= row.clientWidth)"), true, `Subject row overflows at ${width}px`);
    await screenshot(`schedule-list-mobile-${width}`);
  }
  await command("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await evaluate("window.scrollTo(0, document.documentElement.scrollHeight)");
  await evaluate("Array.from(document.querySelectorAll('main button')).find(b => b.innerText.includes('FTL042')).click()");
  await until("!!document.querySelector('[role=dialog]')");
  await assertViewportDialog();
  assert.equal(await evaluate("document.querySelectorAll('[role=dialog] input, [role=dialog] select').length"), 0);
  assert.equal(await evaluate("document.querySelector('[role=dialog]').innerText.includes('Faculdade de Tecnologia')"), true);
  await screenshot("subject-details-scrolled-desktop");
  await command("Emulation.setDeviceMetricsOverride", { width: 320, height: 568, deviceScaleFactor: 1, mobile: true });
  await delay(200); await assertViewportDialog();
  await screenshot("subject-details-mobile");
  await command("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape" });
  await command("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape" });
  await until("!document.querySelector('[role=dialog]')");
  assert.equal(await evaluate("document.body.style.overflow"), "", "Closing must unlock the background");
  await command("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await evaluate("document.querySelector('[data-semester-subject=one] button').click()");
  await assertViewportDialog();
  await evaluate("document.querySelector('[aria-label=Fechar]').click()");
  await evaluate("Array.from(document.querySelectorAll('main button')).find(b => b.innerText === 'Rascunho').click()");
  await until("document.body.innerText.includes('Teste possibilidades')");
  await evaluate("Array.from(document.querySelectorAll('main button')).find(b => b.innerText === 'Planejar pelo catálogo').click()");
  await until("!!document.querySelector('[role=dialog]')");
  await assertViewportDialog();
  await screenshot("schedule-draft");
  assert.equal(await evaluate("document.body.innerText.includes('Curso que oferece a turma')"), false);
  await evaluate("document.querySelector('[role=dialog] summary').click()");
  await evaluate("document.querySelector('[role=dialog] button[aria-haspopup=listbox]').click()");
  await until("!!document.querySelector('[role=dialog] [role=listbox]')");
  assert.equal(await evaluate("document.querySelector('[role=dialog]').contains(document.activeElement)"), true, "Catalog menu must stay within the modal focus boundary");
  await command("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape" });
  await command("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape" });
  await until("!document.querySelector('[role=listbox]')");
  assert.equal(await evaluate("!!document.querySelector('[role=dialog]')"), true, "Escape should first close the dropdown, not the entire modal");
  assert.deepEqual(exceptions, [], "Browser runtime errors");
  console.log("OK: initial import CTA, compact cards, custom calendar, absence action, responsive layout, readonly enrollment and separate drafts.");
  console.log(`Screenshots: ${output}`);
} catch (error) {
  if (socket?.readyState === WebSocket.OPEN) {
    await screenshot("failure").catch(() => {});
    console.error(await evaluate("({ url: location.href, text: document.body.innerText.slice(0, 1800) })").catch(() => null));
    console.error("Runtime errors:", exceptions);
  }
  console.error(`Screenshots: ${output}`);
  throw error;
} finally {
  if (socket?.readyState === WebSocket.OPEN) { await command("Browser.close").catch(() => {}); socket.close(); }
  else browser.kill();
}
