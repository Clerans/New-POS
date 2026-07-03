import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Calendar as CalendarIcon,
  Plus,
  Clock,
  User,
  Phone,
  Users,
  XCircle,
  AlertCircle,
  UserPlus,
  Compass,
  ArrowRight,
  TrendingUp,
  X
} from 'lucide-react';
import { apiClient } from '../api/apiClient.js';
import { getSocket } from '../api/socket.js';
import { Button } from '../components/ui/Button.js';
import { Card } from '../components/ui/Card.js';
import { Badge } from '../components/ui/Badge.js';

interface Reservation {
  id: string;
  reservationNumber: string;
  customerName: string;
  customerPhone?: string;
  guests: number;
  reservationTime: string;
  status: string;
  specialRequests?: string;
  tableId?: string;
  table?: { tableNumber: string };
}

interface WaitlistEntry {
  id: string;
  queueNumber: number;
  customerName: string;
  customerPhone?: string;
  guests: number;
  priority: string;
  status: string;
  estimatedWait: number;
}

interface TableSimple {
  id: string;
  tableNumber: string;
  capacity: number;
}

export const Reservations: React.FC = () => {
  const queryClient = useQueryClient();

  // Selected date/view
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [showAddResModal, setShowAddResModal] = useState<boolean>(false);
  const [showAddWaitlistModal, setShowAddWaitlistModal] = useState<boolean>(false);
  const [showSeatWaitlistModal, setShowSeatWaitlistModal] = useState<boolean>(false);
  const [seatingWaitlistId, setSeatingWaitlistId] = useState<string>('');

  // Form input states
  const [resName, setResName] = useState<string>('');
  const [resPhone, setResPhone] = useState<string>('');
  const [resGuests, setResGuests] = useState<number>(2);
  const [resTime, setResTime] = useState<string>('');
  const [resTableId, setResTableId] = useState<string>('');
  const [resNotes, setResNotes] = useState<string>('');
  
  // Waitlist form inputs
  const [waitName, setWaitName] = useState<string>('');
  const [waitPhone, setWaitPhone] = useState<string>('');
  const [waitGuests, setWaitGuests] = useState<number>(2);
  const [waitPriority, setWaitPriority] = useState<string>('NORMAL');

  // Error/Double-booking alerts
  const [resWarning, setResWarning] = useState<string>('');

  // 1. Fetch Reservations
  const { data: reservations = [] } = useQuery<Reservation[]>({
    queryKey: ['reservations'],
    queryFn: () => apiClient.get('/reservations').then((res: any) => res.data.data),
  });

  // 2. Fetch Waitlist
  const { data: waitlist = [] } = useQuery<WaitlistEntry[]>({
    queryKey: ['waitlist'],
    queryFn: () => apiClient.get('/reservations/waitlist').then((res: any) => res.data.data),
  });

  // 3. Fetch Tables list for reservation select dropdown
  const { data: tables = [] } = useQuery<TableSimple[]>({
    queryKey: ['tables-simple'],
    queryFn: () => apiClient.get('/tables').then((res: any) => res.data.data),
  });

  // Real-time updates subscription
  useEffect(() => {
    const socket = getSocket();
    const handleUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['waitlist'] });
    };

    socket.on('reservations_updated', handleUpdate);
    socket.on('waitlist_updated', handleUpdate);

    return () => {
      socket.off('reservations_updated', handleUpdate);
      socket.off('waitlist_updated', handleUpdate);
    };
  }, [queryClient]);

  // Mutations
  const createReservationMutation = useMutation({
    mutationFn: (data: any) => apiClient.post('/reservations', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      setShowAddResModal(false);
      clearResForm();
    },
    onError: (err: any) => {
      const errMsg = err.response?.data?.message || 'Error booking reservation';
      setResWarning(errMsg);
    },
  });

  const updateResStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiClient.put(`/reservations/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
    },
  });

  const deleteReservationMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/reservations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
    },
  });

  const createWaitlistMutation = useMutation({
    mutationFn: (data: any) => apiClient.post('/reservations/waitlist', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waitlist'] });
      setShowAddWaitlistModal(false);
      setWaitName('');
      setWaitPhone('');
    },
  });

  const seatWaitlistMutation = useMutation({
    mutationFn: (data: { id: string; tableId: string }) =>
      apiClient.post('/reservations/waitlist/seat', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waitlist'] });
      queryClient.invalidateQueries({ queryKey: ['floors'] });
      setShowSeatWaitlistModal(false);
      setSeatingWaitlistId('');
    },
  });

  const clearResForm = () => {
    setResName('');
    setResPhone('');
    setResGuests(2);
    setResTime('');
    setResTableId('');
    setResNotes('');
    setResWarning('');
  };

  const filteredReservations = reservations.filter((res) => {
    const resDay = new Date(res.reservationTime).toISOString().split('T')[0];
    return resDay === selectedDate;
  });

  const getResStatusColor = (status: string): "success" | "warning" | "primary" | "secondary" | "danger" | "accent" => {
    switch (status) {
      case 'CONFIRMED':
        return 'success';
      case 'BOOKED':
        return 'primary';
      case 'ARRIVED':
        return 'accent';
      case 'SEATED':
        return 'warning';
      case 'COMPLETED':
        return 'secondary';
      case 'CANCELLED':
        return 'danger';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="space-y-6 p-6 min-h-screen bg-background text-foreground">
      {/* Header controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
            <CalendarIcon className="h-8 w-8 text-primary" />
            Reservations & Timeline
          </h1>
          <p className="text-muted-foreground mt-1">
            Track confirmed customer bookings slots, run timelines, and manage walk-ins waitlists.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-card border border-border text-foreground px-4 py-2.5 rounded-lg text-sm font-semibold select-none cursor-pointer"
          />

          <Button onClick={() => setShowAddResModal(true)} className="flex items-center gap-1.5">
            <Plus className="h-4.5 w-4.5" /> Book Table
          </Button>
        </div>
      </div>

      {/* Grid container layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Timeline Reservation slots */}
        <div className="lg:col-span-8 space-y-4">
          <Card className="p-6 border border-border shadow-lg">
            <h2 className="text-lg font-bold border-b border-border pb-3 flex items-center gap-2 mb-4">
              <Clock className="h-5 w-5 text-primary" />
              Timeline Bookings: {new Date(selectedDate).toLocaleDateString([], { dateStyle: 'long' })}
            </h2>

            {filteredReservations.length > 0 ? (
              <div className="space-y-3">
                {filteredReservations.map((res) => (
                  <div
                    key={res.id}
                    className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 bg-accent/40 border border-border rounded-xl hover:border-primary/30 transition-all gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-base text-foreground">
                          {res.customerName}
                        </span>
                        <Badge variant={getResStatusColor(res.status)} className="text-[10px]">
                          {res.status}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {new Date(res.reservationTime).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" /> {res.guests} Guests
                        </span>
                        {res.table && (
                          <span className="flex items-center gap-1">
                            <Compass className="h-3.5 w-3.5" /> Table {res.table.tableNumber}
                          </span>
                        )}
                        {res.customerPhone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3.5 w-3.5" /> {res.customerPhone}
                          </span>
                        )}
                      </div>

                      {res.specialRequests && (
                        <p className="text-[11px] italic text-muted-foreground mt-1 bg-accent px-2 py-1 rounded w-fit">
                          Note: {res.specialRequests}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-auto">
                      {res.status === 'CONFIRMED' && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              updateResStatusMutation.mutate({ id: res.id, status: 'SEATED' })
                            }
                            className="bg-emerald-950/20 text-emerald-400 hover:bg-emerald-900/30 text-xs py-1.5 px-3"
                          >
                            Seat Table
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              updateResStatusMutation.mutate({ id: res.id, status: 'CANCELLED' })
                            }
                            className="text-rose-400 hover:bg-rose-950/20 text-xs py-1.5 px-3"
                          >
                            Cancel
                          </Button>
                        </>
                      )}

                      <button
                        onClick={() => deleteReservationMutation.mutate(res.id)}
                        className="p-1.5 rounded hover:bg-accent text-rose-500 cursor-pointer"
                        title="Remove booking"
                      >
                        <XCircle className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 text-muted-foreground">
                <CalendarIcon className="h-12 w-12 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm">No reservations booked for this day.</p>
              </div>
            )}
          </Card>
        </div>

        {/* Walk-in Waitlist Deck */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="p-6 border border-border shadow-lg">
            <div className="flex justify-between items-center border-b border-border pb-3 mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Walk-in Waitlist
              </h2>
              <Button size="sm" onClick={() => setShowAddWaitlistModal(true)} className="py-1 px-2 text-xs">
                <UserPlus className="h-3.5 w-3.5 mr-1 inline" /> Queue party
              </Button>
            </div>

            {waitlist.length > 0 ? (
              <div className="space-y-3">
                {waitlist.map((entry) => (
                  <div
                    key={entry.id}
                    className="p-3 bg-accent/40 border border-border rounded-xl space-y-2"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono bg-primary/20 text-primary px-1.5 py-0.5 rounded text-[10px] font-bold">
                            Q-{entry.queueNumber}
                          </span>
                          <span className="font-bold text-sm">{entry.customerName}</span>
                        </div>
                        <span className="text-xs text-muted-foreground mt-0.5 block">
                          Size: {entry.guests} Guests | Wait: {entry.estimatedWait}m
                        </span>
                      </div>

                      <Badge
                        variant={
                          entry.priority === 'VIP'
                            ? 'danger'
                            : entry.priority === 'HIGH'
                            ? 'warning'
                            : 'secondary'
                        }
                        className="text-[9px] uppercase tracking-wide px-1.5 py-0.5"
                      >
                        {entry.priority}
                      </Badge>
                    </div>

                    <div className="flex justify-end pt-1 border-t border-accent mt-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          setSeatingWaitlistId(entry.id);
                          setShowSeatWaitlistModal(true);
                        }}
                        className="text-[11px] py-1 px-2.5 bg-emerald-600 hover:bg-emerald-700"
                      >
                        Seat Customer <ArrowRight className="h-3 w-3 ml-1 inline" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 text-muted-foreground">
                <User className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs">No walk-in parties in queue.</p>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* MODALS SECTION */}

      {/* 1. Add Booking Modal */}
      {showAddResModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <h3 className="text-lg font-bold flex items-center gap-1.5">
                <CalendarIcon className="h-5 w-5 text-primary" /> Book Dining Table
              </h3>
              <button
                onClick={() => {
                  setShowAddResModal(false);
                  setResWarning('');
                }}
                className="p-1 rounded-full hover:bg-accent text-muted-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {resWarning && (
              <div className="p-3.5 bg-rose-950/20 border border-rose-500/20 text-rose-300 rounded-xl text-xs flex gap-2">
                <AlertCircle className="h-4.5 w-4.5 shrink-0 text-rose-400" />
                <span>{resWarning}</span>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground font-bold">Guest Name</label>
                <input
                  type="text"
                  placeholder="e.g. Brad Pitt"
                  value={resName}
                  onChange={(e) => setResName(e.target.value)}
                  className="w-full bg-accent border border-border rounded-lg px-3 py-2 mt-1 text-sm text-foreground"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground font-bold">Phone Number</label>
                  <input
                    type="text"
                    placeholder="+1 555 9999"
                    value={resPhone}
                    onChange={(e) => setResPhone(e.target.value)}
                    className="w-full bg-accent border border-border rounded-lg px-3 py-2 mt-1 text-sm text-foreground"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground font-bold">Guests Size</label>
                  <input
                    type="number"
                    value={resGuests}
                    onChange={(e) => setResGuests(Number(e.target.value))}
                    className="w-full bg-accent border border-border rounded-lg px-3 py-2 mt-1 text-sm text-foreground"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground font-bold">Booking Slot Time</label>
                  <input
                    type="datetime-local"
                    value={resTime}
                    onChange={(e) => setResTime(e.target.value)}
                    className="w-full bg-accent border border-border rounded-lg px-3 py-2 mt-1 text-sm text-foreground select-none cursor-pointer"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground font-bold">Select Table</label>
                  <select
                    value={resTableId}
                    onChange={(e) => setResTableId(e.target.value)}
                    className="w-full bg-accent border border-border rounded-lg px-3 py-2 mt-1 text-sm text-foreground"
                  >
                    <option value="">Auto Select Table</option>
                    {tables.map((t) => (
                      <option key={t.id} value={t.id}>
                        Table {t.tableNumber} (Max {t.capacity})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground font-bold">Special Requests</label>
                <textarea
                  placeholder="Window seat, anniversary, allergy details..."
                  value={resNotes}
                  onChange={(e) => setResNotes(e.target.value)}
                  className="w-full bg-accent border border-border rounded-lg px-3 py-2 mt-1 text-sm text-foreground h-16"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddResModal(false);
                  setResWarning('');
                }}
              >
                Cancel
              </Button>
              <Button
                disabled={!resName || !resTime}
                onClick={() =>
                  createReservationMutation.mutate({
                    customerName: resName,
                    customerPhone: resPhone,
                    guests: resGuests,
                    reservationTime: resTime,
                    specialRequests: resNotes,
                    tableId: resTableId || null,
                  })
                }
              >
                Confirm Booking Slot
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Add Waitlist Entry Modal */}
      {showAddWaitlistModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <h3 className="text-lg font-bold flex items-center gap-1.5">
                <UserPlus className="h-5 w-5 text-primary" /> Queue Walk-in Customer
              </h3>
              <button
                onClick={() => setShowAddWaitlistModal(false)}
                className="p-1 rounded-full hover:bg-accent text-muted-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground font-bold">Guest Name</label>
                <input
                  type="text"
                  placeholder="e.g. Frank Sinatra"
                  value={waitName}
                  onChange={(e) => setWaitName(e.target.value)}
                  className="w-full bg-accent border border-border rounded-lg px-3 py-2 mt-1 text-sm text-foreground"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground font-bold">Phone Number</label>
                  <input
                    type="text"
                    placeholder="+1 555 0999"
                    value={waitPhone}
                    onChange={(e) => setWaitPhone(e.target.value)}
                    className="w-full bg-accent border border-border rounded-lg px-3 py-2 mt-1 text-sm text-foreground"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground font-bold">Guests Size</label>
                  <input
                    type="number"
                    value={waitGuests}
                    onChange={(e) => setWaitGuests(Number(e.target.value))}
                    className="w-full bg-accent border border-border rounded-lg px-3 py-2 mt-1 text-sm text-foreground"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground font-bold">Queue Priority</label>
                <select
                  value={waitPriority}
                  onChange={(e) => setWaitPriority(e.target.value)}
                  className="w-full bg-accent border border-border rounded-lg px-3 py-2 mt-1 text-sm text-foreground"
                >
                  <option value="NORMAL">Normal Queue</option>
                  <option value="HIGH">High Priority</option>
                  <option value="VIP">VIP Premium</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button variant="outline" onClick={() => setShowAddWaitlistModal(false)}>
                Cancel
              </Button>
              <Button
                disabled={!waitName}
                onClick={() =>
                  createWaitlistMutation.mutate({
                    customerName: waitName,
                    customerPhone: waitPhone,
                    guests: waitGuests,
                    priority: waitPriority,
                    branchId: tables[0]?.id || null, // mock mapping
                  })
                }
              >
                Queue Customer
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Seat Waitlist Customer Table Selector Modal */}
      {showSeatWaitlistModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <h3 className="text-lg font-bold">Assign Table to Seated Party</h3>
              <button
                onClick={() => {
                  setShowSeatWaitlistModal(false);
                  setSeatingWaitlistId('');
                }}
                className="p-1 rounded-full hover:bg-accent text-muted-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-sm text-muted-foreground">
              Select an available table to assign and seat the walk-in customer.
            </p>

            <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
              {tables.map((t) => (
                <button
                  key={t.id}
                  onClick={() =>
                    seatWaitlistMutation.mutate({ id: seatingWaitlistId, tableId: t.id })
                  }
                  className="p-3 text-sm font-bold border border-border hover:border-foreground rounded-xl text-foreground text-center"
                >
                  Table {t.tableNumber}
                </button>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowSeatWaitlistModal(false);
                  setSeatingWaitlistId('');
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reservations;
