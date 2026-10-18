// Shared by vendor categories and budget categories so spend rolls up by name.
export const CATEGORIES = [
  "Venue", "Decor", "Catering", "Photography", "Videography", "Event planner",
  "Music / DJ", "Makeup", "Mehendi artist", "Pandit", "Clothes", "Jewellery",
  "Invitations", "Transport", "Accommodation", "Gifts", "Other",
];

export const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
