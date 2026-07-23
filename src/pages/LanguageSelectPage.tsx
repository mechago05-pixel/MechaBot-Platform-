import { motion } from "framer-motion";
import { Globe } from "lucide-react";
import { useI18n, type Language } from "@/lib/i18n";
import logo from "@/assets/mechabot-logo.png";

interface LanguageSelectPageProps {
  onComplete: () => void;
}

const languages: { id: Language; label: string; flag: string }[] = [
  { id: "en", label: "English", flag: "🇬🇧" },
  { id: "sw", label: "Kiswahili", flag: "🇹🇿" },
];

const LanguageSelectPage = ({ onComplete }: LanguageSelectPageProps) => {
  const { setLanguage } = useI18n();

  const handleSelect = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem("mechabot-lang", lang);
    onComplete();
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 bg-accent"
    >
      <motion.img
        src={logo}
        alt="MechaBot"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="w-[40vw] max-w-[180px] h-auto mb-10"
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="w-full max-w-xs space-y-3"
      >
        <div className="flex items-center justify-center gap-2 mb-6">
          <Globe className="w-5 h-5 text-accent-foreground/80" />
          <p className="text-accent-foreground/90 text-sm font-medium">Choose your language</p>
        </div>

        {languages.map((lang) => (
          <button
            key={lang.id}
            onClick={() => handleSelect(lang.id)}
            className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl bg-accent-foreground/15 backdrop-blur-sm border border-accent-foreground/20 text-accent-foreground transition-all hover:bg-accent-foreground/25 active:scale-[0.97]"
          >
            <span className="text-2xl">{lang.flag}</span>
            <span className="text-base font-semibold">{lang.label}</span>
          </button>
        ))}
      </motion.div>
    </div>
  );
};

export default LanguageSelectPage;
