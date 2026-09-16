import React from "react";
import styles from "../our-story.module.css";
import { HandHeart, Ruler, Gem, Sparkles } from "lucide-react";
import { ScrollReveal } from "./scroll-reveal";

const missionCards = [
  {
    icon: HandHeart,
    title: "Devotion before decoration",
    copy: "A sacred form must carry feeling as carefully as it carries ornamentation.",
  },
  {
    icon: Ruler,
    title: "Proportion with purpose",
    copy: "Scale, posture and balance are considered in relation to the deity and intended sacred space.",
  },
  {
    icon: Gem,
    title: "Respect for the material",
    copy: "The character of the marble guides how every curve, expression and finish is approached.",
  },
  {
    icon: Sparkles,
    title: "Patience in every detail",
    copy: "Handwork is given the time needed for a calm expression and a considered finish.",
  },
];

export function MissionSection() {
  return (
    <section className={styles.missionSection} aria-label="Our Mission">
      <div className="site-container">
        <ScrollReveal>
          <div className={styles.sectionHeaderCentered}>
            <p className={styles.eyebrow}>What guides the work</p>
            <h2 className="font-display">Our Mission & Principles</h2>
            <p className={styles.missionSubtext}>
              The legacy is visible not only in what we make, but in how each decision is approached.
            </p>
          </div>
        </ScrollReveal>

        <div className={styles.missionGrid}>
          {missionCards.map(({ icon: Icon, title, copy }, index) => (
            <ScrollReveal key={title} delay={index * 100}>
              <article className={styles.missionCard}>
                <span className={styles.cardNumber}>{String(index + 1).padStart(2, "0")}</span>
                <Icon aria-hidden="true" size={28} className={styles.cardIcon} />
                <h3 className="font-display">{title}</h3>
                <p>{copy}</p>
              </article>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
