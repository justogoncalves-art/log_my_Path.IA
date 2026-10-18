import Image from "next/image";
import { Brand } from "@/components/brand";

const QUOTES = [
  { text: "No es el más fuerte el que sobrevive, ni el más inteligente. Es el que mejor se adapta al cambio.", author: "Charles Darwin", img: "/img/works-globe.jpeg" },
  { text: "El éxito es la suma de pequeños esfuerzos repetidos día tras día.", author: "Robert Collier", img: "/img/quote-10.jpeg" },
  { text: "No es que tengamos un problema difícil; es que tenemos un problema fácil que estamos resolviendo de forma difícil.", author: "Albert Einstein", img: "/img/quote-einstein.jpg" },
  { text: "El que tiene un porqué para vivir, puede soportar casi cualquier cómo.", author: "Friedrich Nietzsche", img: "/img/quote-6.jpeg" },
  { text: "No te rindas. Sufre ahora y vivirás el resto de tu vida como un campeón.", author: "Muhammad Ali", img: "/img/quote-berlin.jpeg" },
];

// Pantalla dividida del prototipo: carrusel de frases a la izquierda, formulario a la derecha.
// El carrusel es solo CSS (rota cada 10 s) para no cargar JavaScript en el login.
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-wrap">
      <aside className="relative hidden min-h-screen flex-[1_1_480px] overflow-hidden bg-opulent md:block" aria-hidden>
        {QUOTES.map((q, i) => (
          <div
            key={q.author}
            className="absolute inset-0 opacity-0"
            style={{ animation: `mp-quote 50s ${i * 10}s infinite` }}
          >
            <Image src={q.img} alt="" fill priority={i === 0} sizes="50vw" className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-opulent via-opulent/50 to-opulent/20" />
            <blockquote className="absolute bottom-24 left-14 right-14 max-w-md">
              <p className="font-display text-[26px] leading-snug text-white">“{q.text}”</p>
              <footer className="mt-5 font-mono text-xs uppercase tracking-[0.3em] text-white/70">— {q.author}</footer>
            </blockquote>
          </div>
        ))}
        <p className="absolute right-14 top-16 font-brand text-xs tracking-[0.3em] text-white/80">BUILD YOUR TOMORROW.</p>
      </aside>
      <main className="flex min-h-screen flex-[1_1_420px] items-center justify-center px-6 py-16">
        <div className="mp-fade-up w-full max-w-[420px]">
          {children}
          <div className="mt-14 flex justify-center">
            <Brand />
          </div>
        </div>
      </main>
    </div>
  );
}
