import { FormEvent, useEffect, useMemo, useState, type ReactNode } from "react";
import { hasSupabaseConfig, supabase } from "./lib/supabase";

type View = "home" | "planning" | "detail" | "create";
type Visibility = "public" | "prive";

type ScheduleItem = {
  time: string;
  description: string;
};

type EventRecord = {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  description: string;
  price: number;
  places: number;
  visibility: Visibility;
  schedule: ScheduleItem[];
  activities: string[];
};

type FormState = {
  title: string;
  date: string;
  time: string;
  location: string;
  description: string;
  price: string;
  places: string;
  visibility: Visibility;
};

const allowedEmails = (import.meta.env.VITE_ALLOWED_EMAILS as string | undefined)
  ?.split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean) ?? [];

const emptyForm: FormState = {
  title: "",
  date: "",
  time: "",
  location: "",
  description: "",
  price: "0",
  places: "",
  visibility: "public",
};

function useFormatters() {
  const dateTime = useMemo(
    () => ({
      shortDate: new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short" }),
      longDate: new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }),
    }),
    [],
  );

  return dateTime;
}

function formatDayLabel(date: string, formatter: Intl.DateTimeFormat) {
  return formatter.format(new Date(`${date}T00:00:00`));
}

function formatLongDate(date: string, formatter: Intl.DateTimeFormat) {
  return formatter.format(new Date(`${date}T00:00:00`));
}

function formatPrice(value: number) {
  return value === 0 ? "Gratuit" : `${value.toFixed(0)} €`;
}

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return String(Date.now());
}

function Icon({ name }: { name: "calendar" | "clock" | "pin" | "users" | "euro" | "back" | "plus" | "trash" | "close" | "arrow" }) {
  const common = {
    width: 16,
    height: 16,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (name) {
    case "calendar":
      return (
        <svg {...common}>
          <rect x="3" y="4.5" width="18" height="16" rx="2" />
          <path d="M3 9h18" />
          <path d="M8 2.5v4" />
          <path d="M16 2.5v4" />
        </svg>
      );
    case "clock":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7.5V12l3 2" />
        </svg>
      );
    case "pin":
      return (
        <svg {...common}>
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
          <circle cx="12" cy="10" r="2.6" />
        </svg>
      );
    case "users":
      return (
        <svg {...common}>
          <path d="M16 19v-1.5a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4V19" />
          <circle cx="9" cy="7" r="3.2" />
          <path d="M22 19v-1.5a4 4 0 0 0-3-3.85" />
          <path d="M16 3.65a4 4 0 0 1 0 7.7" />
        </svg>
      );
    case "euro":
      return (
        <svg {...common}>
          <path d="M17 5.5A7 7 0 1 0 17 18.5" />
          <path d="M4 10h9" />
          <path d="M4 14h7" />
        </svg>
      );
    case "back":
      return (
        <svg {...common}>
          <path d="M14 6l-6 6 6 6" />
        </svg>
      );
    case "plus":
      return (
        <svg {...common}>
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </svg>
      );
    case "trash":
      return (
        <svg {...common}>
          <path d="M4 7h16" />
          <path d="M9 7V5h6v2" />
          <path d="M6 7l1 13h10l1-13" />
        </svg>
      );
    case "close":
      return (
        <svg {...common}>
          <path d="M6 6l12 12" />
          <path d="M18 6L6 18" />
        </svg>
      );
    case "arrow":
      return (
        <svg {...common}>
          <path d="M5 12h14" />
          <path d="M13 6l6 6-6 6" />
        </svg>
      );
    default:
      return null;
  }
}

function Badge({ visibility }: { visibility: Visibility }) {
  const isPublic = visibility === "public";

  return (
    <span className={`badge ${isPublic ? "badge-public" : "badge-private"}`}>
      <span className="badge-dot" />
      {isPublic ? "Public" : "Privé"}
    </span>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <label className="field-label">{children}</label>;
}

function DetailStat({ icon, label, value, valueClassName }: { icon: ReactNode; label: string; value: string; valueClassName?: string }) {
  return (
    <div className="detail-stat">
      <span className="detail-stat-icon">{icon}</span>
      <span>
        <span className="detail-stat-label">{label}</span>
        <span className={`detail-stat-value ${valueClassName ?? ""}`.trim()}>{value}</span>
      </span>
    </div>
  );
}

function EventCard({
  event,
  onOpen,
  shortDateFormatter,
}: {
  event: EventRecord;
  onOpen: () => void;
  shortDateFormatter: Intl.DateTimeFormat;
}) {
  const remaining = event.places;

  return (
    <button className="event-card" type="button" onClick={onOpen}>
      <div className="card-top">
        <span className="card-date">{formatDayLabel(event.date, shortDateFormatter)}</span>
        <Badge visibility={event.visibility} />
      </div>

      <h3>{event.title}</h3>

      <div className="card-meta">
        <div className="meta-row">
          <Icon name="pin" />
          <span>{event.location}</span>
        </div>
        <div className="meta-row">
          <Icon name="clock" />
          <span>
            {event.time || "À définir"} · {formatPrice(event.price)}
          </span>
        </div>
        <div className="meta-row">
          <Icon name="users" />
          <span className={`spots ${remaining <= 10 ? "low" : ""}`}>{remaining > 0 ? `${remaining} places disponibles` : "Complet"}</span>
        </div>
      </div>
    </button>
  );
}

function AuthScreen({
  onAuthenticate,
  error,
  isLoading,
}: {
  onAuthenticate: (email: string, password: string) => Promise<void>;
  error: string;
  isLoading: boolean;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onAuthenticate(email, password);
  }

  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <div className="brand-row">
          <span className="brand-mark">B</span>
          <div>
            <div className="brand-name">BDE Epitech Réunion</div>
            <div className="brand-subtitle">Accès interne réservé aux membres autorisés</div>
          </div>
        </div>

        <h1>Connexion</h1>

        {error ? <div className="form-error">{error}</div> : null}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <FieldLabel>Email</FieldLabel>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="prenom.nom@epitech.eu"
              autoComplete="email"
            />
          </div>

          <div className="field">
            <FieldLabel>Mot de passe</FieldLabel>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          <button className="btn btn-primary btn-full" type="submit" disabled={isLoading}>
            {isLoading ? "Connexion..." : "Se connecter"}
          </button>
        </form>
      </section>
    </main>
  );
}

function Navbar({ view, onNavigate, onLogout }: { view: View; onNavigate: (next: View) => void; onLogout: () => void }) {
  const items: Array<{ id: View; label: string }> = [
    { id: "home", label: "Accueil" },
    { id: "planning", label: "Planning" },
  ];

  return (
    <header className="nav">
      <div className="wrap nav-inner">
        <button className="brand-button" type="button" onClick={() => onNavigate("home")}>
          <span className="brand-mark">B</span>
          <span className="brand-name">BDE Epitech Réunion</span>
        </button>

        <nav className="nav-links" aria-label="Navigation principale">
          {items.map((item) => (
            <button key={item.id} className={`nav-link ${view === item.id ? "active" : ""}`} type="button" onClick={() => onNavigate(item.id)}>
              {item.label}
            </button>
          ))}
          <button className="btn btn-primary nav-cta" type="button" onClick={() => onNavigate("create")}>Créer un événement</button>
          <button className="nav-link" type="button" onClick={onLogout}>Déconnexion</button>
        </nav>
      </div>
    </header>
  );
}

function HomeView({ eventCount, featuredEvents, onOpenEvent, onNavigate, shortDateFormatter }: { eventCount: number; featuredEvents: EventRecord[]; onOpenEvent: (id: string) => void; onNavigate: (next: View) => void; shortDateFormatter: Intl.DateTimeFormat; }) {
  return (
    <>
      <section className="hero">
        <div className="wrap hero-grid">
          <div>
            <span className="hero-tag">Bureau Des Étudiants · Epitech Réunion</span>
            <h1>Le planning du BDE, clair, rapide et réservé aux membres.</h1>
            <p>
              Le site centralise la connexion interne, la consultation des événements et la création d&apos;un nouveau rendez-vous avec son déroulé et ses activités.
            </p>

            <div className="hero-actions">
              <button className="btn btn-primary" type="button" onClick={() => onNavigate("planning")}>
                Voir le planning <Icon name="arrow" />
              </button>
              <button className="btn" type="button" onClick={() => onNavigate("create")}>
                Proposer un événement
              </button>
            </div>
          </div>

          <aside className="hero-aside">
            <div className="stat-card">
              <span className="stat-value">{eventCount}</span>
              <span className="stat-label">événement(s) en base</span>
            </div>
            <div className="stat-card stat-card-soft">
              <span className="stat-value">Supabase</span>
              <span className="stat-label">auth et données à brancher ensuite</span>
            </div>
          </aside>
        </div>
      </section>

      <section className="block">
        <div className="wrap">
          <div className="section-head">
            <div>
              <div className="eyebrow">À ne pas manquer</div>
              <h2>Les prochains événements</h2>
            </div>
            <button className="btn btn-small" type="button" onClick={() => onNavigate("planning")}>
              Tout voir
            </button>
          </div>

          {featuredEvents.length > 0 ? (
            <div className="grid-3">
              {featuredEvents.map((event) => (
                <EventCard key={event.id} event={event} shortDateFormatter={shortDateFormatter} onOpen={() => onOpenEvent(event.id)} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              Aucun événement pour le moment. Créez le premier rendez-vous du BDE depuis le formulaire.
            </div>
          )}
        </div>
      </section>
    </>
  );
}

function PlanningView({ events, filter, onFilterChange, onOpenEvent, shortDateFormatter }: { events: EventRecord[]; filter: "all" | Visibility; onFilterChange: (next: "all" | Visibility) => void; onOpenEvent: (id: string) => void; shortDateFormatter: Intl.DateTimeFormat; }) {
  const filters: Array<{ id: "all" | Visibility; label: string }> = [
    { id: "all", label: "Tous" },
    { id: "public", label: "Public" },
    { id: "prive", label: "Privé" },
  ];

  const shownEvents = events.filter((event) => filter === "all" || event.visibility === filter);

  return (
    <section className="block">
      <div className="wrap">
        <div className="section-head">
          <div>
            <div className="eyebrow">Agenda du BDE</div>
            <h2>Planning des événements</h2>
          </div>

          <div className="filters" role="tablist" aria-label="Filtres d'événements">
            {filters.map((item) => (
              <button
                key={item.id}
                className={`pill ${filter === item.id ? "active" : ""}`}
                type="button"
                onClick={() => onFilterChange(item.id)}
                aria-pressed={filter === item.id}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {shownEvents.length > 0 ? (
          <div className="list-grid">
            {shownEvents.map((event) => (
              <EventCard key={event.id} event={event} shortDateFormatter={shortDateFormatter} onOpen={() => onOpenEvent(event.id)} />
            ))}
          </div>
        ) : (
          <div className="empty-state">Aucun événement pour le moment.</div>
        )}
      </div>
    </section>
  );
}

function EventDetailView({ event, onBack, longDateFormatter }: { event: EventRecord | undefined; onBack: () => void; longDateFormatter: Intl.DateTimeFormat; }) {
  if (!event) {
    return (
      <section className="block">
        <div className="wrap">
          <div className="empty-state">L&apos;événement demandé est introuvable.</div>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="detail-head">
        <div className="wrap">
          <button className="back-link" type="button" onClick={onBack}>
            <Icon name="back" /> Retour au planning
          </button>

          <div className="detail-meta-row">
            <Badge visibility={event.visibility} />
            <span className="muted-text">{formatDayLabel(event.date, longDateFormatter)} · {event.time || "À définir"}</span>
          </div>

          <h1>{event.title}</h1>
        </div>
      </section>

      <section className="wrap detail-grid">
        <div className="prose">
          <h3>À propos</h3>
          <p>{event.description || "Aucune description fournie."}</p>

          <h3>Déroulé</h3>
          {event.schedule.length > 0 ? (
            <div className="timeline">
              {event.schedule.map((step, index) => (
                <div className="timeline-item" key={`${step.time}-${index}`}>
                  <div className="timeline-time">{step.time || "--:--"}</div>
                  <div className="timeline-body">
                    <p>{step.description || "Étape à définir."}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-inline">Déroulé à compléter.</div>
          )}

          <h3>Activités prévues</h3>
          {event.activities.length > 0 ? (
            <div className="tags">
              {event.activities.map((activity) => (
                <span className="tag" key={activity}>
                  {activity}
                </span>
              ))}
            </div>
          ) : (
            <div className="empty-inline">Aucune activité renseignée.</div>
          )}
        </div>

        <aside>
          <div className="info-card">
            <DetailStat icon={<Icon name="calendar" />} label="Date" value={formatLongDate(event.date, longDateFormatter)} />
            <DetailStat icon={<Icon name="clock" />} label="Heure" value={event.time || "À définir"} />
            <DetailStat icon={<Icon name="pin" />} label="Lieu" value={event.location || "À définir"} />
            <DetailStat icon={<Icon name="euro" />} label="Tarif" value={formatPrice(event.price)} valueClassName={event.price === 0 ? "price-free" : ""} />
            <DetailStat icon={<Icon name="users" />} label="Places" value={`${event.places} disponibles`} />

            <button className="btn btn-primary btn-full detail-cta" type="button" disabled>
              Inscription désactivée
            </button>
            <p className="detail-note">Inscription non disponible pour le moment.</p>
          </div>
        </aside>
      </section>
    </>
  );
}

function CreateEventView({
  onCreate,
  onCancel,
  saving,
}: {
  onCreate: (event: EventRecord) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([{ time: "", description: "" }]);
  const [activities, setActivities] = useState<string[]>([]);
  const [activityInput, setActivityInput] = useState("");
  const [error, setError] = useState("");

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateSchedule(index: number, key: keyof ScheduleItem, value: string) {
    setSchedule((current) => current.map((step, stepIndex) => (stepIndex === index ? { ...step, [key]: value } : step)));
  }

  function addScheduleStep() {
    setSchedule((current) => [...current, { time: "", description: "" }]);
  }

  function removeScheduleStep(index: number) {
    setSchedule((current) => current.filter((_, stepIndex) => stepIndex !== index));
  }

  function addActivity() {
    const value = activityInput.trim();

    if (!value || activities.includes(value)) {
      setActivityInput("");
      return;
    }

    setActivities((current) => [...current, value]);
    setActivityInput("");
  }

  function removeActivity(index: number) {
    setActivities((current) => current.filter((_, activityIndex) => activityIndex !== index));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.title.trim()) {
      setError("Le titre est obligatoire.");
      return;
    }

    if (!form.date) {
      setError("La date est obligatoire.");
      return;
    }

    const places = Number(form.places);

    if (!Number.isFinite(places) || places <= 0) {
      setError("Indiquez un nombre de places valide.");
      return;
    }

    const createdEvent: EventRecord = {
      id: createId(),
      title: form.title.trim(),
      date: form.date,
      time: form.time.trim(),
      location: form.location.trim(),
      description: form.description.trim(),
      price: Number(form.price) || 0,
      places,
      visibility: form.visibility,
      schedule: schedule.filter((step) => step.time.trim() || step.description.trim()),
      activities,
    };

    setError("");
    await onCreate(createdEvent);
  }

  return (
    <section className="wrap form-shell">
      <button className="back-link" type="button" onClick={onCancel}>
        <Icon name="back" /> Annuler
      </button>

      <div className="page-kicker">Nouvel événement</div>
      <h2>Créer un événement</h2>

      {error ? <div className="form-error">{error}</div> : null}

      <form onSubmit={handleSubmit}>
        <div className="field">
          <FieldLabel>Titre <span className="req">*</span></FieldLabel>
          <input
            className="input"
            value={form.title}
            onChange={(event) => updateField("title", event.target.value)}
            placeholder="Ex : Soirée d'intégration"
          />
        </div>

        <div className="field-row-3">
          <div className="field">
            <FieldLabel>Date <span className="req">*</span></FieldLabel>
            <input className="input" type="date" value={form.date} onChange={(event) => updateField("date", event.target.value)} />
          </div>

          <div className="field">
            <FieldLabel>Heure</FieldLabel>
            <input className="input" type="time" value={form.time} onChange={(event) => updateField("time", event.target.value)} />
          </div>

          <div className="field">
            <FieldLabel>Places <span className="req">*</span></FieldLabel>
            <input className="input" type="number" min="1" value={form.places} onChange={(event) => updateField("places", event.target.value)} placeholder="50" />
          </div>
        </div>

        <div className="field">
          <FieldLabel>Lieu</FieldLabel>
          <input className="input" value={form.location} onChange={(event) => updateField("location", event.target.value)} placeholder="Campus Epitech, Sainte-Clotilde" />
        </div>

        <div className="field">
          <FieldLabel>Description</FieldLabel>
          <textarea
            className="textarea"
            value={form.description}
            onChange={(event) => updateField("description", event.target.value)}
            placeholder="Présentez l'événement en quelques lignes…"
          />
        </div>

        <div className="field-row">
          <div className="field">
            <FieldLabel>Tarif (€)</FieldLabel>
            <input className="input" type="number" min="0" value={form.price} onChange={(event) => updateField("price", event.target.value)} />
            <div className="field-hint">Mettez 0 pour un événement gratuit.</div>
          </div>

          <div className="field">
            <FieldLabel>Visibilité</FieldLabel>
            <div className="segmented-control" role="group" aria-label="Visibilité de l'événement">
              <button className={`segmented-option ${form.visibility === "public" ? "active" : ""}`} type="button" onClick={() => updateField("visibility", "public")}>
                <span className="segmented-title">Public</span>
                <span className="segmented-desc">Ouvert à tous</span>
              </button>
              <button className={`segmented-option ${form.visibility === "prive" ? "active" : ""}`} type="button" onClick={() => updateField("visibility", "prive")}>
                <span className="segmented-title">Privé</span>
                <span className="segmented-desc">Membres BDE</span>
              </button>
            </div>
          </div>
        </div>

        <fieldset className="fieldset">
          <legend>Déroulé</legend>
          <p>Ajoutez les étapes de l&apos;événement, heure par heure.</p>

          {schedule.map((step, index) => (
            <div className="step-row" key={index}>
              <input className="input" placeholder="Heure" value={step.time} onChange={(event) => updateSchedule(index, "time", event.target.value)} />
              <input className="input" placeholder="Description de l'étape" value={step.description} onChange={(event) => updateSchedule(index, "description", event.target.value)} />
              <button className="icon-button" type="button" onClick={() => removeScheduleStep(index)} disabled={schedule.length === 1} aria-label="Supprimer une étape">
                <Icon name="trash" />
              </button>
            </div>
          ))}

          <button className="btn btn-small" type="button" onClick={addScheduleStep}>
            <Icon name="plus" /> Ajouter une étape
          </button>
        </fieldset>

        <fieldset className="fieldset">
          <legend>Activités prévues</legend>
          <p>Ajoutez des mots-clés pour décrire ce qui est prévu.</p>

          <div className="tag-input-row">
            <input className="input" placeholder="Ex : Blind test" value={activityInput} onChange={(event) => setActivityInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addActivity(); } }} />
            <button className="btn" type="button" onClick={addActivity}>
              <Icon name="plus" /> Ajouter
            </button>
          </div>

          {activities.length > 0 ? (
            <div className="tags tag-list">
              {activities.map((activity, index) => (
                <span className="tag-removable" key={activity}>
                  {activity}
                  <button type="button" onClick={() => removeActivity(index)} aria-label={`Retirer ${activity}`}>
                    <Icon name="close" />
                  </button>
                </span>
              ))}
            </div>
          ) : null}
        </fieldset>

        <div className="form-actions">
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? "Publication..." : "Publier l'événement"}
          </button>
          <button className="btn" type="button" onClick={onCancel}>
            Annuler
          </button>
        </div>
      </form>
    </section>
  );
}

export default function App() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authLoading, setAuthLoading] = useState(hasSupabaseConfig);
  const [authError, setAuthError] = useState("");
  const [view, setView] = useState<View>("home");
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | Visibility>("all");
  const [eventsError, setEventsError] = useState("");
  const [savingEvent, setSavingEvent] = useState(false);
  const formatters = useFormatters();

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return;
    }

    const client = supabase;

    let active = true;

    async function loadSession() {
      const { data, error } = await client.auth.getSession();

      if (!active) {
        return;
      }

      if (error) {
        setAuthError(error.message);
      }

      setUserEmail(data.session?.user.email ?? null);
      setAuthLoading(false);
    }

    const { data } = client.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user.email ?? null);
      setAuthLoading(false);
    });

    loadSession();

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    const client = supabase;

    let active = true;

    async function loadEvents() {
      const { data, error } = await client
        .from("events")
        .select("id, title, date, time, location, description, price, places, visibility, schedule, activities")
        .order("date", { ascending: true });

      if (!active) {
        return;
      }

      if (error) {
        setEventsError(error.message);
        setEvents([]);
        return;
      }

      setEventsError("");
      setEvents(
        (data ?? []).map((row) => ({
          id: String(row.id),
          title: row.title ?? "Sans titre",
          date: row.date ?? "",
          time: row.time ?? "",
          location: row.location ?? "",
          description: row.description ?? "",
          price: Number(row.price ?? 0),
          places: Number(row.places ?? 0),
          visibility: (row.visibility ?? "public") as Visibility,
          schedule: Array.isArray(row.schedule) ? (row.schedule as ScheduleItem[]) : [],
          activities: Array.isArray(row.activities) ? (row.activities as string[]) : [],
        })),
      );
    }

    loadEvents();

    return () => {
      active = false;
    };
  }, []);

  const sortedEvents = useMemo(
    () => [...events].sort((left, right) => left.date.localeCompare(right.date)),
    [events],
  );

  const selectedEvent = useMemo(
    () => events.find((event) => event.id === selectedEventId),
    [events, selectedEventId],
  );

  function navigate(nextView: View) {
    setView(nextView);
    if (nextView !== "detail") {
      setSelectedEventId(null);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openEvent(id: string) {
    setSelectedEventId(id);
    setView("detail");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function logout() {
    if (supabase) {
      await supabase.auth.signOut();
    }

    setUserEmail(null);
    setView("home");
    setSelectedEventId(null);
  }

  async function handleCreate(event: EventRecord) {
    setSavingEvent(true);

    let nextEvent = event;

    if (supabase) {
      const { data, error } = await supabase
        .from("events")
        .insert({
          title: event.title,
          date: event.date,
          time: event.time,
          location: event.location,
          description: event.description,
          price: event.price,
          places: event.places,
          visibility: event.visibility,
          schedule: event.schedule,
          activities: event.activities,
        })
        .select("id, title, date, time, location, description, price, places, visibility, schedule, activities")
        .single();

      if (error) {
        setEventsError(error.message);
        setSavingEvent(false);
        return;
      }

      if (data) {
        nextEvent = {
          id: String(data.id),
          title: data.title ?? event.title,
          date: data.date ?? event.date,
          time: data.time ?? event.time,
          location: data.location ?? event.location,
          description: data.description ?? event.description,
          price: Number(data.price ?? event.price),
          places: Number(data.places ?? event.places),
          visibility: (data.visibility ?? event.visibility) as Visibility,
          schedule: Array.isArray(data.schedule) ? (data.schedule as ScheduleItem[]) : event.schedule,
          activities: Array.isArray(data.activities) ? (data.activities as string[]) : event.activities,
        };
      }
    }

    setEvents((current) => [nextEvent, ...current]);
    setSelectedEventId(nextEvent.id);
    setView("detail");
    setSavingEvent(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleAuthenticate(email: string, password: string) {
    const normalizedEmail = email.trim().toLowerCase();

    setAuthError("");

    if (!normalizedEmail || !password.trim()) {
      setAuthError("Email et mot de passe requis.");
      return;
    }

    setAuthSubmitting(true);

    if (supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (error) {
        setAuthError(error.message);
        setAuthSubmitting(false);
        return;
      }

      setUserEmail(data.user?.email ?? data.session?.user.email ?? normalizedEmail);
      setAuthSubmitting(false);
      return;
    }

    if (allowedEmails.length > 0 && !allowedEmails.includes(normalizedEmail)) {
      setAuthError("Cet email n'est pas encore autorisé pour le BDE.");
      setAuthSubmitting(false);
      return;
    }

    setUserEmail(normalizedEmail);
    setAuthSubmitting(false);
  }

  if (authLoading) {
    return (
      <main className="auth-shell">
        <section className="auth-panel">
          <div className="brand-row">
            <span className="brand-mark">B</span>
            <div>
              <div className="brand-name">BDE Epitech Réunion</div>
              <div className="brand-subtitle">Chargement de la session...</div>
            </div>
          </div>
          <p>Connexion à Supabase en cours.</p>
        </section>
      </main>
    );
  }

  if (!userEmail) {
    return <AuthScreen onAuthenticate={handleAuthenticate} error={authError} isLoading={authSubmitting} />;
  }

  return (
    <div className="app-shell">
      <Navbar view={view} onNavigate={navigate} onLogout={logout} />

      {eventsError ? (
        <div className="wrap" style={{ paddingTop: 18 }}>
          <div className="form-error">{eventsError}</div>
        </div>
      ) : null}

      {view === "home" ? (
        <HomeView
          eventCount={events.length}
          featuredEvents={sortedEvents.slice(0, 3)}
          onOpenEvent={openEvent}
          onNavigate={navigate}
          shortDateFormatter={formatters.shortDate}
        />
      ) : null}

      {view === "planning" ? (
        <PlanningView
          events={sortedEvents}
          filter={filter}
          onFilterChange={setFilter}
          onOpenEvent={openEvent}
          shortDateFormatter={formatters.shortDate}
        />
      ) : null}

      {view === "detail" ? <EventDetailView event={selectedEvent} onBack={() => navigate("planning")} longDateFormatter={formatters.longDate} /> : null}

      {view === "create" ? <CreateEventView onCreate={handleCreate} onCancel={() => navigate("planning")} saving={savingEvent} /> : null}

      <footer className="footer wrap">
        <span>BDE Epitech Réunion</span>
        <span>{events.length} événement(s)</span>
      </footer>
    </div>
  );
}
