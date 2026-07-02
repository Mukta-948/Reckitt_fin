import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const container = document.getElementById("horseViewer");
const statusText = document.getElementById("modelStatus");
const playPauseBtn = document.getElementById("modelPlayPause");
const zoomInBtn = document.getElementById("modelZoomIn");
const zoomOutBtn = document.getElementById("modelZoomOut");
const resetBtn = document.getElementById("modelReset");

let camera;
let controls;
let mixer;
let model;
let currentAction;
let isPlaying = true;
let initialCameraPosition;
let initialTarget;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xfff7fb);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
container.appendChild(renderer.domElement);

camera = new THREE.PerspectiveCamera(45, 1, 0.01, 1000);
camera.position.set(0, 1.5, 5);

controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.enablePan = true;
controls.screenSpacePanning = true;
controls.minDistance = 1;
controls.maxDistance = 20;
controls.target.set(0, 1, 0);

scene.add(new THREE.HemisphereLight(0xffffff, 0x6e4a5b, 2.2));

const keyLight = new THREE.DirectionalLight(0xffffff, 2.8);
keyLight.position.set(4, 5, 6);
keyLight.castShadow = true;
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0xffd7ea, 1.4);
fillLight.position.set(-4, 2, -3);
scene.add(fillLight);

const floor = new THREE.Mesh(
    new THREE.CircleGeometry(2.8, 64),
    new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.7,
        metalness: 0
    })
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -0.02;
floor.receiveShadow = true;
scene.add(floor);

const clock = new THREE.Clock();
const loader = new GLTFLoader();

loader.load(
    "models/Horse.glb",
    (gltf) => {
        model = gltf.scene;

        model.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        scene.add(model);
        fitModelToView(model);

        if (gltf.animations.length > 0) {
            mixer = new THREE.AnimationMixer(model);
            currentAction = mixer.clipAction(gltf.animations[0]);
            currentAction.play();
            playPauseBtn.disabled = false;
            playPauseBtn.textContent = "Pause";
        } else {
            playPauseBtn.textContent = "No Animation";
        }

        statusText.textContent = "";
        statusText.classList.add("is-hidden");
    },
    undefined,
    (error) => {
        console.error("Unable to load Horse.glb:", error);
        statusText.textContent = "Unable to load the 3D model.";
    }
);

playPauseBtn.addEventListener("click", () => {
    if (!currentAction) return;

    isPlaying = !isPlaying;
    currentAction.paused = !isPlaying;
    playPauseBtn.textContent = isPlaying ? "Pause" : "Play";
});

zoomInBtn.addEventListener("click", () => dollyCamera(0.82));
zoomOutBtn.addEventListener("click", () => dollyCamera(1.18));

resetBtn.addEventListener("click", () => {
    if (!initialCameraPosition || !initialTarget) return;

    camera.position.copy(initialCameraPosition);
    controls.target.copy(initialTarget);
    controls.update();
});

function fitModelToView(object) {
    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxSize = Math.max(size.x, size.y, size.z);
    const distance = maxSize / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));

    object.position.sub(center);

    const adjustedCenter = new THREE.Vector3(0, size.y * 0.35, 0);
    camera.near = Math.max(distance / 100, 0.01);
    camera.far = distance * 100;
    camera.position.set(distance * 0.25, distance * 0.35, distance * 1.6);
    camera.updateProjectionMatrix();

    controls.target.copy(adjustedCenter);
    controls.minDistance = Math.max(distance * 0.35, 0.5);
    controls.maxDistance = distance * 4;
    controls.update();

    floor.scale.setScalar(Math.max(maxSize * 0.45, 1));
    initialCameraPosition = camera.position.clone();
    initialTarget = controls.target.clone();
}

function dollyCamera(scale) {
    const direction = camera.position.clone().sub(controls.target);
    const nextDistance = THREE.MathUtils.clamp(
        direction.length() * scale,
        controls.minDistance,
        controls.maxDistance
    );

    direction.setLength(nextDistance);
    camera.position.copy(controls.target).add(direction);
    controls.update();
}

function resizeRenderer() {
    const width = container.clientWidth;
    const height = container.clientHeight;

    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
}

const resizeObserver = new ResizeObserver(resizeRenderer);
resizeObserver.observe(container);
resizeRenderer();

function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    if (mixer && isPlaying) {
        mixer.update(delta);
    }

    controls.update();
    renderer.render(scene, camera);
}

animate();
