// Globe JavaScript extracted from globe.html
// Initializes a Three.js globe with markers, country borders, and interaction.

// Global array for glowing markers
const glowingMarkers = [];

(function(){
  // Test cases / places
  const PLACES = [
  {
    id:'paris',
    title:'Paris, France',
    lat:48.8566,
    lon:2.3522,
    type:'visited',
    year:2023,
    thumbnail:'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600'
  },
  {
    id:'tokyo',
    title:'Tokyo, Japan',
    lat:35.6762,
    lon:139.6503,
    type:'wishlist',
    year:null,
    thumbnail:'https://images.unsplash.com/photo-1549693578-d683be217e58?w=600'
  },
  {
    id:'nyc',
    title:'New York City, USA',
    lat:40.7128,
    lon:-74.0060,
    type:'visited',
    year:2022,
    thumbnail:'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTR1D45iBVsNs0SCKLbS2NwDW_2elEzF74vsQ&s'
  }
];

  function showSys(msg, timeout=3000){ const el=document.getElementById('sys-msg'); if(!el) return; el.style.display='block'; el.textContent=msg; if(timeout) setTimeout(()=>el.style.display='none', timeout); }

  // Robust script loader with retries and verification (kept for compatibility if reused)
  function loadScript(url, timeout = 8000){
    return new Promise((resolve, reject)=>{
      const s = document.createElement('script'); s.src = url; s.async = true;
      let done = false;
      s.onload = () => { if(done) return; done = true; resolve(); };
      s.onerror = (e) => { if(done) return; done = true; reject(new Error('Failed to load ' + url)); };
      document.head.appendChild(s);
      setTimeout(()=>{ if(done) return; done = true; reject(new Error('Timeout loading ' + url)); }, timeout);
    });
  }

  (async function bootstrap(){
    const container = document.getElementById('container');
    showSys('Loading Three.js...');

    try{
      await loadScript('https://unpkg.com/three@0.152.2/build/three.min.js');
      if(typeof THREE === 'undefined') throw new Error('Three.js not available after load');
      showSys('Three.js loaded — loading controls...');

      try{
        await loadScript('https://unpkg.com/three@0.152.2/examples/js/controls/OrbitControls.js', 6000);
      }catch(err){
        console.warn('First OrbitControls load failed:', err.message);
        try{ await loadScript('https://cdn.jsdelivr.net/npm/three@0.152.2/examples/js/controls/OrbitControls.js', 6000); }catch(err2){ console.warn('Alternate OrbitControls load failed:', err2.message); }
      }

      if(typeof THREE.OrbitControls === 'undefined'){
        if(typeof OrbitControls !== 'undefined'){ THREE.OrbitControls = OrbitControls; console.log('Attached global OrbitControls to THREE.OrbitControls'); }
        else { console.warn('OrbitControls not found; continuing with fallback controls'); }
      }

      initScene(container);
    }catch(err){ console.error('Bootstrap error:', err); showSys('Critical load error: ' + (err.message || err), 0); }
  })();

  function initScene(container){
    try{
      const renderer = new THREE.WebGLRenderer({antialias:true});
      renderer.setPixelRatio(window.devicePixelRatio);
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || (window.innerHeight - 56);
      renderer.setSize(w,h);
      renderer.outputEncoding = THREE.sRGBEncoding;
      container.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, w/h, 0.1, 2000);
      camera.position.set(0, 0, 300);

      let controls;
      if(typeof THREE.OrbitControls === 'function'){
        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true; controls.dampingFactor = 0.06; controls.rotateSpeed = 0.5; controls.minDistance = 120; controls.maxDistance = 800;
        try{ controls.autoRotate = true; controls.autoRotateSpeed = 0.075; }catch(e){}
      } else if(typeof OrbitControls === 'function'){
        controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = true; controls.dampingFactor = 0.06;
      } else {
        controls = createMinimalControls(camera, renderer.domElement); showSys('Using lightweight fallback controls (OrbitControls unavailable).', 5000);
      }

      scene.add(new THREE.AmbientLight(0xffffff, 0.6));
      const dirLight = new THREE.DirectionalLight(0xffffff, 0.8); dirLight.position.set(5,3,5); scene.add(dirLight);

      // Globe
      const R = 100;
      const sphereGeo = new THREE.SphereGeometry(R, 96, 96);
      const texLoader = new THREE.TextureLoader();
      const remoteEarth = 'https://threejs.org/examples/textures/land_ocean_ice_cloud_2048.jpg';
      // try local earth.jpg first, fall back to remote
      let earthTex = texLoader.load('earth.jpg', function onLoad(){ try{ earthTex.encoding = THREE.sRGBEncoding; }catch(e){} }, undefined, function onError(){ earthTex = texLoader.load(remoteEarth, function(){ try{ earthTex.encoding = THREE.sRGBEncoding; }catch(e){} }); });
      const earthMat = new THREE.MeshStandardMaterial({map: earthTex, roughness: 1.0, metalness: 0.0});
      const globe = new THREE.Mesh(sphereGeo, earthMat); scene.add(globe);

      const atmosphereMat = new THREE.MeshPhongMaterial({ color: 0x93d3ff, transparent: true, opacity: 0.18, side: THREE.BackSide, blending: THREE.AdditiveBlending });
      const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(R*1.03, 64, 64), atmosphereMat); scene.add(atmosphere);

      // Render country texture (land/ocean colors + borders)
      (async function renderCountryTexture(){
        try{
          let geo = null;
          const tryFetch = async (url)=>{ const r = await fetch(url, {mode:'cors'}); if(!r.ok) throw new Error('HTTP ' + r.status); return r.json(); };
          try{ geo = await tryFetch('https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/data/world.geojson'); }
          catch(err){ console.warn('Primary geojson failed:', err.message); try{ geo = await tryFetch('https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json'); }catch(err2){ console.warn('Fallback geojson failed:', err2.message); try{ const baseTex = earthTex; const canvas = document.createElement('canvas'); const W = baseTex.image?.width || 2048; const H = baseTex.image?.height || 1024; canvas.width = W; canvas.height = H; const ctx = canvas.getContext('2d'); ctx.drawImage(baseTex.image, 0, 0, W, H); ctx.fillStyle = 'rgba(207,238,255,0.25)'; ctx.fillRect(0,0,W,H); const tex = new THREE.CanvasTexture(canvas); try{ tex.encoding = THREE.sRGBEncoding; }catch(e){} globe.material.map = tex; globe.material.needsUpdate = true; showSys('Using tinted fallback texture', 3000); }catch(e){ console.warn('Fallback recolor failed', e); } return; } }

          const W = 4096, H = 2048; const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H; const ctx = canvas.getContext('2d');
          const oceanColor = '#cfeeff'; const landColor = '#e6e6e6'; const borderColor = '#7a7a7a';
          ctx.fillStyle = oceanColor; ctx.fillRect(0,0,W,H);
          const lonLatToXY = (lon, lat) => { const x = (lon + 180) / 360 * W; const y = (90 - lat) / 180 * H; return [x,y]; };
          ctx.fillStyle = landColor; ctx.strokeStyle = borderColor; ctx.lineWidth = Math.max(1, Math.floor(W/2048));
          geo.features.forEach(f=>{ const geom = f.geometry; if(!geom) return; const processRing=(ring)=>{ if(!ring||ring.length<2) return; ctx.beginPath(); for(let i=0;i<ring.length;i++){ const coord=ring[i]; const lon=coord[0], lat=coord[1]; const [x,y]=lonLatToXY(lon,lat); if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y); } ctx.closePath(); ctx.fill(); ctx.stroke(); }; if(geom.type==='Polygon') geom.coordinates.forEach(r=>processRing(r)); else if(geom.type==='MultiPolygon') geom.coordinates.forEach(p=>p.forEach(r=>processRing(r))); });
          const tex = new THREE.CanvasTexture(canvas); try{ tex.encoding = THREE.sRGBEncoding; }catch(e){} tex.needsUpdate = true; globe.material.map = tex; globe.material.needsUpdate = true; console.log('Country texture applied'); showSys('Land and sea colors applied', 2000);
        }catch(err){ console.warn('Country texture render failed', err); showSys('Country data load failed', 3000); }
      })();

      // Markers
      const markers = new THREE.Group(); globe.add(markers);
      const markerObjs = [];
        PLACES.forEach((p,i)=>{
          // surface point at radius R (local sphere coordinates)
          const surface = latLonToVec3(p.lat, p.lon, R);
          const normal = surface.clone().normalize();

          // Create marker group positioned at the surface with local orientation
          const markerGroup = new THREE.Group();
          markerGroup.position.copy(surface);
          // rotate group's up to align with surface normal
          markerGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), normal);

          // pin geometry: cylinder with base at y=0 (so it sits on the surface)
          const lineHeight = 14;
          const lineRadius = 0.14;
          const cylGeo = new THREE.CylinderGeometry(lineRadius, lineRadius, lineHeight, 10);
          cylGeo.translate(0, lineHeight / 2, 0);
          const lineMat = new THREE.MeshStandardMaterial({color:0x000000, metalness:0.1, roughness:0.8});
          const pinLine = new THREE.Mesh(cylGeo, lineMat);
          pinLine.position.set(0,0,0);

          // small sphere on top (local coordinates, y=lineHeight)
          const sphereRadius = 0.9;
          const sphereGeo = new THREE.SphereGeometry(sphereRadius, 12, 12);
          const sphereMat = new THREE.MeshStandardMaterial({ color: 0x000000 });
          const topSphere = new THREE.Mesh(sphereGeo, sphereMat);
          topSphere.position.set(0, lineHeight, 0);

          // glow halo (slightly larger, additive)
          const glowMat = new THREE.MeshBasicMaterial({ color: 0x1e90ff, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending });
          const glowGeo = new THREE.SphereGeometry(sphereRadius * 2.2, 16, 16);
          const glowSphere = new THREE.Mesh(glowGeo, glowMat);
          glowSphere.position.copy(topSphere.position);
          glowingMarkers.push(glowSphere);

          markerGroup.add(pinLine);
          markerGroup.add(topSphere);
          markerGroup.add(glowSphere);

          markerGroup.userData = { idx: i };
          // add group as a child of the globe so it rotates with it
          markers.add(markerGroup);

          // store group for raycasting and lookup
          markerObjs.push(markerGroup);
        });

      // Raycaster for clicks
      const ray = new THREE.Raycaster(); const mouse = new THREE.Vector2();
      let isFocused = false;
      function clearFocus(){ isFocused = false; lastInteraction = performance.now(); try{ if(controls && 'autoRotate' in controls) controls.autoRotate = true; }catch(e){} showSys('Focus cleared — resuming rotation', 1200); }
      renderer.domElement.addEventListener('pointerdown', (ev) => {
  const rect = renderer.domElement.getBoundingClientRect();

  mouse.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;

  ray.setFromCamera(mouse, camera);

  const hits = ray.intersectObjects(markerObjs, true);

  if (hits.length) {
    let obj = hits[0].object;

    while (obj && obj.userData.idx === undefined) {
      obj = obj.parent;
    }

    if (obj && obj.userData.idx !== undefined) {
      focusOnPlace(PLACES[obj.userData.idx], camera, controls);
    }
  } else {
    clearFocus();
  }
  });

      function populateList(onLookAt) {
  const list = document.getElementById('visited-list');
  const search = document.getElementById('search');
  const tabs = document.querySelectorAll('.tab');

  let activeType = 'visited';

  function render() {
    list.innerHTML = '';
    const q = search.value.toLowerCase();

    PLACES
      .filter(p => p.type === activeType)
      .filter(p => p.title.toLowerCase().includes(q))
      .forEach(p => {
        const item = document.createElement('div');
        item.className = 'place';
        item.innerHTML = `
          <img src="${p.thumbnail}" />
          <div>
            <strong>${p.title}</strong><br>
            <span style="font-size:12px;opacity:.6">
              ${p.year ? 'Visited ' + p.year : 'Planned'}
            </span>
          </div>
          <button>Focus</button>
        `;

        item.querySelector('button').onclick = e => {
          e.stopPropagation();
          onLookAt(p);
        };

        item.onclick = () => onLookAt(p);
        list.appendChild(item);
      });
  }

  search.addEventListener('input', render);

  tabs.forEach(tab => {
    tab.onclick = () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeType = tab.dataset.type;
      render();
    };
  });

  render();
}


      function focusOnPlace(place, cameraLocal, controlsLocal){
        // Prefer the visible marker's world position when available (fixes focus inaccuracies)
        let surface;
        const idx = PLACES.findIndex(p => p.id === place.id);
        if(idx >= 0 && markerObjs[idx]){
          surface = new THREE.Vector3();
          markerObjs[idx].getWorldPosition(surface);
        } else {
          surface = latLonToVec3(place.lat, place.lon, R);
        }

        const normal = surface.clone().normalize();
        const camDist = R * 2.2;
        const targetPos = normal.clone().multiplyScalar(camDist);

        isFocused = true; lastInteraction = performance.now();
        let prevAutoRotate = false, prevEnabled = true;
        try{ if(controlsLocal && 'autoRotate' in controlsLocal){ prevAutoRotate = controlsLocal.autoRotate; controlsLocal.autoRotate = false; } }catch(e){}
        try{ if(controlsLocal && 'enabled' in controlsLocal){ prevEnabled = controlsLocal.enabled; controlsLocal.enabled = false; } }catch(e){}

        const fromPos = cameraLocal.position.clone();
        const toPos = targetPos;
        const fromTarget = controlsLocal && controlsLocal.target ? controlsLocal.target.clone() : new THREE.Vector3(0,0,0);
        const toTarget = surface.clone();
        const start = performance.now(); const dur = 900;
        const ease = (t)=> t<0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2;

        (function tween(){
          const now = performance.now();
          const raw = Math.min(1,(now-start)/dur);
          const t = ease(raw);
          cameraLocal.position.lerpVectors(fromPos, toPos, t);
          if(controlsLocal && controlsLocal.target){ controlsLocal.target.lerpVectors(fromTarget, toTarget, t); }
          else { cameraLocal.lookAt(toTarget); }
          try{ cameraLocal.updateMatrixWorld(); }catch(e){}
          if(controlsLocal && typeof controlsLocal.update === 'function'){ try{ controlsLocal.update(); }catch(e){} }
          if(raw < 1) requestAnimationFrame(tween);
          else {
            try{ cameraLocal.position.copy(toPos); }catch(e){}
            try{ if(controlsLocal && controlsLocal.target) controlsLocal.target.copy(toTarget); }catch(e){}
            try{ cameraLocal.lookAt(toTarget); }catch(e){}
            try{ if(controlsLocal && 'enabled' in controlsLocal) controlsLocal.enabled = prevEnabled; }catch(e){}
            try{ if(controlsLocal && 'autoRotate' in controlsLocal) controlsLocal.autoRotate = prevAutoRotate; }catch(e){}
            showSys('Focused on ' + place.title, 1500);
          }
        })();
      }

      function latLonToVec3(lat, lon, radius){ const phi = (90 - lat) * (Math.PI/180); const theta = (lon + 180) * (Math.PI/180); const x = - (radius * Math.sin(phi) * Math.cos(theta)); const z = (radius * Math.sin(phi) * Math.sin(theta)); const y = (radius * Math.cos(phi)); return new THREE.Vector3(x,y,z); }

      window.addEventListener('resize', ()=>{ const w2 = container.clientWidth || window.innerWidth; const h2 = container.clientHeight || (window.innerHeight - 56); renderer.setSize(w2,h2); camera.aspect = w2/h2; camera.updateProjectionMatrix(); });

      // Auto-rotate when idle
      let lastInteraction = performance.now(); let lastFrame = performance.now(); const IDLE_ROTATE_DELAY = 2500; const IDLE_ROTATE_SPEED = 0.000175;
      container.addEventListener('pointerdown', ()=> lastInteraction = performance.now());
      (function animate(){ requestAnimationFrame(animate); const now = performance.now(); const delta = now - lastFrame; lastFrame = now; try{ if(!isFocused && now - lastInteraction > IDLE_ROTATE_DELAY){ globe.rotation.y += IDLE_ROTATE_SPEED * delta; } if(controls && typeof controls.update === 'function'){ try{ controls.update(); }catch(e){ console.warn('controls.update() failed', e); } } }catch(e){ console.warn('Animate loop error', e); } const t = performance.now() * 0.004;
      const pulse = Math.sin(t) * 0.15 + 1;

      glowingMarkers.forEach(g => {
      g.scale.set(pulse, pulse, pulse);
      g.material.opacity = 0.45 + Math.sin(t) * 0.25;
    });
    renderer.render(scene, camera); })();

      showSys('3D globe ready — orbit, zoom, and click pins!', 4000);

    }catch(err){ console.error('initScene error', err); showSys('3D initialization error: '+(err.message||err), 0); }
  }

  function createMinimalControls(camera, dom){ let isDragging = false; let prev = {x:0,y:0}; const rot = {x:0,y:0}; dom.style.touchAction = 'none'; dom.addEventListener('pointerdown', (e)=>{ isDragging=true; prev.x=e.clientX; prev.y=e.clientY; }); window.addEventListener('pointermove', (e)=>{ if(!isDragging) return; const dx=(e.clientX-prev.x); const dy=(e.clientY-prev.y); prev.x=e.clientX; prev.y=e.clientY; rot.y += dx*0.005; rot.x += dy*0.005; camera.position.applyAxisAngle(new THREE.Vector3(0,1,0), -dx*0.005); }); window.addEventListener('pointerup', ()=>{ isDragging=false; }); dom.addEventListener('wheel', (e)=>{ e.preventDefault(); const dir = e.deltaY>0?1:-1; camera.position.multiplyScalar(1+dir*0.05); }, {passive:false}); return { update: ()=>{}, dispose: ()=>{} }; }

  // populateList is defined earlier (with search/tabs). Remove duplicate simple definition.

})();

print("This is a test")