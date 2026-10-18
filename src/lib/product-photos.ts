import type { ProductArt } from "@/db/schema";

/**
 * Real product photos, keyed by product slug. Interim home for images until the
 * owner can manage photos from an admin: a slug with no entry keeps its drawn
 * illustration, so a missing photo never breaks a page.
 *
 * Sources and match notes live in IMAGE_CREDITS.md (not shipped to shoppers).
 */
const PHOTOS: Record<string, { photo: string; photoAlt: string }> = {
  "speckled-stoneware-mug": {
    photo: "/products/speckled-stoneware-mug.jpg",
    photoAlt: "Speckled white and oat stoneware mug with a rounded handle on a pale surface",
  },
  "hand-thrown-serving-bowl": {
    photo: "/products/hand-thrown-serving-bowl.jpg",
    photoAlt: "Wide stoneware serving bowl with a deep rust-brown glaze and a dark rim",
  },
  "amber-jar-soy-candle": {
    photo: "/products/amber-jar-soy-candle.jpg",
    photoAlt: "Amber glass candle jar with a paper label, styled with pine, holly, cinnamon sticks and dried orange slices",
  },
  "engraved-walnut-board": {
    photo: "/products/engraved-walnut-board.jpg",
    photoAlt: "End-grain walnut cutting board with a small engraved monogram in the lower corner",
  },
  "herringbone-wool-throw": {
    photo: "/products/herringbone-wool-throw.jpg",
    photoAlt: "Folded woven wool throw in rust and blush with a hand-twisted fringe",
  },
  "striped-linen-tea-towels": {
    photo: "/products/striped-linen-tea-towels.jpg",
    photoAlt: "Stack of folded white linen tea towels with grey woven stripes and a spool of natural thread",
  },
  "leather-bound-journal": {
    photo: "/products/leather-bound-journal.jpg",
    photoAlt: "Tan leather journal closed with an elastic band, next to a black pen",
  },
  "macrame-plant-hanger": {
    photo: "/products/macrame-plant-hanger.jpg",
    photoAlt: "Cream macramé plant hanger with dark wooden beads holding a potted spider plant against a warm wall",
  },
  "porcelain-bud-vase": {
    photo: "/products/porcelain-bud-vase.jpg",
    photoAlt: "Small round-bodied speckled ceramic bud vase with a narrow neck",
  },
  "winter-solstice-candle": {
    photo: "/products/winter-solstice-candle.jpg",
    photoAlt: "Speckled cream ceramic candle with two wicks and a wooden lid leaning against it",
  },
};

export function withPhoto(slug: string, art: ProductArt): ProductArt {
  const p = PHOTOS[slug];
  return p ? { ...art, ...p } : art;
}
