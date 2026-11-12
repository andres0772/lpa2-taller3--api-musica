import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { formatearTiempo, useAudioPlayback } from "./useAudioPlayback";

function entorno() {
  const audio = document.createElement("audio");
  audio.src = "/audio/demo.mp3";
  Object.defineProperty(audio, "duration", {
    value: Number.NaN,
    writable: true,
    configurable: true,
  });
  document.body.append(audio);

  return {
    audioRef: { current: audio },
    audio,
  };
}

function definirDuracion(audio: HTMLAudioElement, segundos: number) {
  Object.defineProperty(audio, "duration", {
    value: segundos,
    writable: true,
    configurable: true,
  });
}

describe("formatearTiempo", () => {
  it("formats seconds as mm:ss and rejects nonsense", () => {
    expect(formatearTiempo(0)).toBe("0:00");
    expect(formatearTiempo(5)).toBe("0:05");
    expect(formatearTiempo(65)).toBe("1:05");
    expect(formatearTiempo(125)).toBe("2:05");
    expect(formatearTiempo(600)).toBe("10:00");
    expect(formatearTiempo(2.9)).toBe("0:02");
    expect(formatearTiempo(-3)).toBe("0:00");
    expect(formatearTiempo(Number.NaN)).toBe("0:00");
  });
});

describe("useAudioPlayback", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("reads live progress from the audio element timeupdate", () => {
    const { audioRef, audio } = entorno();

    const { result } = renderHook(() => useAudioPlayback(audioRef));

    expect(result.current.progreso).toBe(0);

    act(() => {
      audio.currentTime = 30;
      audio.dispatchEvent(new Event("timeupdate"));
    });

    expect(result.current.progreso).toBe(30);
  });

  it("picks up duration once the metadata is loaded", () => {
    const { audioRef, audio } = entorno();

    const { result } = renderHook(() => useAudioPlayback(audioRef));

    expect(result.current.duracion).toBe(0);

    act(() => {
      definirDuracion(audio, 125);
      audio.dispatchEvent(new Event("loadedmetadata"));
    });

    expect(result.current.duracion).toBe(125);
  });

  it("seeks to a valid position and clamps to the known duration", () => {
    const { audioRef, audio } = entorno();

    const { result } = renderHook(() => useAudioPlayback(audioRef));

    act(() => {
      definirDuracion(audio, 100);
      audio.dispatchEvent(new Event("loadedmetadata"));
    });

    act(() => result.current.buscar(30));
    expect(audio.currentTime).toBe(30);
    expect(result.current.progreso).toBe(30);

    act(() => result.current.buscar(500));
    expect(audio.currentTime).toBe(100);
    expect(result.current.progreso).toBe(100);

    act(() => result.current.buscar(-5));
    expect(audio.currentTime).toBe(0);
  });

  it("clamps seeks to the requested value when duration is unknown", () => {
    const { audioRef, audio } = entorno();

    const { result } = renderHook(() => useAudioPlayback(audioRef));

    act(() => result.current.buscar(42));
    expect(audio.currentTime).toBe(42);
  });

  it("resets progress and duration when the song changes", () => {
    const { audioRef, audio } = entorno();

    const { result } = renderHook(() => useAudioPlayback(audioRef));

    act(() => {
      definirDuracion(audio, 90);
      audio.dispatchEvent(new Event("loadedmetadata"));
      audio.currentTime = 45;
      audio.dispatchEvent(new Event("timeupdate"));
    });

    expect(result.current.progreso).toBe(45);
    expect(result.current.duracion).toBe(90);

    act(() => {
      audio.dispatchEvent(new Event("emptied"));
    });

    expect(result.current.progreso).toBe(0);
    expect(result.current.duracion).toBe(0);
  });

  it("notifies the page when the track ends", () => {
    const { audioRef, audio } = entorno();
    const onEnded = vi.fn();

    renderHook(() => useAudioPlayback(audioRef, { onEnded }));

    act(() => {
      audio.dispatchEvent(new Event("ended"));
    });

    expect(onEnded).toHaveBeenCalledTimes(1);
  });
});
