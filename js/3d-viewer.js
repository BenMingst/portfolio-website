import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

function main() {
    const canvas = document.querySelector('#c');
    // Enable alpha to let the CSS background show through
    const renderer = new THREE.WebGLRenderer({ antialias: true, canvas, alpha: true });

    // Improve visual quality: high DPI, tone mapping, and soft shadows
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.physicallyCorrectLights = true;
    
    const scene = new THREE.Scene();
    // No background color set on scene to allow transparency
    
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(5, 5, 5);
    camera.lookAt(0, 0, 0);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 2;
    controls.maxDistance = 20;

        // --- Lighting Setup ---
        // Soft ambient/sky-ground light
        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x222222, 0.8);
        hemiLight.position.set(0, 5, 0);
        scene.add(hemiLight);
    
        // Main directional "sun" light with soft shadows
        const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
        dirLight.position.set(5, 10, 7);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.set(2048, 2048);
        dirLight.shadow.camera.near = 0.5;
        dirLight.shadow.camera.far = 50;
        dirLight.shadow.camera.left = -10;
        dirLight.shadow.camera.right = 10;
        dirLight.shadow.camera.top = 10;
        dirLight.shadow.camera.bottom = -10;
        scene.add(dirLight);
    
        // Fill light from the opposite side to soften contrast
        const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
        fillLight.position.set(-5, 3, -5);
        scene.add(fillLight);

        // Add a sample object (Cube) as placeholder while the GLB loads
        const geometry = new THREE.BoxGeometry(2, 2, 2);
        const material = new THREE.MeshStandardMaterial({
            color: 0x5a6d8f,
            roughness: 0.4,
            metalness: 0.2
        });
        const cube = new THREE.Mesh(geometry, material);
        cube.castShadow = true;
        cube.receiveShadow = true;
        scene.add(cube);

        // Simple shadow-catching ground plane
        const ground = new THREE.Mesh(
            new THREE.PlaneGeometry(20, 20),
            new THREE.ShadowMaterial({ opacity: 0.2 })
        );
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -1;
        ground.receiveShadow = true;
        scene.add(ground);
    
        // Load your GLTF model (replaces the placeholder cube when ready)
        const loader = new GLTFLoader();
        loader.load(
            '../media/intersection complete.glb',
            (gltf) => {
                // Remove placeholder cube
                scene.remove(cube);
    
                const model = gltf.scene;
                scene.add(model);

                // Enable shadows and sharpen textures on all meshes
                model.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                        if (child.material && child.material.map) {
                            child.material.map.anisotropy = 8;
                        }
                    }
                });
    
                // Center and scale model to fit roughly in a 2x2x2 box around the origin
                const box = new THREE.Box3().setFromObject(model);
                const center = box.getCenter(new THREE.Vector3());
                const size = box.getSize(new THREE.Vector3());
    
                const maxDim = Math.max(size.x, size.y, size.z) || 1;
                const scale = 2 / maxDim;
                model.scale.setScalar(scale);
                model.position.sub(center.multiplyScalar(scale));
    
                // Reset camera target to center on the model
                controls.target.set(0, 0, 0);
                controls.update();
            },
            undefined,
            (error) => {
                console.error('An error happened loading the model:', error);
            }
        );



    // --- ViewCube Logic ---
    const viewCubeInner = document.querySelector('.cad-viewcube-inner');
    
    function updateViewCube() {
        if (!viewCubeInner) return;

        // Create a matrix from the camera's rotation
        const mat = new THREE.Matrix4();
        mat.extractRotation(camera.matrixWorldInverse);
        
        // Convert to CSS matrix3d string
        const elements = mat.elements;
        const cssMatrix = `matrix3d(
            ${elements[0]}, ${elements[1]}, ${elements[2]}, ${elements[3]},
            ${elements[4]}, ${elements[5]}, ${elements[6]}, ${elements[7]},
            ${elements[8]}, ${elements[9]}, ${elements[10]}, ${elements[11]},
            ${elements[12]}, ${elements[13]}, ${elements[14]}, ${elements[15]}
        )`;

        viewCubeInner.style.transform = cssMatrix;
    }

    // Handle ViewCube Clicks
    const faces = {
        'front': { pos: [0, 0, 5], lookAt: [0, 0, 0] },
        'back': { pos: [0, 0, -5], lookAt: [0, 0, 0] },
        'right': { pos: [5, 0, 0], lookAt: [0, 0, 0] },
        'left': { pos: [-5, 0, 0], lookAt: [0, 0, 0] },
        'top': { pos: [0, 5, 0], lookAt: [0, 0, 0] },
        'bottom': { pos: [0, -5, 0], lookAt: [0, 0, 0] },
        
        // Corners
        'corner-ftr': { pos: [5, 5, 5], lookAt: [0, 0, 0] },
        'corner-ftl': { pos: [-5, 5, 5], lookAt: [0, 0, 0] },
        'corner-fbr': { pos: [5, -5, 5], lookAt: [0, 0, 0] },
        'corner-fbl': { pos: [-5, -5, 5], lookAt: [0, 0, 0] },
        'corner-btr': { pos: [5, 5, -5], lookAt: [0, 0, 0] },
        'corner-btl': { pos: [-5, 5, -5], lookAt: [0, 0, 0] },
        'corner-bbr': { pos: [5, -5, -5], lookAt: [0, 0, 0] },
        'corner-bbl': { pos: [-5, -5, -5], lookAt: [0, 0, 0] }
    };

    // Handle Face Clicks
    document.querySelectorAll('.cad-viewcube-face').forEach(face => {
        face.addEventListener('click', (e) => {
            e.stopPropagation();
            let target = null;
            if (face.classList.contains('cad-viewcube-front')) target = faces.front;
            else if (face.classList.contains('cad-viewcube-back')) target = faces.back;
            else if (face.classList.contains('cad-viewcube-right')) target = faces.right;
            else if (face.classList.contains('cad-viewcube-left')) target = faces.left;
            else if (face.classList.contains('cad-viewcube-top')) target = faces.top;
            else if (face.classList.contains('cad-viewcube-bottom')) target = faces.bottom;

            if (target) moveCameraTo(target.pos, target.lookAt);
        });
    });

    // Handle Corner Clicks
    document.querySelectorAll('.cad-viewcube-corner').forEach(corner => {
        corner.addEventListener('click', (e) => {
            e.stopPropagation();
            let target = null;
            if (corner.classList.contains('corner-ftr')) target = faces['corner-ftr'];
            else if (corner.classList.contains('corner-ftl')) target = faces['corner-ftl'];
            else if (corner.classList.contains('corner-fbr')) target = faces['corner-fbr'];
            else if (corner.classList.contains('corner-fbl')) target = faces['corner-fbl'];
            else if (corner.classList.contains('corner-btr')) target = faces['corner-btr'];
            else if (corner.classList.contains('corner-btl')) target = faces['corner-btl'];
            else if (corner.classList.contains('corner-bbr')) target = faces['corner-bbr'];
            else if (corner.classList.contains('corner-bbl')) target = faces['corner-bbl'];

            if (target) moveCameraTo(target.pos, target.lookAt);
        });
    });

    function moveCameraTo(position, target) {
        const startPos = camera.position.clone();
        const endPos = new THREE.Vector3(...position);
        const startTarget = controls.target.clone();
        const endTarget = new THREE.Vector3(...target);
        
        // Simple animation loop
        const duration = 500; // ms
        const startTime = performance.now();

        function animateCamera(time) {
            const elapsed = time - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Ease out cubic
            const ease = 1 - Math.pow(1 - progress, 3);

            camera.position.lerpVectors(startPos, endPos, ease);
            controls.target.lerpVectors(startTarget, endTarget, ease);
            controls.update();

            if (progress < 1) {
                requestAnimationFrame(animateCamera);
            }
        }
        requestAnimationFrame(animateCamera);
    }

    // --- Toolbar Logic ---
    const toolbarButtons = document.querySelectorAll('.cad-viewport-tool');
    
    toolbarButtons.forEach(btn => {
        const title = btn.getAttribute('title').toLowerCase();
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            switch(title) {
                case 'home':
                    moveCameraTo([5, 5, 5], [0, 0, 0]);
                    break;
                case 'fit':
                    // Fit cube to screen
                    moveCameraTo([4, 4, 4], [0, 0, 0]);
                    break;
                case 'rotate':
                    controls.autoRotate = !controls.autoRotate;
                    break;
                case 'pan':
                    // Toggle panning mode vs rotating mode if desired, 
                    // or just reset controls to pan-friendly state
                    controls.mouseButtons = {
                        LEFT: THREE.MOUSE.PAN,
                        MIDDLE: THREE.MOUSE.DOLLY,
                        RIGHT: THREE.MOUSE.ROTATE
                    };
                    break;
                case 'zoom':
                     // Reset to default orbit behavior
                     controls.mouseButtons = {
                        LEFT: THREE.MOUSE.ROTATE,
                        MIDDLE: THREE.MOUSE.DOLLY,
                        RIGHT: THREE.MOUSE.PAN
                    };
                    break;
            }
        });
    });


    function resizeRendererToDisplaySize(renderer) {
        const canvas = renderer.domElement;
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        const needResize = canvas.width !== width || canvas.height !== height;
        if (needResize) {
            renderer.setSize(width, height, false);
        }
        return needResize;
    }

    function animate() {
        if (resizeRendererToDisplaySize(renderer)) {
            const canvas = renderer.domElement;
            camera.aspect = canvas.clientWidth / canvas.clientHeight;
            camera.updateProjectionMatrix();
        }

        controls.update();
        updateViewCube();
        
        renderer.render(scene, camera);
        requestAnimationFrame(animate);
    }

    animate();
}

main();