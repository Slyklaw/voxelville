import * as THREE from 'three';

const PI = Math.PI;

export class OrbitCamera {
  private camera: THREE.PerspectiveCamera;
  private domElement: HTMLElement;
  private target: THREE.Vector3;

  private spherical: {
    radius: number;
    theta: number;
    phi: number;
  };

  private isDragging = false;
  private lastMouse = { x: 0, y: 0 };
  private boundHandlers = {
    mousedown: this.onMouseDown.bind(this),
    mousemove: this.onMouseMove.bind(this),
    mouseup: this.onMouseUp.bind(this),
    wheel: this.onWheel.bind(this),
  };

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement) {
    this.camera = camera;
    this.domElement = domElement;
    this.target = new THREE.Vector3(0, 0, 0);

    // Initial spherical: radius=50, theta=PI/4 (45° horizontal), phi=PI/3 (elevation ~45°)
    this.spherical = {
      radius: 50,
      theta: PI / 4,
      phi: PI / 3,
    };

    this.applyPosition();
    this.attachListeners();
  }

  private attachListeners(): void {
    this.domElement.addEventListener('mousedown', this.boundHandlers.mousedown);
    window.addEventListener('mousemove', this.boundHandlers.mousemove);
    window.addEventListener('mouseup', this.boundHandlers.mouseup);
    this.domElement.addEventListener('wheel', this.boundHandlers.wheel, { passive: true });
  }

  private onMouseDown(e: MouseEvent): void {
    this.isDragging = true;
    this.lastMouse.x = e.clientX;
    this.lastMouse.y = e.clientY;
    this.domElement.style.cursor = 'grabbing';
    e.preventDefault();
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.isDragging) return;
    const dx = e.clientX - this.lastMouse.x;
    const dy = e.clientY - this.lastMouse.y;
    this.lastMouse.x = e.clientX;
    this.lastMouse.y = e.clientY;

    // Horizontal rotation (theta)
    this.spherical.theta -= dx * 0.005;
    // Vertical rotation (phi) — inverted so dragging up raises the camera
    this.spherical.phi -= dy * 0.005;
    // Clamp phi to prevent flipping: [0.1, PI/2 - 0.1]
    this.spherical.phi = Math.max(0.1, Math.min(PI / 2 - 0.1, this.spherical.phi));

    this.applyPosition();
  }

  private onMouseUp(): void {
    this.isDragging = false;
    this.domElement.style.cursor = 'grab';
  }

  private onWheel(e: WheelEvent): void {
    // Zoom with scroll
    this.spherical.radius += e.deltaY * 0.05;
    this.spherical.radius = Math.max(25, Math.min(80, this.spherical.radius));
    this.applyPosition();
  }

  private applyPosition(): void {
    const { radius, theta, phi } = this.spherical;
    const { target } = this;

    let x = target.x + radius * Math.sin(phi) * Math.cos(theta);
    let y = target.y + radius * Math.cos(phi);
    let z = target.z + radius * Math.sin(phi) * Math.sin(theta);

    // Ensure camera is always above ground (minimum Y = target.y + 20)
    // Higher minimum prevents browser throttling when close to ground
    const minY = target.y + 20;
    if (y < minY) {
      y = minY;
      // Adjust phi to keep the same radius but maintain minimum height
      const newPhi = Math.acos(Math.min(1, (y - target.y) / radius));
      x = target.x + radius * Math.sin(newPhi) * Math.cos(theta);
      z = target.z + radius * Math.sin(newPhi) * Math.sin(theta);
    }

    this.camera.position.set(x, y, z);
    this.camera.lookAt(target);
  }

  dispose(): void {
    this.domElement.removeEventListener('mousedown', this.boundHandlers.mousedown);
    window.removeEventListener('mousemove', this.boundHandlers.mousemove);
    window.removeEventListener('mouseup', this.boundHandlers.mouseup);
    this.domElement.removeEventListener('wheel', this.boundHandlers.wheel);
  }
}

export function initOrbitCamera(
  camera: THREE.PerspectiveCamera,
  domElement: HTMLElement,
): OrbitCamera {
  return new OrbitCamera(camera, domElement);
}
