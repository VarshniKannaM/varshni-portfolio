// Small interaction enhancement: mark the active navigation section.
const sections = document.querySelectorAll("main section[id]");
const links = document.querySelectorAll(".nav nav a");

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      links.forEach(link => link.classList.remove("active"));
      const active = document.querySelector(`.nav nav a[href="#${entry.target.id}"]`);
      if (active) active.classList.add("active");
    }
  });
}, { rootMargin: "-35% 0px -55% 0px" });

sections.forEach(section => observer.observe(section));
