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
  // Only domains with at least two tabs are worth merging.
  for (const [d, n] of counts) if (n < 2) counts.delete(d);
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
  statusEl.textContent = "Moving…";
  // The background script does the work, since this popup closes when focus changes.
  const { moved, total } = await browser.runtime.sendMessage({
    type: "merge",
    domain,
    target: targetSel.value,
  });
  statusEl.textContent = `Moved ${moved} of ${total} ${domain} tab(s).`;
  await refresh();
}

mergeBtn.addEventListener("click", () =>
  merge().catch((e) => {
    statusEl.textContent = `Error: ${e.message}`;
    mergeBtn.disabled = false;
  })
);

refresh();
