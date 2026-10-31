"use client";

import { motion } from 'framer-motion';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ContactForm from '@/components/ContactForm';
import styles from './page.module.css';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.15 } }
};

export default function Contact() {
  return (
    <>
      <Navbar />
      <main className={styles.main}>
        <section className={styles.contactSection}>
          <div className="container">
            <motion.div 
              className={styles.contactGrid}
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
            >
              <motion.div variants={fadeUp} className={styles.contactInfo}>
                <div className="eyebrow">Connect</div>
                <h1>Begin the Conversation</h1>
                <p>Schedule a confidential consultation to discuss your financial architecture. We operate on a strict appointment-only basis to ensure complete discretion.</p>
                
                <div className={styles.infoList}>
                  <div className={styles.infoItem}>
                    <h5>HEADQUARTERS</h5>
                    <p>Near Jain Digital Mart, Hiran Magri,<br/>Udaipur, Rajasthan</p>
                  </div>
                  <div className={styles.infoItem}>
                    <h5>DIRECT LINE</h5>
                    <p>+91 98765 43210</p>
                  </div>
                  <div className={styles.infoItem}>
                    <h5>PRIVATE ADVISORY DESK</h5>
                    <p>info@knowithcapital.demo</p>
                  </div>
                  <div className={styles.infoItem}>
                    <h5>HOURS</h5>
                    <p>Mon-Fri, 9:00 AM - 6:00 PM</p>
                  </div>
                </div>
              </motion.div>

              <motion.div variants={fadeUp} className={styles.contactFormWrap}>
                <ContactForm formClassName={styles.contactForm} inputClassName={styles.inputUnderline} />
              </motion.div>
            </motion.div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
