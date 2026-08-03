/* ========================================================================
   新生一班 · 星河剪贴簿 — 交互脚本
   ======================================================================== */

/* ---------- 资源加载追踪 ---------- */
(() => {
  const loader = document.getElementById("loader");
  const fill = document.getElementById("loaderFill");
  const percent = document.getElementById("loaderPercent");
  if (!loader || !fill || !percent) return;

  // 收集所有需要加载的资源（不跳过已完成的）
  const resources = [];
  document.querySelectorAll("img").forEach((img) => {
    if (img.src) resources.push(img);
  });
  document.querySelectorAll("audio").forEach((a) => {
    if (a.src) resources.push(a);
  });

  if (resources.length === 0) {
    loader.classList.add("done");
    return;
  }

  let loaded = 0;
  const total = resources.length;

  function updateProgress() {
    loaded++;
    const pct = Math.round((loaded / total) * 100);
    fill.style.width = pct + "%";
    percent.textContent = pct + "%";
    if (loaded >= total) {
      setTimeout(() => loader.classList.add("done"), 400);
    }
  }

  resources.forEach((el) => {
    if (el.complete || el.readyState >= 2) {
      updateProgress();
    } else {
      let done = false;
      const onDone = () => { if (!done) { done = true; updateProgress(); } };
      el.addEventListener("load", onDone, { once: true });
      el.addEventListener("error", onDone, { once: true });
      // 单个资源兜底：5 秒无响应就算完成
      setTimeout(onDone, 5000);
    }
  });

  // 兜底：10 秒后无论如何隐藏
  setTimeout(() => {
    if (!loader.classList.contains("done")) {
      loader.classList.add("done");
    }
  }, 10000);
})();

const isMobile = () => window.matchMedia("(max-width: 640px)").matches;

/* ---------- 星空背景 ---------- */
(() => {
  const canvas = document.getElementById("starfield");
  const ctx = canvas.getContext("2d");
  let w, h, stars, shootingStars;
  const DPR = Math.min(window.devicePixelRatio || 1, 2);

  function resize() {
    w = canvas.width = innerWidth * DPR;
    h = canvas.height = innerHeight * DPR;
    canvas.style.width = innerWidth + "px";
    canvas.style.height = innerHeight + "px";
    initStars();
  }
  function initStars() {
    const count = Math.floor((innerWidth * innerHeight) / 6000);
    stars = Array.from({ length: count }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      r: Math.max(0.3, Math.random() * 1.6) * DPR,
      a: Math.random(), tw: 0.005 + Math.random() * 0.02,
      dir: Math.random() > 0.5 ? 1 : -1,
      hue: Math.random() < 0.12 ? (Math.random() < 0.5 ? "gold" : "cyan") : "white",
      vx: (Math.random() - 0.5) * 0.05 * DPR, vy: (Math.random() - 0.5) * 0.05 * DPR,
    }));
    shootingStars = [];
  }
  function spawnShooting() {
    if (shootingStars.length > 2) return;
    if (Math.random() > 0.008) return;
    shootingStars.push({
      x: Math.random() * w * 0.7, y: Math.random() * h * 0.4,
      len: (80 + Math.random() * 120) * DPR, speed: (6 + Math.random() * 6) * DPR,
      ang: Math.PI / 5 + Math.random() * 0.3, life: 1,
    });
  }
  function color(hue, alpha) {
    if (hue === "gold") return `rgba(255, 216, 107, ${alpha})`;
    if (hue === "cyan") return `rgba(122, 245, 232, ${alpha})`;
    return `rgba(255, 255, 255, ${alpha})`;
  }
  function draw() {
    ctx.clearRect(0, 0, w, h);
    for (const s of stars) {
      s.a += s.tw * s.dir;
      if (s.a <= 0.1) { s.a = 0.1; s.dir = 1; }
      if (s.a >= 1) { s.a = 1; s.dir = -1; }
      s.x += s.vx; s.y += s.vy;
      if (s.x < 0) s.x = w; if (s.x > w) s.x = 0;
      if (s.y < 0) s.y = h; if (s.y > h) s.y = 0;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = color(s.hue, s.a);
      if (s.hue !== "white") { ctx.shadowBlur = 8 * DPR; ctx.shadowColor = color(s.hue, s.a); }
      else ctx.shadowBlur = 0;
      ctx.fill();
    }
    ctx.shadowBlur = 0;
    spawnShooting();
    for (let i = shootingStars.length - 1; i >= 0; i--) {
      const m = shootingStars[i];
      m.x += Math.cos(m.ang) * m.speed; m.y += Math.sin(m.ang) * m.speed;
      m.life -= 0.012;
      const tailX = m.x - Math.cos(m.ang) * m.len, tailY = m.y - Math.sin(m.ang) * m.len;
      const grad = ctx.createLinearGradient(m.x, m.y, tailX, tailY);
      grad.addColorStop(0, `rgba(255, 230, 180, ${m.life})`);
      grad.addColorStop(1, "rgba(255, 230, 180, 0)");
      ctx.strokeStyle = grad; ctx.lineWidth = 2 * DPR;
      ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(tailX, tailY); ctx.stroke();
      if (m.life <= 0 || m.x > w || m.y > h) shootingStars.splice(i, 1);
    }
    requestAnimationFrame(draw);
  }
  resize(); draw();
  window.addEventListener("resize", resize);
})();

/* ---------- 剪贴簿翻页核心（桌面堆叠 + 随机方向；手机纵向滚动） ---------- */
(() => {
  const scrapbook = document.getElementById("scrapbook");
  const pages = Array.from(document.querySelectorAll(".page"));
  const prevBtn = document.getElementById("prevPage");
  const nextBtn = document.getElementById("nextPage");
  const dotsWrap = document.getElementById("pageDots");
  const navLinks = Array.from(document.querySelectorAll(".nav__links a, .nav__brand"));
  const mobileFlip = document.getElementById("mobileFlip");
  const backCover = document.getElementById("backCover");
  const nav = document.getElementById("nav");
  const total = pages.length;
  let current = -1;

  // 随机方向池（入场方向）
  const dirs = [
    { tx: "-100%", ty: 0, tr: "-6deg" },
    { tx: "100%",  ty: 0, tr: "6deg" },
    { tx: 0, ty: "-100%", tr: "4deg" },
    { tx: 0, ty: "100%",  tr: "-4deg" },
    { tx: "-70%", ty: "-70%", tr: "-8deg" },
    { tx: "70%",  ty: "70%",  tr: "8deg" },
    { tx: "-80%", ty: "60%",  tr: "5deg" },
    { tx: "80%",  ty: "-60%", tr: "-5deg" },
  ];
  let lastDir = -1;

  // 生成页码点
  pages.forEach((_, i) => {
    const dot = document.createElement("button");
    dot.className = "page-dots__dot";
    dot.type = "button";
    dot.setAttribute("aria-label", `第 ${i + 1} 页`);
    dot.addEventListener("click", () => goToPage(i));
    dotsWrap.appendChild(dot);
  });
  const dots = Array.from(dotsWrap.children);

  function pickDir() {
    let i;
    do { i = Math.floor(Math.random() * dirs.length); } while (i === lastDir && dirs.length > 1);
    lastDir = i;
    return dirs[i];
  }

  function activateStack(idx) {
    const incoming = pages[idx];
    // 旧页淡出缩放
    pages.forEach((p, i) => { if (i !== idx) p.classList.remove("is-active"); });
    // 设置入场起点（无过渡）
    const d = pickDir();
    incoming.style.transition = "none";
    incoming.style.transform = `translate(${d.tx}, ${d.ty}) rotate(${d.tr}) scale(.94)`;
    incoming.style.opacity = "0";
    // 强制回流
    void incoming.offsetWidth;
    // 恢复过渡并进入
    incoming.style.transition = "";
    incoming.classList.add("is-active");
    incoming.style.transform = "";
    incoming.style.opacity = "";
  }

  function goToPage(i) {
    i = Math.max(0, Math.min(total - 1, i));
    if (i === current) return;
    // 桌面与手机均使用堆叠切换 + 随机方向
    updateUI(i);
    activateStack(i);
  }

  function updateUI(idx) {
    current = idx;
    dots.forEach((d, i) => d.classList.toggle("active", i === idx));
    prevBtn.classList.toggle("is-first", idx === 0);
    prevBtn.disabled = idx === 0;
    nextBtn.classList.toggle("is-last", idx === total - 1);
    navLinks.forEach((a) => {
      const p = parseInt(a.dataset.page, 10);
      a.classList.toggle("active", p === idx);
    });
    nav.classList.toggle("scrolled", idx !== 0);
    if (mobileFlip) mobileFlip.classList.toggle("hide", idx === total - 1);
    // 触发当前页出现动画
    pages[idx].querySelectorAll(".reveal:not(.in)").forEach((el) => {
      const delay = parseInt(el.dataset.delay || "0", 10);
      setTimeout(() => el.classList.add("in"), delay * 120);
    });
    // 数字计数
    pages[idx].querySelectorAll(".big-num[data-count]").forEach((el) => {
      if (el.dataset.done) return;
      el.dataset.done = "1";
      const target = parseInt(el.dataset.count, 10);
      const start = performance.now();
      const step = (now) => {
        const p = Math.min((now - start) / 1200, 1);
        el.textContent = Math.floor((1 - Math.pow(1 - p, 3)) * target);
        if (p < 1) requestAnimationFrame(step);
        else el.textContent = target;
      };
      requestAnimationFrame(step);
    });
  }

  // 翻页仅靠左右按钮（与键盘），取消滚轮/触摸滑动翻页；
  // 关于我们 / 包班团队 的卡片区允许手指触屏内部滚动（见 CSS .collage overflow-y:auto）

  // 翻页按钮
  nextBtn.addEventListener("click", () => {
    if (current === total - 1) goToPage(0);
    else goToPage(current + 1);
  });
  prevBtn.addEventListener("click", () => goToPage(current - 1));

  // 导航点击
  navLinks.forEach((a) => {
    a.addEventListener("click", (e) => {
      const p = parseInt(a.dataset.page, 10);
      if (isNaN(p)) return;
      e.preventDefault();
      goToPage(p);
      document.getElementById("navToggle").classList.remove("open");
      document.querySelector(".nav__links").classList.remove("open");
    });
  });

  if (backCover) backCover.addEventListener("click", () => goToPage(0));

  // 键盘（桌面）
  const modalOpen = () => document.getElementById("teacherModal").classList.contains("open");
  window.addEventListener("keydown", (e) => {
    if (isMobile() || modalOpen()) return;
    if (e.key === "ArrowRight" || e.key === "PageDown") { e.preventDefault(); nextBtn.click(); }
    else if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); prevBtn.click(); }
    else if (e.key === "Home") { e.preventDefault(); goToPage(0); }
    else if (e.key === "End") { e.preventDefault(); goToPage(total - 1); }
  });

  // 切换尺寸时确保当前页激活
  window.addEventListener("resize", () => {
    pages.forEach((p, i) => p.classList.toggle("is-active", i === current));
  });

  // 初始化：激活封面
  pages[0].classList.add("is-active");
  updateUI(0);
})();

/* ---------- 顶部导航菜单（移动端） ---------- */
(() => {
  const toggle = document.getElementById("navToggle");
  const links = document.querySelector(".nav__links");
  if (!toggle) return;
  toggle.addEventListener("click", () => {
    toggle.classList.toggle("open");
    links.classList.toggle("open");
  });
})();

/* ---------- 教师详情弹窗 ---------- */
(() => {
  const modal = document.getElementById("teacherModal");
  const mPhoto = document.getElementById("modalPhoto");
  const mRole = document.getElementById("modalRole");
  const mName = document.getElementById("modalName");
  const mMotto = document.getElementById("modalMotto");
  const mBio = document.getElementById("modalBio");
  const mTags = document.getElementById("modalTags");
  const mMsg = document.getElementById("modalMsg");

  const data = {
    liao: {
      name: "廖老师", role: "班主任 · 掌舵人",
      motto: "「以心为灯，照你前行每一步。」",
      img: "assets/teacher-liao.jpg", ph: "ph--liao",
      bio: "新生一班的班主任，也是这群年轻人最坚定的领航者。从清晨第一缕光到夜自习最后一盏灯，廖老师的目光始终温柔而有力——既照见每个人的方向，也托住每颗不安的心。",
      tags: ["领航", "守护", "陪伴", "责任"],
      msg: "愿你在这里学会自律、收获友谊、找到属于自己的光。我一直都在。",
    },
    chang: {
      name: "常教", role: "教官",
      motto: "「铁血柔情，砺骨铸魂。」",
      img: "assets/teacher-chang.jpg", ph: "ph--chang",
      bio: "训练场上令出如山，私下里却是最懂少年的硬汉教官。常教相信，汗水浇灌出的不仅是体魄，更是面对困难不退缩的底气。",
      tags: ["纪律", "磨砺", "热血", "担当"],
      msg: "训练场上的每一滴汗，都会变成你未来路上的底气。挺住，就赢了。",
    },
    liu: {
      name: "刘教", role: "教官",
      motto: "「令行禁止，热血不熄。」",
      img: "assets/teacher-liu.jpg", ph: "ph--liu",
      bio: '口令干脆、动作利落，刘教是队里公认的\u201C动作担当\u201D。严苛的外表下藏着一颗炽热的心，最怕看到学生放弃自己。',
      tags: ["体能", "标准", "热血", "陪伴"],
      msg: "标准从来不是为难你，而是让你知道——你可以比想象中更好。",
    },
    hu: {
      name: "胡教", role: "教官",
      motto: "「严中有爱，并肩同行。」",
      img: "assets/teacher-hu.jpg", ph: "ph--hu",
      bio: "训练时一丝不苟，休息时与同学们打成一片。胡教用最朴实的方式告诉每一个人：纪律与温度，从不冲突。",
      tags: ["规范", "温暖", "并肩", "成长"],
      msg: "我会和你们一起，把这段日子过成将来最舍不得的回忆。",
    },
    lu: {
      name: "小陆老师", role: "心理老师",
      motto: "「倾听每一颗心的回响。」",
      img: "assets/teacher-lu.jpg", ph: "ph--lu",
      bio: '新生一班的\u201C情绪港湾\u201D。无论是想家的夜晚、训练的压力，还是说不清的小情绪，小陆老师都愿意陪你慢慢聊、慢慢懂。',
      tags: ["倾听", "疏导", "温暖", "安心"],
      msg: "累了、难过了，随时来找我。你不必一个人扛着所有情绪。",
    },
    wang: {
      name: "王老师", role: "体育老师 · 德育处主任",
      motto: "「强健体魄，端正品行。」",
      img: "assets/teacher-wang.jpg", ph: "ph--wang",
      bio: "操场上的王老师雷厉风行，德育处的王主任刚正不阿。他用汗水教会学生什么叫坚持，用品格教会学生什么叫担当。",
      tags: ["体育", "德育", "刚毅", "正气"],
      msg: "身体是革命的本钱，品行是做人的根基。两个都不能落下！",
    },
  };

  function open(key) {
    const d = data[key];
    if (!d) return;
    mPhoto.innerHTML = `<img src="${d.img}" alt="${d.name}" onerror="this.style.display='none';this.parentElement.classList.add('${d.ph}')" />`;
    mRole.textContent = d.role;
    mName.textContent = d.name;
    mMotto.textContent = d.motto;
    mBio.textContent = d.bio;
    mTags.innerHTML = d.tags.map((t) => `<span>${t}</span>`).join("");
    mMsg.textContent = d.msg;
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }
  function close() {
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    // 清掉占位类，避免下次错位
    mPhoto.className = "modal__photo";
  }

  document.querySelectorAll(".polaroid--clickable[data-teacher]").forEach((el) => {
    el.addEventListener("click", (e) => {
      // 避免点击图片占位等子元素时被 a 标签拦截（团队卡非链接，无影响）
      open(el.dataset.teacher);
    });
  });
  modal.querySelectorAll("[data-close]").forEach((el) =>
    el.addEventListener("click", close)
  );
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("open")) close();
  });
})();

/* ---------- 拍立得 3D 倾斜（桌面） ---------- */
(() => {
  if (window.matchMedia("(pointer: coarse)").matches) return;
  document.querySelectorAll(".polaroid:not(.polaroid--clickable)").forEach((el) => {
    el.addEventListener("mousemove", (e) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      el.style.transform = `rotate(0deg) translateY(-8px) scale(1.03) perspective(800px) rotateY(${px * 10}deg) rotateX(${-py * 10}deg)`;
    });
    el.addEventListener("mouseleave", () => { el.style.transform = ""; });
  });
  // 可点击卡片：更轻的倾斜，提示可点击
  document.querySelectorAll(".polaroid--clickable").forEach((el) => {
    el.addEventListener("mousemove", (e) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      el.style.transform = `rotate(0deg) translateY(-6px) scale(1.03) perspective(800px) rotateY(${px * 6}deg) rotateX(${-py * 6}deg)`;
    });
    el.addEventListener("mouseleave", () => { el.style.transform = ""; });
  });
})();

/* ---------- BGM 播放控制 ---------- */
(() => {
  const audio = document.getElementById("bgmPlayer");
  const btn = document.getElementById("bgmBtn");
  if (!audio || !btn) return;

  let playing = false;
  let unmuted = false;

  function updateUI() {
    btn.classList.toggle("playing", playing);
    btn.setAttribute("title", playing ? "暂停背景音乐" : "播放背景音乐");
  }

  function play() {
    audio.play().then(() => { playing = true; updateUI(); }).catch(() => {});
  }

  function pause() {
    audio.pause();
    playing = false;
    updateUI();
  }

  function toggle() {
    if (playing) pause(); else play();
  }

  // 标记按钮为"播放中"状态（符合用户预期）
  playing = true;
  updateUI();

  // 首次用户交互时启动播放
  let started = false;
  function startBgm() {
    if (started) return;
    started = true;
    audio.muted = true;
    audio.play().then(() => {
      playing = true;
      updateUI();
    }).catch(() => { playing = false; updateUI(); });
    document.removeEventListener("click", startBgm);
    document.removeEventListener("touchstart", startBgm);
  }
  document.addEventListener("click", startBgm);
  document.addEventListener("touchstart", startBgm);

  // 也尝试直接自动播放（部分浏览器允许）
  audio.muted = true;
  audio.play().then(() => {
    started = true; // 成功了，取消等待交互
    document.removeEventListener("click", startBgm);
    document.removeEventListener("touchstart", startBgm);
    playing = true;
    updateUI();
  }).catch(() => {});

  // 首次用户交互时取消静音
  function unmute() {
    if (unmuted) return;
    unmuted = true;
    audio.muted = false;
    document.removeEventListener("click", unmute);
    document.removeEventListener("touchstart", unmute);
  }
  document.addEventListener("click", unmute);
  document.addEventListener("touchstart", unmute);

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (!unmuted) { unmuted = true; audio.muted = false; }
    toggle();
  });
})();
