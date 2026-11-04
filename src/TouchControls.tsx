import React, { useEffect, useRef, useState } from "react";
type Axis = (x: number, y: number, sprint: boolean) => void;
function Thumbstick({
  label,
  onChange,
  disabled = false,
  sprint = false,
}: {
  label: string;
  onChange: Axis;
  disabled?: boolean;
  sprint?: boolean;
}) {
  const [position, setPosition] = useState({ x: 0, y: 0, sprint: false });
  const pointer = useRef<number | null>(null),
    emit = useRef(onChange);
  emit.current = onChange;
  const reset = () => {
    pointer.current = null;
    setPosition({ x: 0, y: 0, sprint: false });
    emit.current(0, 0, false);
  };
  useEffect(() => {
    if (disabled) reset();
  }, [disabled]);
  useEffect(() => {
    const stop = () => reset();
    window.addEventListener("blur", stop);
    document.addEventListener("visibilitychange", stop);
    return () => {
      window.removeEventListener("blur", stop);
      document.removeEventListener("visibilitychange", stop);
      emit.current(0, 0, false);
    };
  }, []);
  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || pointer.current !== e.pointerId) return;
    const b = e.currentTarget.getBoundingClientRect(),
      radius = b.width * 0.32;
    const x = (e.clientX - b.left - b.width / 2) / radius,
      y = (e.clientY - b.top - b.height / 2) / radius,
      length = Math.hypot(x, y);
    const amount = length < 0.12 ? 0 : Math.min(1, (length - 0.12) / 0.88),
      run = sprint && length > 0.9;
    const next = {
      x: length ? (x / length) * amount : 0,
      y: length ? (y / length) * amount : 0,
      sprint: run,
    };
    setPosition(next);
    emit.current(next.x, next.y, run);
  };
  return (
    <div
      className={
        "thumbstick " +
        (sprint ? "movement-stick" : "look-stick") +
        (position.sprint ? " sprinting" : "")
      }
      role="group"
      aria-label={label}
      aria-disabled={disabled}
      onPointerDown={(e) => {
        if (disabled || pointer.current !== null) return;
        e.preventDefault();
        e.stopPropagation();
        pointer.current = e.pointerId;
        e.currentTarget.setPointerCapture(e.pointerId);
        move(e);
      }}
      onPointerMove={move}
      onPointerUp={(e) => {
        if (pointer.current === e.pointerId) reset();
      }}
      onPointerCancel={(e) => {
        if (pointer.current === e.pointerId) reset();
      }}
      onLostPointerCapture={(e) => {
        if (pointer.current === e.pointerId) reset();
      }}
    >
      <span className="thumbstick-ring" />
      <span
        className="thumbstick-knob"
        style={{
          transform: `translate(${position.x * 32}px,${position.y * 32}px)`,
        }}
      />
      <span className="thumbstick-label">
        {position.sprint ? "Sprint" : sprint ? "Move" : "Look"}
      </span>
    </div>
  );
}
export function TouchControls({
  disabled,
  onMove,
  onLook,
  onInteract,
}: {
  disabled: boolean;
  onMove: Axis;
  onLook: Axis;
  onInteract: () => void;
}) {
  return (
    <div className="touch-controls">
      <Thumbstick
        label="Movement thumbstick"
        onChange={onMove}
        disabled={disabled}
        sprint
      />
      <Thumbstick
        label="Camera thumbstick"
        onChange={onLook}
        disabled={disabled}
      />
      <button
        className="touch-interact"
        aria-label="Interact nearby"
        disabled={disabled}
        onClick={onInteract}
      >
        Interact
      </button>
    </div>
  );
}
