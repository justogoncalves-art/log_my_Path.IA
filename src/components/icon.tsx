// Íconos de línea (24×24, trazo actual). Compartidos por el admin y la vista del docente.
export const ICONS: Record<string, React.ReactNode> = {
  resumen: <path d="M4 13h6V4H4zM14 20h6v-9h-6zM4 20h6v-3H4zM14 4v3h6V4z" />,
  estado: <path d="M3 12h4l3-8 4 16 3-8h4" />,
  orgs: <path d="M3 21h18M5 21V8l7-5 7 5v13M9 21v-6h6v6M9 10h.01M15 10h.01" />,
  alta: <path d="M15 19a6 6 0 0 0-12 0M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M19 8v6M22 11h-6" />,
  programas: <path d="M4 5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2zM4 21V5M10 8l4 2.5-4 2.5z" />,
  campus: <path d="M2 9l10-5 10 5-10 5zM6 11v5c3 2 9 2 12 0v-5M22 9v6" />,
  volver: <path d="M3 10.5 12 3l9 7.5M5 9.5V21h14V9.5" />,
  mail: <path d="M3 6h18v12H3zM3 7l9 6 9-6" />,
  clases: <path d="M4 4h16v12H4zM8 20h8M12 16v4" />,
  personas: <path d="M17 20a5 5 0 0 0-10 0M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8M21 20a4 4 0 0 0-3-3.9M3 20a4 4 0 0 1 3-3.9" />,
  subir: <path d="M12 16V4M7 9l5-5 5 5M4 20h16" />,
  revisar: <path d="M9 11l3 3 8-8M20 12v7a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h11" />,
  globo: <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M3 12h18M12 3c2.5 2.5 3.5 5.5 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-5.5-3.5-9s1-6.5 3.5-9" />,
  video: <path d="M3 6h12v12H3zM15 10l6-3v10l-6-3" />,
  grafico: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  ia: <path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8zM19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9z" />,
  libro: <path d="M4 4h6a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H4zM20 4h-6a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h6z" />,
  archivo: <path d="M14 3H6v18h12V7zM14 3v4h4M9 13h6M9 17h6" />,
  reloj: <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M12 7v5l3 2" />,
  check: <path d="M20 6 9 17l-5-5" />,
  alerta: <path d="M12 3 2 20h20zM12 10v4M12 17h.01" />,
};


export function Icon({ name, size = 18, className = "shrink-0" }: { name: string; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
      {ICONS[name]}
    </svg>
  );
}
