/**
 * CAD-style 3D tile viewport for portfolio sections.
 *
 * Uses Three.js (loaded globally as THREE) to render:
 * - One tile per major section (#overview, #about, #projects, #experience, #skills, #contact)
 * - Each tile is a base plate with raised blocks of varying heights
 * - Camera focus and subtle tile animation are driven by scroll (active section)
 *
 * This is Phase 1: primarily visual + scroll-driven behavior.
 * DOM remains the source of truth for actual content and scrolling.
 */

(function () {
  if (typeof window === "undefined") return;

  document.addEventListener("DOMContentLoaded", initCadTiles3D);

  function initCadTiles3D() {
    // Basic guards
    if (!window.THREE) {
      console.warn("[CAD 3D] THREE.js not found, skipping 3D tiles.");
      return;
    }

    const container = document.getElementById("cad-3d-viewport");
    if (!container) {
      console.warn("[CAD 3D] #cad-3d-viewport not found, skipping 3D tiles.");
      return;
    }

    const scrollRoot =
      document.querySelector(".cad-portfolio-content") || window;

    // ---- Config ----------------------------------------------------------------

    const TILE_SPACING_X = 6.5;
    const TILE_BASE_WIDTH = 4.0;
    const TILE_BASE_DEPTH = 3.0;
    const TILE_BASE_THICKNESS = 0.18;

    const TILE_OFFSET_CAMERA = new THREE.Vector3(0.0, 3.0, 7.0);
    const CAMERA_ANIM_DURATION = 900; // ms
    const TILE_ANIM_LERP = 0.12;

    // Per-section tile config: rough shape + block heights.
    // You can tweak these numbers to change the visual "height field".
    /** @type {Array<{id:string,label:string,color:number,blocks:Array<{w:number,d:number,h:number,x:number,z:number}>}>} */
    const TILE_CONFIG = [
      {
        id: "overview",
        label: "Overview",
        color: 0x8fa8ff,
        blocks: [
          // Hero name/title - tall
          { w: 1.6, d: 0.6, h: 0.7, x: -0.4, z: -0.4 },
          // Subtitle - mid
          { w: 1.4, d: 0.4, h: 0.45, x: -0.3, z: 0.1 },
          // Description - low
          { w: 1.8, d: 0.5, h: 0.3, x: -0.2, z: 0.6 },
          // Stats - three blocks
          { w: 0.5, d: 0.5, h: 0.55, x: 1.0, z: -0.6 },
          { w: 0.5, d: 0.5, h: 0.5, x: 1.0, z: 0.0 },
          { w: 0.5, d: 0.5, h: 0.45, x: 1.0, z: 0.6 },
        ],
      },
      {
        id: "about",
        label: "About",
        color: 0x90d0ff,
        blocks: [
          // Three about cards
          { w: 1.1, d: 0.9, h: 0.55, x: -1.0, z: 0.0 },
          { w: 1.1, d: 0.9, h: 0.6, x: 0.0, z: 0.0 },
          { w: 1.1, d: 0.9, h: 0.5, x: 1.0, z: 0.0 },
        ],
      },
      {
        id: "projects",
        label: "Projects",
        color: 0xffc27a,
        blocks: [
          // Three project cards
          { w: 1.3, d: 0.9, h: 0.6, x: -1.0, z: 0.0 },
          { w: 1.3, d: 0.9, h: 0.7, x: 0.0, z: 0.0 },
          { w: 1.3, d: 0.9, h: 0.65, x: 1.0, z: 0.0 },
        ],
      },
      {
        id: "experience",
        label: "Experience",
        color: 0xa3ffb8,
        blocks: [
          // Two timeline entries, one slightly taller
          { w: 1.6, d: 0.9, h: 0.7, x: -0.6, z: 0.0 },
          { w: 1.6, d: 0.9, h: 0.55, x: 0.9, z: 0.0 },
        ],
      },
      {
        id: "skills",
        label: "Skills",
        color: 0xe0b3ff,
        blocks: [
          // Three skill categories
          { w: 1.0, d: 0.9, h: 0.55, x: -1.0, z: 0.0 },
          { w: 1.0, d: 0.9, h: 0.6, x: 0.0, z: 0.0 },
          { w: 1.0, d: 0.9, h: 0.5, x: 1.0, z: 0.0 },
        ],
      },
      {
        id: "contact",
        label: "Contact",
        color: 0xffa3be,
        blocks: [
          // Three contact cards
          { w: 0.8, d: 0.8, h: 0.6, x: -0.9, z: 0.0 },
          { w: 0.8, d: 0.8, h: 0.55, x: 0.0, z: 0.0 },
          { w: 0.8, d: 0.8, h: 0.5, x: 0.9, z: 0.0 },
        ],
      },
    ];

    // ---- Three.js setup ---------------------------------------------------------

    let renderer, scene, camera;
    let animationFrameId = null;

    // Picking and interaction state
    const raycaster = new THREE.Raycaster();
    const pointerNDC = new THREE.Vector2();
    const pickableMeshes = [];

    const dragState = {
      isDragging: false,
      lastX: 0,
      lastY: 0,
    };

    const clickState = {
      downX: 0,
      downY: 0,
      downTime: 0,
    };

    /** @type {Map<string,{group:THREE.Group, baseMaterial:THREE.MeshStandardMaterial, emissiveMaterial:THREE.MeshStandardMaterial, center:THREE.Vector3, targetCameraPos:THREE.Vector3, targetLookAt:THREE.Vector3}>} */
    const sectionTiles = new Map();

    let activeSectionId = null;

    const cameraAnimState = {
      isAnimating: false,
      startTime: 0,
      duration: CAMERA_ANIM_DURATION,
      fromPos: new THREE.Vector3(),
      toPos: new THREE.Vector3(),
      fromLookAt: new THREE.Vector3(),
      toLookAt: new THREE.Vector3(),
      currentLookAt: new THREE.Vector3(),
    };

    try {
      const { width, height } = getContainerSize(container);

      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(width, height);
      renderer.outputEncoding = THREE.sRGBEncoding;
      container.appendChild(renderer.domElement);

      scene = new THREE.Scene();

      camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
      camera.position.set(0, 4, 10);
      camera.lookAt(0, 0, 0);
      cameraAnimState.currentLookAt.set(0, 0, 0);

      // Lighting: soft, CAD-like
      const ambient = new THREE.AmbientLight(0xffffff, 0.4);
      scene.add(ambient);

      const dir1 = new THREE.DirectionalLight(0xffffff, 0.7);
      dir1.position.set(4, 8, 6);
      scene.add(dir1);

      const dir2 = new THREE.DirectionalLight(0xffffff, 0.4);
      dir2.position.set(-5, 6, -4);
      scene.add(dir2);

      // Subtle floor to catch shadows / give sense of space
      const floorGeom = new THREE.PlaneGeometry(50, 50);
      const floorMat = new THREE.MeshStandardMaterial({
        color: 0xb5c0d8,
        roughness: 0.95,
        metalness: 0.0,
        transparent: true,
        opacity: 0.6,
      });
      const floor = new THREE.Mesh(floorGeom, floorMat);
      floor.rotation.x = -Math.PI / 2;
      floor.position.y = -0.02;
      scene.add(floor);

      createTiles();
      setupInteractions(container);

      window.addEventListener("resize", handleResize);
      // Observe DOM scroll to change active section
      setupSectionObserver(scrollRoot);

      // Start render loop
      animate();
    } catch (err) {
      console.error("[CAD 3D] Error initializing 3D tiles:", err);
      if (container) {
        container.style.display = "none";
      }
      return;
    }

    // ---- Tile creation ----------------------------------------------------------

    function createTiles() {
      const tileCount = TILE_CONFIG.length;
      const totalWidth = (tileCount - 1) * TILE_SPACING_X;
      const startX = -totalWidth / 2;

      TILE_CONFIG.forEach((cfg, index) => {
        const tileGroup = new THREE.Group();
        tileGroup.name = "Tile_" + cfg.id;
        tileGroup.position.set(startX + index * TILE_SPACING_X, 0, 0);

        // Base plate
        const baseGeom = new THREE.BoxGeometry(
          TILE_BASE_WIDTH,
          TILE_BASE_THICKNESS,
          TILE_BASE_DEPTH
        );
        const baseMat = new THREE.MeshStandardMaterial({
          color: cfg.color,
          roughness: 0.55,
          metalness: 0.25,
        });
        const baseMesh = new THREE.Mesh(baseGeom, baseMat);
        baseMesh.position.y = TILE_BASE_THICKNESS / 2;
        baseMesh.castShadow = false;
        baseMesh.receiveShadow = true;
        baseMesh.userData.sectionId = cfg.id;
        tileGroup.add(baseMesh);
        pickableMeshes.push(baseMesh);

        // Raised blocks - slightly offset to feel machined, not perfect grid
        const emissiveMat = new THREE.MeshStandardMaterial({
          color: 0xffffff,
          emissive: 0x111318,
          roughness: 0.4,
          metalness: 0.35,
        });

        cfg.blocks.forEach((b, bi) => {
          const height = b.h;
          const geom = new THREE.BoxGeometry(b.w, height, b.d);

          // Alternate material instances for variety
          const mat =
            bi % 2 === 0
              ? new THREE.MeshStandardMaterial({
                  color: 0xf5f7ff,
                  roughness: 0.35,
                  metalness: 0.25,
                })
              : emissiveMat.clone();

          const mesh = new THREE.Mesh(geom, mat);
          mesh.position.set(
            clamp(b.x, -1.6, 1.6),
            TILE_BASE_THICKNESS + height / 2,
            clamp(b.z, -1.1, 1.1)
          );
          mesh.castShadow = true;
          mesh.receiveShadow = false;
          mesh.userData.sectionId = cfg.id;
          tileGroup.add(mesh);
          pickableMeshes.push(mesh);
        });

        // Subtle border (wireframe-like)
        const edgeGeom = new THREE.EdgesGeometry(baseGeom);
        const edgeMat = new THREE.LineBasicMaterial({
          color: 0x1a2238,
          linewidth: 1,
        });
        const edgeLines = new THREE.LineSegments(edgeGeom, edgeMat);
        edgeLines.position.copy(baseMesh.position);
        tileGroup.add(edgeLines);

        // Slight base tilt to feel like a drafting board.
        tileGroup.rotation.x = -Math.PI * 0.18;
        tileGroup.rotation.y = 0.2 + index * 0.04;

        scene.add(tileGroup);

        // Compute center in world space for camera targeting
        const center = new THREE.Vector3();
        tileGroup.getWorldPosition(center);

        const targetCameraPos = center.clone().add(TILE_OFFSET_CAMERA);
        const targetLookAt = center.clone();

        sectionTiles.set(cfg.id, {
          group: tileGroup,
          baseMaterial: baseMat,
          emissiveMaterial: emissiveMat,
          center,
          targetCameraPos,
          targetLookAt,
        });
      });

      // Default focus to first known section if present in DOM
      const firstExisting = TILE_CONFIG.find((cfg) =>
        document.getElementById(cfg.id)
      );
      const initialId = firstExisting ? firstExisting.id : TILE_CONFIG[0].id;
      setActiveSection(initialId, { immediate: true });
    }

    // ---- Mouse / wheel interactions (orbit + picking) --------------------------

    function setupInteractions(containerEl) {
      if (!renderer || !camera) return;

      const dom = renderer.domElement;

      dom.addEventListener("pointerdown", onPointerDown);
      dom.addEventListener("pointermove", onPointerMove);
      dom.addEventListener("pointerup", onPointerUp);
      dom.addEventListener("pointerleave", onPointerUp);
      dom.addEventListener("wheel", onWheel, { passive: false });

      function onPointerDown(event) {
        // Left button only for orbit + picking
        if (event.button !== 0) return;

        dragState.isDragging = true;
        dragState.lastX = event.clientX;
        dragState.lastY = event.clientY;

        // Stop any scroll-driven camera tween while user interacts
        cameraAnimState.isAnimating = false;

        clickState.downX = event.clientX;
        clickState.downY = event.clientY;
        clickState.downTime = performance.now();

        if (event.pointerId != null) {
          dom.setPointerCapture(event.pointerId);
        }

        event.preventDefault();
      }

      function onPointerMove(event) {
        if (!dragState.isDragging) return;

        const dx = event.clientX - dragState.lastX;
        const dy = event.clientY - dragState.lastY;
        dragState.lastX = event.clientX;
        dragState.lastY = event.clientY;

        const ROTATE_SPEED = 0.005;

        // Orbit camera around current look-at point
        const center = cameraAnimState.currentLookAt.clone();
        const offset = new THREE.Vector3().subVectors(camera.position, center);
        const spherical = new THREE.Spherical().setFromVector3(offset);

        spherical.theta -= dx * ROTATE_SPEED;
        spherical.phi -= dy * ROTATE_SPEED;
        spherical.phi = clamp(spherical.phi, 0.1, Math.PI - 0.1);

        offset.setFromSpherical(spherical);
        camera.position.copy(center.clone().add(offset));
        camera.lookAt(center);

        event.preventDefault();
      }

      function onPointerUp(event) {
        if (dragState.isDragging) {
          dragState.isDragging = false;
        }

        if (event.pointerId != null) {
          try {
            dom.releasePointerCapture(event.pointerId);
          } catch (e) {
            // ignore
          }
        }

        const dx = event.clientX - clickState.downX;
        const dy = event.clientY - clickState.downY;
        const distSq = dx * dx + dy * dy;
        const elapsed = performance.now() - clickState.downTime;

        // Treat as a click if the pointer didn't move much
        if (distSq < 9 && elapsed < 400) {
          handleTileClick(event);
        }
      }

      function onWheel(event) {
        const center = cameraAnimState.currentLookAt.clone();
        const offset = new THREE.Vector3().subVectors(camera.position, center);

        const ZOOM_SPEED = 0.0015;
        const factor = 1 + event.deltaY * ZOOM_SPEED;

        // Clamp radius
        const minRadius = 3.0;
        const maxRadius = 30.0;
        const newRadius = clamp(offset.length() * factor, minRadius, maxRadius);

        offset.setLength(newRadius);
        camera.position.copy(center.clone().add(offset));
        camera.lookAt(center);

        event.preventDefault();
      }
    }

    function handleTileClick(event) {
      if (!renderer || !camera || !pickableMeshes.length) return;

      const rect = renderer.domElement.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      pointerNDC.set(x, y);
      raycaster.setFromCamera(pointerNDC, camera);

      const hits = raycaster.intersectObjects(pickableMeshes, true);
      if (!hits.length) return;

      const hitObj = hits[0].object;
      let sectionId = hitObj.userData.sectionId;
      let current = hitObj.parent;

      while (!sectionId && current) {
        sectionId = current.userData.sectionId;
        current = current.parent;
      }

      if (!sectionId) return;

      scrollToSection(sectionId);
      setActiveSection(sectionId, { immediate: false });
    }

    function scrollToSection(sectionId) {
      const section = document.getElementById(sectionId);
      if (!section) return;

      section.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    // ---- Section observer (scroll-driven) --------------------------------------

    function setupSectionObserver(rootElement) {
      const sections = Array.from(
        document.querySelectorAll(".portfolio-section[id]")
      );
      if (!sections.length) return;

      const observerOptions = {
        root: rootElement === window ? null : rootElement,
        rootMargin: "-40% 0px -45% 0px",
        threshold: [0.25, 0.5, 0.75],
      };

      let currentActive = null;

      const observer = new IntersectionObserver((entries) => {
        let best = null;

        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          if (!best || entry.intersectionRatio > best.intersectionRatio) {
            best = entry;
          }
        });

        if (!best) return;

        const id = best.target.id;
        if (!id || id === currentActive) return;
        currentActive = id;

        setActiveSection(id, { immediate: false });
      }, observerOptions);

      sections.forEach((section) => observer.observe(section));
    }

    // ---- Active section & camera animation -----------------------------------

    /**
     * Set the active section for 3D focus.
     * @param {string} sectionId
     * @param {{immediate?:boolean}} options
     */
    function setActiveSection(sectionId, options) {
      const opts = options || {};
      if (!sectionTiles.has(sectionId)) return;

      if (activeSectionId === sectionId && !opts.immediate) {
        return;
      }

      activeSectionId = sectionId;

      const tileInfo = sectionTiles.get(sectionId);
      const toPos = tileInfo.targetCameraPos.clone();
      const toLookAt = tileInfo.targetLookAt.clone();

      if (opts.immediate) {
        camera.position.copy(toPos);
        camera.lookAt(toLookAt);
        cameraAnimState.currentLookAt.copy(toLookAt);
        cameraAnimState.isAnimating = false;
      } else {
        cameraAnimState.isAnimating = true;
        cameraAnimState.startTime = performance.now();
        cameraAnimState.fromPos.copy(camera.position);
        cameraAnimState.toPos.copy(toPos);
        cameraAnimState.fromLookAt.copy(cameraAnimState.currentLookAt);
        cameraAnimState.toLookAt.copy(toLookAt);
      }

      // Visual emphasis on active tile: others slightly reduce scale and "relax".
      sectionTiles.forEach((info, id) => {
        if (!info.group) return;
        if (id === sectionId) {
          // Target rotation & scale handled each frame; here we only mark via userData
          info.group.userData.isActive = true;
        } else {
          info.group.userData.isActive = false;
        }
      });
    }

    // ---- Resize handling --------------------------------------------------------

    function handleResize() {
      if (!renderer || !camera) return;
      const { width, height } = getContainerSize(container);
      renderer.setSize(width, height);
      camera.aspect = width / height || 1;
      camera.updateProjectionMatrix();
    }

    function getContainerSize(el) {
      const rect = el.getBoundingClientRect();
      const width = rect.width || window.innerWidth || 800;
      const height = rect.height || window.innerHeight || 600;
      return { width, height };
    }

    // ---- Render loop & animation --------------------------------------------

    function animate(now) {
      animationFrameId = requestAnimationFrame(animate);

      const t = typeof now === "number" ? now : performance.now();

      updateCamera(t);
      updateTiles(t);

      renderer.render(scene, camera);
    }

    function updateCamera(time) {
      if (!cameraAnimState.isAnimating) {
        // Maintain lookAt target
        camera.lookAt(cameraAnimState.currentLookAt);
        return;
      }

      const elapsed = time - cameraAnimState.startTime;
      const alpha = clamp(elapsed / cameraAnimState.duration, 0, 1);
      const eased = easeInOutCubic(alpha);

      camera.position.lerpVectors(
        cameraAnimState.fromPos,
        cameraAnimState.toPos,
        eased
      );

      cameraAnimState.currentLookAt.lerpVectors(
        cameraAnimState.fromLookAt,
        cameraAnimState.toLookAt,
        eased
      );
      camera.lookAt(cameraAnimState.currentLookAt);

      if (alpha >= 1) {
        cameraAnimState.isAnimating = false;
      }
    }

    function updateTiles(time) {
      const t = time * 0.001;

      sectionTiles.forEach((info, id) => {
        const group = info.group;
        if (!group) return;

        const isActive = group.userData.isActive;

        // Base rotation target
        const baseTiltX = -Math.PI * 0.18;
        const baseRotY = 0.2 + (t * 0.03 + group.position.x * 0.03) * 0.1;

        let targetScale = 0.98;
        let targetRotX = baseTiltX;
        let targetRotY = baseRotY;
        let targetY = 0.0;

        if (isActive) {
          targetScale = 1.06;
          targetRotX = baseTiltX - 0.16;
          targetRotY = baseRotY + 0.25;
          targetY = 0.3;
        }

        // Smooth interpolation toward targets
        group.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), TILE_ANIM_LERP);
        group.rotation.x += (targetRotX - group.rotation.x) * TILE_ANIM_LERP;
        group.rotation.y += (targetRotY - group.rotation.y) * TILE_ANIM_LERP;
        group.position.y += (targetY - group.position.y) * TILE_ANIM_LERP;
      });
    }

    // ---- Utilities --------------------------------------------------------------

    function clamp(v, min, max) {
      return v < min ? min : v > max ? max : v;
    }

    function easeInOutCubic(x) {
      return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
    }

    // Cleanup hook (not strictly needed on single-page)
    window.addEventListener("beforeunload", function () {
      if (animationFrameId != null) {
        cancelAnimationFrame(animationFrameId);
      }
      if (renderer) {
        renderer.dispose();
      }
    });
  }
})();