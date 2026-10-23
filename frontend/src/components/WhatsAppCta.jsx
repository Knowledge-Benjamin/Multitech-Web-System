import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import axios from 'axios'
import { MessageCircle } from 'lucide-react'
import './WhatsAppCta.css'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

export default function WhatsAppCta() {
  const { pathname, search, hash } = useLocation()
  const [whatsappNumber, setWhatsappNumber] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    axios.get(`${API_BASE_URL}/emails/whatsapp-settings`, { signal: controller.signal })
      .then((response) => {
        setWhatsappNumber(response.data.data.whatsapp_cta_number || '')
      })
      .catch((error) => {
        if (!axios.isCancel(error)) {
          console.error('Error fetching WhatsApp CTA settings:', error)
        }
      })

    return () => controller.abort()
  }, [])

  if (!whatsappNumber) return null

  const currentPage = `${window.location.origin}${pathname}${search}${hash}`
  const message = `Hello Multitech Business School, I would like to learn more. I am contacting you from: ${currentPage}`
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`

  return (
    <a
      className="whatsapp-cta"
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with Multitech Business School on WhatsApp"
    >
      <MessageCircle aria-hidden="true" size={22} />
      <span>Chat with us</span>
    </a>
  )
}
