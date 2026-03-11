import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const masterEmail = process.env.MASTER_EMAIL ?? "admin@supercrown.com";
  const masterPassword = process.env.MASTER_PASSWORD ?? "master2026!";
  const masterName = process.env.MASTER_NAME ?? "Victor";

  const masterHash = await hash(masterPassword, 12);
  const salesHash = await hash("sales123", 12);
  const deliveryHash = await hash("delivery123", 12);

  await prisma.user.upsert({
    where: { email: masterEmail },
    update: { passwordHash: masterHash, name: masterName, role: "MASTER" },
    create: {
      email: masterEmail,
      passwordHash: masterHash,
      name: masterName,
      role: "MASTER",
    },
  });

  await prisma.user.upsert({
    where: { email: "ventas@supercrown.com" },
    update: {},
    create: {
      email: "ventas@supercrown.com",
      passwordHash: salesHash,
      name: "Sales Team",
      role: "SALES",
    },
  });

  await prisma.user.upsert({
    where: { email: "repartidor@supercrown.com" },
    update: {},
    create: {
      email: "repartidor@supercrown.com",
      passwordHash: deliveryHash,
      name: "Delivery Driver",
      role: "DELIVERY",
    },
  });

  console.log("Users seeded:");
  console.log(`  MASTER: ${masterEmail} / ${masterPassword}`);
  console.log("  SALES: ventas@supercrown.com / sales123");
  console.log("  DELIVERY: repartidor@supercrown.com / delivery123");

  // Seed products from menuData
  const menuImageMap: Record<string, string> = {
    "turkey-cheese-box-lunch": "/images/turkey chesse.avif",
    "turkey-jalapeno-box-lunch": "/images/turkey jalapeno.avif",
    "turkey-special-box-lunch": "/images/turkey special.avif",
    "mikes-special-box-lunch": "/images/mike special.avif",
    "turkey-pepper-jack-box-lunch": "/images/turkey pepper jack.avif",
    "turkey-club-box-lunch": "/images/bacon tomato turkey.avif",
    "tuna-box-lunch": "/images/tuna.avif",
    "pastrami-cheese-grab-n-go": "/images/pastrami and swees cheese.avif",
    "hawaiian-grab-n-go": "/images/hawaiian station.avif",
    "yogurt-parfait-grab-n-go": "/images/yogurt parfait.avif",
    "fruit-cup-grab-n-go": "/images/fruit bowl.avif",
    "snack-pack-seeds-grab-n-go": "/images/snack pack seeds.avif",
    "snack-pack-fruits-grab-n-go": "/images/snack pack fruits.avif",
    "snack-pack-nuts-grab-n-go": "/images/snack pack nuts.avif",
    "vegetable-plate-grab-n-go": "/images/vegetable plate.avif",
    "snack-tray-box-lunch": "/images/snack tray.avif",
    "caesar-salad-box-lunch": "/images/caesar salad.avif",
    "green-salad-box-lunch": "/images/green salads.avif",
    "tuna-salad-box-lunch": "/images/tuna salad.avif",
    "greek-salad-box-lunch": "/images/greek salad.avif",
  };

  const menuItems = [
    { slug: "turkey-cheese-box-lunch", name: "Turkey & Cheese", category: "Box Lunch", subcategory: "Sandwiches", description: "A classic combination of freshly sliced turkey breast with cheese, crisp lettuce, ripe tomato, and your choice of mustard or mayo.", shortDescription: "Turkey Breast, Cheese, Lettuce, Tomato, and Mustard or Mayo", ingredients: ["Turkey Breast","Cheese","Lettuce","Tomato","Mustard or Mayo"], calories: 520, allergens: ["gluten","dairy"], isPopular: true, isVegetarian: false, imagePlaceholder: "#C9A07A", reviewText: "Perfect for our team lunch. Fresh and delicious every time.", reviewAuthor: "Sarah M.", reviewRating: 5 },
    { slug: "turkey-jalapeno-box-lunch", name: "Turkey Jalapeño", category: "Box Lunch", subcategory: "Sandwiches", description: "Turkey breast with Monterey Jack cheese, lettuce, tomato, and a kick of jalapeño mayonnaise.", shortDescription: "Turkey Breast, Monterey Jack Cheese, Lettuce, Tomato, and Jalapeño Mayonnaise", ingredients: ["Turkey Breast","Monterey Jack Cheese","Lettuce","Tomato","Jalapeño Mayonnaise"], calories: 545, allergens: ["gluten","dairy"], isPopular: false, isVegetarian: false, imagePlaceholder: "#9E7E58", reviewText: "The jalapeño mayo adds the perfect spice. Our office favorite!", reviewAuthor: "Mike R.", reviewRating: 5 },
    { slug: "turkey-special-box-lunch", name: "Turkey Special", category: "Box Lunch", subcategory: "Sandwiches", description: "Turkey breast with Monterey Jack, lettuce, tomato, pepperoncini, garlic mayonnaise, and pepper.", shortDescription: "Turkey Breast, Monterey Jack Cheese, Lettuce, Tomato, Pepperoncini, Garlic Mayonnaise, and Pepper", ingredients: ["Turkey Breast","Monterey Jack Cheese","Lettuce","Tomato","Pepperoncini","Garlic Mayonnaise","Pepper"], calories: 580, allergens: ["gluten","dairy"], isPopular: true, isVegetarian: false, imagePlaceholder: "#8A9E7A", reviewText: "The garlic mayo and pepperoncini make it stand out. Highly recommend.", reviewAuthor: "Jennifer K.", reviewRating: 5 },
    { slug: "mikes-special-box-lunch", name: "Mike's Special", category: "Box Lunch", subcategory: "Sandwiches", description: "Roast beef and turkey breast with Monterey Jack cheese, lettuce, tomato, pepperoncini, garlic mayonnaise, and pepper.", shortDescription: "Roast Beef, Turkey Breast, Monterey Jack Cheese, Lettuce, Tomato, Pepperoncini, Garlic Mayonnaise and Pepper", ingredients: ["Roast Beef","Turkey Breast","Monterey Jack Cheese","Lettuce","Tomato","Pepperoncini","Garlic Mayonnaise","Pepper"], calories: 620, allergens: ["gluten","dairy"], isPopular: true, isVegetarian: false, imagePlaceholder: "#B5612A", reviewText: "The combo of roast beef and turkey is unbeatable. Great for larger events.", reviewAuthor: "David L.", reviewRating: 5 },
    { slug: "turkey-pepper-jack-box-lunch", name: "Turkey Pepper Jack", category: "Box Lunch", subcategory: "Sandwiches", description: "Turkey breast with Pepper Jack cheese, lettuce, tomato, onions, and mustard.", shortDescription: "Turkey Breast, Pepper Jack Cheese, Lettuce, Tomato, Onions, and Mustard", ingredients: ["Turkey Breast","Pepper Jack Cheese","Lettuce","Tomato","Onions","Mustard"], calories: 535, allergens: ["gluten","dairy"], isPopular: false, isVegetarian: false, imagePlaceholder: "#C8B99A", reviewText: "Love the kick from the Pepper Jack. Always fresh and satisfying.", reviewAuthor: "Amanda T.", reviewRating: 5 },
    { slug: "turkey-club-box-lunch", name: "Turkey Club", category: "Box Lunch", subcategory: "Sandwiches", description: "Turkey with bacon, lettuce, tomato, and your choice of spread.", shortDescription: "Turkey, Bacon, Lettuce, Tomato with your choice of spread", ingredients: ["Turkey","Bacon","Lettuce","Tomato","Spread of choice"], calories: 610, allergens: ["gluten","dairy"], isPopular: true, isVegetarian: false, imagePlaceholder: "#7A9E8A", reviewText: "Classic turkey club done right. Bacon is always crispy.", reviewAuthor: "Chris B.", reviewRating: 5 },
    { slug: "tuna-box-lunch", name: "Tuna", category: "Box Lunch", subcategory: "Sandwiches", description: "Classic tuna salad with mayonnaise, lettuce, and tomato.", shortDescription: "Tuna, Mayonnaise, Lettuce, and Tomato", ingredients: ["Tuna","Mayonnaise","Lettuce","Tomato"], calories: 480, allergens: ["gluten","fish"], isPopular: false, isVegetarian: false, imagePlaceholder: "#A07A5A", reviewText: "Creamy tuna, never dry. Perfect for a light lunch option.", reviewAuthor: "Lisa W.", reviewRating: 5 },
    { slug: "pastrami-cheese-grab-n-go", name: "Pastrami & Cheese", category: "Grab-N-Go", subcategory: "Sandwiches", description: "Tender pastrami and Swiss cheese on your choice of bread.", shortDescription: "Pastrami and Swiss Cheese on your choice of bread", ingredients: ["Pastrami","Swiss Cheese","Bread of choice"], calories: 550, allergens: ["gluten","dairy"], isPopular: false, isVegetarian: false, imagePlaceholder: "#C9A07A", reviewText: "Quick and delicious. Ideal for grab-and-go events.", reviewAuthor: "Robert P.", reviewRating: 5 },
    { slug: "hawaiian-grab-n-go", name: "Hawaiian", category: "Grab-N-Go", subcategory: "Sandwiches", description: "Ham, pineapple, and cheese on a sweet Hawaiian roll.", shortDescription: "Ham, pineapple, and cheese on Hawaiian roll", ingredients: ["Ham","Pineapple","Cheese","Hawaiian Roll"], calories: 470, allergens: ["gluten","dairy"], isPopular: true, isVegetarian: false, imagePlaceholder: "#9E7E58", reviewText: "The Hawaiian is always a hit with kids and adults alike.", reviewAuthor: "Karen S.", reviewRating: 5 },
    { slug: "yogurt-parfait-grab-n-go", name: "Yogurt Parfait", category: "Grab-N-Go", subcategory: "Snacks", description: "Vanilla yogurt layered with strawberries or blueberries and granola.", shortDescription: "Vanilla yogurt with strawberries or blueberries and granola", ingredients: ["Vanilla Yogurt","Strawberries or Blueberries","Granola"], calories: 280, allergens: ["dairy","tree nuts"], isPopular: false, isVegetarian: true, imagePlaceholder: "#8A9E7A", reviewText: "Light, fresh, and perfectly layered. Great healthy option.", reviewAuthor: "Emily F.", reviewRating: 5 },
    { slug: "fruit-cup-grab-n-go", name: "Fruit Cup", category: "Grab-N-Go", subcategory: "Snacks", description: "Seasonal fresh fruit assortment, always ripe and sweet.", shortDescription: "Seasonal fresh fruit assortment", ingredients: ["Seasonal Fresh Fruit"], calories: 120, allergens: [], isPopular: true, isVegetarian: true, imagePlaceholder: "#B5612A", reviewText: "Fresh and refreshing. Perfect addition to any lunch.", reviewAuthor: "Nicole H.", reviewRating: 5 },
    { slug: "snack-pack-seeds-grab-n-go", name: "Snack Pack (Seeds)", category: "Grab-N-Go", subcategory: "Snacks", description: "Seeds, pretzels, and assorted snacks for a satisfying crunch.", shortDescription: "Seeds, pretzels, and assorted snacks", ingredients: ["Seeds","Pretzels","Assorted Snacks"], calories: 220, allergens: ["gluten"], isPopular: false, isVegetarian: true, imagePlaceholder: "#C8B99A", reviewText: "Great variety and perfect portion size. Kids love it.", reviewAuthor: "Tom G.", reviewRating: 5 },
    { slug: "snack-pack-fruits-grab-n-go", name: "Snack Pack (Fruits)", category: "Grab-N-Go", subcategory: "Snacks", description: "Carrots, cheese, almonds, pretzels and more in a convenient pack.", shortDescription: "Carrots, Cheese, Almonds, Pretzels and more", ingredients: ["Carrots","Cheese","Almonds","Pretzels"], calories: 310, allergens: ["dairy","tree nuts","gluten"], isPopular: false, isVegetarian: true, imagePlaceholder: "#7A9E8A", reviewText: "Healthy mix of veggies and protein. Ideal for meetings.", reviewAuthor: "Patricia M.", reviewRating: 5 },
    { slug: "snack-pack-nuts-grab-n-go", name: "Snack Pack (Nuts)", category: "Grab-N-Go", subcategory: "Snacks", description: "Peanuts, cheese, almonds, and pretzels for a protein-packed snack.", shortDescription: "Peanuts, Cheese, Almonds, Pretzels", ingredients: ["Peanuts","Cheese","Almonds","Pretzels"], calories: 380, allergens: ["dairy","tree nuts","peanuts","gluten"], isPopular: false, isVegetarian: true, imagePlaceholder: "#A07A5A", reviewText: "Satisfying and filling. Great for afternoon breaks.", reviewAuthor: "Steve D.", reviewRating: 5 },
    { slug: "vegetable-plate-grab-n-go", name: "Vegetable Plate", category: "Grab-N-Go", subcategory: "Snacks", description: "Assorted fresh vegetables with your choice of dip.", shortDescription: "Assorted fresh vegetables with dip", ingredients: ["Assorted Fresh Vegetables","Dip"], calories: 150, allergens: ["dairy"], isPopular: false, isVegetarian: true, imagePlaceholder: "#8A9E7A", reviewText: "Always crisp and fresh. The dip is fantastic.", reviewAuthor: "Linda R.", reviewRating: 5 },
    { slug: "snack-tray-box-lunch", name: "Snack Tray", category: "Box Lunch", subcategory: "Snacks", description: "Grapes, cheese, crackers or cherries, cheese, and cookies for a sweet and savory spread.", shortDescription: "Grapes, Cheese, Crackers or Cherries, Cheese, Cookies", ingredients: ["Grapes","Cheese","Crackers or Cherries","Cookies"], calories: 420, allergens: ["dairy","gluten"], isPopular: true, isVegetarian: true, imagePlaceholder: "#B5612A", reviewText: "Perfect for casual gatherings. Everyone finds something they love.", reviewAuthor: "Rachel C.", reviewRating: 5 },
    { slug: "caesar-salad-box-lunch", name: "Caesar Salad", category: "Box Lunch", subcategory: "Salads", description: "Romaine lettuce with tomatoes, croutons, parmesan cheese, and classic Caesar dressing.", shortDescription: "Romaine Lettuce, Tomatoes, Croutons, Parmesan Cheese, Caesar Dressing", ingredients: ["Romaine Lettuce","Tomatoes","Croutons","Parmesan Cheese","Caesar Dressing"], calories: 380, allergens: ["gluten","dairy","fish"], isPopular: true, isVegetarian: true, imagePlaceholder: "#6B7A5A", reviewText: "Best Caesar salad we've had catered. Dressing is perfect.", reviewAuthor: "Greg N.", reviewRating: 5 },
    { slug: "green-salad-box-lunch", name: "Green Salad", category: "Box Lunch", subcategory: "Salads", description: "Mixed greens with tomatoes, hard-boiled egg, cucumber, pepperoncini, and ranch dressing.", shortDescription: "Mixed Greens, Tomatoes, Hard-boiled Egg, Cucumber, Pepperoncinis, Ranch Dressing", ingredients: ["Mixed Greens","Tomatoes","Hard-boiled Egg","Cucumber","Pepperoncini","Ranch Dressing"], calories: 320, allergens: ["dairy","egg"], isPopular: false, isVegetarian: true, imagePlaceholder: "#7A9E8A", reviewText: "Fresh and satisfying. The ranch dressing is homemade-style.", reviewAuthor: "Diana K.", reviewRating: 5 },
    { slug: "tuna-salad-box-lunch", name: "Tuna Salad", category: "Box Lunch", subcategory: "Salads", description: "Romaine lettuce with tuna fish, tomatoes, hard-boiled egg, cucumber, pepperoncini, and ranch dressing.", shortDescription: "Romaine Lettuce, Tuna Fish, Tomatoes, Hard-boiled Egg, Cucumber, Pepperoncinis, Ranch Dressing", ingredients: ["Romaine Lettuce","Tuna Fish","Tomatoes","Hard-boiled Egg","Cucumber","Pepperoncini","Ranch Dressing"], calories: 410, allergens: ["fish","egg","dairy"], isPopular: false, isVegetarian: false, imagePlaceholder: "#A07A5A", reviewText: "Hearty and flavorful. Great as a main or side.", reviewAuthor: "Kevin J.", reviewRating: 5 },
    { slug: "greek-salad-box-lunch", name: "Greek Salad", category: "Box Lunch", subcategory: "Salads", description: "Romaine lettuce with cucumbers, tomatoes, bell peppers, onions, Kalamata olives, oil, vinegar, and oregano.", shortDescription: "Romaine Lettuce, Cucumbers, Tomatoes, Bell Peppers, Onions, Kalamata Olives, Oil, Vinegar, Oregano", ingredients: ["Romaine Lettuce","Cucumbers","Tomatoes","Bell Peppers","Onions","Kalamata Olives","Oil","Vinegar","Oregano"], calories: 290, allergens: [], isPopular: true, isVegetarian: true, imagePlaceholder: "#9E7E58", reviewText: "Authentic Greek flavors. The olives make it special.", reviewAuthor: "Helen V.", reviewRating: 5 },
  ];

  let sortIdx = 0;
  for (const item of menuItems) {
    await prisma.product.upsert({
      where: { slug: item.slug },
      update: {},
      create: {
        ...item,
        ingredients: JSON.stringify(item.ingredients),
        allergens: JSON.stringify(item.allergens),
        imageUrl: menuImageMap[item.slug] || null,
        sortOrder: sortIdx++,
        isAvailable: true,
      },
    });
  }
  console.log(`Products seeded: ${menuItems.length} items`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
