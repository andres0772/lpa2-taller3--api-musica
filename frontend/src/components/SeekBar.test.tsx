import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SeekBar } from "./SeekBar";

describe("SeekBar", () => {
  it("shows current and remaining time formatted", () => {
    render(<SeekBar progreso={65} duracion={185} onSeek={() => {}} />);

    expect(screen.getByText("1:05")).toBeTruthy();
    expect(screen.getByText("-2:00")).toBeTruthy();
  });

  it("stays disabled until the duration is known", () => {
    render(<SeekBar progreso={0} duracion={0} onSeek={() => {}} />);

    const barra = screen.getByLabelText(
      "Buscar posición dentro de la canción",
    ) as HTMLInputElement;

    expect(barra.disabled).toBe(true);
    expect(screen.getByText("0:00")).toBeTruthy();
    expect(screen.getByText("-0:00")).toBeTruthy();
  });

  it("seeks to the picked position once the duration is known", () => {
    const onSeek = vi.fn();
    render(<SeekBar progreso={10} duracion={100} onSeek={onSeek} />);

    const barra = screen.getByLabelText(
      "Buscar posición dentro de la canción",
    ) as HTMLInputElement;

    expect(barra.disabled).toBe(false);

    fireEvent.change(barra, { target: { value: "42.5" } });

    expect(onSeek).toHaveBeenCalledWith(42.5);
  });

  it("clamps the visible progress to the known duration", () => {
    render(<SeekBar progreso={140} duracion={100} onSeek={() => {}} />);

    const barra = screen.getByLabelText(
      "Buscar posición dentro de la canción",
    ) as HTMLInputElement;

    expect(barra.value).toBe("100");
    expect(screen.getByText("-0:00")).toBeTruthy();
  });
});
