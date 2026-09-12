import Image from "next/image";
import type { Connector } from "./catalog";
import styles from "./connections.module.css";

export function AgentLogo({ connector, size = 44 }: { connector: Connector; size?: number }) {
  return (
    <span
      className={`${styles.logo} ${connector.id === "grokbot" ? styles.grok : ""}`}
      data-agent={connector.id}
      style={{ width: size, height: size }}
    >
      <Image
        src={`/agents/${connector.image}`}
        alt=""
        width={connector.id === "grokbot" ? 1920 : 64}
        height={connector.id === "grokbot" ? 1080 : 64}
        sizes={connector.id === "grokbot" ? "512px" : `${size}px`}
      />
    </span>
  );
}
