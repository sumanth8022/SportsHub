import React, { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { STAND_3D_CONFIG, getStadiumDetails } from "../../data/stadiumData";
import "./Stadium3DViewer.css";

function inr(n) {
  return "₹" + Number(n).toLocaleString("en-IN");
}

export default function Stadium3DViewer({
  stadium,
  selectedStandId,
  onSelectStand,
  onProceedToBooking,
  onClose,
  onTravel,
}) {
  const mountRef = useRef(null);
  const details = getStadiumDetails(stadium);
  const stands = stadium.stands && stadium.stands.length > 0 ? stadium.stands : STAND_3D_CONFIG;

  const [activeStandId, setActiveStandId] = useState(selectedStandId || 1);
  const [hoveredStand, setHoveredStand] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0, visible: false });
  const [cameraMode, setCameraMode] = useState("orbit"); // orbit | pitch | vip | top
  const [isLoading, setIsLoading] = useState(true);
  const [liveStands, setLiveStands] = useState(null);

  useEffect(() => {
    let active = true;
    const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";
    const evId = stadium.nextEvent?.id || (stadium.events && stadium.events[0]?.id);
    const url = `${API_BASE}/stadiums/${stadium.id}/stands${evId ? `?eventId=${evId}` : ""}`;
    fetch(url)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (active && data && Array.isArray(data)) {
          setLiveStands(data);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [stadium.id, stadium.nextEvent?.id, stadium.events]);

  // References to three objects for interaction & cleanup
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);
  const cameraRef = useRef(null);
  const standMeshesRef = useRef(new Map());
  const reqIdRef = useRef(null);

  // Merge backend stands with 3D metadata
  const standList = STAND_3D_CONFIG.map((cfg) => {
    const backendStand = (liveStands || stadium.stands || []).find((s) => s.id === cfg.id || s.name.toLowerCase().includes(cfg.name.toLowerCase()));
    const mult = backendStand ? backendStand.priceMultiplier || backendStand.mult || cfg.defaultMultiplier : cfg.defaultMultiplier;
    const price = backendStand?.price != null ? Number(backendStand.price) : Math.round((stadium.price || stadium.basePrice || 800) * mult);
    const availableTickets = backendStand?.availableTickets != null ? backendStand.availableTickets : cfg.availableTickets;
    const status = backendStand?.status ? backendStand.status.toLowerCase() : cfg.status;
    return {
      ...cfg,
      id: backendStand ? backendStand.id : cfg.id,
      name: backendStand ? backendStand.name : cfg.name,
      mult,
      price,
      availableTickets,
      status,
      capacity: backendStand?.capacity || cfg.capacity,
    };
  });

  const currentStand = standList.find((s) => s.id === activeStandId) || standList[0];

  // Camera preset handler
  const setCameraPreset = useCallback((preset) => {
    if (!cameraRef.current || !controlsRef.current) return;
    setCameraMode(preset);
    const camera = cameraRef.current;
    const controls = controlsRef.current;

    switch (preset) {
      case "pitch":
        // View from batting crease looking toward stands
        camera.position.set(0, 3.5, 12);
        controls.target.set(0, 10, -50);
        break;
      case "vip":
        // View from VIP Pavilion balcony looking over pitch
        camera.position.set(-42, 22, 10);
        controls.target.set(0, 2, 0);
        break;
      case "top":
        // Birds-eye top down
        camera.position.set(0, 120, 1);
        controls.target.set(0, 0, 0);
        break;
      case "orbit":
      default:
        // Classic elevated 360 view
        camera.position.set(0, 55, 95);
        controls.target.set(0, 4, 0);
        break;
    }
    controls.update();
  }, []);

  // Update visual materials of stand meshes on hover/active change
  useEffect(() => {
    standMeshesRef.current.forEach((meshGroup, id) => {
      const isSelected = id === activeStandId;
      const isHovered = hoveredStand && hoveredStand.id === id;

      meshGroup.traverse((child) => {
        if (child.isMesh && child.userData.isStandPiece) {
          if (isSelected) {
            child.material.emissive.setHex(0xf59e0b); // Golden amber glow
            child.material.emissiveIntensity = 0.55;
          } else if (isHovered) {
            child.material.emissive.setHex(0x38bdf8); // Sky blue glow
            child.material.emissiveIntensity = 0.45;
          } else {
            child.material.emissive.setHex(child.userData.defaultEmissive || 0x000000);
            child.material.emissiveIntensity = 0.05;
          }
        }
      });
    });
  }, [activeStandId, hoveredStand]);

  // Build Three.js 3D Stadium
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x0a0f24);
    scene.fog = new THREE.FogExp2(0x0a0f24, 0.0035);

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(46, width / height, 0.5, 600);
    camera.position.set(0, 58, 98);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI / 2.04; // Don't clip under ground
    controls.minDistance = 20;
    controls.maxDistance = 220;
    controls.target.set(0, 4, 0);
    controlsRef.current = controls;

    // 5. Lighting
    const ambientLight = new THREE.AmbientLight(0xdbeafe, 0.65);
    scene.add(ambientLight);

    const dirSun = new THREE.DirectionalLight(0xffffff, 0.9);
    dirSun.position.set(40, 90, 40);
    dirSun.castShadow = true;
    dirSun.shadow.mapSize.width = 1024;
    dirSun.shadow.mapSize.height = 1024;
    scene.add(dirSun);

    // 6. Stadium Foundation & Field
    const outerBaseGeo = new THREE.CylinderGeometry(78, 80, 2, 64);
    const outerBaseMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.9 });
    const outerBase = new THREE.Mesh(outerBaseGeo, outerBaseMat);
    outerBase.position.y = -1;
    outerBase.receiveShadow = true;
    scene.add(outerBase);

    // Turf Canvas Texture (Alternating mower lawn rings)
    const turfCanvas = document.createElement("canvas");
    turfCanvas.width = 1024;
    turfCanvas.height = 1024;
    const ctx = turfCanvas.getContext("2d");
    ctx.fillStyle = "#15803d";
    ctx.fillRect(0, 0, 1024, 1024);

    // Draw concentric lawn stripe rings
    for (let r = 500; r > 30; r -= 40) {
      ctx.beginPath();
      ctx.arc(512, 512, r, 0, Math.PI * 2);
      ctx.fillStyle = r % 80 === 0 ? "#16a34a" : "#15803d";
      ctx.fill();
    }
    // 30-yard inner circle line
    ctx.beginPath();
    ctx.arc(512, 512, 270, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
    ctx.lineWidth = 4;
    ctx.setLineDash([12, 8]);
    ctx.stroke();

    // Boundary circle
    ctx.beginPath();
    ctx.arc(512, 512, 470, 0, Math.PI * 2);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 6;
    ctx.setLineDash([]);
    ctx.stroke();

    const turfTexture = new THREE.CanvasTexture(turfCanvas);
    turfTexture.wrapS = THREE.ClampToEdgeWrapping;
    turfTexture.wrapT = THREE.ClampToEdgeWrapping;

    const fieldGeo = new THREE.CylinderGeometry(45, 45, 0.5, 64);
    const fieldMat = new THREE.MeshStandardMaterial({
      map: turfTexture,
      roughness: 0.7,
      metalness: 0.1,
    });
    const field = new THREE.Mesh(fieldGeo, fieldMat);
    field.position.y = 0.25;
    field.receiveShadow = true;
    scene.add(field);

    // Cricket Pitch Strip
    const pitchGeo = new THREE.BoxGeometry(3.2, 0.12, 22);
    const pitchMat = new THREE.MeshStandardMaterial({ color: 0xca8a04, roughness: 0.95 });
    const pitch = new THREE.Mesh(pitchGeo, pitchMat);
    pitch.position.set(0, 0.55, 0);
    pitch.receiveShadow = true;
    scene.add(pitch);

    // Crease lines & Wickets
    const creaseMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    [-8.8, 8.8].forEach((zPos) => {
      // Bowling crease
      const creaseGeo = new THREE.BoxGeometry(2.8, 0.05, 0.2);
      const crease = new THREE.Mesh(creaseGeo, creaseMat);
      crease.position.set(0, 0.62, zPos);
      scene.add(crease);

      // Stumps / Wickets (3 wickets + bails)
      [-0.35, 0, 0.35].forEach((xOff) => {
        const stumpGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.85, 8);
        const stumpMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.5 });
        const stump = new THREE.Mesh(stumpGeo, stumpMat);
        stump.position.set(xOff, 1.05, zPos);
        scene.add(stump);
      });
      // Bail
      const bailGeo = new THREE.BoxGeometry(0.85, 0.04, 0.04);
      const bailMat = new THREE.MeshStandardMaterial({ color: 0xfef08a });
      const bail = new THREE.Mesh(bailGeo, bailMat);
      bail.position.set(0, 1.48, zPos);
      scene.add(bail);
    });

    // Boundary Rope Foam Wedges
    const boundaryRopeGeo = new THREE.TorusGeometry(44.2, 0.3, 12, 64);
    const boundaryRopeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
    const boundaryRope = new THREE.Mesh(boundaryRopeGeo, boundaryRopeMat);
    boundaryRope.rotation.x = Math.PI / 2;
    boundaryRope.position.y = 0.55;
    scene.add(boundaryRope);

    // Digital LED perimeter ads ring
    const ledRibbonGeo = new THREE.CylinderGeometry(46, 46, 1.2, 64, 1, true);
    const ledRibbonMat = new THREE.MeshBasicMaterial({ color: 0x3b82f6, side: THREE.DoubleSide });
    const ledRibbon = new THREE.Mesh(ledRibbonGeo, ledRibbonMat);
    ledRibbon.position.y = 1.1;
    scene.add(ledRibbon);

    // 7. Interactive Stadium Stands
    standMeshesRef.current.clear();
    const hitMeshes = [];

    standList.forEach((standConfig) => {
      const standGroup = new THREE.Group();
      standGroup.userData = { standId: standConfig.id, standConfig };

      // Stand placement based on angle around oval
      const angle = standConfig.angle;
      const radius = 53;
      const posX = Math.sin(angle) * radius;
      const posZ = Math.cos(angle) * radius;

      standGroup.position.set(posX, 0, posZ);
      // lookAt(0, 0, 0) aligns local +Z directly facing the pitch in the center
      standGroup.lookAt(0, 0, 0);

      // Stand construction: authentic stepped grandstand tiers facing the pitch
      const tiers = standConfig.tierCount || 3;
      const standWidth = standConfig.id === 3 ? 28 : 34; // VIP stand slightly more compact and tall
      const tierHeight = 2.8;
      const tierDepth = 4.2;

      // Track bounding coordinates for roof and pillars
      const frontEdgeZ = 3.5;
      const topRearZ = frontEdgeZ - (tiers - 1) * tierDepth - tierDepth / 2;

      for (let t = 0; t < tiers; t++) {
        // t=0 is the lowest front row near the boundary rope
        // As t increases: height goes UP and position steps BACKWARD (-Z) away from the pitch
        const tierY = 1.0 + t * tierHeight;
        const tierZ = frontEdgeZ - t * tierDepth;

        // Tier concrete foundation
        const tierGeo = new THREE.BoxGeometry(standWidth - t * 1.2, tierHeight, tierDepth);
        const tierMat = new THREE.MeshStandardMaterial({
          color: 0x334155, // slate-700
          roughness: 0.85,
        });
        const tierMesh = new THREE.Mesh(tierGeo, tierMat);
        tierMesh.position.set(0, tierY, tierZ);
        tierMesh.castShadow = true;
        tierMesh.receiveShadow = true;
        standGroup.add(tierMesh);

        // Seating Row on top of concrete step (spectators face forward +Z toward the pitch)
        const seatGeo = new THREE.BoxGeometry(standWidth - t * 1.2 - 0.4, 0.7, tierDepth - 0.6);
        const seatColor = new THREE.Color(standConfig.color);
        const seatMat = new THREE.MeshStandardMaterial({
          color: seatColor,
          roughness: 0.5,
          metalness: 0.2,
          emissive: new THREE.Color(0x000000),
          emissiveIntensity: 0.05,
        });
        const seatMesh = new THREE.Mesh(seatGeo, seatMat);
        seatMesh.position.set(0, tierY + tierHeight / 2 + 0.35, tierZ);
        seatMesh.userData = {
          isStandPiece: true,
          standId: standConfig.id,
          defaultEmissive: 0x000000,
        };
        standGroup.add(seatMesh);
      }

      // Modern Cantilevered Canopy Roof (starts at rear and projects forward over seats)
      const roofY = 1.0 + tiers * tierHeight + 3.2;
      const frontLipZ = 5.2;
      const roofDepth = Math.abs(frontLipZ - topRearZ);
      const roofCenterZ = (topRearZ + frontLipZ) / 2;

      const roofGeo = new THREE.BoxGeometry(standWidth + 4, 0.7, roofDepth);
      const roofMat = new THREE.MeshStandardMaterial({
        color: standConfig.id === 3 ? 0xf8fafc : 0x1e293b,
        metalness: 0.5,
        roughness: 0.25,
      });
      const roofMesh = new THREE.Mesh(roofGeo, roofMat);
      roofMesh.position.set(0, roofY, roofCenterZ);
      roofMesh.rotation.x = -0.06; // Slanted slightly downward towards the pitch
      roofMesh.castShadow = true;
      standGroup.add(roofMesh);

      // Rear support pillars (placed at back of stand to guarantee 100% pillar-free spectator views!)
      [-standWidth / 2 + 1, standWidth / 2 - 1].forEach((colX) => {
        const pillarGeo = new THREE.CylinderGeometry(0.45, 0.65, roofY, 12);
        const pillarMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.7 });
        const pillar = new THREE.Mesh(pillarGeo, pillarMat);
        pillar.position.set(colX, roofY / 2, topRearZ + 0.8);
        standGroup.add(pillar);
      });

      // Side structural walls enclosing the grandstand
      [-standWidth / 2 + 0.2, standWidth / 2 - 0.2].forEach((wallX) => {
        const wallHeight = tiers * tierHeight + 1.2;
        const wallGeo = new THREE.BoxGeometry(0.4, wallHeight, (tiers + 1) * tierDepth);
        const wallMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
        const wall = new THREE.Mesh(wallGeo, wallMat);
        wall.position.set(wallX, wallHeight / 2 + 0.5, roofCenterZ);
        standGroup.add(wall);
      });

      // Special VIP Glass Pavilion features (Stand 3)
      if (standConfig.id === 3) {
        // Luxury air-conditioned glass box lounge overlooking the pitch
        const glassGeo = new THREE.BoxGeometry(standWidth - 3, 4.2, 0.3);
        const glassMat = new THREE.MeshPhysicalMaterial({
          color: 0x38bdf8,
          transparent: true,
          opacity: 0.65,
          roughness: 0.1,
          transmission: 0.85,
        });
        const glassBox = new THREE.Mesh(glassGeo, glassMat);
        glassBox.position.set(0, 1.0 + (tiers - 1) * tierHeight + 2.2, topRearZ + 3.8);
        standGroup.add(glassBox);

        // VIP Roof Mast and Flag
        const poleGeo = new THREE.CylinderGeometry(0.08, 0.08, 4, 8);
        const poleMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.8 });
        const pole = new THREE.Mesh(poleGeo, poleMat);
        pole.position.set(0, roofY + 2, topRearZ + 1);
        standGroup.add(pole);

        const flagGeo = new THREE.PlaneGeometry(2.5, 1.2);
        const flagMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, side: THREE.DoubleSide });
        const flag = new THREE.Mesh(flagGeo, flagMat);
        flag.position.set(1.25, roofY + 3.2, topRearZ + 1);
        standGroup.add(flag);
      }

      // Invisible Raycasting Hit Box (makes hover & click effortless on mobile/desktop)
      const hitBoxGeo = new THREE.BoxGeometry(standWidth + 6, tiers * tierHeight + 6, roofDepth + 6);
      const hitBoxMat = new THREE.MeshBasicMaterial({ visible: false, wireframe: false });
      const hitMesh = new THREE.Mesh(hitBoxGeo, hitBoxMat);
      hitMesh.position.set(0, (tiers * tierHeight) / 2 + 1.5, roofCenterZ);
      hitMesh.userData = { standId: standConfig.id, standConfig };
      standGroup.add(hitMesh);
      hitMeshes.push(hitMesh);

      scene.add(standGroup);
      standMeshesRef.current.set(standConfig.id, standGroup);
    });

    // 8. Stadium Floodlight Masts (4 Corner Towers)
    const towerCoords = [
      { x: 55, z: 55 },
      { x: -55, z: 55 },
      { x: 55, z: -55 },
      { x: -55, z: -55 },
    ];

    towerCoords.forEach((coord) => {
      const towerHeight = 44;
      const mastGeo = new THREE.CylinderGeometry(0.6, 1.8, towerHeight, 8);
      const mastMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.7 });
      const mast = new THREE.Mesh(mastGeo, mastMat);
      mast.position.set(coord.x, towerHeight / 2, coord.z);
      scene.add(mast);

      // Light head platform
      const headGeo = new THREE.BoxGeometry(7, 3.5, 1.5);
      const headMat = new THREE.MeshStandardMaterial({ color: 0x1e293b });
      const head = new THREE.Mesh(headGeo, headMat);
      head.position.set(coord.x, towerHeight, coord.z);
      head.lookAt(0, 5, 0);
      scene.add(head);

      // Emissive Floodlight Bulbs
      const bulbGeo = new THREE.SphereGeometry(0.4, 8, 8);
      const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      for (let bx = -2.5; bx <= 2.5; bx += 1.2) {
        for (let by = -1; by <= 1; by += 1) {
          const bulb = new THREE.Mesh(bulbGeo, bulbMat);
          bulb.position.set(bx, by, 0.8);
          head.add(bulb);
        }
      }

      // Spotlight casting light on pitch
      const spot = new THREE.SpotLight(0xfffaed, 1.2, 160, Math.PI / 4, 0.35, 1);
      spot.position.set(coord.x, towerHeight, coord.z);
      spot.target.position.set(0, 0, 0);
      scene.add(spot);
      scene.add(spot.target);
    });

    // 9. Jumbotron / Electronic Match Scoreboard (North-East elevated screen)
    const boardGroup = new THREE.Group();
    boardGroup.position.set(48, 18, -48);
    boardGroup.lookAt(0, 8, 0);

    const frameGeo = new THREE.BoxGeometry(16, 9, 1.2);
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x0f172a });
    const frame = new THREE.Mesh(frameGeo, frameMat);
    boardGroup.add(frame);

    // Dynamic Scoreboard screen texture
    const screenCanvas = document.createElement("canvas");
    screenCanvas.width = 512;
    screenCanvas.height = 256;
    const sctx = screenCanvas.getContext("2d");
    sctx.fillStyle = "#020617";
    sctx.fillRect(0, 0, 512, 256);
    sctx.fillStyle = "#38bdf8";
    sctx.font = "bold 26px sans-serif";
    sctx.fillText("⚡ SPORTSHUB LIVE ARENA", 28, 48);
    sctx.fillStyle = "#ffffff";
    sctx.font = "bold 32px sans-serif";
    sctx.fillText(stadium.name.toUpperCase().substring(0, 24), 28, 105);
    sctx.fillStyle = "#22c55e";
    sctx.font = "24px sans-serif";
    sctx.fillText(`● GATES OPEN · ${details.capacity.toLocaleString()} SEATS`, 28, 160);
    sctx.fillStyle = "#f59e0b";
    sctx.font = "bold 24px sans-serif";
    sctx.fillText("SELECT YOUR STAND TO BOOK", 28, 215);

    const screenTex = new THREE.CanvasTexture(screenCanvas);
    const screenGeo = new THREE.PlaneGeometry(15, 8);
    const screenMat = new THREE.MeshBasicMaterial({ map: screenTex });
    const screenMesh = new THREE.Mesh(screenGeo, screenMat);
    screenMesh.position.z = 0.65;
    boardGroup.add(screenMesh);
    scene.add(boardGroup);

    setIsLoading(false);

    // 10. Raycasting Interaction
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handlePointerMove = (e) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(hitMeshes, false);

      if (intersects.length > 0) {
        const hit = intersects[0].object;
        const cfg = hit.userData.standConfig;
        setHoveredStand(cfg);
        setTooltipPos({
          x: e.clientX,
          y: e.clientY - 20,
          visible: true,
          name: cfg.name,
          category: cfg.category,
        });
        renderer.domElement.style.cursor = "pointer";
      } else {
        setHoveredStand(null);
        setTooltipPos((prev) => ({ ...prev, visible: false }));
        renderer.domElement.style.cursor = "default";
      }
    };

    const handleClick = (e) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(hitMeshes, false);

      if (intersects.length > 0) {
        const hit = intersects[0].object;
        const cfg = hit.userData.standConfig;
        setActiveStandId(cfg.id);
        if (onSelectStand) onSelectStand(cfg);
      }
    };

    const domEl = renderer.domElement;
    domEl.addEventListener("pointermove", handlePointerMove);
    domEl.addEventListener("click", handleClick);

    // Resize handler
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    // 11. Animation Loop
    const animate = () => {
      reqIdRef.current = requestAnimationFrame(animate);
      controls.update();

      // Pitch and arena remain 100% constant and stationary
      scene.rotation.y = 0;

      renderer.render(scene, camera);
    };
    reqIdRef.current = requestAnimationFrame(animate);

    // Cleanup
    return () => {
      cancelAnimationFrame(reqIdRef.current);
      window.removeEventListener("resize", handleResize);
      domEl.removeEventListener("pointermove", handlePointerMove);
      domEl.removeEventListener("click", handleClick);
      controls.dispose();
      renderer.dispose();
      if (domEl && domEl.parentNode) {
        domEl.parentNode.removeChild(domEl);
      }
    };
  }, [stadium.id, stadium.name, cameraMode, onSelectStand]);

  // Proceed handler: pass stand and trigger booking
  const handleProceed = () => {
    if (currentStand.status === "sold_out") return;
    if (onProceedToBooking) {
      onProceedToBooking(currentStand);
    }
  };

  return (
    <div className="stadium-3d-overlay" role="dialog" aria-modal="true" aria-label={`3D View of ${stadium.name}`}>
      {/* 3D Canvas Mount */}
      <div className="stadium-3d-canvas-wrap" ref={mountRef}>
        {isLoading && (
          <div className="stadium-3d-loader">
            <div className="spinner"></div>
            <p>Rendering 3D Arena...</p>
          </div>
        )}
      </div>

      {/* Floating Hover Tooltip */}
      {tooltipPos.visible && (
        <div
          className="stadium-3d-hover-tooltip"
          style={{
            left: `${tooltipPos.x}px`,
            top: `${tooltipPos.y}px`,
          }}
        >
          <div className="tooltip-title">{tooltipPos.name}</div>
          <div className="tooltip-sub">{tooltipPos.category}</div>
          <div className="tooltip-action">Click to inspect stand</div>
        </div>
      )}

      {/* Top Header Bar */}
      <header className="stadium-3d-header">
        <div className="header-left">
          <button className="back-btn" onClick={onClose} aria-label="Back to stadium list">
            ← Back
          </button>
          <div className="stadium-title-meta">
            <h1>{stadium.name}</h1>
            <div className="badges-row">
              <span className="badge city-badge">📍 {stadium.city}</span>
              <span className="badge capacity-badge">🏟️ {details.capacity.toLocaleString()} Capacity</span>
              <span className="badge rating-badge">★ {details.rating}</span>
            </div>
          </div>
        </div>

        <div className="header-right">
          <div className="interaction-hint">
            <span>🔄 Drag 360°</span>
            <span>🔍 Pinch / Scroll Zoom</span>
            <span>🎯 Click Stand</span>
          </div>
          {onTravel && (
            <button className="directions-btn" onClick={(e) => onTravel(e, stadium)}>
              🧭 Get Directions
            </button>
          )}
          <button className="close-x-btn" onClick={onClose} aria-label="Close 3D Viewer">
            ✕
          </button>
        </div>
      </header>

      {/* Bottom-Left Camera Presets Toolbar */}
      <nav className="camera-presets-bar" aria-label="Camera views">
        <span className="bar-label">Camera Angle:</span>
        <button
          className={`preset-btn ${cameraMode === "orbit" ? "active" : ""}`}
          onClick={() => setCameraPreset("orbit")}
          title="360 Orbit View"
        >
          🏟️ 360° Orbit
        </button>
        <button
          className={`preset-btn ${cameraMode === "pitch" ? "active" : ""}`}
          onClick={() => setCameraPreset("pitch")}
          title="Batsman's Pitch Level View"
        >
          🏏 Pitch View
        </button>
        <button
          className={`preset-btn ${cameraMode === "vip" ? "active" : ""}`}
          onClick={() => setCameraPreset("vip")}
          title="VIP Lounge Balcony View"
        >
          ⭐ VIP Balcony
        </button>
        <button
          className={`preset-btn ${cameraMode === "top" ? "active" : ""}`}
          onClick={() => setCameraPreset("top")}
          title="Top Down Birds Eye View"
        >
          🦅 Aerial View
        </button>
      </nav>

      {/* Interactive Stands Selector Horizontal Bar */}
      <div className="stands-selector-strip" aria-label="Selectable stands list">
        <div className="strip-label">Select a Stand in 3D:</div>
        <div className="stands-pills">
          {standList.map((st) => {
            const isSelected = st.id === activeStandId;
            const isSoldOut = st.status === "sold_out";
            return (
              <button
                key={st.id}
                className={`stand-pill ${isSelected ? "selected" : ""} ${isSoldOut ? "sold-out" : ""}`}
                onClick={() => {
                  setActiveStandId(st.id);
                  if (onSelectStand) onSelectStand(st);
                }}
              >
                <span className="stand-dot" style={{ background: st.color }}></span>
                <span className="stand-name">{st.name}</span>
                <span className="stand-price">{inr(st.price)}</span>
                {isSoldOut ? (
                  <span className="pill-badge sold-out-badge">Sold Out</span>
                ) : st.status === "limited" ? (
                  <span className="pill-badge limited-badge">Few Left</span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {/* Stand Details & Booking Inspector Panel (Right / Bottom Sheet) */}
      <aside className="stand-inspector-card" aria-label="Selected Stand Details">
        <div className="inspector-head">
          <div className="inspector-stand-title">
            <span className="stand-color-badge" style={{ background: currentStand.color }}></span>
            <div>
              <h2>{currentStand.name}</h2>
              <span className="stand-category-text">{currentStand.category}</span>
            </div>
          </div>
          <div className={`status-pill ${currentStand.status}`}>
            {currentStand.status === "available" && "● Available"}
            {currentStand.status === "limited" && "▲ Limited Availability"}
            {currentStand.status === "sold_out" && "✕ Sold Out"}
          </div>
        </div>

        <p className="stand-description">{currentStand.description}</p>

        {details.blueprint && (
          <div className="stand-blueprint-note">
            <span className="bp-icon">📐</span>
            <span className="bp-text">{details.blueprint}</span>
          </div>
        )}

        <div className="inspector-stats-grid">
          <div className="stat-box">
            <span className="stat-label">Ticket Price</span>
            <span className="stat-value price-val">{inr(currentStand.price)}</span>
            <span className="stat-sub">per adult ticket</span>
          </div>
          <div className="stat-box">
            <span className="stat-label">Availability</span>
            <span className={`stat-value ${currentStand.status === "sold_out" ? "danger" : "success"}`}>
              {currentStand.status === "sold_out" ? "0 Seats" : `${currentStand.availableTickets} Seats`}
            </span>
            <span className="stat-sub">{currentStand.statusLabel}</span>
          </div>
        </div>

        {/* Action Button */}
        <div className="inspector-actions">
          <button
            className={`btn-book-stand ${currentStand.status === "sold_out" ? "disabled" : "primary"}`}
            disabled={currentStand.status === "sold_out"}
            onClick={handleProceed}
          >
            {currentStand.status === "sold_out"
              ? "Stand Sold Out"
              : `Select Stand & Choose Tickets (${inr(currentStand.price)}) →`}
          </button>
        </div>
      </aside>
    </div>
  );
}

