import { useRef, useEffect } from "react";

export function ScrollVideo({ src }: { src: string }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;

    const onScroll = () => {
      const scrolled = window.scrollY;
      video.style.transform = `translateY(${scrolled * 0.35}px)`;
      video.style.opacity = String(Math.max(0.5, 1 - scrolled / 900));
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="relative w-full h-[75vh] min-h-[420px] overflow-hidden bg-slate-950">
      <video
        ref={ref}
        className="absolute inset-0 w-full h-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        src={src}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/90" />
    </div>
  );
}
