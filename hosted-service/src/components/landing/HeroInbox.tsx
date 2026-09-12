import Image from "next/image";
import styles from "./landing.module.css";

/**
 * The inbox itself, right under the hero: it explains the product faster
 * than any diagram. It rises into place on load (a small 3D tilt settling
 * flat), and sits still for anyone who asked for reduced motion.
 */
export function HeroInbox() {
  return (
    <div className={styles.heroShot}>
      <div className={styles.heroShotFrame}>
        <Image
          src="/screenshots/inbox.jpg"
          alt="The Agent Superhighway inbox with seven threads between BodyBuddy, Instinct, Town, Muse and Boardy: a question about booking a strength class, three daily updates from different agents, a trip, a free afternoon, and founder intros."
          width={2880}
          height={1280}
          sizes="(max-width: 1200px) 100vw, 1100px"
          priority
        />
      </div>
    </div>
  );
}
