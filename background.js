function domainOf(url) {
  try {
    const u = new URL(url);
    if (u.protocol === "http:" || u.protocol === "https:") {
      return u.hostname.replace(/^www\./, "");
    }
  } catch (e) {}
  return null;
}

async function mergeDomain(domain, target) {
  const tabs = (await browser.tabs.query({})).filter((t) => domainOf(t.url) === domain);
  if (!tabs.length) return { moved: 0, total: 0 };

  let windowId;
  let toMove;
  let placeholderId = null;

  if (target === "new") {
    // Create an empty window first (without focusing), then move every tab into it.
    const win = await browser.windows.create({ focused: false });
    windowId = win.id;
    placeholderId = win.tabs[0].id;
    toMove = tabs;
  } else {
    windowId = Number(target);
    toMove = tabs.filter((t) => t.windowId !== windowId);
  }

  // Pinned tabs can't be moved past unpinned ones; unpin them first.
  for (const t of toMove) {
    if (t.pinned) await browser.tabs.update(t.id, { pinned: false });
  }
  if (toMove.length) {
    await browser.tabs.move(toMove.map((t) => t.id), { windowId, index: -1 });
  }
  if (placeholderId !== null) await browser.tabs.remove(placeholderId);
  await browser.windows.update(windowId, { focused: true });

  return { moved: toMove.length, total: tabs.length };
}

browser.runtime.onMessage.addListener((msg) => {
  if (msg && msg.type === "merge") return mergeDomain(msg.domain, msg.target);
});
