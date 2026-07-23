import { useEffect, useState } from "react";
import logo from "@/assets/mechabot-logo.png";

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const [phase, setPhase] = useState<"enter" | "visible" | "out">("enter");

  useEffect(() => {
    const enterTimer = setTimeout(() => setPhase("visible"), 100);
    const exitTimer = setTimeout(() => {
      setPhase("out");
      setTimeout(onComplete, 600);
    }, 10000);
    return () => {
      clearTimeout(enterTimer);
      clearTimeout(exitTimer);
    };
  }, [onComplete]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-600"
      style={{ opacity: phase === "out" ? 0 : 1, backgroundColor: "hsl(135 55% 55%)" }}
    >
      <div
        className="flex flex-col items-center justify-center transition-all duration-700 ease-out"
        style={{
          opacity: phase === "enter" ? 0 : 1,
          transform: phase === "enter" ? "scale(0.85)" : "scale(1)",
        }}
      >
        <img
          src={logo}
          alt="MechaBot"
          className="w-52 h-52 sm:w-64 sm:h-64 object-contain"
          style={{ maxHeight: "33vh" }}
        />
      </div>
    </div>
  );
};

export default SplashScreen;
