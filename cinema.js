'use strict';
/* A single buffered H.264 film. Native compositing, serialized latest-target seeks. */
(() => {
  const world = document.getElementById('world');
  const film = document.getElementById('cinema-film');
  const poster = document.getElementById('cinema-poster');
  const formation = 6.5, lastFrame = 22.5 - 1 / 24, frame = 1 / 24;
  const mobile = matchMedia('(max-width:700px)').matches;
  const clamp = (n, a = 0, b = 1) => Math.max(a, Math.min(b, n));
  let ready = false, loading = false, failed = false, objectURL;
  let raf = 0, inFlight = false, lastSeek = -100, lastTick = 0;
  let introDone = false, introStarted = false, playPending = false;
  let replaySeen, eased = formation, opacity = '', posterName = 'hero';

  function schedule() { if (!raf && !document.hidden) raf = requestAnimationFrame(tick); }
  function showPoster(time) {
    const name = time < 10.5 ? 'hero' : time < 18.5 ? 'dubai' : 'earth';
    if (name !== posterName) { posterName = name; poster.src = `assets/cinematic-${name}.webp`; }
  }
  function reveal() { world.classList.add('film-ready'); }
  function seek(time, now) {
    if (!ready || inFlight || film.seeking) return false;
    const target = Math.round(clamp(time, 0, lastFrame) / frame) * frame;
    if (Math.abs(film.currentTime - target) < frame * .55) return true;
    if (now - lastSeek < 32) { schedule(); return false; }
    lastSeek = now;
    inFlight = true;
    film.currentTime = target;
    return false;
  }
  async function loadFilm() {
    if (loading || failed) return;
    loading = true;
    try {
      // Buffer the compact file once: reverse scrolling never waits for a network range.
      const response = await fetch(`assets/film/journey-${mobile ? 'mobile' : 'desktop'}-v5.mp4`, {cache:'force-cache'});
      if (!response.ok) throw Error('Film unavailable');
      objectURL = URL.createObjectURL(await response.blob());
      film.src = objectURL;
      film.load();
    } catch (_) { failed = true; document.body.dataset.sequenceState = 'poster-fallback'; }
  }
  film.muted = true;
  film.addEventListener('loadeddata', () => { ready = true; schedule(); });
  film.addEventListener('seeked', () => { inFlight = false; reveal(); schedule(); });
  film.addEventListener('error', () => {
    failed = true; ready = false; inFlight = false;
    world.classList.remove('film-ready');
    document.body.dataset.sequenceState = 'poster-fallback';
  });
  film.addEventListener('timeupdate', schedule);
  film.addEventListener('playing', () => { reveal(); schedule(); });

  function tick(now) {
    raf = 0;
    const state = window.afoc || {}, height = innerHeight;
    const hero = state.hero || height, end = state.journeyEnd || height * 6;
    let scroll = state.scroll || 0;
    window.afocSceneTime = now / 1000;
    if (state.replayTime !== undefined && state.replayTime !== replaySeen) {
      replaySeen = state.replayTime;
      film.pause(); introDone = false; introStarted = false;
      eased = 0; scroll = state.scroll = 0;
      window.scrollTo({top:0, behavior:'instant'});
    }
    const nextOpacity = String(1 - clamp((scroll - end + height * .15) / (height * .75)));
    if (nextOpacity !== opacity) { opacity = nextOpacity; world.style.opacity = opacity; }
    const inHero = scroll < hero * .08;
    const desired = inHero ? formation : formation + clamp((scroll - hero * .08) / Math.max(1, end - height - hero * .08)) * (lastFrame - formation);
    if (!ready) showPoster(desired);
    if (document.hidden || opacity === '0' || state.paused) {
      film.pause(); lastTick = 0; return;
    }
    if (!ready) { loadFilm(); return; }
    if (inHero && !introDone) {
      if (!introStarted) {
        if (!seek(0, now)) return;
        introStarted = true;
      }
      if (film.currentTime >= formation - frame * .5) {
        film.pause(); introDone = true; eased = formation;
      } else {
        if (film.paused && !playPending) {
          playPending = true;
          const attempt = film.play();
          Promise.resolve(attempt).then(() => { playPending = false; schedule(); }).catch(() => {
            playPending = false; introDone = true; eased = formation; schedule();
          });
        }
        schedule(); return;
      }
    } else if (!inHero) { introDone = true; }
    film.pause();
    // Keep only the newest position. Never interrupt a decode with another seek.
    const dt = Math.min(.1, Math.max(.016, (now - (lastTick || now - 50)) / 1000));
    lastTick = now;
    eased += (desired - eased) * (1 - Math.exp(-dt / .075));
    if (Math.abs(desired - eased) < frame * .4) eased = desired;
    if (inFlight || film.seeking) return;
    const settled = seek(eased, now);
    if (settled) reveal();
    if (!inFlight && Math.abs(desired - film.currentTime) >= frame * .55) schedule();
  }
  addEventListener('scroll', schedule, {passive:true});
  addEventListener('resize', schedule, {passive:true});
  document.getElementById('pulse').addEventListener('click', schedule);
  document.getElementById('motion').addEventListener('click', schedule);
  matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', schedule);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { film.pause(); cancelAnimationFrame(raf); raf = 0; lastTick = 0; }
    else schedule();
  });
  addEventListener('pagehide', event => {
    film.pause();
    if (!event.persisted && objectURL) URL.revokeObjectURL(objectURL);
  });
  addEventListener('pageshow', schedule);
  schedule();
})();
