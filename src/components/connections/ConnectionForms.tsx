"use client";

import { useFormStatus } from "react-dom";
import { addMember, removeMemberAction, resendInvitation, updateMemberRole } from "@/app/actions";
import type { MemberKind, MemberStatus } from "@/generated/prisma/client";
import type { Connector } from "./catalog";
import styles from "./forms.module.css";

/** What an invite form can be prefilled with: a house connector or a directory pick. */
export interface InvitePreset {
  name: string;
  role: string;
  website?: string;
}

export function presetFromConnector(connector: Connector): InvitePreset {
  return { name: connector.name, role: connector.role, website: connector.website };
}

export type ConnectionMember = {
  id: string;
  name: string;
  email: string;
  kind: MemberKind;
  role: string;
  intro: string;
  status: MemberStatus;
  isOwner: boolean;
};

export function Submit({
  children,
  pendingLabel,
  danger = false,
}: {
  children: React.ReactNode;
  pendingLabel: string;
  danger?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={danger ? styles.danger : styles.submit}>
      {pending ? pendingLabel : children}
    </button>
  );
}

export function InviteForm({ connector, preset, onCancel }: { connector?: Connector; preset?: InvitePreset; onCancel: () => void }) {
  const fill = preset ?? (connector ? presetFromConnector(connector) : undefined);
  return (
    <form action={addMember} className={styles.invite}>
      <div className={styles.instructions}>
        <strong>{fill ? `Connect ${fill.name} by email` : "Invite another agent"}</strong>
        <p>
          {fill
            ? `Use the address your ${fill.name} agent sends and receives from. It may need email tools or an adapter first.`
            : "Use an address that can send and receive email."}{" "}
          We’ll send an invitation. Replying to it joins the highway.
        </p>
        <a href="/skill.md" target="_blank" rel="noreferrer">
          Read the agent setup guide ↗
        </a>
      </div>
      {fill ? (
        <>
          <input type="hidden" name="name" value={fill.name} />
          <input type="hidden" name="kind" value="AGENT" />
        </>
      ) : (
        <div className={styles.fields}>
          <label>
            Name
            <input name="name" required placeholder="Your agent or person’s name" />
          </label>
          <label>
            Type
            <select name="kind" defaultValue="AGENT">
              <option value="AGENT">Agent</option>
              <option value="PERSON">Person</option>
            </select>
          </label>
        </div>
      )}
      <div className={styles.fields}>
        <label>
          Email address
          <input name="email" type="email" required placeholder="Your agent’s email address" autoComplete="off" />
        </label>
        <label>
          What they help you with
          <input
            name="role"
            required
            maxLength={200}
            defaultValue={fill?.role}
            placeholder="e.g. my travel assistant"
          />
        </label>
      </div>
      <p className={styles.formNote}>Once connected, they’ll receive every message shared with this highway.</p>
      <div className={styles.formActions}>
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
        <Submit pendingLabel="Sending invitation…">Send invitation</Submit>
      </div>
    </form>
  );
}

export function MemberDetails({ member }: { member: ConnectionMember }) {
  return (
    <div className={styles.details}>
      <p className={styles.memberEmail}>{member.email}</p>
      <form action={updateMemberRole}>
        <input type="hidden" name="memberId" value={member.id} />
        <label>
          What they help you with
          <input name="role" maxLength={200} defaultValue={member.role} />
        </label>
        <label>
          Their introduction
          <textarea
            name="intro"
            maxLength={600}
            rows={2}
            defaultValue={member.intro}
            placeholder={
              member.status === "PENDING"
                ? "Their introduction appears when they reply to the invitation."
                : "What this member has shared about themselves"
            }
          />
        </label>
        <div className={styles.formActions}>
          <Submit pendingLabel="Saving…">Save details</Submit>
        </div>
      </form>
      {member.status === "PENDING" && (
        <form action={resendInvitation} className={styles.resend}>
          <input type="hidden" name="memberId" value={member.id} />
          <p>The invitation is waiting for a reply from this address.</p>
          <Submit pendingLabel="Sending…">Resend invitation</Submit>
        </form>
      )}
    </div>
  );
}

export function DisconnectForm({ member, onCancel }: { member: ConnectionMember; onCancel: () => void }) {
  return (
    <form action={removeMemberAction} className={styles.disconnect}>
      <input type="hidden" name="memberId" value={member.id} />
      <div>
        <strong>
          {member.status === "PENDING" ? `Cancel ${member.name}’s invitation?` : `Disconnect ${member.name}?`}
        </strong>
        <p>
          {member.status === "PENDING"
            ? "The invitation will no longer let this address join."
            : "This address will stop sending and receiving new messages here. Previously delivered emails stay in their inbox."}
        </p>
      </div>
      <div className={styles.formActions}>
        <button type="button" onClick={onCancel}>
          Keep {member.status === "PENDING" ? "invitation" : "connected"}
        </button>
        <Submit pendingLabel="Disconnecting…" danger>
          {member.status === "PENDING" ? "Cancel invitation" : "Disconnect"}
        </Submit>
      </div>
    </form>
  );
}
