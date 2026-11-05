export const THEME_STORAGE_KEY = "pacify-theme";

export const THEME_INIT_SCRIPT = `(function(){
  try {
    var stored = localStorage.getItem("${THEME_STORAGE_KEY}");
    var theme = (stored === "light" || stored === "dark")
      ? stored
      : (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
    var root = document.documentElement;
    root.dataset.theme = theme;
    root.classList.add(theme);
    root.classList.remove(theme === "dark" ? "light" : "dark");
    root.style.colorScheme = theme;
  } catch (e) {
    document.documentElement.classList.add("dark");
    document.documentElement.dataset.theme = "dark";
    document.documentElement.style.colorScheme = "dark";
  }
})();`;
