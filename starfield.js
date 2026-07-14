// ============================================================
// STARFIELD — Fondo animado ambiental (no es un módulo de datos,
// es puramente decorativo). Respeta prefers-reduced-motion.
// ============================================================
(function () {
  const canvas = document.getElementById("starfield");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  let width, height, stars, shootingStars;

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    generateStars();
  }

  function generateStars() {
    const count = Math.floor((width * height) / 9000);
    stars = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 1.3 + 0.3,
      baseAlpha: Math.random() * 0.5 + 0.3,
      twinkleSpeed: Math.random() * 0.02 + 0.005,
      twinklePhase: Math.random() * Math.PI * 2
    }));
    shootingStars = [];
  }

  function maybeSpawnShootingStar() {
    if (prefersReducedMotion) return;
    if (Math.random() < 0.002 && shootingStars.length < 2) {
      const startX = Math.random() * width * 0.6;
      const startY = Math.random() * height * 0.3;
      shootingStars.push({
        x: startX,
        y: startY,
        len: Math.random() * 80 + 60,
        speed: Math.random() * 6 + 8,
        angle: Math.PI / 5,
        life: 1
      });
    }
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);

    // Static/twinkling stars
    const t = Date.now();
    for (const s of stars) {
      const twinkle = prefersReducedMotion
        ? 0
        : Math.sin(t * s.twinkleSpeed + s.twinklePhase) * 0.25;
      const alpha = Math.min(1, Math.max(0.15, s.baseAlpha + twinkle));
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(226, 232, 240, ${alpha})`;
      ctx.fill();
    }

    // Shooting stars
    maybeSpawnShootingStar();
    shootingStars.forEach((star) => {
      const dx = Math.cos(star.angle) * star.len;
      const dy = Math.sin(star.angle) * star.len;
      const grad = ctx.createLinearGradient(
        star.x, star.y, star.x - dx, star.y - dy
      );
      grad.addColorStop(0, `rgba(34, 211, 238, ${star.life})`);
      grad.addColorStop(1, "rgba(34, 211, 238, 0)");
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(star.x, star.y);
      ctx.lineTo(star.x - dx, star.y - dy);
      ctx.stroke();

      star.x += Math.cos(star.angle) * star.speed;
      star.y += Math.sin(star.angle) * star.speed;
      star.life -= 0.012;
    });
    shootingStars = shootingStars.filter((s) => s.life > 0);

    requestAnimationFrame(draw);
  }

  window.addEventListener("resize", resize);
  resize();
  draw();
})();
