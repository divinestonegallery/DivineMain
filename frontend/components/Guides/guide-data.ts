// @ts-nocheck
export type Guide = {
  slug: "materials" | "sizing" | "care";
  eyebrow: string;
  title: string;
  summary: string;
  image: string;
  imageAlt: string;
  readTime: string;
  highlights: { value: string; label: string; copy: string }[];
  sections: { title: string; copy: string; bullets: string[] }[];
  note: string;
};

export const guides: Guide[] = [
  {
    slug: "materials",
    eyebrow: "Material guide",
    title: "Understanding marble for a sacred work.",
    summary:
      "Learn what makes marble visually distinctive, how natural variation appears and how the finish changes the final character of a murti.",
    image: "/catalog/ganesh-24.jpg",
    imageAlt: "Ornate Ganesha moorti showing detailed carving and painted marble finish",
    readTime: "4 minute guide",
    highlights: [
      { value: "Detail", label: "Carving character", copy: "Marble can support both broad, calm surfaces and intricate ornamentation." },
      { value: "Natural", label: "Individual variation", copy: "Tone and subtle veining can differ from one piece of stone to another." },
      { value: "Choice", label: "Finish direction", copy: "The same form can feel different in natural white or a hand-painted finish." },
    ],
    sections: [
      {
        title: "Why marble suits sacred sculpture",
        copy: "Marble brings visual weight, a calm surface and the ability to hold carefully shaped detail. Its presence can work in both compact home mandirs and larger temple settings.",
        bullets: ["Supports refined facial and ornamental detail", "Creates a substantial, enduring visual presence", "Works with natural-white and decorative finishes"],
      },
      {
        title: "Natural character is part of the stone",
        copy: "Marble is a natural material. Small differences in tone, veining and surface character are expected and help make each hand-carved work individual.",
        bullets: ["Reference photos may not show every subtle variation", "Lighting changes how white marble appears", "Ask the gallery about the stone selected for a commission"],
      },
      {
        title: "Choosing the finish",
        copy: "A natural-white finish keeps attention on form and shadow. Hand-painted details can bring colour, ornament and emphasis to specific features. The right direction depends on the deity, setting and your preference.",
        bullets: ["Natural white for a restrained appearance", "Traditional hand-painting for decorative detail", "Subtle gold accents for selective emphasis"],
      },
    ],
    note: "Material availability and the exact finish should always be confirmed with the gallery for the specific murti or commission.",
  },
  {
    slug: "sizing",
    eyebrow: "Sizing guide",
    title: "Choosing a murti that belongs in your space.",
    summary:
      "A practical way to think about height, visual balance, altar clearance and delivery access before choosing or commissioning a murti.",
    image: "/catalog/radha-krishna-39.jpg",
    imageAlt: "Full 39-inch Radha Krishna marble moorties shown without cropping",
    readTime: "5 minute guide",
    highlights: [
      { value: "6–12 in", label: "Compact", copy: "A starting range for shelves, smaller mandirs and sacred accents." },
      { value: "13–24 in", label: "Home mandir", copy: "A versatile starting range for many dedicated home settings." },
      { value: "25 in +", label: "Statement scale", copy: "Often suited to larger rooms, temples or purpose-planned installations." },
    ],
    sections: [
      {
        title: "Measure the complete setting",
        copy: "Begin with more than the empty height. Consider the altar or pedestal, overhead decoration, lamps, surrounding objects and the visual breathing room the form needs.",
        bullets: ["Measure usable height, width and depth", "Allow space around projecting hands or ornaments", "Include the base or pedestal in your calculation"],
      },
      {
        title: "Think about viewing distance",
        copy: "A form viewed closely can feel balanced at a smaller scale. Across a larger room, additional height and clearer visual separation may help the murti hold its presence.",
        bullets: ["Mark the proposed height on a wall", "Step back to the normal viewing position", "Check eye level when seated and standing"],
      },
      {
        title: "Plan the path to its final position",
        copy: "The selected size must also move safely through the building. Doorways, stair turns, lifts and the final installation area all matter, especially for larger or multi-figure works.",
        bullets: ["Measure the narrowest doorway", "Check lift and stair dimensions", "Share destination photos for a custom commission"],
      },
    ],
    note: "These ranges are starting points, not fixed rules. Share your space measurements or photos with our gallery for more personal guidance.",
  },
  {
    slug: "care",
    eyebrow: "Care guide",
    title: "Gentle care for hand-carved marble.",
    summary:
      "Simple habits for dusting, handling and protecting natural-white or hand-painted marble murtis without using harsh products.",
    image: "/catalog/lakshmi-24.jpg",
    imageAlt: "Hand-painted Lakshmi Mata marble moorti requiring gentle surface care",
    readTime: "4 minute guide",
    highlights: [
      { value: "Soft", label: "Everyday dusting", copy: "Use a clean, dry, non-abrasive cloth or a very soft brush." },
      { value: "Gentle", label: "Surface protection", copy: "Avoid acidic, bleaching or abrasive household cleaners." },
      { value: "Supported", label: "Safe handling", copy: "Lift from a secure base rather than projecting details or limbs." },
    ],
    sections: [
      {
        title: "Routine dusting",
        copy: "Regular gentle dusting is preferable to occasional aggressive cleaning. Work slowly around ornaments, fingers and other projecting details.",
        bullets: ["Use a clean microfiber cloth for open surfaces", "Use a soft brush for intricate areas", "Keep cloths free from grit that could scratch"],
      },
      {
        title: "What to avoid",
        copy: "Marble and decorative finishes can be affected by unsuitable cleaners or rough handling. Do not experiment with strong household products on a sacred sculpture.",
        bullets: ["Avoid acidic cleaners, bleach and abrasive powders", "Do not use rough scrubbers or sharp tools", "Keep coloured oils and liquids away from painted details"],
      },
      {
        title: "Moving and deeper care",
        copy: "Before moving a murti, clear the route and arrange enough support for its weight and form. For stains, damage or deeper cleaning, ask for guidance before taking action.",
        bullets: ["Support the base and main body", "Never lift from hands, crowns or ornaments", "Photograph the issue before contacting the gallery"],
      },
    ],
    note: "Finishes can differ. Contact Divine Stone Gallery before wet-cleaning, treating a stain or attempting any repair on a hand-painted work.",
  },
];

export function getGuide(slug: string) {
  return guides.find((guide) => guide.slug === slug);
}
