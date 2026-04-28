import { useEffect, useRef, useState } from "react";

export function useGamepad(onEasterEgg: () => void) {
  const [hasGamepad, setHasGamepad] = useState(false);
  const onEasterEggRef = useRef(onEasterEgg);
  const cooldownRef = useRef(false);

  useEffect(() => {
    onEasterEggRef.current = onEasterEgg;
  }, [onEasterEgg]);

  useEffect(() => {
    const hasAnyGamepad = () => navigator.getGamepads().some(Boolean);

    const triggerEasterEgg = () => {
      if (cooldownRef.current) return;
      cooldownRef.current = true;
      onEasterEggRef.current();
      window.setTimeout(() => {
        cooldownRef.current = false;
      }, 5000);
    };

    const pollGamepads = () => {
      const gamepads = navigator.getGamepads();
      for (const gamepad of gamepads) {
        if (!gamepad) continue;

        const lb = gamepad.buttons[4]?.pressed;
        const rb = gamepad.buttons[5]?.pressed;
        const a = gamepad.buttons[0]?.pressed;

        if (lb && rb && a) {
          triggerEasterEgg();
          return;
        }
      }
    };

    const onGamepadConnected = (e: GamepadEvent) => {
      console.log("Gamepad connected:", e.gamepad.id);
      setHasGamepad(true);
    };

    const onGamepadDisconnected = (e: GamepadEvent) => {
      console.log("Gamepad disconnected:", e.gamepad.id);
      setHasGamepad(hasAnyGamepad());
    };

    setHasGamepad(hasAnyGamepad());

    window.addEventListener("gamepadconnected", onGamepadConnected);
    window.addEventListener("gamepaddisconnected", onGamepadDisconnected);

    const intervalId = window.setInterval(() => {
      if (!hasAnyGamepad()) return;
      pollGamepads();
    }, 120);

    return () => {
      window.removeEventListener("gamepadconnected", onGamepadConnected);
      window.removeEventListener("gamepaddisconnected", onGamepadDisconnected);
      window.clearInterval(intervalId);
    };
  }, []);

  return hasGamepad;
}
