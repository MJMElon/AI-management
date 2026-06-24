// Safe storage: localStorage when available, in-memory fallback otherwise
// (e.g. sandboxed iframes). Holds UI prefs and, in demo mode, the data.
export const store = (() => {
  let mem = {}
  let ok = true
  try { const k = '__t'; window.localStorage.setItem(k, '1'); window.localStorage.removeItem(k) }
  catch (e) { ok = false }
  return {
    get(k) { try { return ok ? window.localStorage.getItem(k) : (mem[k] ?? null) } catch (e) { return mem[k] ?? null } },
    set(k, v) { try { ok ? window.localStorage.setItem(k, v) : (mem[k] = v) } catch (e) { mem[k] = v } },
    del(k) { try { ok ? window.localStorage.removeItem(k) : delete mem[k] } catch (e) { delete mem[k] } },
  }
})()
