import ContactForm from '../components/ContactForm'
import './ContactUs.css'

export default function ContactUs() {
  return (
    <section className="contact-page">
      <div className="container contact-page-inner">
        <div className="contact-page-copy">
          <span className="section-label">Contact Us</span>
          <h1>Reach out to our team</h1>
          <p>Have a question about admissions, student services, or campus programs? Send us a message and we will reply as soon as possible.</p>
        </div>

        <ContactForm pageUrl="/contact" />
      </div>
    </section>
  )
}
