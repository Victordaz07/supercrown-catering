import { themeColors } from "./colors";

export type MenuCategory = "Box Lunch" | "Grab-n-Go";

export type ThemeColorKey = keyof typeof themeColors;

/** Helper for local image paths with spaces in filenames */
const img = (name: string) =>
  `/images/${encodeURIComponent(name + ".avif")}`;

export interface MenuItem {
  id: string;
  name: string;
  category: MenuCategory;
  description: string;
  imagePlaceholder: ThemeColorKey;
  image?: string;
}

export interface MenuCategoryData {
  id: string;
  title: string;
  items: MenuItem[];
}

export interface Review {
  id: string;
  author: string;
  role: string;
  text: string;
  rating: number;
}

export interface Service {
  id: string;
  title: string;
  tag: string;
  description: string;
  cta: string;
  imagePlaceholder: ThemeColorKey;
  image?: string;
}

export interface Step {
  number: string;
  title: string;
  description: string;
}

/** Hero - uses local image to avoid loading failures */
export const heroImage = "/images/" + encodeURIComponent("snack tray.avif");

/** Menu categories with items and local images */
export const menuCategories: MenuCategoryData[] = [
  {
    id: "sandwiches",
    title: "Sandwiches",
    items: [
      {
        id: "s1",
        name: "Turkey & Cheese",
        category: "Box Lunch",
        description: "Turkey Breast, Cheese, Lettuce, Tomato, and Mustard or Mayonnaise",
        imagePlaceholder: "stone",
        image: img("turkey chesse"),
      },
      {
        id: "s2",
        name: "Turkey/Jalapeño",
        category: "Box Lunch",
        description: "Turkey Breast, Monterey Jack Cheese, Lettuce, Tomato, and Jalapeño Mayonnaise",
        imagePlaceholder: "stone",
        image: img("turkey jalapeno"),
      },
      {
        id: "s3",
        name: "Turkey Special",
        category: "Box Lunch",
        description: "Turkey Breast, Monterey Jack Cheese, Lettuce, Tomato, Pepperoncini, Garlic Mayonnaise, and Pepper",
        imagePlaceholder: "stone",
        image: img("turkey special"),
      },
      {
        id: "s4",
        name: "Mike's Special",
        category: "Box Lunch",
        description: "Roast Beef, Turkey Breast, Monterey Jack Cheese, Lettuce, Tomato, Pepperoncini, Garlic Mayonnaise and Pepper",
        imagePlaceholder: "stone",
        image: img("mike special"),
      },
      {
        id: "s5",
        name: "Pastrami & Cheese",
        category: "Grab-n-Go",
        description: "Pastrami and Swiss Cheese on your choice of bread",
        imagePlaceholder: "stone",
        image: img("pastrami and swees cheese"),
      },
      {
        id: "s6",
        name: "Turkey Pepper Jack",
        category: "Box Lunch",
        description: "Turkey Breast, Pepper Jack Cheese, Lettuce, Tomato, Onions, and Mustard",
        imagePlaceholder: "stone",
        image: img("turkey pepper jack"),
      },
      {
        id: "s7",
        name: "Turkey Club",
        category: "Box Lunch",
        description: "Turkey, Bacon, Lettuce, Tomato with your choice of spread",
        imagePlaceholder: "stone",
        image: img("bacon tomato turkey"),
      },
      {
        id: "s8",
        name: "Tuna",
        category: "Box Lunch",
        description: "Tuna, Mayonnaise, Lettuce, and Tomato",
        imagePlaceholder: "stone",
        image: img("tuna"),
      },
      {
        id: "s9",
        name: "Hawaiian",
        category: "Grab-n-Go",
        description: "Ham, pineapple, and cheese on Hawaiian roll",
        imagePlaceholder: "stone",
        image: img("hawaiian station"),
      },
    ],
  },
  {
    id: "salads",
    title: "Salads",
    items: [
      {
        id: "sal1",
        name: "Caesar",
        category: "Box Lunch",
        description: "Romaine Lettuce, Tomatoes, Croutons, Parmesan Cheese, Caesar Dressing",
        imagePlaceholder: "olive",
        image: img("caesar salad"),
      },
      {
        id: "sal2",
        name: "Green",
        category: "Box Lunch",
        description: "Mixed Greens, Tomatoes, Hard-boiled Egg, Cucumber, Pepperoncinis, Ranch Dressing",
        imagePlaceholder: "olive",
        image: img("green salads"),
      },
      {
        id: "sal3",
        name: "Tuna Salad",
        category: "Box Lunch",
        description: "Romaine Lettuce, Tuna Fish, Tomatoes, Hard-boiled Egg, Cucumber, Pepperoncinis, Ranch Dressing",
        imagePlaceholder: "olive",
        image: img("tuna salad"),
      },
      {
        id: "sal4",
        name: "Greek",
        category: "Box Lunch",
        description: "Romaine Lettuce, Cucumbers, Tomatoes, Bell Peppers, Onions, Kalamata Olives, Oil, Vinegar, Oregano",
        imagePlaceholder: "olive",
        image: img("greek salad"),
      },
    ],
  },
  {
    id: "snacks",
    title: "Snacks",
    items: [
      {
        id: "sn1",
        name: "Yogurt Parfait",
        category: "Grab-n-Go",
        description: "Vanilla yogurt with strawberries or blueberries and granola",
        imagePlaceholder: "terracotta",
        image: img("yogurt parfait"),
      },
      {
        id: "sn2",
        name: "Fruit Cup",
        category: "Grab-n-Go",
        description: "Seasonal fresh fruit assortment",
        imagePlaceholder: "terracotta",
        image: img("fruit bowl"),
      },
      {
        id: "sn3",
        name: "Snack Pack (Seeds)",
        category: "Grab-n-Go",
        description: "Seeds, pretzels, and assorted snacks",
        imagePlaceholder: "terracotta",
        image: img("snack pack seeds"),
      },
      {
        id: "sn4",
        name: "Snack Pack (Fruits)",
        category: "Grab-n-Go",
        description: "Carrots, Cheese, Almonds, Pretzels and more",
        imagePlaceholder: "terracotta",
        image: img("snack pack fruits"),
      },
      {
        id: "sn5",
        name: "Snack Pack (Nuts)",
        category: "Grab-n-Go",
        description: "Peanuts, Cheese, Almonds, Pretzels",
        imagePlaceholder: "terracotta",
        image: img("snack pack nuts"),
      },
      {
        id: "sn6",
        name: "Snack Tray",
        category: "Box Lunch",
        description: "Grapes, Cheese, Crackers or Cherries, Cheese, Cookies",
        imagePlaceholder: "terracotta",
        image: img("snack tray"),
      },
      {
        id: "sn7",
        name: "Vegetable Plate",
        category: "Grab-n-Go",
        description: "Assorted fresh vegetables with dip",
        imagePlaceholder: "terracotta",
        image: img("vegetable plate"),
      },
    ],
  },
];

/** @deprecated Use menuCategories instead. Kept for backwards compatibility. */
export const menuItems: MenuItem[] = menuCategories.flatMap((c) => c.items);

export const reviews: Review[] = [
  {
    id: "1",
    author: "Sarah Mitchell",
    role: "Event Coordinator",
    text: "Super Crown made our corporate retreat unforgettable. The box lunches were fresh, delicious, and everyone kept asking where we got them!",
    rating: 5,
  },
  {
    id: "2",
    author: "James Chen",
    role: "School Administrator",
    text: "We've ordered from Super Crown for three years now. Consistent quality, on-time delivery, and the kids love the grab-n-go options.",
    rating: 5,
  },
  {
    id: "3",
    author: "Maria Gonzalez",
    role: "Wedding Planner",
    text: "The catering for our client's rehearsal dinner was exceptional. Beautiful presentation and the terracotta-seasoned dishes were a hit.",
    rating: 5,
  },
];

export const services: Service[] = [
  {
    id: "1",
    title: "Box Lunches",
    tag: "Corporate & Events",
    description: "Individually packaged, fresh boxed meals perfect for meetings, trainings, and events.",
    cta: "Learn more",
    imagePlaceholder: "stone",
    image: img("snack tray"),
  },
  {
    id: "2",
    title: "Grab-n-Go",
    tag: "Quick & Fresh",
    description: "Wraps, sandwiches, and snacks ready to grab. Ideal for schools, offices, and busy schedules.",
    cta: "Learn more",
    imagePlaceholder: "olive",
    image: img("turkey chesse"),
  },
];

export const steps: Step[] = [
  {
    number: "01",
    title: "Choose your menu",
    description: "Browse our selections and pick the items that fit your event—from box lunches to grab-n-go.",
  },
  {
    number: "02",
    title: "Send your request",
    description: "Fill out our quick quote form with your details. We'll respond within 24 hours.",
  },
  {
    number: "03",
    title: "We deliver fresh",
    description: "Enjoy freshly prepared meals delivered on time. No hassle, no stress—just great food.",
  },
];

export const trustItems: string[] = [
  "Family-Owned Business",
  "Fresh Daily Ingredients",
  "On-Time Delivery",
  "Fully Customizable",
  "Corporate & Private Events",
];
