import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useAudioWaveform } from "./useAudioWaveform";

class FakeAudioContext {
  static instances: FakeAudioContext[] = [];
  state = "running";
  createMediaElementSource = vi.fn(() => ({ connect: vi.fn(), disconnect: vi.fn() }));
  createAnalyser = vi.fn(() => ({
    fftSize: 0,
    smoothingTimeConstant: 0,
    frequencyBinCount: 16,
    connect: vi.fn(),
    disconnect: vi.fn(),
    getByteFrequencyData: vi.fn((data: Uint8Array) => data.fill(200)),
  }));
  connect = vi.fn();
  disconnect = vi.fn();
  resume = vi.fn(async () => {});
  close = vi.fn(async () => {});

  constructor() {
    FakeAudioContext.instances.push(this);
  }
}

function entorno() {
  const audio = document.createElement("audio");
  audio.src = "/audio/demo.mp3";
  const wave = document.createElement("div");
  wave.className = "waveform";
  for (let i = 0; i < 6; i += 1) {
    wave.appendChild(document.createElement("i"));
  }
  document.body.append(audio, wave);

  return {
    audioRef: { current: audio },
    waveRef: { current: wave },
  };
}

describe("useAudioWaveform", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    FakeAudioContext.instances = [];
    document.body.innerHTML = "";
  });

  it("stays inert and silent when Web Audio is unavailable", () => {
    const { audioRef, waveRef } = entorno();

    const { result } = renderHook(() => useAudioWaveform(audioRef, waveRef));

    act(() => result.current.start());

    expect(result.current.live).toBe(false);
    expect(waveRef.current?.getAttribute("data-live")).toBe("false");
  });

  it("streams real levels to the bars and cleans up on stop", async () => {
    if (typeof globalThis.requestAnimationFrame !== "function") {
      globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) =>
        setTimeout(() => cb(performance.now()), 16)) as typeof requestAnimationFrame;
      globalThis.cancelAnimationFrame = ((id: number) =>
        clearTimeout(id)) as typeof cancelAnimationFrame;
    }
    vi.stubGlobal("AudioContext", FakeAudioContext);

    const { audioRef, waveRef } = entorno();

    const { result } = renderHook(() => useAudioWaveform(audioRef, waveRef));

    act(() => result.current.start());
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 40));
    });

    expect(result.current.live).toBe(true);
    expect(waveRef.current?.getAttribute("data-live")).toBe("true");
    const barras = waveRef.current?.querySelectorAll("i") ?? [];
    expect(barras.length).toBe(6);
    for (const bar of barras) {
      expect(bar.style.transform).toMatch(/scaleY\(/);
    }

    act(() => result.current.stop());

    expect(result.current.live).toBe(false);
    expect(waveRef.current?.getAttribute("data-live")).toBe("false");
    for (const bar of barras) {
      expect(bar.style.transform).toBe("");
    }
  });
});
