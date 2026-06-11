import Image from "next/image";
import {
  ArrowDown,
  CalendarDays,
  Camera,
  Clock,
  Globe,
  Mail,
  MapPin,
  MessageCircle,
  Music2,
  ShieldCheck,
} from "lucide-react";
import EventScene from "./components/EventScene";
import TicketCheckout from "./components/TicketCheckout";
import MusicToggle from "./components/MusicToggle";
import { eventInfo, schedule, ticketTiers } from "@/lib/event";

const eventDetails = [
  {
    icon: CalendarDays,
    label: "Date",
    value: eventInfo.dateLabel,
  },
  {
    icon: Clock,
    label: "Time",
    value: `${eventInfo.startsAt} - ${eventInfo.endsAt}`,
  },
  {
    icon: MapPin,
    label: "Venue",
    value: eventInfo.location,
  },
  {
    icon: Music2,
    label: "Sound",
    value: eventInfo.genres.join(" / "),
  },
];

export default function Home() {
  return (
    <main className="site-shell">
      <section className="hero-section" aria-labelledby="event-title">
        <EventScene />

        <nav className="top-nav" aria-label="Main navigation">
          <a className="brand-lockup" href="#top" aria-label="Ghost MGM home">
            <Image
              src="/ghostmgm-logo-new.jpg"
              alt="Ghost MGM Management Team logo"
              width={56}
              height={56}
              priority
            />
            <span>Ghost MGM</span>
          </a>
          <MusicToggle />
          <div className="nav-actions">
            <a href="#details">Details</a>
            <a href="#schedule">Schedule</a>
            <a className="nav-ticket" href="#tickets">
              <ShieldCheck size={16} />
              <span>Tickets</span>
            </a>
          </div>
        </nav>

        <div className="hero-grid" id="top">
          <div className="hero-copy">
            <p className="eyebrow">{eventInfo.genres.join(" • ")}</p>
            <h1 id="event-title">{eventInfo.name}</h1>
            <p className="hero-tagline">{eventInfo.tagline}</p>
            <div className="hero-meta" aria-label="Event quick information">
              <span>{eventInfo.dateLabel}</span>
              <span>{eventInfo.startsAt}</span>
              <span>{eventInfo.endsAt}</span>
            </div>
            <div className="hero-buttons">
              <a className="primary-link" href="#tickets">
                <ShieldCheck size={18} />
                <span>Buy Tickets</span>
              </a>
              <a className="ghost-link" href="#details">
                <ArrowDown size={18} />
                <span>Event Details</span>
              </a>
            </div>
          </div>

          <div className="poster-stage" aria-label="Event poster">
            <Image
              src="/synagogue-event.jpg"
              alt="SYNAGOGUE event poster"
              width={1080}
              height={1349}
              priority
            />
          </div>

          <TicketCheckout />
        </div>
      </section>

      <section
        className="detail-band"
        id="details"
        aria-labelledby="details-title"
      >
        <div className="section-heading">
          <p className="eyebrow">Event information</p>
          <h2 id="details-title">Everything in one place</h2>
        </div>

        <div className="detail-grid">
          {eventDetails.map((detail) => {
            const Icon = detail.icon;
            return (
              <article className="detail-card" key={detail.label}>
                <Icon size={24} />
                <p>{detail.label}</p>
                <strong>{detail.value}</strong>
              </article>
            );
          })}
        </div>
      </section>

      <section className="experience-band" aria-labelledby="experience-title">
        <div className="experience-copy">
          <p className="eyebrow">The night</p>
          <h2 id="experience-title">
            Pink-lit dark techno energy, built for a twelve-hour run.
          </h2>
          <p>
            SYNAGOGUE moves from late-afternoon AfroTech into deeper spiritual
            and dark techno textures, with Ghost MGM handling confirmations,
            venue reveal alerts, and digital entry.
          </p>
        </div>

        <div className="genre-wall" aria-label="Music genres">
          {eventInfo.genres.map((genre) => (
            <span key={genre}>{genre}</span>
          ))}
        </div>
      </section>

      <section
        className="schedule-band"
        id="schedule"
        aria-labelledby="schedule-title"
      >
        <div className="section-heading">
          <p className="eyebrow">Schedule</p>
          <h2 id="schedule-title">3:00 PM to 3:00 AM</h2>
        </div>

        <div className="timeline">
          {schedule.map((item) => (
            <article className="timeline-item" key={item.time}>
              <time>{item.time}</time>
              <div>
                <h3>{item.title}</h3>
                <p>{item.detail}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="passes-band" aria-labelledby="passes-title">
        <div className="section-heading">
          <p className="eyebrow">Passes</p>
          <h2 id="passes-title">Choose your entry</h2>
        </div>

        <div className="passes-grid">
          {ticketTiers.map((ticket) => (
            <article className="pass-card" key={ticket.id}>
              <h3>{ticket.name}</h3>
              <p>{ticket.description}</p>
              <ul>
                {ticket.perks.map((perk) => (
                  <li key={perk}>
                    <ShieldCheck size={15} />
                    <span>{perk}</span>
                  </li>
                ))}
              </ul>
              <a href="#tickets">Book {ticket.name}</a>
            </article>
          ))}
        </div>
      </section>

      <footer className="site-footer">
        <Image
          src="/ghostmgm-logo-new.jpg"
          alt="Ghost MGM Management Team logo"
          width={96}
          height={96}
        />
        <div className="footer-details">
          <p>Organizer: Baibhav Bhowmik, rishi Dudheria, Bigyat Deb</p>
          <a href="mailto:gilgamesh@ghostmgm.xyz">
            <Mail size={16} />
            <span>gilgamesh@ghostmgm.xyz</span>
          </a>
          <a
            href="https://www.instagram.com/ghostmgm_"
            target="_blank"
            rel="noreferrer"
          >
            <Camera size={16} />
            <span>@ghostmgm_</span>
          </a>
          <a href="https://wa.me/917429401586" target="_blank" rel="noreferrer">
            <MessageCircle size={16} />
            <span>+91 7429401586</span>
          </a>
          <p>
            <MapPin size={16} />
            <span>Bylane 2, Rehabari, Guwahati 781008</span>
          </p>
          <p>
            <Globe size={16} />
            <span>Website created and managed by Abhikraj Dutta Choudhury</span>
          </p>
          <p>© 2026 ghostmgm, Licensed under the AGPL License.</p>
        </div>
      </footer>
    </main>
  );
}
