// @ts-nocheck
import Image from "next/image";
import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { brand } from "@/src/config/brand";
import { getPublicBusinessDetails } from "@/src/config/business";
import { getPublishedBusinessSettings } from "@/api/cms/public-repository";
import styles from "./site-shell.module.css";

export async function SiteFooter() {
  const business = getPublicBusinessDetails();
  const settings = await getPublishedBusinessSettings();
  const phone = settings.support_phone || brand.phone;
  const email = settings.support_email || "divinestonegallery@gmail.com";
  const address = settings.business_address || business.address || brand.location;
  return (
    <footer className={styles.siteFooter}>
      <div className={`${styles.footerGrid} site-container`}>
        <div className={styles.footerBrand}>
          <Image src="/brand/DSG-White.png" alt="Divine Stone Gallery" width={420} height={225} />
          <p>{brand.promise}, shaped by generations of experience and guided by sacred tradition.</p>
        </div>

        <div className={styles.footerColumn}>
          <p>Contact</p>
          <div className={styles.footerContact}>
            <span><MapPin aria-hidden="true" size={17} /> {address}</span>
            <a href={`tel:${phone.replace(/[^+\d]/g, "")}`}><Phone aria-hidden="true" size={17} /> {phone}</a>
            <a href={`mailto:${email}`}><Mail aria-hidden="true" size={17} /> {email}</a>
          </div>
        </div>

        <div className={styles.footerColumn}>
          <p>Explore</p>
          <Link href="/shop">All Moorties</Link>
          <Link href="/shop">Collection</Link>
          <Link href="/custom-murti">Custom Murti</Link>
          <Link href="/artisans">Artisans</Link>
          <Link href="/shop">Featured</Link>
          <Link href="/our-story">Our Story</Link>
          <Link href="/guides">Guide</Link>
          <Link href="/faq">FAQs</Link>
        </div>
      </div>

      <div className={`${styles.footerBottom} site-container`}>
        <span>© {new Date().getFullYear()} Divine Stone Gallery</span>
        <div>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/returns">Returns</Link>
        </div>
      </div>
    </footer>
  );
}
