"use client";

import React, { useState, useEffect } from "react";
import styles from "../our-story.module.css";
import { ImagePlaceholder } from "./image-placeholder";

const slides = [
  {
    id: 1,
    eyebrow: "Our Heritage",
    title: "Carved across four generations.",
    description:
      "Divine Stone Gallery continues the family tradition of Agnihotri Moorti Art, established in 1960 in Alwar, Rajasthan—a practice shaped by devotion, patience and precision.",
    cta: "Discover our roots",
  },
  {
    id: 2,
    eyebrow: "The Craft",
    title: "Patience in every detail.",
    description:
      "Handwork is given the time needed for a calm expression and a considered finish. The character of the marble guides how every curve is approached.",
    cta: "See our process",
  },
  {
    id: 3,
    eyebrow: "Sacred Form",
    title: "Proportion with purpose.",
    description:
      "Scale, posture and balance are considered in relation to the deity and intended sacred space, in accordance with Shilp Shastra.",
    cta: "View our gallery",
  },
];

export function AboutHero() {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 12000); // 12 seconds per slide

    return () => clearInterval(timer);
  }, []);

  const slide = slides[currentSlide];

  return (
    <section className={styles.heroSection} aria-label="About Us Hero">
      <div className={styles.heroTrack}>
        {/* Mobile stacking structure (CSS will handle order & display) */}
        <div className={styles.heroLayout}>
          
          {/* 10% Left Image */}
          <div className={styles.heroSideImageLeft} aria-hidden="true">
            <ImagePlaceholder text="" aspectRatio="3/4" />
          </div>

          {/* 60% Main Image */}
          <div className={styles.heroMainImage}>
            {/* We could crossfade multiple images here, for now using one placeholder */}
            <ImagePlaceholder 
              text={`Main Image ${currentSlide + 1}`} 
              aspectRatio="4/3" 
              className={styles.heroImageFull}
            />
          </div>

          {/* 20% Content Panel */}
          <div className={styles.heroContentPanel}>
            <div className={styles.heroContentInner} key={slide.id}>
              <p className={styles.eyebrow}>{slide.eyebrow}</p>
              <h1 className="font-display">{slide.title}</h1>
              <p className={styles.heroDesc}>{slide.description}</p>
              <span className={styles.heroCta}>{slide.cta}</span>
            </div>
            
            {/* Carousel Indicators */}
            <div className={styles.carouselIndicators}>
              {slides.map((s, index) => (
                <button
                  key={s.id}
                  className={`${styles.indicator} ${index === currentSlide ? styles.indicatorActive : ""}`}
                  onClick={() => setCurrentSlide(index)}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          </div>

          {/* 10% Right Image */}
          <div className={styles.heroSideImageRight} aria-hidden="true">
            <ImagePlaceholder text="" aspectRatio="3/4" />
          </div>

        </div>
      </div>
    </section>
  );
}
