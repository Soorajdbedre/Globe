// Globe JavaScript extracted from globe.html
// Initializes a Three.js globe with markers, country borders, and interaction.

// Cyberpunk marker colors
  const VISITED_COLOR = 0x00f0ff;  // Neon cyan
  const WISHLIST_COLOR = 0xff00ff; // Neon magenta

  // More places for demo
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
  },
  {
    id:'sydney',
    title:'Sydney, Australia',
    lat:-33.8688,
    lon:151.2093,
    type:'wishlist',
    year:null,
    thumbnail:'https://images.unsplash.com/photo-1506973035872-a4ec16b772e7?w=600'
  },
  {
    id:'dubai',
    title:'Dubai, UAE',
    lat:25.2048,
    lon:55.2708,
    type:'visited',
    year:2024,
    thumbnail:'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=600'
  },
  {
    id:'london',
    title:'London, UK',
    lat:51.5074,
    lon:-0.1278,
    type:'visited',
    year:2021,
    thumbnail:'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=600'
  },
  {
    id:'singapore',
    title:'Singapore',
    lat:1.3521,
    lon:103.8198,
    type:'wishlist',
    year:null,
    thumbnail:'https://images.unsplash.com/photo-1525625293386-3f3c1f01b16d?w=600'
  },
  {
    id:'rio',
    title:'Rio de Janeiro, Brazil',
    lat:-22.9068,
    lon:-43.1729,
    type:'wishlist',
    year:null,
    thumbnail:'https://images.unsplash.com/photo-1483729558449-891ef6525f90?w=600'
  }
  ];

  function showSys(msg, timeout=3000){ const el=document.getElementById('sys-msg'); if(!el) return; el.style.display='block'; el.textContent=msg; if(timeout) setTimeout(()=>el.style.display='none', timeout); }

  // Focus on a place - camera animation
  function focusOnPlace(place, cameraLocal, controlsLocal, markerObjsArr){
    let surface;
    const idx = PLACES.findIndex(p => p.id === place.id);
    if(idx >= 0 && markerObjsArr[idx]){
      surface = new THREE.Vector3();
      markerObjsArr[idx].getWorldPosition(surface);
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
        showSys('▸ Located: ' + place.title, 1500);
      }
    })();
  }

  function latLonToVec3(lat, lon, radius){ const phi = (90 - lat) * (Math.PI/180); const theta = (lon + 180) * (Math.PI/180); const x = - (radius * Math.sin(phi) * Math.cos(theta)); const z = (radius * Math.sin(phi) * Math.sin(theta)); const y = (radius * Math.cos(phi)); return new THREE.Vector3(x,y,z); }

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
    showSys('▶ Initializing cyberspace...');

    try{
      await loadScript('https://unpkg.com/three@0.152.2/build/three.min.js');
      if(typeof THREE === 'undefined') throw new Error('Three.js not available after load');
      showSys('▶ Three.js loaded — linking controls...');

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
      const renderer = new THREE.WebGLRenderer({antialias:true, alpha:false});
      renderer.setPixelRatio(window.devicePixelRatio);
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || (window.innerHeight - 56);
      renderer.setSize(w,h);
      renderer.outputEncoding = THREE.sRGBEncoding;
      container.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x020208);
      
      const camera = new THREE.PerspectiveCamera(45, w/h, 0.1, 2000);
      camera.position.set(0, 0, 300);

      let controls;
      if(typeof THREE.OrbitControls === 'function'){
        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true; 
        controls.dampingFactor = 0.05; 
        controls.rotateSpeed = 0.4; 
        controls.zoomSpeed = 0.8;
        controls.panSpeed = 0.4;
        controls.minDistance = 120; 
        controls.maxDistance = 800;
        controls.enablePan = true;
        controls.keyPanSpeed = 30;
        controls.autoRotate = true; 
        controls.autoRotateSpeed = 0.3;
      } else if(typeof OrbitControls === 'function'){
        controls = new OrbitControls(camera, renderer.domElement); 
        controls.enableDamping = true; 
        controls.dampingFactor = 0.05;
      } else {
        controls = createMinimalControls(camera, renderer.domElement); 
        showSys('Using lightweight fallback controls (OrbitControls unavailable).', 5000);
      }

      scene.add(new THREE.AmbientLight(0xffffff, 0.5));
      const dirLight = new THREE.DirectionalLight(0xffffff, 0.6); 
      dirLight.position.set(5,3,5); 
      scene.add(dirLight);

      // Cyberpunk rim lights - cyan and magenta
      const rimLight = new THREE.DirectionalLight(0x00f0ff, 0.4);
      rimLight.position.set(-5, 0, -5);
      scene.add(rimLight);

      const rimLight2 = new THREE.DirectionalLight(0xff00ff, 0.3);
      rimLight2.position.set(5, 0, -5);
      scene.add(rimLight2);

      // Globe
      const R = 100;
      const sphereGeo = new THREE.SphereGeometry(R, 96, 96);
      const texLoader = new THREE.TextureLoader();
      const remoteEarth = 'https://threejs.org/examples/textures/land_ocean_ice_cloud_2048.jpg';
      // try local earth.jpg first, fall back to remote
      let earthTex = texLoader.load('earth.jpg', function onLoad(){ try{ earthTex.encoding = THREE.sRGBEncoding; }catch(e){} }, undefined, function onError(){ earthTex = texLoader.load(remoteEarth, function(){ try{ earthTex.encoding = THREE.sRGBEncoding; }catch(e){} }); });
      const earthMat = new THREE.MeshStandardMaterial({map: earthTex, roughness: 1.0, metalness: 0.0});
      const globe = new THREE.Mesh(sphereGeo, earthMat); 
      
      // Add emissive glow effect to globe
      earthMat.emissive = new THREE.Color(0x001122);
      earthMat.emissiveIntensity = 0.1;
      
      scene.add(globe);

      // Atmosphere glow
      const atmosphereMat = new THREE.MeshPhongMaterial({ 
        color: 0x00f0ff, 
        transparent: true, 
        opacity: 0.12, 
        side: THREE.BackSide, 
        blending: THREE.AdditiveBlending 
      });
      const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(R*1.04, 64, 64), atmosphereMat); 
      scene.add(atmosphere);

      // Outer glow layer
      const outerAtmoMat = new THREE.MeshPhongMaterial({ 
        color: 0xff00ff, 
        transparent: true, 
        opacity: 0.05, 
        side: THREE.BackSide, 
        blending: THREE.AdditiveBlending 
      });
      const outerAtmo = new THREE.Mesh(new THREE.SphereGeometry(R*1.08, 64, 64), outerAtmoMat); 
      scene.add(outerAtmo);

      // Render country texture (land/ocean colors + borders)
      (async function renderCountryTexture(){
        try{
          let geo = null;
          const tryFetch = async (url)=>{ const r = await fetch(url, {mode:'cors'}); if(!r.ok) throw new Error('HTTP ' + r.status); return r.json(); };
          try{ geo = await tryFetch('https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/data/world.geojson'); }
          catch(err){ console.warn('Primary geojson failed:', err.message); try{ geo = await tryFetch('https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json'); }catch(err2){ console.warn('Fallback geojson failed:', err2.message); try{ const baseTex = earthTex; const canvas = document.createElement('canvas'); const W = baseTex.image?.width || 2048; const H = baseTex.image?.height || 1024; canvas.width = W; canvas.height = H; const ctx = canvas.getContext('2d'); ctx.drawImage(baseTex.image, 0, 0, W, H); ctx.fillStyle = 'rgba(0,240,255,0.15)'; ctx.fillRect(0,0,W,H); const tex = new THREE.CanvasTexture(canvas); try{ tex.encoding = THREE.sRGBEncoding; }catch(e){} globe.material.map = tex; globe.material.needsUpdate = true; showSys('▣ Using tinted fallback texture', 3000); }catch(e){ console.warn('Fallback recolor failed', e); } return; } }

          const W = 4096, H = 2048; const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H; const ctx = canvas.getContext('2d');
          const oceanColor = '#020a14'; const landColor = '#0a1520'; const borderColor = '#00f0ff';
          ctx.fillStyle = oceanColor; ctx.fillRect(0,0,W,H);
          const lonLatToXY = (lon, lat) => { const x = (lon + 180) / 360 * W; const y = (90 - lat) / 180 * H; return [x,y]; };
          ctx.fillStyle = landColor; ctx.strokeStyle = borderColor; ctx.lineWidth = Math.max(1, Math.floor(W/2048));
          ctx.globalAlpha = 0.8;
          geo.features.forEach(f=>{ const geom = f.geometry; if(!geom) return; const processRing=(ring)=>{ if(!ring||ring.length<2) return; ctx.beginPath(); for(let i=0;i<ring.length;i++){ const coord=ring[i]; const lon=coord[0], lat=coord[1]; const [x,y]=lonLatToXY(lon,lat); if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y); } ctx.closePath(); ctx.fill(); ctx.stroke(); }; if(geom.type==='Polygon') geom.coordinates.forEach(r=>processRing(r)); else if(geom.type==='MultiPolygon') geom.coordinates.forEach(p=>p.forEach(r=>processRing(r))); });
          const tex = new THREE.CanvasTexture(canvas); try{ tex.encoding = THREE.sRGBEncoding; }catch(e){} tex.needsUpdate = true; globe.material.map = tex; globe.material.needsUpdate = true; console.log('Country texture applied'); showSys('▣ Country borders rendered', 2000);
        }catch(err){ console.warn('Country texture render failed', err); showSys('▣ Country data load failed', 3000); }
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

          // Cyberpunk color based on type
          const markerColor = p.type === 'visited' ? VISITED_COLOR : WISHLIST_COLOR;
          const glowColor = p.type === 'visited' ? 0x00f0ff : 0xff00ff;

          // pin geometry: cylinder with base at y=0 (so it sits on the surface)
          const lineHeight = 14;
          const lineRadius = 0.18;
          const cylGeo = new THREE.CylinderGeometry(lineRadius, lineRadius, lineHeight, 12);
          cylGeo.translate(0, lineHeight / 2, 0);
          const lineMat = new THREE.MeshStandardMaterial({
            color: markerColor, 
            metalness: 0.9, 
            roughness: 0.2,
            emissive: markerColor,
            emissiveIntensity: 0.3
          });
          const pinLine = new THREE.Mesh(cylGeo, lineMat);
          pinLine.position.set(0,0,0);

          // small sphere on top (local coordinates, y=lineHeight)
          const sphereRadius = 1.4;
          const sphereGeo = new THREE.SphereGeometry(sphereRadius, 16, 16);
          const sphereMat = new THREE.MeshStandardMaterial({ 
            color: markerColor,
            emissive: markerColor,
            emissiveIntensity: 0.5,
            metalness: 0.8,
            roughness: 0.2
          });
          const topSphere = new THREE.Mesh(sphereGeo, sphereMat);
          topSphere.position.set(0, lineHeight, 0);

          // glow halo (slightly larger, additive)
          const glowMat = new THREE.MeshBasicMaterial({
            color: glowColor,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending,
          });
          const glowGeo = new THREE.SphereGeometry(sphereRadius * 2.5, 16, 16);
          const glowSphere = new THREE.Mesh(glowGeo, glowMat);
          glowSphere.position.copy(topSphere.position);
          glowingMarkers.push(glowSphere);

          markerGroup.add(pinLine);
          markerGroup.add(topSphere);
          markerGroup.add(glowSphere);

          markerGroup.userData = { idx: i, placeId: p.id };
          // add group as a child of the globe so it rotates with it
          markers.add(markerGroup);

          // store group for raycasting and lookup
          markerObjs.push(markerGroup);
        });

      // Raycaster for clicks
      const ray = new THREE.Raycaster(); const mouse = new THREE.Vector2();
      let isFocused = false;
      function clearFocus(){ isFocused = false; lastInteraction = performance.now(); try{ if(controls && 'autoRotate' in controls){ controls.autoRotate = true; } }catch(e){} showSys('▹ Focus cleared — resuming orbit', 1200); }
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
      focusOnPlace(PLACES[obj.userData.idx], camera, controls, markerObjs);
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
    const q = search.value.toLowerCase().trim();

    const filtered = PLACES.filter(p => p.type === activeType && p.title.toLowerCase().includes(q));
    
    if (filtered.length === 0) {
      list.innerHTML = '<div class="no-results">◈ No locations found</div>';
      return;
    }

    filtered.forEach(p => {
        const typeIcon = p.type === 'visited' ? '◈' : '◇';
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
          <button>${typeIcon}</button>
        `;

        item.querySelector('button').onclick = e => {
          e.stopPropagation();
          if(onLookAt) onLookAt(p);
        };

        item.onclick = () => {
          if(onLookAt) onLookAt(p);
        };
        list.appendChild(item);
      });
  }

  search.addEventListener('input', render);
  search.addEventListener('keypress', e => {
    if(e.key === 'Enter') {
      const firstResult = PLACES.find(p => p.title.toLowerCase().includes(search.value.toLowerCase().trim()));
      if(firstResult && onLookAt) {
        onLookAt(firstResult);
        search.value = firstResult.title;
      }
    }
  });

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

      // Pass focus function to populateList
      populateList((place) => focusOnPlace(place, camera, controls, markerObjs));

      window.addEventListener('resize', ()=>{ const w2 = container.clientWidth || window.innerWidth; const h2 = container.clientHeight || (window.innerHeight - 56); renderer.setSize(w2,h2); camera.aspect = w2/h2; camera.updateProjectionMatrix(); });

      // Coordinate display element refs
      const coordLat = document.getElementById('coord-lat');
      const coordLon = document.getElementById('coord-lon');
      
      function updateCoordDisplay() {
        if(coordLat && coordLon && camera) {
          const pos = camera.position.clone();
          pos.applyMatrix4(globe.matrixWorld.clone().invert());
          const lat = 90 - Math.acos(pos.y / R) * (180 / Math.PI);
          const lon = Math.atan2(pos.x, pos.z) * (180 / Math.PI);
          if(coordLat) coordLat.textContent = lat.toFixed(2);
          if(coordLon) coordLon.textContent = lon.toFixed(2);
        }
      }

      // Auto-rotate when idle
      let lastInteraction = performance.now(); let lastFrame = performance.now(); const IDLE_ROTATE_DELAY = 3000; const IDLE_ROTATE_SPEED = 0.00015;
      container.addEventListener('pointerdown', ()=> lastInteraction = performance.now());
      container.addEventListener('wheel', ()=> lastInteraction = performance.now());
      (function animate(){ requestAnimationFrame(animate); const now = performance.now(); const delta = now - lastFrame; lastFrame = now; try{ if(!isFocused && now - lastInteraction > IDLE_ROTATE_DELAY){ if(controls && controls.autoRotate === false) controls.autoRotate = true; globe.rotation.y += IDLE_ROTATE_SPEED * delta; } if(controls && typeof controls.update === 'function'){ try{ controls.update(); }catch(e){ console.warn('controls.update() failed', e); } } }catch(e){ console.warn('Animate loop error', e); } const t = performance.now() * 0.003;
      const pulse = Math.sin(t) * 0.12 + 1;

      glowingMarkers.forEach((g, idx) => {
        const place = PLACES[idx];
        const baseScale = place && place.type === 'wishlist' ? 2.8 : 2.5;
        g.scale.set(pulse * baseScale, pulse * baseScale, pulse * baseScale);
        g.material.opacity = 0.4 + Math.sin(t + idx) * 0.2;
      });
      
      // Pulse atmosphere
      atmosphere.material.opacity = 0.1 + Math.sin(t * 0.5) * 0.03;
      
      updateCoordDisplay();
      renderer.render(scene, camera); })();

      showSys('▣ Globe online — drag to rotate, scroll to zoom', 4000);

    }catch(err){ console.error('initScene error', err); showSys('▣ 3D initialization error: '+(err.message||err), 0); }
  }

  function createMinimalControls(camera, dom){ let isDragging = false; let prev = {x:0,y:0}; const rot = {x:0,y:0}; dom.style.touchAction = 'none'; dom.addEventListener('pointerdown', (e)=>{ isDragging=true; prev.x=e.clientX; prev.y=e.clientY; }); window.addEventListener('pointermove', (e)=>{ if(!isDragging) return; const dx=(e.clientX-prev.x); const dy=(e.clientY-prev.y); prev.x=e.clientX; prev.y=e.clientY; rot.y += dx*0.005; rot.x += dy*0.005; camera.position.applyAxisAngle(new THREE.Vector3(0,1,0), -dx*0.005); }); window.addEventListener('pointerup', ()=>{ isDragging=false; }); dom.addEventListener('wheel', (e)=>{ e.preventDefault(); const dir = e.deltaY>0?1:-1; camera.position.multiplyScalar(1+dir*0.05); }, {passive:false}); return { update: ()=>{}, dispose: ()=>{} }; }

})();
