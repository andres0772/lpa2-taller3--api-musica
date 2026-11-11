import { motion } from "motion/react";

interface CardItem {
  id: number;
  titulo: string;
  artista: string;
  genero?: string;
}

interface MarqueeCardsProps {
  items: CardItem[];
  direction: "left" | "right";
  label: string;
}

export function MarqueeCards({ items, direction, label }: MarqueeCardsProps) {
  const startX = direction === "left" ? "100%" : "-100%";
  const endX = direction === "left" ? "-100%" : "100%";

  return (
    <section className="mb-16 relative">
      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-[0.3em] mb-8 pl-2">
        {label}
      </h3>
      <div className="relative w-full overflow-hidden">
        <motion.div
          initial={{ x: startX }}
          animate={{ x: endX }}
          transition={{
            repeat: Infinity,
            duration: 20,
            ease: "linear",
          }}
          className="flex gap-8 whitespace-nowrap"
        >
          {items.map((item) => (
            <div
              key={item.id}
              className="flex-shrink-0 glass rounded-xl p-4 min-w-[240px] text-center border border-white/5"
            >
              <div className="h-1 bg-indigo-500/30 rounded w-1/3 mx-auto mb-3" />
              <div className="text-sm font-medium text-white leading-tight">
                {item.titulo}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                {item.artista}
              </div>
              {item.genero && (
                <span className="mt-2 inline-block px-2 py-0.5 rounded text-[10px] text-indigo-300 border border-indigo-500/30 bg-indigo-500/10">
                  {item.genero}
                </span>
              )}
            </div>
          ))}
          {items.map((item) => (
            <div
              key={item.id + "-dup"}
              className="flex-shrink-0 glass rounded-xl p-4 min-w-[240px] text-center border border-white/5"
            >
              <div className="h-1 bg-indigo-500/30 rounded w-1/3 mx-auto mb-3" />
              <div className="text-sm font-medium text-white leading-tight">
                {item.titulo}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                {item.artista}
              </div>
              {item.genero && (
                <span className="mt-2 inline-block px-2 py-0.5 rounded text-[10px] text-indigo-300 border border-indigo-500/30 bg-indigo-500/10">
                  {item.genero}
                </span>
              )}
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
