// @ts-nocheck
export type CatalogCategory = string;

export type CatalogItem = {
  id: string;
  slug: string;
  name: string;
  deity: string;
  category: CatalogCategory;
  height: number;
  material: string;
  finish: string;
  image: string;
  imageAlt: string;
  featured: number;
  description: string;
  variantId?: string;
  sku?: string;
  pricePaise?: number | null;
  gstRateBps?: number | null;
  stockQuantity?: number;
  inventoryKind?: "unique" | "repeatable";
  salesMode?: "direct" | "quote" | "both";
  weightMinGrams?: number | null;
  weightGrams?: number | null;
};

export const catalogItems: CatalogItem[] = [
  {
    id: "radha-krishna-39",
    slug: "radha-krishna-39-inch-marble",
    name: "Radha Krishna Moorti",
    deity: "Radha Krishna",
    category: "Deity Idol",
    height: 39,
    material: "White marble",
    finish: "Hand-painted",
    image: "/catalog/radha-krishna-39.jpg",
    imageAlt: "Hand-carved Radha Krishna marble moorties with gold and pastel detailing",
    featured: 1,
    description:
      "A serene Radha Krishna composition carved in white marble and completed with delicate hand-painted details for a graceful devotional presence.",
  },
  {
    id: "ganesha-24",
    slug: "ornate-ganesh-24-inch-marble",
    name: "Sri Ornate Ganesha",
    deity: "Ganesha",
    category: "Deity Idol",
    height: 24,
    material: "White marble",
    finish: "Hand-painted",
    image: "/catalog/ganesh-24.jpg",
    imageAlt: "Ornate Ganesha marble moorti with finely painted details",
    featured: 2,
    description:
      "An expressive Ganesha moorti shaped in white marble, with carefully rendered ornamentation and hand-painted accents.",
  },
  {
    id: "gauri-shankar-18",
    slug: "gauri-shankar-family-18-inch-marble",
    name: "Gauri Shankar Family",
    deity: "Shiva",
    category: "Divine Family",
    height: 18,
    material: "White marble",
    finish: "Hand-painted",
    image: "/catalog/gauri-shankar-18.jpg",
    imageAlt: "Gauri Shankar divine family marble sculpture",
    featured: 3,
    description:
      "A balanced Gauri Shankar family composition, hand-carved in white marble and finished with gentle colour and devotional detail.",
  },
  {
    id: "ram-darbar-24",
    slug: "ram-darbar-24-inch-marble",
    name: "Ram Darbar",
    deity: "Rama",
    category: "Divine Family",
    height: 24,
    material: "White marble",
    finish: "Natural white",
    image: "/catalog/ram-darbar-24.jpg",
    imageAlt: "Ram Darbar divine family set carved in white marble",
    featured: 4,
    description:
      "A complete Ram Darbar arrangement in a calm natural-white finish, designed to create a harmonious focal point for a mandir or sacred space.",
  },
  {
    id: "lakshmi-24",
    slug: "lakshmi-mata-24-inch-marble",
    name: "Lakshmi Mata",
    deity: "Lakshmi",
    category: "Deity Idol",
    height: 24,
    material: "White marble",
    finish: "Hand-painted",
    image: "/catalog/lakshmi-24.jpg",
    imageAlt: "Lakshmi Mata moorti hand-carved and painted in white marble",
    featured: 5,
    description:
      "A poised Lakshmi Mata moorti in white marble, completed with refined hand-painted details and a warm devotional expression.",
  },
  {
    id: "saraswati-18",
    slug: "saraswati-mata-18-inch-marble",
    name: "Saraswati Mata",
    deity: "Saraswati",
    category: "Deity Idol",
    height: 18,
    material: "White marble",
    finish: "Hand-painted",
    image: "/catalog/saraswati-18.jpg",
    imageAlt: "Saraswati Mata marble moorti with hand-painted ornamentation",
    featured: 6,
    description:
      "A graceful Saraswati Mata form hand-carved in white marble, with considered ornamentation and soft painted accents.",
  },
  {
    id: "shrinathji-wall-27",
    slug: "shrinathji-wall-sculpture-27-inch",
    name: "Shrinathji Wall Sculpture",
    deity: "Shrinathji",
    category: "Wall Sculpture",
    height: 27,
    material: "Marble",
    finish: "Hand-painted",
    image: "/catalog/shreenathji-wall-27.jpg",
    imageAlt: "Hand-painted Shrinathji marble wall sculpture",
    featured: 7,
    description:
      "A richly detailed Shrinathji wall sculpture carved in marble and hand-painted to bring devotional character to a vertical sacred setting.",
  },
  {
    id: "cow-calf-6",
    slug: "gau-mata-calf-6-inch-marble",
    name: "Gau Mata & Calf",
    deity: "Gau Mata",
    category: "Sacred Accent",
    height: 6,
    material: "Marble",
    finish: "Hand-painted",
    image: "/catalog/cow-calf-6.jpg",
    imageAlt: "Gau Mata and calf miniature marble sculpture",
    featured: 8,
    description:
      "A compact Gau Mata and calf sculpture, carved in marble and delicately painted for a mandir shelf, gifting or sacred accent.",
  },
  {
    id: "divine-trio-12",
    slug: "lakshmi-ganesh-saraswati-12-inch",
    name: "Lakshmi, Ganesha & Saraswati",
    deity: "Divine Trio",
    category: "Divine Family",
    height: 12,
    material: "White marble",
    finish: "Hand-painted",
    image: "/catalog/lakshmi-ganesh-saraswati-12.jpg",
    imageAlt: "Lakshmi, Ganesha and Saraswati trio in hand-painted white marble",
    featured: 9,
    description:
      "A coordinated Lakshmi, Ganesha and Saraswati trio in white marble, created as a harmonious devotional arrangement for the home.",
  },
];

export function getCatalogItem(slug: string) {
  return catalogItems.find((item) => item.slug === slug);
}

export function getRelatedCatalogItems(item: CatalogItem, count = 3) {
  return catalogItems
    .filter((candidate) => candidate.id !== item.id)
    .sort((a, b) => {
      const aMatch = Number(a.category === item.category || a.deity === item.deity);
      const bMatch = Number(b.category === item.category || b.deity === item.deity);
      return bMatch - aMatch || a.featured - b.featured;
    })
    .slice(0, count);
}
