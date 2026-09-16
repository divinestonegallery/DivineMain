"use client";

import React, { useEffect, useState, useRef } from "react";
import styles from "../our-story.module.css";
import { ScrollReveal } from "./scroll-reveal";

const visionNodes = [
  { id: "v1", title: "Global Reach", desc: "Bringing sacred art to homes worldwide.", x: -250, y: 120 },
  { id: "v2", title: "Enduring Heritage", desc: "Preserving ancient carving techniques.", x: 0, y: 180 },
  { id: "v3", title: "Modern Integration", desc: "Blending tradition with contemporary spaces.", x: 250, y: 120 },
];

export function VisionSection() {
  const [isDrawn, setIsDrawn] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mediaQuery.matches) {
      setIsDrawn(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsDrawn(true);
        }
      },
      { threshold: 0.3 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className={styles.visionSection} aria-label="Our Vision">
      <div className="site-container">
        <ScrollReveal>
          <div className={styles.sectionHeaderCentered}>
            <p className={styles.eyebrow}>Looking Forward</p>
            <h2 className="font-display">Our Vision</h2>
          </div>
        </ScrollReveal>

        <div className={styles.visionTreeContainer}>
          {/* Central Root Node */}
          <div className={styles.treeRoot}>
            <div className={`${styles.visionNode} ${styles.visionRoot} ${isDrawn ? styles.nodeVisible : ""}`}>
              <h3 className="font-display">Sacred Foundation</h3>
              <p>Rooted in four generations of craftsmanship</p>
            </div>
          </div>

          {/* Child Nodes */}
          <div className={styles.treeBranches}>
            {visionNodes.map((node, i) => (
              <div key={node.id} className={styles.treeBranch}>
                <div
                  className={`${styles.visionNode} ${isDrawn ? styles.nodeVisible : ""}`}
                  style={{
                    transitionDelay: `${400 + i * 200}ms`,
                  }}
                >
                  <h4 className="font-display">{node.title}</h4>
                  <p>{node.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
