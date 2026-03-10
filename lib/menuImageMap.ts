const menuImageMap: Record<string, string> = {
  "turkey-cheese-box-lunch": "turkey chesse.avif",
  "turkey-jalapeno-box-lunch": "turkey jalapeno.avif",
  "turkey-special-box-lunch": "turkey special.avif",
  "mikes-special-box-lunch": "mike special.avif",
  "turkey-pepper-jack-box-lunch": "turkey pepper jack.avif",
  "turkey-club-box-lunch": "bacon tomato turkey.avif",
  "tuna-box-lunch": "tuna.avif",
  "pastrami-cheese-grab-n-go": "pastrami and swees cheese.avif",
  "hawaiian-grab-n-go": "hawaiian station.avif",
  "yogurt-parfait-grab-n-go": "yogurt parfait.avif",
  "fruit-cup-grab-n-go": "fruit bowl.avif",
  "snack-pack-seeds-grab-n-go": "snack pack seeds.avif",
  "snack-pack-fruits-grab-n-go": "snack pack fruits.avif",
  "snack-pack-nuts-grab-n-go": "snack pack nuts.avif",
  "vegetable-plate-grab-n-go": "vegetable plate.avif",
  "snack-tray-box-lunch": "snack tray.avif",
  "caesar-salad-box-lunch": "caesar salad.avif",
  "green-salad-box-lunch": "green salads.avif",
  "tuna-salad-box-lunch": "tuna salad.avif",
  "greek-salad-box-lunch": "greek salad.avif",
};

export function getImagePath(id: string): string | null {
  const filename = menuImageMap[id];
  if (!filename) return null;
  return `/images/${encodeURIComponent(filename)}`;
}
