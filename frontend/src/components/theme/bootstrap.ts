// Not a client module: the root layout (a server component) inlines this string.

export const THEME_STORAGE_KEY = "afyalink-theme";

/**
 * Runs before first paint so a saved dark theme never flashes light. Must stay
 * self-contained and mirror resolveTheme() in ./index.tsx.
 */
export const THEME_BOOTSTRAP_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});var d=t==="dark"||(t==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d)}catch(e){}})()`;
