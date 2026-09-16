import React from "react";
import styles from "../our-story.module.css";
import { ImagePlaceholder } from "./image-placeholder";
import { ScrollReveal } from "./scroll-reveal";

export function OurStorySection() {
  return (
    <section className={styles.storySection} aria-label="Our Story">
      <div className={`${styles.storyGrid} site-container`}>
        <ScrollReveal>
          <div className={styles.storyCopy}>
            <p className={styles.eyebrow}>The thread that continues</p>
            <h2 className="font-display">A new identity, rooted in an enduring practice.</h2>
            <div className={styles.storyText}>
              <p>
                What began as Agnihotri Moorti Art in 1960 continues today under the name Divine Stone Gallery. The identity is new; the family commitment to sacred sculpture remains the foundation.
              </p>
              <p>
                Across four generations, knowledge has been carried through practice: understanding the marble, observing proportion, shaping expression and knowing that the smallest detail can change the feeling of the whole form.
              </p>
              <blockquote className="font-display">
                “The name moves forward. The devotion within the work remains.”
              </blockquote>
            </div>
          </div>
        </ScrollReveal>
        
        <ScrollReveal delay={150}>
          <div className={styles.storyVisual}>
            <ImagePlaceholder text="Legacy Image" aspectRatio="4/5" />
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
