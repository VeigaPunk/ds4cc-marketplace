(function () {
  const burger = document.querySelector("[data-burger]");
  const mob = document.querySelector("[data-mob]");
  if (burger && mob) {
    burger.addEventListener("click", () => {
      const open = mob.classList.toggle("open");
      burger.setAttribute("aria-expanded", open ? "true" : "false");
      burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    });
  }

  document.querySelectorAll("[data-copy]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-copy");
      const el = id ? document.getElementById(id) : btn.closest(".copy")?.querySelector("code");
      const text = el ? el.textContent : "";
      try {
        await navigator.clipboard.writeText(text);
        const prev = btn.textContent;
        btn.textContent = "Copied";
        setTimeout(() => {
          btn.textContent = prev;
        }, 1600);
      } catch {
        btn.textContent = "Failed";
      }
    });
  });

  document.querySelectorAll("[data-tabs]").forEach((root) => {
    const buttons = root.querySelectorAll("[data-tab]");
    const panes = root.querySelectorAll("[data-pane]");
    buttons.forEach((b) => {
      b.addEventListener("click", () => {
        const id = b.getAttribute("data-tab");
        buttons.forEach((x) => x.classList.toggle("on", x === b));
        panes.forEach((p) => {
          p.hidden = p.getAttribute("data-pane") !== id;
        });
      });
    });
  });
})();
