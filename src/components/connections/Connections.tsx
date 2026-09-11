"use client";

import { useId, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { CopyButton } from "@/components/CopyButton";
import { Icon } from "@/components/Icon";
import { Notice } from "@/components/Notice";
import { connectors, connectorForName, type Connector } from "./catalog";
import { AgentLogo } from "./AgentLogo";
import { ApproveForm, DisconnectForm, InviteForm, MemberDetails, type ConnectionMember } from "./ConnectionForms";
import { resetInviteLink } from "@/app/actions";
import { directoryForName, directoryLogoSrc, searchDirectory, type DirectoryAgent } from "./directory";
import styles from "./connections.module.css";

export function Connections({
  members,
  address,
  highwayInviteUrl,
  droppedThisWeek,
  error,
  sent,
  reset,
}: {
  members: ConnectionMember[];
  address: string;
  highwayInviteUrl: string;
  droppedThisWeek: number;
  error?: string;
  sent?: string;
  reset?: string;
}) {
  const [customOpen, setCustomOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [pick, setPick] = useState<DirectoryAgent | null>(null);
  const results = searchDirectory(query);
  const searchId = useId();
  // Presets reuse persisted member names. Additional instances stay visible below.
  const matches = new Map(
    connectors.map((c) => [
      c.id,
      members.find((m) => !m.isOwner && m.kind === "AGENT" && connectorForName(m.name)?.id === c.id),
    ]),
  );
  const matchedIds = new Set([...matches.values()].filter(Boolean).map((m) => m!.id));
  const others = members.filter((m) => !m.isOwner && !matchedIds.has(m.id));
  const owner = members.find((m) => m.isOwner);
  const active = members.filter((m) => !m.isOwner && m.status === "ACTIVE").length;
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>Connections</h1>
        </div>
        <span className={styles.connectedCount}>
          <span />
          {active} connected
        </span>
      </header>
      <div className={styles.content}>
        {error && <Notice tone="error">{error}</Notice>}
        {sent && <Notice tone="ok">Invitation sent again.</Notice>}
        {reset && <Notice tone="ok">New invite link. The old one no longer works.</Notice>}
        <div className={styles.address}>
          <Icon name="mail" />
          <div>
            <span>Shared inbox</span>
            <p>{address}</p>
          </div>
          <CopyButton value={address} />
        </div>
        <p className={styles.helper}>Every connected agent receives messages sent to this address.</p>
        <div className={styles.address}>
          <Icon name="arrow" />
          <div>
            <span>Invite link</span>
            <p>{highwayInviteUrl}</p>
          </div>
          <CopyButton value={highwayInviteUrl} label="Copy invite link" />
          <form action={resetInviteLink}>
            <button type="submit" className={styles.resetLink} title="Make a new link; the old one stops working">
              Reset
            </button>
          </form>
        </div>
        <p className={styles.helper}>
          Send the invite link to any agent. They enter their name and email address, and you approve them here.
        </p>
        <div className={styles.finder}>
          <label htmlFor={searchId}>Find an agent</label>
          <div className={styles.finderBox}>
            <Icon name="search" width={17} height={17} />
            <input
              id={searchId}
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPick(null);
              }}
              placeholder="Search the agent directory, e.g. Instinct, travel, finance"
              autoComplete="off"
            />
          </div>
          {results.length > 0 && !pick && (
            <ul className={styles.results} role="listbox" aria-label="Agents">
              {results.map((agent) => (
                <li key={agent.slug}>
                  <button type="button" role="option" aria-selected={false} onClick={() => setPick(agent)}>
                    <DirectoryLogo agent={agent} size={34} />
                    <span>
                      <strong>{agent.name}</strong>
                      <small>{agent.tagline}</small>
                    </span>
                    {agent.categories[0] && <em>{agent.categories[0]}</em>}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {query.trim().length >= 2 && results.length === 0 && !pick && (
            <p className={styles.noResults}>
              Not in the directory. Use “Add connection” below with any email address.
            </p>
          )}
          {pick && (
            <InviteForm
              preset={{ name: pick.name, role: pick.tagline ? `My ${pick.tagline.replace(/^(an?|the|your)\s+/i, "").toLowerCase()}` : "", website: pick.website }}
              onCancel={() => setPick(null)}
            />
          )}
        </div>
        <div className={styles.catalog}>
          {connectors.map((connector) => (
            <ConnectionRow
              key={`${connector.id}-${matches.get(connector.id)?.id ?? "new"}-${matches.get(connector.id)?.status ?? "off"}`}
              connector={connector}
              member={matches.get(connector.id)}
            />
          ))}
        </div>
        <div className={styles.custom}>
          <div>
            <Icon name="members" />
            <div>
              <h2>Have another agent?</h2>
            </div>
          </div>
          <button type="button" aria-expanded={customOpen} onClick={() => setCustomOpen(!customOpen)}>
            {customOpen ? "Close" : "Add connection"}
            <span aria-hidden="true">{customOpen ? "−" : "+"}</span>
          </button>
        </div>
        {customOpen && <InviteForm onCancel={() => setCustomOpen(false)} />}
        {others.length > 0 && (
          <section className={styles.other}>
            <h2>Other connections</h2>
            {others.map((member) => (
              <ConnectionRow key={`${member.id}-${member.status}`} member={member} />
            ))}
          </section>
        )}
        {owner && (
          <div className={styles.owner}>
            <Avatar name={owner.name} kind="PERSON" size={32} />
            <div>
              <strong>
                {owner.name}
                <span>You · Owner</span>
              </strong>
              <p>{owner.email}</p>
            </div>
            <Icon name="eye" width={17} height={17} />
          </div>
        )}
        {droppedThisWeek > 0 && (
          <p className={styles.privacy}>
            {droppedThisWeek} messages from non-members or unauthenticated senders were dropped this week.
          </p>
        )}
      </div>
    </div>
  );
}

function DirectoryLogo({ agent, size = 44 }: { agent: DirectoryAgent; size?: number }) {
  const src = directoryLogoSrc(agent);
  if (!src) return <Avatar name={agent.name} kind="AGENT" size={size} />;
  return (
    <span className={styles.logo} style={{ width: size, height: size }}>
      {/* Logos come from the directory scrape at 128px; plain img keeps them out of the optimizer. */}
      <img src={src} alt="" width={size} height={size} />
    </span>
  );
}

function ConnectionRow({ connector, member }: { connector?: Connector; member?: ConnectionMember }) {
  const [panel, setPanel] = useState<"invite" | "details" | "disconnect" | null>(null);
  const statusId = useId();
  const name = connector?.name ?? member!.name;
  const connected = member?.status === "ACTIVE";
  const pending = member?.status === "PENDING";
  const listed = !connector && member?.kind === "AGENT" ? directoryForName(member.name) : undefined;
  return (
    <section className={styles.connection}>
      <div className={styles.row}>
        {connector ? (
          <AgentLogo connector={connector} />
        ) : listed ? (
          <DirectoryLogo agent={listed} />
        ) : (
          <Avatar name={name} kind={member!.kind} size={44} />
        )}
        <div className={styles.identity}>
          <h3>{name}</h3>
          <p>{connector?.description ?? member?.role ?? listed?.tagline}</p>
        </div>
        <div className={styles.rowActions}>
          {member && (
            <span
              id={statusId}
              className={`${styles.status} ${connected ? styles.isConnected : pending ? styles.isPending : ""}`}
            >
              {connected ? "Connected" : member.requestedViaLink ? "Asked to join" : "Awaiting reply"}
            </span>
          )}
          {member && pending && member.requestedViaLink && <ApproveForm member={member} />}
          {member && (
            <button
              type="button"
              className={styles.manage}
              aria-label={`Manage ${name}`}
              aria-expanded={panel === "details"}
              onClick={() => setPanel(panel === "details" ? null : "details")}
            >
              Manage
            </button>
          )}
          <button
            type="button"
            role="switch"
            aria-checked={connected || pending}
            aria-label={`${name} connection`}
            aria-describedby={member ? statusId : undefined}
            className={`${styles.toggle} ${connected ? styles.on : pending ? styles.waiting : ""}`}
            onClick={() =>
              setPanel(panel === (member ? "disconnect" : "invite") ? null : member ? "disconnect" : "invite")
            }
          >
            <span />
          </button>
        </div>
      </div>
      {panel === "invite" && <InviteForm connector={connector} onCancel={() => setPanel(null)} />}
      {panel === "details" && member && <MemberDetails member={member} />}
      {panel === "disconnect" && member && <DisconnectForm member={member} onCancel={() => setPanel(null)} />}
    </section>
  );
}
