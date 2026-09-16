import React from "react";
import styles from "../our-story.module.css";
import { ImagePlaceholder } from "./image-placeholder";
import { ScrollReveal } from "./scroll-reveal";

const teamMembers = [
  { name: "Suresh Agnihotri", role: "Master Sculptor" },
  { name: "Ramesh Sharma", role: "Lead Finisher" },
  { name: "Priya Singh", role: "Design Consultant" },
  { name: "Amit Kumar", role: "Sourcing Specialist" },
];

export function LeadershipSection() {
  return (
    <section className={styles.leadershipSection} aria-label="Our Team">
      <div className="site-container">
        {/* Leader in Charge */}
        <ScrollReveal>
          <div className={styles.leaderGrid}>
            <div className={styles.leaderImage}>
              <ImagePlaceholder text="Master Sculptor / Founder" aspectRatio="3/4" />
            </div>
            <div className={styles.leaderCopy}>
              <p className={styles.eyebrow}>Leader in Charge</p>
              <h2 className="font-display">Ravi Agnihotri</h2>
              <p className={styles.leaderRole}>Fourth Generation Custodian</p>
              <p className={styles.leaderBio}>
                "The stone speaks if you have the patience to listen. Our responsibility is not to force a shape onto the marble, but to guide it towards its most divine expression."
              </p>
              <p className={styles.leaderBio}>
                Having grown up in the atelier, Ravi oversees all major commissions, ensuring that the strict principles of proportion and devotion are maintained in every piece that leaves the gallery.
              </p>
            </div>
          </div>
        </ScrollReveal>

        {/* Our Team */}
        <ScrollReveal delay={200}>
          <div className={styles.teamContainer}>
            <div className={styles.sectionHeaderCentered}>
              <h3 className="font-display">The Craftspeople</h3>
              <p>The devoted hands behind every creation.</p>
            </div>
            <div className={styles.teamGrid}>
              {teamMembers.map((member, i) => (
                <div key={member.name} className={styles.teamMember}>
                  <div className={styles.teamMemberImage}>
                    <ImagePlaceholder text={member.name} aspectRatio="1/1" />
                  </div>
                  <h4 className="font-display">{member.name}</h4>
                  <p>{member.role}</p>
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
