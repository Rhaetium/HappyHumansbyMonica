// Types de l'admin du CMS (déplacés de app/cms-admin/page.tsx, sans changement)
// ─── Types ───────────────────────────────────────────────────
export type Article = {
  id: number; title: string; slug: string; category: string;
  published: boolean; published_at: string; created_at: string;
  excerpt: string; featured_image: string; content?: string; voice_notes?: string;
  seo_title?: string; seo_description?: string; og_image?: string;
};

export type Setting = { id: number; key: string; value: string; label: string; group_name: string; type?: string; };
export type SiteContent = { id: number; page: string; block_key: string; value: string; label: string; type: string; };

export type BookingSlot = {
  id: string; slot_date: string; slot_time: string;
  slot_type: 'coaching' | 'discovery' | 'enterprise';
  duration_minutes: number; status: 'available' | 'booked' | 'cancelled';
  notes: string | null; created_at: string;
};

export type BookingRequest = {
  id: string; slot_id: string; client_name: string; client_email: string;
  client_phone: string | null; message: string | null;
  status: 'pending' | 'confirmed' | 'cancelled';
  created_at: string; booking_slots?: BookingSlot;
};

export type ContactMessage = {
  id: string; name: string; email: string; message: string;
  type: string; status: 'unread' | 'read' | 'replied';
  created_at: string;
};

export type NewSlot = { date: string; time: string; type: string; notes: string };
