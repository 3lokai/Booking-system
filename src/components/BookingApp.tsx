'use client'
import React, { useState, useEffect } from 'react';
import { supabase, type Slot } from '../lib/supabase';

const ContactLinks = () => (
  <>
    <a href="mailto:amy.cole@publicissapient.com" className="text-red-700 hover:underline">Amy Cole</a>
    {' '}/{' '}
    <a href="mailto:abhishek.gt@publicissapient.com" className="text-red-700 hover:underline">Abhishek GT</a>
    {' '}/{' '}
    <a href="mailto:vatsal.gupta@publicissapient.com" className="text-red-700 hover:underline">Vatsal Gupta</a>
  </>
);

const BookingApp = () => {
  const generateSlots = (): Slot[] => {
    const slots: Slot[] = [];
    const days = [
      { date: 8, day: 'Wed' },
      { date: 9, day: 'Thu' },
      { date: 15, day: 'Wed' },
      { date: 16, day: 'Thu' },
      { date: 22, day: 'Wed' },
      { date: 23, day: 'Thu' },
      { date: 29, day: 'Wed' },
      { date: 30, day: 'Thu' }
    ];
    
    const times = [
      { start: '08:00', end: '09:00' },
      { start: '09:00', end: '10:00' },
      { start: '10:00', end: '11:00' },
      { start: '13:00', end: '14:00' },
      { start: '14:00', end: '15:00' }
    ];

    days.forEach(({ date }) => {
      times.forEach(({ start }) => {
        // Create ISO timestamp for January 2025
        const timeSlot = new Date(`2025-01-${date.toString().padStart(2, '0')}T${start}:00Z`);
        
        slots.push({
          id: crypto.randomUUID(), // Generate UUID for new slots
          time_slot: timeSlot.toISOString(),
          is_booked: false,
          booker_name: null,
          booker_email: null,
          account_name: null,
          created_at: new Date().toISOString()
        });
      });
    });

    return slots;
  };

  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    accountName: '',
    selectedSlot: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchSlots = async () => {
      try {
        const { data, error } = await supabase
          .from('slots')
          .select('*')
          .order('time_slot', { ascending: true });

        if (error) throw error;
        
        if (!data?.length) {
          // If no slots exist, generate and insert them
          const newSlots = generateSlots();
          const { error: insertError } = await supabase
            .from('slots')
            .insert(newSlots);
          
          if (insertError) throw insertError;
          
          // Fetch again after insertion
          const { data: freshData, error: fetchError } = await supabase
            .from('slots')
            .select('*')
            .order('time_slot', { ascending: true });
            
          if (fetchError) throw fetchError;
          setSlots(freshData || []);
        } else {
          setSlots(data);
        }
      } catch (err) {
        console.error('Error fetching slots:', err);
        setError('Failed to load time slots. Please refresh the page.');
      } finally {
        setLoading(false);
      }
    };

    fetchSlots();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!formData.email.endsWith('@publicissapient.com')) {
      setError('Please use your Publicis Sapient email address');
      setSubmitting(false);
      return;
    }
    setSubmitting(true);
    
    if (!formData.selectedSlot) {
      setError('Please select a time slot');
      setSubmitting(false);
      return;
    }

    if (!formData.name || !formData.email || !formData.accountName) {
      setError('Please fill in all fields');
      setSubmitting(false);
      return;
    }

    if (!formData.email.includes('@')) {
      setError('Please enter a valid email address');
      setSubmitting(false);
      return;
    }

    try {
      const { data: existingBookings, error: searchError } = await supabase
  .from('slots')
  .select('*')
  .or(`booker_email.eq."${formData.email}",account_name.eq."${formData.accountName}",booker_name.eq."${formData.name}"`)
  .eq('is_booked', true);

if (searchError) throw searchError;

if (existingBookings && existingBookings.length > 0) {
  const existingBooking = existingBookings[0];
  let errorMessage = '';
  
  if (existingBooking.booker_email === formData.email) {
    setError(`email-${formData.email}`);
  } else if (existingBooking.account_name === formData.accountName) {
    setError(`account-${formData.accountName}`);
  } else if (existingBooking.booker_name === formData.name) {
    setError(`name-${formData.name}`);
  }
  setSubmitting(false);
  return;
}
      const { error } = await supabase
        .from('slots')
        .update({
          is_booked: true,
          booker_name: formData.name,
          booker_email: formData.email,
          account_name: formData.accountName
        })
        .eq('id', formData.selectedSlot);

      if (error) throw error;

      setSuccess('Your time slot has been successfully booked! You will receive an invite soon.');
      setFormData({
        name: '',
        email: '',
        accountName: '',
        selectedSlot: ''
      });

      // Refresh slots
      const { data: updatedSlots } = await supabase
        .from('slots')
        .select('*')
        .order('time_slot', { ascending: true });
      
      if (updatedSlots) setSlots(updatedSlots);

    } catch (err) {
      console.error('Error during booking:', err); // Actually use the err parameter
      setError('Failed to book slot. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Group slots by date
  const groupedSlots = slots.reduce((acc: Record<string, Slot[]>, slot) => {
    const date = new Date(slot.time_slot).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(slot);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="text-center border-b pb-6">
  <h1 className="text-2xl font-semibold">Schedule Your Account Plan Review</h1>
  <p className="text-gray-600 mt-2">Join us for a one-hour session to review and align on your account&apos;s strategic goals and progress.</p>

</div>
          
          <div className="grid md:grid-cols-2 gap-6 mt-6">
            {/* Form Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Your Information</h3>
              <div>
                <label className="block text-sm font-medium mb-1">Client Partner Name</label>
                <input
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded-md"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">CP&apos;s Email (@publicissapient.com)</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded-md"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Account Name for Review</label>
                <input
                  name="accountName"
                  value={formData.accountName}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded-md"
                  required
                />
              </div>
            </div>

            {/* Time Slots Section */}
            <div>
            <h3 className="text-lg font-medium mb-4">
  Available Time Slots <span className="text-sm text-gray-500">({Intl.DateTimeFormat().resolvedOptions().timeZone})</span>
</h3>
              <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2">
                {Object.entries(groupedSlots).map(([date, dateSlots]) => (
                  <div key={date} className="space-y-2">
                    <h4 className="font-medium text-sm text-gray-700 bg-gray-100 p-2 rounded">
                      {date}
                    </h4>
                    <div className="space-y-2 pl-2">
                      {dateSlots.map(slot => (
                        <label
                          key={slot.id}
                          className={`flex items-center space-x-2 p-2 rounded ${
                            slot.is_booked 
                              ? 'bg-gray-100 cursor-not-allowed' 
                              : 'hover:bg-gray-50 cursor-pointer'
                          }`}
                        >
                          <input
                            type="radio"
                            name="selectedSlot"
                            value={slot.id}
                            checked={formData.selectedSlot === slot.id}
                            onChange={handleInputChange}
                            disabled={slot.is_booked}
                            className="h-4 w-4 text-blue-600"
                          />
                          <div className="flex-1">
                            <span className="text-sm">
                              {new Date(slot.time_slot).toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true
                              })}
                            </span>
                            {slot.is_booked && (
                              <span className="block text-xs text-gray-500">
                                Booked by {slot.account_name} ({slot.booker_name})
                              </span>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Notifications */}
          <div className="mt-6">
          {error && (
              <div className="bg-red-50 text-red-700 p-3 rounded-md mb-4">
                {error.startsWith('email-') ? (
                  <p>
                    You ({error.split('-')[1]}) have already booked a slot, please reach out to{' '}
                    <ContactLinks /> for any rescheduling.
                  </p>
                ) : error.startsWith('account-') ? (
                  <p>
                    This account ({error.split('-')[1]}) already has a scheduled review, please reach out to{' '}
                    <ContactLinks /> for any rescheduling.
                  </p>
                ) : error.startsWith('name-') ? (
                  <p>
                    You ({error.split('-')[1]}) have already booked a slot, please reach out to{' '}
                    <ContactLinks /> for any rescheduling.
                  </p>
                ) : (
                  error
                )}
              </div>
            )}
            {success && (
              <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-md mb-4">
              <h4 className="font-medium mb-2">Booking Confirmed! 🎉</h4>
              <p>A calendar invite will be sent to your email shortly.</p>
              <div className="mt-3 text-sm">
                <p className="font-medium mb-1">Please prepare for the session:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Have your account documentation uploaded in your dedicated Teams channel well in advance</li>
                  <li>Feel free to provide any relevent addendum files for the panel to review</li>
                  <li>Reach out to{' '}
                      <a href="mailto:amy.cole@publicissapient.com" className="text-blue-600 hover:underline">Amy Cole</a> /{' '}
                      <a href="mailto:abhishek.gt@publicissapient.com" className="text-blue-600 hover:underline">Abhishek GT</a> /{' '}
                      <a href="mailto:vatsal.gupta@publicissapient.com" className="text-blue-600 hover:underline">Vatsal Gupta</a>
                      {' '}for any queries
                    </li>
                </ul>
              </div>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button 
            type="submit" 
            onClick={handleSubmit}
            disabled={submitting || success !== ''}
            className={`w-full mt-4 px-4 py-2 rounded-md text-white font-medium
              ${(submitting || success !== '') 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700'
              }`}
          >
            {submitting ? 'Booking...' : success ? 'Booked Successfully' : 'Book Time Slot'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookingApp;
