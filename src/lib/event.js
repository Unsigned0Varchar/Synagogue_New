export const eventInfo = {
  name: "SYNAGOGUE",
  organizer: "Ghost MGM Management Team",
  tagline: "Seeking the Ultimate Opium",
  dateLabel: "Saturday, 27 June 2026",
  startsAt: "3:00 PM",
  endsAt: "Onwards",
  location: "Venue to be revealed by Host 3 Days before commencement.",
  email: "gilgamesh@ghostmgm.xyz",
  genres: ["Afrotech", "Spiritual", "Techno", "Dark", "Cypher"],
  currency: "INR",
};

export const schedule = [
  {
    time: "3:00 PM",
    title: "Doors and daylight session",
    detail: "Entry opens with thrilling Cypher percussion.",
  },
  {
    time: "6:00 PM",
    title: "Sunset transmission",
    detail: "Deep melodic techno, visuals, and Afro House Music.",
  },
  {
    time: "9:00 PM Onwards",
    title: "SYNAGOGUE prime hours",
    detail: "Peak-room house music with dark rhythms and spiritual melody.",
  },
];

export const ticketTiers = [
  {
    id: "Yokai",
    name: "YOKAI",
    price: 999,
    entries: 1,
    description: "Full-event access from 3:00 PM onwards.",
    perks: ["General entry", "Digital ticket"],
  },
  {
    id: "executive-pass",
    name: "ELDER YOKAI",
    price: 1499,
    entries: 1,
    description: "Full-event access and 500/- off on F&B.",
    perks: ["EXECUTIVE entry", "500 cover"],
  },
  {
    id: "duo-pass",
    name: "YOKAI PACT- Duo",
    price: 2799,
    entries: 2,
    description: "Two entries and 1000/- off on F&B.",
    perks: ["2 digital tickets", "1000 cover"],
  },
  
];

export function getTicketTier(ticketId) {
  return ticketTiers.find((ticket) => ticket.id === ticketId);
}

export function formatPrice(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: eventInfo.currency,
    maximumFractionDigits: 0,
  }).format(amount);
}
