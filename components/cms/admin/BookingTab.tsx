'use client';

import { lbl, inp } from '@/components/cms/admin/styles';
import { BulkSlotCreator } from '@/components/cms/admin/BulkSlotCreator';
import type { Dispatch, SetStateAction } from 'react';
import type { BookingRequest, BookingSlot, NewSlot } from '@/components/cms/admin/types';

type Props = {
  bookingSlots: BookingSlot[];
  bookingRequests: BookingRequest[];
  loadingSlots: boolean;
  savingSlot: boolean;
  newSlot: NewSlot;
  setNewSlot: Dispatch<SetStateAction<NewSlot>>;
  loadBookingSlots: () => void | Promise<void>;
  saveNewSlot: () => void | Promise<void>;
  deleteSlot: (id: string) => void | Promise<void>;
  updateRequestStatus: (id: string, status: string) => void | Promise<void>;
};

/** Onglet « booking » de l'admin du CMS (déplacé de app/cms-admin/page.tsx, JSX inchangé). */
export default function BookingTab({ bookingSlots, bookingRequests, loadingSlots, savingSlot, newSlot, setNewSlot, loadBookingSlots, saveNewSlot, deleteSlot, updateRequestStatus }: Props) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
      {/* Création en masse */}
      <div style={{ gridColumn: '1 / -1', background: 'white', borderRadius: '1rem', padding: '1.5rem', boxShadow: '0 2px 12px rgba(0,0,0,.07)', marginBottom: '-.5rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#2d5f54', marginBottom: '1rem' }}>🗓 Créneaux récurrents — Ajout en masse</h2>
        <BulkSlotCreator onCreated={loadBookingSlots} />
      </div>
      {/* Add slot */}
      <div style={{ background: 'white', borderRadius: '1rem', padding: '1.5rem', boxShadow: '0 2px 12px rgba(0,0,0,.07)' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#2d5f54', marginBottom: '1rem' }}>📅 Ajouter un créneau</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
          <div>
            <label style={lbl}>Date</label>
            <input type="date" value={newSlot.date}
              onChange={e => setNewSlot(p => ({...p, date: e.target.value}))}
              style={inp} min={new Date().toISOString().split('T')[0]} />
          </div>
          <div>
            <label style={lbl}>Heure</label>
            <select value={newSlot.time}
              onChange={e => setNewSlot(p => ({...p, time: e.target.value}))}
              style={inp}>
              <option value="09:00">09:00</option>
              <option value="10:00">10:00</option>
              <option value="11:00">11:00</option>
              <option value="14:00">14:00</option>
              <option value="15:00">15:00</option>
              <option value="16:00">16:00</option>
              <option value="17:00">17:00</option>
            </select>
          </div>
          <div>
            <label style={lbl}>Type</label>
            <select value={newSlot.type}
              onChange={e => setNewSlot(p => ({...p, type: e.target.value}))}
              style={inp}>
              <option value="coaching">Coaching (60 min)</option>
              <option value="discovery">Découverte (30 min)</option>
              <option value="enterprise">Entreprise</option>
            </select>
          </div>
          <div>
            <label style={lbl}>Notes</label>
            <input type="text" value={newSlot.notes}
              onChange={e => setNewSlot(p => ({...p, notes: e.target.value}))}
              style={inp} placeholder="En ligne, présentiel..." />
          </div>
          <button onClick={saveNewSlot} disabled={savingSlot}
            style={{ padding: '.75rem', background: '#2d5f54', color: 'white', border: 'none', borderRadius: '.5rem', fontWeight: 700, cursor: 'pointer' }}>
            {savingSlot ? 'Ajout...' : '+ Ajouter le créneau'}
          </button>
        </div>
      </div>
      {/* Slots list */}
      <div style={{ background: 'white', borderRadius: '1rem', padding: '1.5rem', boxShadow: '0 2px 12px rgba(0,0,0,.07)', maxHeight: 600, overflow: 'auto' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#2d5f54', marginBottom: '1rem' }}>
          📆 Créneaux ({bookingSlots.length})
        </h2>
        {loadingSlots ? (
          <p style={{ color: '#888', textAlign: 'center', padding: '2rem' }}>Chargement...</p>
        ) : bookingSlots.length === 0 ? (
          <p style={{ color: '#888', textAlign: 'center', padding: '2rem' }}>Aucun créneau</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
            {bookingSlots.map(slot => (
              <div key={slot.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '.75rem', background: '#faf9f7', borderRadius: '.5rem', border: '1px solid #e8e4df' }}>
                <div>
                  <div style={{ fontWeight: 600, color: '#333' }}>{slot.slot_date} à {slot.slot_time}</div>
                  <div style={{ fontSize: '.8rem', color: '#666' }}>{slot.slot_type} · {slot.duration_minutes} min</div>
                </div>
                <button onClick={() => deleteSlot(slot.id)}
                  style={{ padding: '.3rem .6rem', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '.3rem', cursor: 'pointer', fontSize: '.8rem' }}>
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Requests */}
      <div style={{ gridColumn: '1 / -1', background: 'white', borderRadius: '1rem', padding: '1.5rem', boxShadow: '0 2px 12px rgba(0,0,0,.07)' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#2d5f54', marginBottom: '1rem' }}>
          📋 Demandes ({bookingRequests.length})
        </h2>
        {bookingRequests.length === 0 ? (
          <p style={{ color: '#888', textAlign: 'center', padding: '1rem' }}>Aucune demande</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
            {bookingRequests.map(req => (
              <div key={req.id} style={{ padding: '1rem', background: '#faf9f7', borderRadius: '.75rem', border: '1px solid #e8e4df' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.5rem' }}>
                  <strong>{req.client_name}</strong>
                  <span style={{ color: '#888' }}>{req.client_email}</span>
                </div>
                <div style={{ display: 'flex', gap: '.5rem', marginTop: '.75rem' }}>
                  <button onClick={() => updateRequestStatus(req.id, 'confirmed')}
                    style={{ padding: '.4rem .8rem', background: '#166534', color: 'white', border: 'none', borderRadius: '.4rem', cursor: 'pointer' }}>
                    ✅ Confirmer
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
