import { AABB } from "../physics/aabb.js";
import { moveWithCollision } from "../physics/collision.js";
import { Input } from "../engine/input.js";

const WALK_SPEED = 4.317;
const SPRINT_MULT = 1.3;        // 4.317 * 1.3 ≈ 5.6 m/s
const SNEAK_MULT = 0.3;         // 1.3 m/s
const FLY_SPEED = 11.0;
const FLY_SPRINT_MULT = 5.0;    // 55 m/s (creative-fly)
const JUMP_VELOCITY = 8.4;      // m/s
const GRAVITY = 25.0;           // m/s² (slightly floatier than vanilla's 32)
const TERMINAL_VELOCITY = 80.0; // m/s falling cap

export class Player {
  constructor(camera, world) {
    this.camera = camera;
    this.world = world;

    // Feet-centered AABB. Vanilla: 0.6 x 1.8 x 0.6.
    this.width = 0.6;
    this.height = 1.8;
    this.eyeHeight = 1.62;
    this.box = new AABB(0, 0, 0, this.width, this.height, this.width);

    this.velocity = [0, 0, 0];
    this.onGround = false;
    this.flying = false;
    this.sprinting = false;
    this.sneaking = false;
  }

  setPosition(x, y, z) {
    this.box.set(x, y, z);
    this.velocity[0] = this.velocity[1] = this.velocity[2] = 0;
    this.onGround = false;
    this.syncCamera();
  }

  // Mirror the player's head position + look into the camera so the renderer
  // can keep using the existing camera math unchanged.
  syncCamera() {
    this.camera.position[0] = this.box.x + this.width * 0.5;
    this.camera.position[1] = this.box.y + this.eyeHeight;
    this.camera.position[2] = this.box.z + this.width * 0.5;
    this.camera._dirty = true;
  }

  update(dt) {
    this.sprinting = Input.isKeyDown("ControlLeft") || Input.isKeyDown("ControlRight");
    this.sneaking  = Input.isKeyDown("ShiftLeft")   || Input.isKeyDown("ShiftRight");

    if (this.flying) {
      this.updateFly(dt);
    } else {
      this.updateWalk(dt);
    }

    this.syncCamera();
  }

  updateWalk(dt) {
    // Horizontal velocity from input, in camera-yaw space.
    const fwd = this.camera.forward(new Float32Array(3));
    const right = this.camera.right(new Float32Array(3));
    // Stay on the horizontal plane so the player doesn't fly up by looking up.
    fwd[1] = 0;
    const fwdLen = Math.hypot(fwd[0], fwd[2]) || 1;
    fwd[0] /= fwdLen; fwd[2] /= fwdLen;

    let wishX = 0, wishZ = 0;
    if (Input.isKeyDown("KeyW") || Input.isKeyDown("ArrowUp"))    { wishX += fwd[0]; wishZ += fwd[2]; }
    if (Input.isKeyDown("KeyS") || Input.isKeyDown("ArrowDown"))  { wishX -= fwd[0]; wishZ -= fwd[2]; }
    if (Input.isKeyDown("KeyD") || Input.isKeyDown("ArrowRight")) { wishX += right[0]; wishZ += right[2]; }
    if (Input.isKeyDown("KeyA") || Input.isKeyDown("ArrowLeft"))  { wishX -= right[0]; wishZ -= right[2]; }

    const wishLen = Math.hypot(wishX, wishZ);
    if (wishLen > 0) { wishX /= wishLen; wishZ /= wishLen; }

    let speed = WALK_SPEED;
    if (this.sprinting && !this.sneaking) speed *= SPRINT_MULT;
    else if (this.sneaking) speed *= SNEAK_MULT;

    this.velocity[0] = wishX * speed;
    this.velocity[2] = wishZ * speed;

    // Jumping (only when on the ground and not sneaking).
    if (this.onGround && this.sprinting === false && this.sneaking === false &&
        Input.isKeyDown("Space")) {
      this.velocity[1] = JUMP_VELOCITY;
      this.onGround = false;
    }

    // Gravity.
    this.velocity[1] -= GRAVITY * dt;
    if (this.velocity[1] < -TERMINAL_VELOCITY) this.velocity[1] = -TERMINAL_VELOCITY;

    // Substep if a single frame's motion could overshoot a block.
    const stepDt = dt;
    const stepX = this.velocity[0] * stepDt;
    const stepY = this.velocity[1] * stepDt;
    const stepZ = this.velocity[2] * stepDt;
    const r = moveWithCollision(this.world, this.box, stepX, stepY, stepZ);

    this.onGround = r.onGround;
    if (r.hitX) this.velocity[0] = 0;
    if (r.hitY) this.velocity[1] = 0;
    if (r.hitZ) this.velocity[2] = 0;
  }

  updateFly(dt) {
    const fwd = this.camera.forward(new Float32Array(3));
    const right = this.camera.right(new Float32Array(3));

    let speed = FLY_SPEED;
    if (this.sprinting) speed *= FLY_SPRINT_MULT;
    else if (this.sneaking) speed *= 0.3;

    let vx = 0, vy = 0, vz = 0;
    if (Input.isKeyDown("KeyW") || Input.isKeyDown("ArrowUp"))    { vx += fwd[0]; vy += fwd[1]; vz += fwd[2]; }
    if (Input.isKeyDown("KeyS") || Input.isKeyDown("ArrowDown"))  { vx -= fwd[0]; vy -= fwd[1]; vz -= fwd[2]; }
    if (Input.isKeyDown("KeyD") || Input.isKeyDown("ArrowRight")) { vx += right[0]; vz += right[2]; }
    if (Input.isKeyDown("KeyA") || Input.isKeyDown("ArrowLeft"))  { vx -= right[0]; vz -= right[2]; }
    if (Input.isKeyDown("Space"))     vy += 1;
    if (Input.isKeyDown("ShiftLeft") || Input.isKeyDown("ShiftRight")) vy -= 1;

    const len = Math.hypot(vx, vy, vz);
    if (len > 0) { vx = vx / len * speed; vy = vy / len * speed; vz = vz / len * speed; }

    // Flight: no collision, so the player can pass through blocks.
    this.box.x += vx * dt;
    this.box.y += vy * dt;
    this.box.z += vz * dt;
    this.velocity[0] = vx;
    this.velocity[1] = vy;
    this.velocity[2] = vz;
    this.onGround = false;
  }

  toggleFly() {
    this.flying = !this.flying;
    this.velocity[0] = this.velocity[1] = this.velocity[2] = 0;
  }
}
