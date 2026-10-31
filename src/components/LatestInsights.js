"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import styles from './LatestInsights.module.css';

const fadeInUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
};
const staggerContainer = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.12 } } };

const LABELS = { REPORT: 'Research Report', ARTICLE: 'Research Article', INFOGRAPHIC: 'Infographic' };

/**
 * Homepage "Insights & Perspectives": the three newest published insights, read from the same
 * list as the Insights page. The section hides itself until at least one insight is published.
 */
export default function LatestInsights() {
  const [items, setItems] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/v1/insights')
      .then(res => (res.ok ? res.json() : { insights: [] }))
      .then(json => { if (!cancelled) setItems((json.insights || []).slice(0, 3)); })
      .catch(() => { if (!cancelled) setItems([]); });
    return () => { cancelled = true; };
  }, []);

  if (!items || items.length === 0) return null;

  return (
    <section className="section-light-2">
      <motion.div
        className="container"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-100px' }}
        variants={staggerContainer}
      >
        <motion.div variants={fadeInUp} className="eyebrow">Market Intelligence</motion.div>
        <motion.h2 variants={fadeInUp}>Insights &amp; Perspectives</motion.h2>
        <br /><br />
        <div className={`hairline-grid hairline-grid-light ${styles.grid}`}>
          {items.map(item => (
            <motion.div variants={fadeInUp} key={item.id} className={`hairline-cell-light ${styles.card}`}>
              <div className={styles.media}>
                {(item.thumbnailUrl || (item.type === 'INFOGRAPHIC' && item.contentUrl)) && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.thumbnailUrl || item.contentUrl} alt="" loading="lazy" />
                )}
              </div>
              <div className={styles.content}>
                <div className="eyebrow" style={{ marginBottom: 0 }}>{LABELS[item.type] || 'Insight'}</div>
                <h3>{item.title || 'Untitled'}</h3>
                {item.description && <p>{item.description}</p>}
                <Link href={item.type === 'INFOGRAPHIC' ? '/insights' : `/insights/${item.id}`} className={styles.link}>
                  {item.type === 'INFOGRAPHIC' ? 'See all insights' : 'Read the note'} &rarr;
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
        <div className={styles.all}>
          <Link href="/insights" className={styles.link}>View all insights &rarr;</Link>
        </div>
      </motion.div>
    </section>
  );
}
