import { useEffect, useState } from 'react'
import { CloseIcon } from './Icons'
import { TTL_MINUTES } from './lib'

// ---------------------------------------------------------------------------
// FILL THESE IN before going public. The GDPR (art. 13) requires the identity
// and contact details of whoever runs the service (the "data controller").
// ---------------------------------------------------------------------------
const CONTROLLER = {
  name: '[Nome e cognome o ragione sociale]',
  address: '[Indirizzo completo]',
  email: '[email per richieste privacy]',
}
// Company hosting the server. It acts as data processor (art. 28 GDPR).
const HOSTING = '[Nome del fornitore di hosting e paese dei server]'
// Change this if VITE_TILE_URL points to a different map tile provider.
const TILE_PROVIDER = {
  name: 'OpenStreetMap Foundation (United Kingdom)',
  policy: 'https://osmfoundation.org/wiki/Privacy_Policy',
}
const LAST_UPDATED = '1 November 2026'
const MAX_LIFETIME_MINUTES = 60

export const LEGAL_TABS = [
  { id: 'privacy', label: 'Privacy' },
  { id: 'cookies', label: 'Cookies' },
  { id: 'terms', label: 'Terms of use' },
]

const H = ({ children }) => <h3 className="mt-5 mb-1 font-display text-lg font-semibold">{children}</h3>
const P = ({ children }) => <p className="mt-2 text-base">{children}</p>
const L = ({ items }) => (
  <ul className="mt-2 list-disc space-y-1 pl-5 text-base">
    {items.map((t, i) => (
      <li key={i}>{t}</li>
    ))}
  </ul>
)
const A = ({ href, children }) => (
  <a href={href} target="_blank" rel="noreferrer" className="underline">
    {children}
  </a>
)

function Summary() {
  return (
    <div className="mt-3 rounded-md border border-line bg-ground p-3 text-base">
      <p className="font-semibold">In short</p>
      <L
        items={[
          'No account, no name, no email, no phone number, no device ID.',
          'Your position stays on your phone. It is sent only when you tap a report button, as the place of that report.',
          `Reports are anonymous and are deleted after ${TTL_MINUTES} minutes (${MAX_LIFETIME_MINUTES} at most).`,
          'No cookies, no analytics, no advertising, no tracking.',
          'Reports come from other drivers and may be wrong. Never use the app with your hands while driving.',
        ]}
      />
    </div>
  )
}

function Privacy() {
  return (
    <>
      <P>
        Information notice under articles 13 and 14 of Regulation (EU) 2016/679 (GDPR) and Legislative Decree
        196/2003 (Italian Privacy Code).
      </P>

      <H>1. Who is responsible</H>
      <P>
        The data controller is {CONTROLLER.name}, {CONTROLLER.address}. Contact: {CONTROLLER.email}.
      </P>

      <H>2. What data is processed and why</H>
      <P>
        <strong>Your position.</strong> It is read by your browser, only after you allow it, and used on your
        phone to show the map around you and to check whether a report is close. It is not sent to our server
        and is not stored. To download reports, the app asks for a wide area (a square of about 33 × 33 km)
        that contains you, not your exact position.
      </P>
      <P>
        <strong>Reports you send.</strong> When you tap a report button the server receives and stores: the
        type of report, the place (your position or the spot you chose, rounded to about 11 m), the time, and
        the number of confirmations and “gone” votes. A report is not linked to you, to your device or to any
        other report. Purpose: to show the report to other drivers. Legal basis: providing the service you
        ask for (art. 6(1)(b) GDPR).
      </P>
      <P>
        <strong>IP address.</strong> Like any website, the server sees your IP address in order to reply. It
        is not written to logs. When you send a report or a vote, it is kept in memory for at most 60 seconds
        to limit abuse (max a few reports per minute), then discarded. Legal basis: our legitimate interest in
        keeping the service safe and working (art. 6(1)(f) GDPR).
      </P>
      <P>
        <strong>Settings.</strong> Alert distance, sound, vibration and theme are saved only in your browser
        (see Cookies).
      </P>
      <P>
        We do not create profiles, make automated decisions about you (art. 22 GDPR), use your data for
        marketing, or sell it.
      </P>

      <H>3. How long it is kept</H>
      <L
        items={[
          `Reports: ${TTL_MINUTES} minutes, extended each time a driver confirms them, never more than ${MAX_LIFETIME_MINUTES} minutes. Then they are permanently deleted.`,
          'IP address for abuse protection: up to 60 seconds, in memory only.',
          'Server access logs: none.',
          'Position: never stored on our side.',
        ]}
      />

      <H>4. Who else receives data</H>
      <P>
        <strong>Map tiles.</strong> The map images are loaded directly by your browser from {TILE_PROVIDER.name}.
        That provider receives your IP address, your browser type and which map areas you view, and processes
        them as an independent controller under its own{' '}
        <A href={TILE_PROVIDER.policy}>privacy policy</A>. The United Kingdom benefits from an adequacy decision
        of the European Commission (art. 45 GDPR).
      </P>
      <P>
        <strong>Hosting.</strong> {HOSTING}, acting as data processor under art. 28 GDPR.
      </P>
      <P>
        Data may be disclosed to public authorities only where required by law. Reports are public: anyone
        using the app can see them.
      </P>

      <H>5. Do you have to give data?</H>
      <P>
        No. You can view the map without sharing your position. Without it, alerts and sending reports do not
        work. You can withdraw location and notification permissions at any time in your browser settings.
      </P>

      <H>6. Your rights</H>
      <P>
        You have the right to access, correct and erase your data, to restrict or object to its processing and
        to data portability (articles 15–22 GDPR), by writing to {CONTROLLER.email}. Since reports are
        anonymous and short-lived, we may be unable to identify which ones are yours (art. 11 GDPR); if you
        give us enough detail we will do our best. You also have the right to lodge a complaint with the
        Garante per la protezione dei dati personali (<A href="https://www.garanteprivacy.it">
          www.garanteprivacy.it
        </A>) or with the authority of your EU country (art. 77 GDPR).
      </P>

      <H>7. Changes</H>
      <P>If this notice changes, the new version will be published here with a new date.</P>
    </>
  )
}

function Cookies() {
  return (
    <>
      <P>
        <strong>RoadWatch does not use cookies.</strong> No technical, analytics, profiling or third-party
        cookies, no tracking pixels, no fingerprinting. For this reason no cookie banner is shown.
      </P>
      <P>
        Art. 122 of the Italian Privacy Code and the Garante’s Guidelines of 10 June 2021 also cover other ways
        of storing information on your device. RoadWatch uses only these, which are strictly necessary for the
        service you request and therefore need no consent:
      </P>
      <L
        items={[
          <>
            <strong>Local storage “rw.settings”</strong>: your preferences (alert distance, sound, vibration,
            screen, theme). It stays in your browser, is never sent to us, and has no expiry until you delete it.
          </>,
          <>
            <strong>Service worker</strong>: a small script needed to show alert notifications. It stores no data
            and caches nothing.
          </>,
        ]}
      />
      <P>
        You can delete both at any time by clearing this site’s data in your browser settings. The map tile
        provider may set its own cookies or use similar tools; see its privacy policy linked in the Privacy
        section.
      </P>
    </>
  )
}

function Terms() {
  return (
    <>
      <P>By using RoadWatch you accept these terms. If you do not accept them, please do not use the app.</P>

      <H>1. What the service is</H>
      <P>
        RoadWatch is a free service where drivers share short-lived, anonymous reports about obstacles, police,
        accidents and hazards. The reports are for information only.
      </P>

      <H>2. Reports may be wrong</H>
      <P>
        Reports are made by other users and are not checked by us. They can be inaccurate, late, out of date or
        missing. The absence of a report does not mean the road is clear. Always follow road signs, the traffic
        rules and the instructions of the police, which prevail over anything shown in the app.
      </P>

      <H>3. Safety while driving</H>
      <P>
        Do not hold or operate your phone while driving: art. 173 of the Italian Highway Code (Codice della
        Strada) prohibits it and provides for fines and licence points deductions. Use RoadWatch only when the
        vehicle is stopped safely, through a hands-free mount, or let a passenger use it. Keep your eyes on the
        road: alerts are a support, not a substitute for your attention.
      </P>

      <H>4. Not an emergency service</H>
      <P>
        RoadWatch does not notify the authorities or emergency services. In an emergency call <strong>112</strong>.
      </P>

      <H>5. What you must not do</H>
      <L
        items={[
          'Send false, misleading or joke reports.',
          'Use the service to obstruct police activity or to commit or facilitate any offence.',
          'Flood the service with requests, scrape it, or try to bypass its limits or security.',
        ]}
      />
      <P>
        You are responsible for the reports you send. False reports can cause danger to others and may give
        rise to civil or criminal liability.
      </P>

      <H>6. Availability</H>
      <P>
        The service is provided “as is”, free of charge, and may be interrupted, changed or discontinued at
        any time, without notice. Reports may be removed at any time.
      </P>

      <H>7. Liability</H>
      <P>
        To the extent permitted by law, the operator is not liable for damage resulting from the use of, or
        inability to use, the service or from the content of reports. This does not exclude or limit liability
        for wilful misconduct or gross negligence (art. 1229 of the Italian Civil Code), or any right you have
        as a consumer under Legislative Decree 206/2005 (Consumer Code).
      </P>

      <H>8. Map data</H>
      <P>
        Map data © <A href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</A>, available
        under the Open Database License.
      </P>

      <H>9. Law and courts</H>
      <P>
        These terms are governed by Italian law. If you are a consumer, the court of the place where you live
        has jurisdiction (art. 66-bis Consumer Code); you also keep the protections of the mandatory laws of
        your country of residence.
      </P>

      <H>10. Changes</H>
      <P>We may update these terms. The current version, with its date, is always available here.</P>
    </>
  )
}

export default function LegalSheet({ initialTab = 'privacy', onClose }) {
  const [tab, setTab] = useState(initialTab)

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-40 flex items-end bg-black/50" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Privacy, cookies and terms of use"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92dvh] w-full flex-col border-t border-line bg-panel text-ink"
      >
        <div className="shrink-0 px-4 pt-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl font-bold">Information</h2>
            <button type="button" onClick={onClose} aria-label="Close" className="grid h-11 w-11 place-items-center">
              <CloseIcon className="h-6 w-6" />
            </button>
          </div>
          <div role="tablist" className="mt-2 grid grid-cols-3 overflow-hidden rounded-md border border-line">
            {LEGAL_TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={`h-11 border-l border-line px-2 text-base font-medium first:border-l-0 ${
                  tab === t.id ? 'bg-ink text-ground' : 'bg-panel text-ink'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div
          key={tab}
          role="tabpanel"
          className="min-h-0 flex-1 overflow-y-auto px-4"
          style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
        >
          <Summary />
          {tab === 'privacy' && <Privacy />}
          {tab === 'cookies' && <Cookies />}
          {tab === 'terms' && <Terms />}
          <p className="mt-6 text-sm text-mute">Last updated: {LAST_UPDATED}</p>
        </div>
      </section>
    </div>
  )
}
