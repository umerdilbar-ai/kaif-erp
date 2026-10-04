/**
 * Opens a tab right away (inside the tap, so popup blockers allow it) and points it at the URL
 * once `getUrl` resolves. Falls back to same-tab navigation if the popup was blocked.
 */
export async function openWhenReady(getUrl: () => Promise<string | null>) {
  const w = window.open("about:blank", "_blank");
  try {
    const url = await getUrl();
    if (!url) return w?.close();
    if (w) w.location.href = url;
    else window.location.href = url;
  } catch (e) {
    w?.close();
    throw e;
  }
}
