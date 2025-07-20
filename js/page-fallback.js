// Emergency fallback to ensure page is never permanently hidden
// This runs immediately when the script loads
(function () {
  console.log("🚨 Page transition fallback loaded");

  // If page is still hidden after 1 second, show it
  setTimeout(function () {
    if (!document.body.classList.contains("loaded")) {
      console.log("⚠️ Applying emergency fallback - showing page");
      document.body.style.opacity = "1";
      document.body.style.transform = "translateY(0)";
      document.body.classList.add("loaded");
    }
  }, 1000);

  // Also apply immediately if DOM is already loaded
  if (document.readyState !== "loading") {
    setTimeout(function () {
      if (!document.body.classList.contains("loaded")) {
        console.log("⚠️ DOM ready, applying immediate fallback");
        document.body.classList.add("loaded");
      }
    }, 50);
  }
})();
