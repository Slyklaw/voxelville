const keys = new Set();
const oncePressed = new Set();

let pointerLocked = false;
let mouseDx = 0;
let mouseDy = 0;
let mouseLeftDown = false;
let mouseRightDown = false;
let mouseLeftClicked = false;
let mouseRightClicked = false;
let wheelDelta = 0;

let onLockChange = null;
let onLockError = null;

export const Input = {
  isPointerLocked() {
    return pointerLocked;
  },

  isKeyDown(code) {
    return keys.has(code);
  },

  consumeKeyPress(code) {
    if (oncePressed.has(code)) {
      oncePressed.delete(code);
      return true;
    }
    return false;
  },

  mouseDeltaX() {
    return mouseDx;
  },
  mouseDeltaY() {
    return mouseDy;
  },

  resetMouseDelta() {
    mouseDx = 0;
    mouseDy = 0;
  },

  consumeMouseLeft() {
    const v = mouseLeftClicked;
    mouseLeftClicked = false;
    return v;
  },
  consumeMouseRight() {
    const v = mouseRightClicked;
    mouseRightClicked = false;
    return v;
  },
  isMouseLeftDown() {
    return mouseLeftDown;
  },
  isMouseRightDown() {
    return mouseRightDown;
  },

  consumeWheel() {
    const v = wheelDelta;
    wheelDelta = 0;
    return v;
  },

  requestPointerLock(el) {
    if (el.requestPointerLock) el.requestPointerLock();
  },

  setLockChangeHandler(fn) {
    onLockChange = fn;
  },
};

export function attachInput(targetEl) {
  window.addEventListener("keydown", (e) => {
    if (!keys.has(e.code)) oncePressed.add(e.code);
    keys.add(e.code);
  });
  window.addEventListener("keyup", (e) => {
    keys.delete(e.code);
  });
  window.addEventListener("blur", () => {
    keys.clear();
    oncePressed.clear();
    mouseLeftDown = false;
    mouseRightDown = false;
    // Release the cursor so it doesn't stay trapped while the tab is
    // unfocused; returning re-locks via canvas click or Resume.
    if (document.pointerLockElement) document.exitPointerLock();
  });

  document.addEventListener("pointerlockchange", () => {
    pointerLocked = document.pointerLockElement === targetEl;
    if (onLockChange) onLockChange(pointerLocked);
  });
  document.addEventListener("pointerlockerror", () => {
    if (onLockError) onLockError();
  });

  document.addEventListener("mousemove", (e) => {
    if (!pointerLocked) return;
    mouseDx += e.movementX || 0;
    mouseDy += e.movementY || 0;
  });

  targetEl.addEventListener("mousedown", (e) => {
    if (!pointerLocked) {
      Input.requestPointerLock(targetEl);
      return;
    }
    if (e.button === 0) {
      mouseLeftDown = true;
      mouseLeftClicked = true;
    } else if (e.button === 2) {
      mouseRightDown = true;
      mouseRightClicked = true;
    }
  });
  targetEl.addEventListener("mouseup", (e) => {
    if (e.button === 0) mouseLeftDown = false;
    if (e.button === 2) mouseRightDown = false;
  });
  targetEl.addEventListener("contextmenu", (e) => e.preventDefault());

  targetEl.addEventListener("wheel", (e) => {
    // Normalize to a ±1 step so high-resolution wheels don't skip slots.
    if (e.deltaY > 0) wheelDelta += 1;
    else if (e.deltaY < 0) wheelDelta -= 1;
    e.preventDefault();
  }, { passive: false });
}
