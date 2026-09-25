const domainSel = document.getElementById("domain");
const targetSel = document.getElementById("target");
const mergeBtn = document.getElementById("merge");
const statusEl = document.getElementById("status");

function domainOf(url) {
  try {
    const u = new URL(url);
    if (u.protocol === "http:" || u.protocol === "https:") {
      return u.hostname.replace(/^www\./, "");
    }
  } catch (e) {}
  return null;
}

async function refresh() {
  const tabs = await browser.tabs.query({});
  const counts = new Map();
  for (const t of tabs) {
    const d = domainOf(t.url);
    if (d) counts.set(d, (counts.get(d) || 0) + 1);
  }
  const prevDomain = domainSel.value;
  domainSel.replaceChildren();
  [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .forEach(([d, n]) => domainSel.add(new Option(`${d} (${n})`, d)));
  if (prevDomain && counts.has(prevDomain)) domainSel.value = prevDomain;

  const windows = await browser.windows.getAll({ populate: true, windowTypes: ["normal"] });
  const current = await browser.windows.getCurrent();
  const prevTarget = targetSel.value;
  targetSel.replaceChildren(new Option("New window", "new"));
  windows.forEach((w, i) => {
    const active = w.tabs.find((t) => t.active);
    const title = active ? active.title : "";
    const label = `Window ${i + 1}${w.id === current.id ? " (current)" : ""} – ${w.tabs.length} tabs – ${title}`;
    targetSel.add(new Option(label.slice(0, 90), String(w.id)));
  });
  if (prevTarget && [...targetSel.options].some((o) => o.value === prevTarget)) {
    targetSel.value = prevTarget;
  }

  mergeBtn.disabled = counts.size === 0;
}

async function merge() {
  const domain = domainSel.value;
  if (!domain) return;
  mergeBtn.disabled = true;

  const tabs = (await browser.tabs.query({})).filter((t) => domainOf(t.url) === domain);
  let windowId;
  let toMove = tabs;

  if (targetSel.value === "new") {
    const [first, ...rest] = tabs;
    const win = await browser.windows.create({ tabId: first.id });
    windowId = win.id;
    toMove = rest;
  } else {
    windowId = Number(targetSel.value);
    toMove = tabs.filter((t) => t.windowId !== windowId);
  }

  // Pinned tabs can't be moved past unpinned ones; unpin them first.
  for (const t of toMove) {
    if (t.pinned) await browser.tabs.update(t.id, { pinned: false });
  }
  if (toMove.length) {
    await browser.tabs.move(toMove.map((t) => t.id), { windowId, index: -1 });
  }
  await browser.windows.update(windowId, { focused: true });

  statusEl.textContent = `Moved ${toMove.length} of ${tabs.length} ${domain} tab(s).`;
  await refresh();
}

mergeBtn.addEventListener("click", () =>
  merge().catch((e) => {
    statusEl.textContent = `Error: ${e.message}`;
    mergeBtn.disabled = false;
  })
);

refresh();
