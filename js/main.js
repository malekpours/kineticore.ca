/* Kineticore site JS: mobile nav, scroll reveals, division switcher, contact form */
(function () {
  "use strict";

  /* ---------- Sticky header shadow ---------- */
  var header = document.querySelector(".site-header");
  function onScroll() {
    if (!header) return;
    if (window.scrollY > 8) header.classList.add("scrolled");
    else header.classList.remove("scrolled");
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Mobile navigation ---------- */
  var toggle = document.querySelector(".nav-toggle");
  if (toggle) {
    toggle.addEventListener("click", function () {
      document.body.classList.toggle("nav-open");
    });
    document.querySelectorAll(".nav a").forEach(function (a) {
      a.addEventListener("click", function () {
        document.body.classList.remove("nav-open");
      });
    });
  }

  /* ---------- Scroll reveal ---------- */
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add("in");
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12 });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("in"); });
  }

  /* ---------- Homepage division switcher ---------- */
  var switcher = document.getElementById("division-switch");
  if (switcher) {
    var btns = switcher.querySelectorAll("button");
    var panels = document.querySelectorAll(".division-panel");
    var showPanel = function (id) {
      panels.forEach(function (p) { p.classList.toggle("on", p.id === id); });
      btns.forEach(function (b) { b.classList.toggle("on", b.getAttribute("data-panel") === id); });
    };
    btns.forEach(function (b) {
      b.addEventListener("click", function () { showPanel(b.getAttribute("data-panel")); });
    });
    // Default to the Lab Systems division on load
    showPanel("panel-lab");
  }

  /* ---------- Contact form (static-friendly, opens mail client or logs) ---------- */
  var form = document.getElementById("contact-form");
  if (form) {
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var status = document.getElementById("form-status");
      var name = (form.querySelector("#f-name") || {}).value || "";
      var email = (form.querySelector("#f-email") || {}).value || "";
      var msg = (form.querySelector("#f-msg") || {}).value || "";
      var ok = true;

      if (!name.trim()) { ok = false; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { ok = false; }
      if (msg.trim().length < 10) { ok = false; }

      if (!ok) {
        status.className = "form-status err";
        status.textContent = "Please fill in your name, a valid email, and a message (min 10 characters).";
        return;
      }

      var subject = encodeURIComponent("Website inquiry — " + (form.querySelector("#f-topic") ? form.querySelector("#f-topic").value : "General"));
      var body = encodeURIComponent(
        "Name: " + name + "\n" +
        "Organization: " + ((form.querySelector("#f-org") || {}).value || "") + "\n" +
        "Email: " + email + "\n\n" +
        msg
      );
      window.location.href = "mailto:info@kineticore.ca?subject=" + subject + "&body=" + body;
      status.className = "form-status ok";
      status.textContent = "Your email client should open with the message pre-filled. Or write to us directly at info@kineticore.ca.";
    });
  }
})();
