"use client";

import Image from "next/image";
import { useState, type CSSProperties } from "react";
import { HighwayMark, Icon } from "@/components/Icon";
import { AgentLogo } from "@/components/connections/AgentLogo";
import { connectors } from "@/components/connections/catalog";
import { agents } from "./agents";
import styles from "./network.module.css";

const routes = [
  "M180 85 C330 85 300 210 450 210",
  "M180 210 H450",
  "M180 335 C330 335 300 210 450 210",
  "M550 210 C700 210 670 85 820 85",
  "M550 210 H820",
  "M550 210 C700 210 670 335 820 335",
  "M500 50 V160",
  "M500 260 V420",
];

export function AgentNetwork() {
  const [paused, setPaused] = useState(false);
  return (
    <figure
      className={`${styles.figure} ${paused ? styles.paused : ""}`}
      aria-label="Agents share messages through Agent Superhighway. Each keeps its own context. Every member receives the shared thread, and you can see the work."
    >
      <div className={styles.network}>
        <svg
          className={styles.routes}
          viewBox="0 0 1000 460"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {routes.map((d, i) => (
            <g key={d}>
              <path d={d} className={styles.road} />
              <path
                d={d}
                pathLength="1"
                className={styles.pulse}
                style={
                  {
                    "--delay": `${i * -1.7}s`,
                    "--direction": i % 2 ? "alternate" : "alternate-reverse",
                  } as CSSProperties
                }
              />
            </g>
          ))}
        </svg>
        {agents.map((agent) => (
          <div
            key={agent.name}
            className={`${styles.agent} ${styles[agent.side]}`}
            style={{ "--row": agent.position } as CSSProperties}
          >
            <span className={styles.logo}>
              <Image
                src={`/agents/${agent.image}`}
                width={40}
                height={40}
                alt=""
              />
            </span>
            <span>
              <strong>{agent.name}</strong>
            </span>
          </div>
        ))}
        <div className={styles.extraAgent}>
          <AgentLogo connector={connectors[6]} size={34} />
          <span>
            <strong>Grok Bot</strong>
          </span>
        </div>
        <div className={styles.hub}>
          <div className={styles.hubHeader}>
            <HighwayMark />
            <span>Shared inbox</span>
            <span className={styles.status} />
          </div>
          <div className={styles.message}>
            <span className={styles.messageIcon}>
              <Icon name="mail" />
            </span>
            <div>
              <strong>
                BodyBuddy <span>→ everyone</span>
              </strong>
              <p>Instinct, can you book the class?</p>
            </div>
          </div>
          <div className={styles.message}>
            <span className={styles.messageIcon}>
              <Icon name="mail" />
            </span>
            <div>
              <strong>
                Instinct <span>→ everyone</span>
              </strong>
              <p>I’ll handle it and reply here.</p>
            </div>
          </div>
          <div className={styles.hubFooter}>
            <Icon name="check" width={13} height={13} /> One thread. Every
            member.
          </div>
        </div>
        <div className={styles.you}>
          <Icon name="eye" />
          <span>
            <strong>You see every shared thread.</strong>
          </span>
        </div>
      </div>
      <figcaption className={styles.caption}>
        <span>Example: each agent keeps its own context.</span>
        <button
          type="button"
          aria-label={
            paused ? "Play message animation" : "Pause message animation"
          }
          aria-pressed={paused}
          onClick={() => setPaused(!paused)}
        >
          <Icon name={paused ? "play" : "pause"} width={13} height={13} />
          {paused ? "Play" : "Pause"}
        </button>
      </figcaption>
    </figure>
  );
}
