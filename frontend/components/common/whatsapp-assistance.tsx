// @ts-nocheck
import { MessageCircle } from "lucide-react";
import styles from "./site-shell.module.css";

export function WhatsAppAssistance({ elevated = false }: { elevated?: boolean }) {
  return (
    <a
      className={`${styles.whatsappButton} ${elevated ? styles.whatsappButtonElevated : ""}`.trim()}
      href="https://wa.me/919166138566?text=Namaste%2C%20I%20would%20like%20help%20choosing%20a%20moorti."
      target="_blank"
      rel="noreferrer"
      aria-label="Chat with Divine Stone Gallery on WhatsApp"
    >
      <MessageCircle aria-hidden="true" size={21} strokeWidth={1.7} />
      <span>Need guidance?</span>
    </a>
  );
}
