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

  /* ---------- Contact form topic deep-links (?topic=...) ----------
     Also duplicated inline in contact.html so it works even if an older cached
     version of this file loads: the inline copy always runs. */
  (function () {
    var topicSelect = document.getElementById("f-topic");
    var topicMap = {
      "lab-daq": "Lab / DAQ System Inquiry",
      "kc36-pricing": "KC-36 Logger \u2014 Pricing",
      "kc36-support": "KC-36 Logger \u2014 Support",
      "feedstock": "Biochar \u2014 Feedstock Supply",
      "biochar-buy": "Biochar \u2014 Purchasing Biochar",
      "toll": "Biochar \u2014 Toll Processing"
    };
    var wanted = new URLSearchParams(window.location.search).get("topic");
    if (topicSelect && wanted && topicMap[wanted]) {
      for (var i = 0; i < topicSelect.options.length; i++) {
        if (topicSelect.options[i].text === topicMap[wanted]) {
          topicSelect.selectedIndex = i;
          break;
        }
      }
    }
  })();

  /* ---------- Contact form (AJAX POST to the same backend the original site uses) ---------- */
  var form = document.getElementById("quote-form");
  if (form) {
    var status = document.getElementById("form-status");
    var submitBtn = document.getElementById("f-submit");

    /* Phone auto-format, mirroring the original form.js behaviour */
    var phoneEl = document.getElementById("f-phone");
    if (phoneEl && !phoneEl.value) { phoneEl.value = "+1 "; }
    function formatPlusOne(v) {
      var digits = (v.match(/\d/g) || []).join("");
      if (digits.indexOf("1") !== 0) return v;
      var local = digits.slice(1, 11);
      var out = "+1 ";
      if (local.length > 0) out += "(" + local.slice(0, Math.min(3, local.length)) + ")";
      if (local.length > 3) out += " " + local.slice(3, Math.min(6, local.length));
      if (local.length > 6) out += "-" + local.slice(6);
      return out;
    }
    function formatGeneric(v) {
      var capped = ((v.match(/\d/g) || []).join("")).slice(0, 15);
      return capped.length === 0 ? "" : capped.replace(/(.{1,3})/g, "$1 ").trim();
    }
    if (phoneEl) {
      phoneEl.addEventListener("input", function () {
        var v = phoneEl.value;
        if (v.replace(/\s/g, "").indexOf("+1") === 0) phoneEl.value = formatPlusOne(v);
        else if (v.indexOf("+") === 0) phoneEl.value = v.replace(/\s+/g, " ");
        else phoneEl.value = formatGeneric(v);
      });
    }

    function validPhone(v) {
      v = String(v).trim();
      if (v.length === 0) return false;
      if (/[A-Za-z]/.test(v)) return false;
      if (!/^\+?[0-9\s\-\(\)]+$/.test(v)) return false;
      var digits = (v.match(/\d/g) || []).length;
      var compact = v.replace(/\s/g, "");
      if (compact.indexOf("+1") === 0 || compact.indexOf("1") === 0) {
        var nums = (v.match(/\d/g) || []).join("");
        if (nums.indexOf("1") !== 0) return false;
        return nums.length === 11;
      }
      return digits >= 7 && digits <= 15;
    }

    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var name = form.querySelector("#f-name").value.trim();
      var email = form.querySelector("#f-email").value.trim();
      var phone = form.querySelector("#f-phone").value;
      var ext = form.querySelector("#f-ext").value.trim();
      var msg = form.querySelector("#f-msg").value.trim();

      var problems = [];
      if (!name) { problems.push("your name"); }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { problems.push("a valid email"); }
      if (!validPhone(phone)) { problems.push("a valid phone number (for +1, 11 digits total; others 7-15)"); }
      if (ext && !/^[0-9]{1,6}$/.test(ext)) { problems.push("an extension of 1-6 digits"); }
      if (!msg) { problems.push("your message"); }

      if (problems.length) {
        status.className = "form-status err";
        status.textContent = "Please provide " + problems.join(", ") + ".";
        return;
      }

      var endpoint = form.getAttribute("data-endpoint") || "/sendmail/process-wrapper.php";
      var data = new URLSearchParams();
      form.querySelectorAll("input[name], select[name], textarea[name]").forEach(function (el) {
        data.append(el.name, el.value);
      });

      submitBtn.disabled = true;
      var originalLabel = submitBtn.textContent;
      submitBtn.textContent = "Please wait..";
      status.className = "form-status";
      status.textContent = "";

      fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
        body: data.toString()
      })
        .then(function (r) { return r.text(); })
        .then(function (response) {
          if (response.indexOf("Success") === 0) {
            form.querySelector(".form-grid").style.display = "none";
            document.getElementById("form-thankyou").style.display = "block";
            var note = form.querySelector(".form-note");
            if (note) note.style.display = "none";
          } else if (response.indexOf("Fail:") === 0) {
            status.className = "form-status err";
            status.innerHTML = "<strong>Configuration error:</strong><br>" + response.substring(5);
            submitBtn.disabled = false;
            submitBtn.textContent = originalLabel;
          } else if (response.indexOf("Error:") === 0 || response.indexOf("Debug:") === 0) {
            status.className = "form-status err";
            status.innerHTML = "<strong>Error:</strong><br>" + response.replace(/^(Error:|Debug:)/, "");
            submitBtn.disabled = false;
            submitBtn.textContent = originalLabel;
          } else {
            status.className = "form-status err";
            status.textContent = "Unknown error, please try later - or email info@kineticore.ca directly.";
            submitBtn.disabled = false;
            submitBtn.textContent = originalLabel;
          }
        })
        .catch(function () {
          status.className = "form-status err";
          status.textContent = "Could not reach the form server. If you are viewing a local preview, this works once deployed - meanwhile email info@kineticore.ca.";
          submitBtn.disabled = false;
          submitBtn.textContent = originalLabel;
        });
    });
  }
})();
