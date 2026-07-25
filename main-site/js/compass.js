// Device orientation (compass heading) support, with the iOS 13+ permission
// dance handled explicitly since it must be triggered from a user gesture.

let headingListeners = [];
let active = false;

function needsIOSPermission() {
  return typeof DeviceOrientationEvent !== "undefined" &&
    typeof DeviceOrientationEvent.requestPermission === "function";
}

export async function requestCompassPermission() {
  if (needsIOSPermission()) {
    const result = await DeviceOrientationEvent.requestPermission();
    return result === "granted";
  }
  // Non-iOS browsers don't gate this behind a permission prompt.
  return "DeviceOrientationEvent" in window;
}

function handleOrientation(event) {
  let heading = null;
  if (typeof event.webkitCompassHeading === "number") {
    heading = event.webkitCompassHeading; // iOS: already true-north clockwise
  } else if (event.absolute && typeof event.alpha === "number") {
    heading = (360 - event.alpha) % 360;
  } else if (typeof event.alpha === "number") {
    heading = (360 - event.alpha) % 360;
  }
  if (heading == null || Number.isNaN(heading)) return;
  headingListeners.forEach((fn) => fn(heading));
}

export function startCompass(onHeading) {
  headingListeners.push(onHeading);
  if (!active) {
    window.addEventListener("deviceorientationabsolute", handleOrientation, true);
    window.addEventListener("deviceorientation", handleOrientation, true);
    active = true;
  }
  return () => {
    headingListeners = headingListeners.filter((fn) => fn !== onHeading);
  };
}

export function stopCompass() {
  window.removeEventListener("deviceorientationabsolute", handleOrientation, true);
  window.removeEventListener("deviceorientation", handleOrientation, true);
  headingListeners = [];
  active = false;
}

export function isCompassSupported() {
  return "DeviceOrientationEvent" in window;
}
