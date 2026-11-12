import { describe, expect, it } from "vitest";
import { anteriorCancion, siguienteCancion } from "./cola";

const cola = [
  { id: 1, titulo: "Uno" },
  { id: 3, titulo: "Dos" },
  { id: 8, titulo: "Tres" },
];

describe("cola de reproducción", () => {
  it("advances to the next song", () => {
    expect(siguienteCancion(cola, 1)?.id).toBe(3);
    expect(siguienteCancion(cola, 3)?.id).toBe(8);
  });

  it("goes back to the first song after the last one", () => {
    expect(siguienteCancion(cola, 8)?.id).toBe(1);
  });

  it("returns to the previous song", () => {
    expect(anteriorCancion(cola, 3)?.id).toBe(1);
    expect(anteriorCancion(cola, 8)?.id).toBe(3);
  });

  it("goes back to the last song before the first one", () => {
    expect(anteriorCancion(cola, 1)?.id).toBe(8);
  });

  it("starts at the beginning when the current song is unknown", () => {
    expect(siguienteCancion(cola, 999)?.id).toBe(1);
    expect(anteriorCancion(cola, 999)?.id).toBe(8);
  });

  it("has no destination on an empty queue", () => {
    expect(siguienteCancion([], 1)).toBeNull();
    expect(anteriorCancion([], 1)).toBeNull();
  });
});
