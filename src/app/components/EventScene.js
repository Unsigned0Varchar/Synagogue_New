"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function EventScene() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return undefined;
    }

    let frameId;
    let disposed = false;
    const pointer = { x: 0, y: 0 };
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true,
      powerPreference: "high-performance",
    });

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x050207, 0);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x07030a, 0.07);

    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 100);
    camera.position.set(0, 0.25, 8);

    const ambient = new THREE.AmbientLight(0xffb5d9, 0.65);
    const key = new THREE.PointLight(0xff4fa3, 8, 22);
    key.position.set(-4, 4, 5);
    const rim = new THREE.PointLight(0x81f7ff, 5, 20);
    rim.position.set(4, -2, 5);
    const gold = new THREE.PointLight(0xffc45d, 4, 20);
    gold.position.set(0, 3, -4);
    scene.add(ambient, key, rim, gold);

    const mainGroup = new THREE.Group();
    scene.add(mainGroup);

    const coreMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xf3388f,
      emissive: 0x4c0625,
      metalness: 0.72,
      roughness: 0.24,
      clearcoat: 0.75,
      clearcoatRoughness: 0.18,
    });
    const wireMaterial = new THREE.MeshBasicMaterial({
      color: 0xff8fc4,
      wireframe: true,
      transparent: true,
      opacity: 0.28,
    });
    const edgeMaterial = new THREE.MeshBasicMaterial({
      color: 0x9cf8ff,
      transparent: true,
      opacity: 0.42,
    });

    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(1.16, 5), coreMaterial);
    core.scale.set(1.25, 1.25, 1.25);
    mainGroup.add(core);

    const wireCore = new THREE.Mesh(new THREE.IcosahedronGeometry(1.36, 2), wireMaterial);
    mainGroup.add(wireCore);

    const ringGroup = new THREE.Group();
    mainGroup.add(ringGroup);

    for (let index = 0; index < 5; index += 1) {
      const torus = new THREE.Mesh(
        new THREE.TorusGeometry(1.9 + index * 0.27, 0.012, 16, 160),
        index % 2 === 0 ? edgeMaterial : wireMaterial,
      );
      torus.rotation.set(index * 0.33, index * 0.42, index * 0.17);
      ringGroup.add(torus);
    }

    const tunnelGroup = new THREE.Group();
    tunnelGroup.position.z = -6.5;
    scene.add(tunnelGroup);

    const tunnelMaterial = new THREE.MeshBasicMaterial({
      color: 0x431028,
      transparent: true,
      opacity: 0.36,
      wireframe: true,
    });

    for (let index = 0; index < 22; index += 1) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(3.2 + index * 0.05, 0.01, 10, 96),
        tunnelMaterial,
      );
      ring.position.z = -index * 0.62;
      ring.rotation.z = index * 0.17;
      tunnelGroup.add(ring);
    }

    const particleGeometry = new THREE.BufferGeometry();
    const particleCount = 900;
    const positions = new Float32Array(particleCount * 3);

    for (let index = 0; index < particleCount; index += 1) {
      positions[index * 3] = (Math.random() - 0.5) * 18;
      positions[index * 3 + 1] = (Math.random() - 0.5) * 10;
      positions[index * 3 + 2] = (Math.random() - 0.5) * 18;
    }

    particleGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const particles = new THREE.Points(
      particleGeometry,
      new THREE.PointsMaterial({
        color: 0xff77b7,
        size: 0.018,
        transparent: true,
        opacity: 0.72,
      }),
    );
    scene.add(particles);

    const resize = () => {
      const width = canvas.clientWidth || window.innerWidth;
      const height = canvas.clientHeight || window.innerHeight;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    const onPointerMove = (event) => {
      pointer.x = (event.clientX / window.innerWidth - 0.5) * 2;
      pointer.y = (event.clientY / window.innerHeight - 0.5) * 2;
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("resize", resize);
    resize();

    const startedAt = performance.now();
    const render = () => {
      const elapsed = (performance.now() - startedAt) / 1000;

      core.rotation.x = elapsed * 0.18 + pointer.y * 0.08;
      core.rotation.y = elapsed * 0.26 + pointer.x * 0.1;
      wireCore.rotation.x = -elapsed * 0.14;
      wireCore.rotation.y = elapsed * 0.18;
      ringGroup.rotation.x = elapsed * 0.08 + pointer.y * 0.16;
      ringGroup.rotation.y = elapsed * 0.1 + pointer.x * 0.18;
      particles.rotation.y = elapsed * 0.018;
      tunnelGroup.rotation.z = elapsed * 0.018;
      camera.position.x += (pointer.x * 0.34 - camera.position.x) * 0.035;
      camera.position.y += (0.25 - pointer.y * 0.16 - camera.position.y) * 0.035;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);

      if (!disposed && !reducedMotion) {
        frameId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("resize", resize);

      scene.traverse((object) => {
        if (!object.isMesh && !object.isPoints) {
          return;
        }

        object.geometry?.dispose();

        if (Array.isArray(object.material)) {
          object.material.forEach((material) => material.dispose());
        } else {
          object.material?.dispose();
        }
      });

      renderer.dispose();
    };
  }, []);

  return <canvas ref={canvasRef} className="event-scene" data-testid="three-scene" aria-hidden="true" />;
}
