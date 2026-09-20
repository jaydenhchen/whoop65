import * as THREE from "three";

const ARM = 0.023;
const DUCT_R = 0.0155;

function ductMesh(color) {
  const g = new THREE.Group();
  const outer = new THREE.Mesh(
    new THREE.CylinderGeometry(DUCT_R, DUCT_R, 0.009, 24, 1, true),
    new THREE.MeshStandardMaterial({
      color,
      roughness: 0.35,
      metalness: 0.15,
      side: THREE.DoubleSide,
    })
  );
  const inner = new THREE.Mesh(
    new THREE.CylinderGeometry(DUCT_R - 0.0016, DUCT_R - 0.0016, 0.008, 24, 1, true),
    new THREE.MeshStandardMaterial({
      color: 0x111318,
      roughness: 0.6,
      side: THREE.DoubleSide,
    })
  );
  const lip = new THREE.Mesh(
    new THREE.TorusGeometry(DUCT_R - 0.0004, 0.0011, 8, 24),
    new THREE.MeshStandardMaterial({ color: 0xf2f5f0, roughness: 0.4 })
  );
  lip.rotation.x = Math.PI / 2;
  lip.position.y = 0.0046;
  const motor = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0042, 0.0046, 0.007, 12),
    new THREE.MeshStandardMaterial({ color: 0xb0b6c0, metalness: 0.8, roughness: 0.25 })
  );
  motor.position.y = -0.001;
  g.add(outer, inner, lip, motor);
  return g;
}

function propMesh() {
  const g = new THREE.Group();
  const blade = new THREE.Mesh(
    new THREE.BoxGeometry(0.026, 0.0007, 0.0045),
    new THREE.MeshStandardMaterial({ color: 0x1a1d24, roughness: 0.5 })
  );
  const blade2 = blade.clone();
  blade2.rotation.y = Math.PI / 2;
  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0024, 0.0024, 0.002, 10),
    new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 0.5, roughness: 0.3 })
  );
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(0.014, 24),
    new THREE.MeshBasicMaterial({
      color: 0x9aa3b0,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = 0.0032;
  g.add(blade, blade2, hub, disc);
  g.userData.disc = disc;
  g.userData.blades = [blade, blade2];
  return g;
}

export function createDrone() {
  const root = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x16181e,
    roughness: 0.45,
    metalness: 0.2,
  });
  const carbon = new THREE.MeshStandardMaterial({
    color: 0x0e1014,
    roughness: 0.55,
    metalness: 0.3,
  });

  const fc = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.006, 0.022), bodyMat);
  fc.position.y = 0.004;
  const canopy = new THREE.Mesh(
    new THREE.SphereGeometry(0.013, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55),
    new THREE.MeshStandardMaterial({
      color: 0x7dffb3,
      transparent: true,
      opacity: 0.28,
      roughness: 0.15,
      metalness: 0.1,
    })
  );
  canopy.position.y = 0.008;
  canopy.scale.set(1, 0.55, 1.05);

  const batt = new THREE.Mesh(
    new THREE.BoxGeometry(0.016, 0.008, 0.028),
    new THREE.MeshStandardMaterial({ color: 0x2a1a12, roughness: 0.7 })
  );
  batt.position.set(0, -0.004, -0.002);

  const cam = new THREE.Group();
  const camBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.01, 0.008, 0.012),
    new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.4 })
  );
  const lens = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0034, 0.0034, 0.004, 16),
    new THREE.MeshStandardMaterial({
      color: 0x1a3cff,
      emissive: 0x1428aa,
      emissiveIntensity: 0.4,
      metalness: 0.6,
      roughness: 0.2,
    })
  );
  lens.rotation.x = Math.PI / 2;
  lens.position.z = 0.007;
  cam.add(camBody, lens);
  cam.position.set(0, 0.012, 0.018);
  cam.rotation.x = THREE.MathUtils.degToRad(18);

  const ledR = new THREE.Mesh(
    new THREE.BoxGeometry(0.01, 0.002, 0.002),
    new THREE.MeshStandardMaterial({ color: 0xff2a44, emissive: 0xff2a44, emissiveIntensity: 1.4 })
  );
  ledR.position.set(0, 0.006, -0.012);
  const ledF = new THREE.Mesh(
    new THREE.BoxGeometry(0.008, 0.0016, 0.0016),
    new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.9 })
  );
  ledF.position.set(0, 0.007, 0.012);

  root.add(fc, canopy, batt, cam, ledR, ledF);

  const motorPos = [
    new THREE.Vector3(-ARM, 0, ARM),
    new THREE.Vector3(ARM, 0, ARM),
    new THREE.Vector3(ARM, 0, -ARM),
    new THREE.Vector3(-ARM, 0, -ARM),
  ];
  const colors = [0x7dffb3, 0x7dffb3, 0xff3d7f, 0xff3d7f];
  const props = [];
  const ducts = [];

  motorPos.forEach((p, i) => {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.003, ARM * 2.1), carbon);
    arm.position.copy(p).multiplyScalar(0.5);
    arm.lookAt(p);
    arm.rotateX(Math.PI / 2);
    const duct = ductMesh(colors[i]);
    duct.position.copy(p);
    const prop = propMesh();
    prop.position.copy(p);
    prop.position.y += 0.0042;
    root.add(arm, duct, prop);
    ducts.push(duct);
    props.push(prop);
  });

  const light = new THREE.PointLight(0x7dffb3, 0.15, 1.2);
  light.position.set(0, 0.02, 0);
  root.add(light);
  root.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });

  return {
    group: root,
    props,
    update(flight, dt) {
      root.position.copy(flight.pos);
      root.quaternion.copy(flight.quat);
      for (let i = 0; i < 4; i++) {
        const m = flight.motors[i];
        const spin = m * 90 * dt * (i % 2 === 0 ? 1 : -1);
        props[i].rotation.y += spin;
        const disc = props[i].userData.disc;
        disc.material.opacity = m * 0.28;
        for (const b of props[i].userData.blades) b.visible = m < 0.25;
      }
      ledR.material.emissiveIntensity = flight.armed ? 1.6 + Math.sin(performance.now() * 0.02) * 0.4 : 0.2;
    },
  };
}
