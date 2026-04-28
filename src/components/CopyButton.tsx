import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  value: string;
  label?: string;
  className?: string;
  size?: "sm" | "default" | "icon";
  variant?: "default" | "ghost" | "outline" | "secondary";
}

export function CopyButton({ value, label = "Kopieer", className, size = "sm", variant = "secondary" }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={handleCopy}
      className={cn("relative overflow-hidden", className)}
    >
      <AnimatePresence mode="wait" initial={false}>
        {copied ? (
          <motion.span
            key="ok"
            initial={{ y: 8, opacity: 0, scale: 0.8 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -8, opacity: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 18 }}
            className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400"
          >
            <Check className="h-4 w-4" /> Succes!
          </motion.span>
        ) : (
          <motion.span
            key="copy"
            initial={{ y: 8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -8, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-1.5"
          >
            <Copy className="h-4 w-4" /> {label}
          </motion.span>
        )}
      </AnimatePresence>
    </Button>
  );
}
