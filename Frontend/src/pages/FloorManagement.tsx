import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Layers,
  Plus,
  Trash2,
  Lock,
  Unlock,
  Move,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Copy,
  LayoutGrid,
  Download,
  Info,
  User as UserIcon,
  Clock,
  UserCheck,
  Split,
  AlertTriangle,
  X,
  FileText
} from 'lucide-react';
import { apiClient } from '../api/apiClient.js';
import { useUserStore } from '../store/userStore.js';
import { getSocket } from '../api/socket.js';
import { Badge } from '../components/ui/Badge.js';
import { Button } from '../components/ui/Button.js';
import { Card } from '../components/ui/Card.js';

interface TablePos {
  x: number;
  y: number;
  rotation: number;
}

interface TableSession {
  id: string;
  guests: number;
  startTime: string;
  customer?: { id: string; name: string };
  waiter?: { id: string; displayName: string };
}

interface TableData {
  id: string;
  tableNumber: string;
  displayName: string;
  capacity: number;
  minGuests: number;
  maxGuests: number;
  shape: string;
  width: number;
  height: number;
  rotation: number;
  color?: string;
  status: string;
  floorId: string;
  branchId?: string;
  position?: TablePos;
  qrCode?: { qrData: string; svgString: string };
  sessions: TableSession[];
  mergeItem?: {
    id: string;
    merge: {
      id: string;
      parentTableId: string;
      items: Array<{ table: { tableNumber: string } }>;
    };
  };
}

interface FloorData {
  id: string;
  name: string;
  description?: string;
  color?: string;
  displayOrder: number;
  status: string;
  branchId?: string;
  tables: TableData[];
}

export const FloorManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const { hasPermission } = useUserStore();

  const [selectedFloorId, setSelectedFloorId] = useState<string>('');
  const [selectedTable, setSelectedTable] = useState<TableData | null>(null);
  
  // Designer Tool State
  const [designerMode, setDesignerMode] = useState<boolean>(false);
  const [zoom, setZoom] = useState<number>(1);
  const [snapToGrid, setSnapToGrid] = useState<boolean>(true);
  const [isLockedLayout, setIsLockedLayout] = useState<boolean>(true);
  
  // Dialog/Modal states
  const [showAddTableModal, setShowAddTableModal] = useState<boolean>(false);
  const [showMergeModal, setShowMergeModal] = useState<boolean>(false);
  const [showTransferModal, setShowTransferModal] = useState<boolean>(false);
  const [showQRModal, setShowQRModal] = useState<boolean>(false);
  
  // Form input states
  const [newTableNum, setNewTableNum] = useState<string>('');
  const [newTableShape, setNewTableShape] = useState<string>('SQUARE');
  const [newTableCapacity, setNewTableCapacity] = useState<number>(4);
  const [sessionGuests, setSessionGuests] = useState<number>(2);
  
  // Merges / Transfers selection
  const [mergeTargetTableIds, setMergeTargetTableIds] = useState<string[]>([]);
  const [transferTargetTableId, setTransferTargetTableId] = useState<string>('');

  // Dragging state
  const canvasRef = useRef<HTMLDivElement>(null);
  const [draggedTableId, setDraggedTableId] = useState<string | null>(null);

  // 1. Fetch Floors and Tables
  const { data: floors = [] } = useQuery<FloorData[]>({
    queryKey: ['floors'],
    queryFn: () => apiClient.get('/floors').then((res: any) => res.data.data),
  });

  // Set initial selected floor
  useEffect(() => {
    if (floors.length > 0 && !selectedFloorId) {
      setSelectedFloorId(floors[0].id);
    }
  }, [floors, selectedFloorId]);

  // Real-time socket hook
  useEffect(() => {
    const socket = getSocket();
    const handleTableChange = () => {
      queryClient.invalidateQueries({ queryKey: ['floors'] });
    };

    socket.on('table_status_changed', handleTableChange);
    socket.on('dashboard_update', handleTableChange);

    return () => {
      socket.off('table_status_changed', handleTableChange);
      socket.off('dashboard_update', handleTableChange);
    };
  }, [queryClient]);

  const activeFloor = floors.find((f) => f.id === selectedFloorId);
  const tables = activeFloor?.tables || [];

  // 2. Mutations
  const updateTableMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiClient.put(`/tables/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['floors'] });
    },
  });

  const createTableMutation = useMutation({
    mutationFn: (data: any) => apiClient.post('/tables', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['floors'] });
      setShowAddTableModal(false);
      setNewTableNum('');
    },
  });

  const deleteTableMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/tables/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['floors'] });
      setSelectedTable(null);
    },
  });

  const openSessionMutation = useMutation({
    mutationFn: (data: any) => apiClient.post('/tables/sessions/open', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['floors'] });
      setSelectedTable(null);
    },
  });

  const closeSessionMutation = useMutation({
    mutationFn: (data: any) => apiClient.post('/tables/sessions/close', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['floors'] });
      setSelectedTable(null);
    },
  });

  const mergeTablesMutation = useMutation({
    mutationFn: (data: any) => apiClient.post('/tables/merge', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['floors'] });
      setShowMergeModal(false);
      setMergeTargetTableIds([]);
      setSelectedTable(null);
    },
  });

  const splitTablesMutation = useMutation({
    mutationFn: (data: any) => apiClient.post('/tables/split', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['floors'] });
      setSelectedTable(null);
    },
  });

  const transferTableMutation = useMutation({
    mutationFn: (data: any) => apiClient.post('/tables/transfer', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['floors'] });
      setShowTransferModal(false);
      setTransferTargetTableId('');
      setSelectedTable(null);
    },
  });

  const handleDragStart = (_e: React.MouseEvent, table: TableData) => {
    if (isLockedLayout) return;
    setDraggedTableId(table.id);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggedTableId || isLockedLayout || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    let newX = (e.clientX - rect.left) / zoom;
    let newY = (e.clientY - rect.top) / zoom;

    // Grid snap rules
    if (snapToGrid) {
      newX = Math.round(newX / 20) * 20;
      newY = Math.round(newY / 20) * 20;
    }

    // Boundaries
    newX = Math.max(20, Math.min(newX, 900));
    newY = Math.max(20, Math.min(newY, 600));

    // Optimistically update locally
    const updatedTables = tables.map((t) => {
      if (t.id === draggedTableId) {
        return {
          ...t,
          position: { ...(t.position || { rotation: 0 }), x: newX, y: newY },
        };
      }
      return t;
    });

    queryClient.setQueryData(['floors'], (old: FloorData[] | undefined) => {
      if (!old) return old;
      return old.map((f) => {
        if (f.id === selectedFloorId) {
          return { ...f, tables: updatedTables };
        }
        return f;
      });
    });
  };

  const handleDragEnd = () => {
    if (!draggedTableId) return;

    const table = tables.find((t) => t.id === draggedTableId);
    if (table && table.position) {
      updateTableMutation.mutate({
        id: draggedTableId,
        data: {
          x: table.position.x,
          y: table.position.y,
        },
      });
    }

    setDraggedTableId(null);
  };

  // Rotation trigger
  const rotateSelectedTable = () => {
    if (!selectedTable) return;
    const currentRot = selectedTable.rotation || 0;
    const nextRot = (currentRot + 45) % 360;

    updateTableMutation.mutate({
      id: selectedTable.id,
      data: { rotation: nextRot },
    });

    setSelectedTable({
      ...selectedTable,
      rotation: nextRot,
    });
  };

  // Duplication trigger
  const duplicateSelectedTable = () => {
    if (!selectedTable) return;
    const uniqueNum = `${selectedTable.tableNumber}-D`;
    createTableMutation.mutate({
      tableNumber: uniqueNum,
      displayName: `${selectedTable.displayName} (Copy)`,
      capacity: selectedTable.capacity,
      shape: selectedTable.shape,
      width: selectedTable.width,
      height: selectedTable.height,
      x: (selectedTable.position?.x || 100) + 40,
      y: (selectedTable.position?.y || 100) + 40,
      branchId: selectedTable.branchId || floors[0]?.branchId,
      floorId: selectedFloorId,
    });
  };

  // Export CSV helper
  const handleExportCSV = () => {
    if (tables.length === 0) return;
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      ['Table Number,Capacity,Shape,Status']
        .concat(tables.map((t) => `"${t.tableNumber}",${t.capacity},"${t.shape}","${t.status}"`))
        .join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `tables-layout-${activeFloor?.name}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusColor = (status: string): "success" | "warning" | "primary" | "secondary" | "danger" | "accent" => {
    switch (status) {
      case 'AVAILABLE':
        return 'success';
      case 'OCCUPIED':
        return 'danger';
      case 'RESERVED':
        return 'warning';
      case 'CLEANING':
        return 'accent';
      case 'BLOCKED':
        return 'secondary';
      case 'MERGED':
        return 'primary';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="space-y-6 p-6 min-h-screen bg-background text-foreground">
      {/* Header Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
            <Layers className="h-8 w-8 text-primary" />
            Floor Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Design restaurant dining areas, assign waiter sessions, and monitor occupancy status in real-time.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <Button
            variant="outline"
            onClick={() => setDesignerMode(!designerMode)}
            className="flex items-center gap-2"
          >
            <LayoutGrid className="h-4 w-4" />
            {designerMode ? 'Exit Designer' : 'Layout Designer'}
          </Button>

          <Button variant="outline" onClick={handleExportCSV} className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            CSV Export
          </Button>

          {hasPermission('Table.Create') && (
            <Button onClick={() => setShowAddTableModal(true)} className="flex items-center gap-1.5">
              <Plus className="h-4.5 w-4.5" />
              Add Table
            </Button>
          )}
        </div>
      </div>

      {/* Floors Swiper Selector */}
      <div className="flex border-b border-border overflow-x-auto gap-2 scrollbar-none pb-2">
        {floors.map((fl) => (
          <button
            key={fl.id}
            onClick={() => {
              setSelectedFloorId(fl.id);
              setSelectedTable(null);
            }}
            className={`px-6 py-3 font-semibold border-b-2 text-sm transition-all whitespace-nowrap cursor-pointer ${
              selectedFloorId === fl.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {fl.name} ({fl.tables.length} Tables)
          </button>
        ))}
      </div>

      {/* Canvas Layout & Right Drawer Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Floor grid workspace */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          {/* Canvas Tools Toolbar */}
          <div className="flex flex-wrap items-center justify-between bg-card p-3 rounded-xl border border-border gap-3 shadow-md">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">Controls:</span>
              <button
                onClick={() => setZoom(Math.max(0.6, zoom - 0.1))}
                className="p-1.5 rounded bg-accent hover:text-foreground cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <span className="font-mono px-2 py-0.5 bg-background rounded">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={() => setZoom(Math.min(1.5, zoom + 0.1))}
                className="p-1.5 rounded bg-accent hover:text-foreground cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs font-semibold select-none cursor-pointer">
                <input
                  type="checkbox"
                  checked={snapToGrid}
                  onChange={(e) => setSnapToGrid(e.target.checked)}
                  className="rounded border-border accent-primary"
                />
                Snap to Grid
              </label>

              <button
                onClick={() => setIsLockedLayout(!isLockedLayout)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                  isLockedLayout
                    ? 'bg-neutral-800 text-neutral-400 border-neutral-700'
                    : 'bg-primary/20 text-primary border-primary/50'
                }`}
              >
                {isLockedLayout ? (
                  <>
                    <Lock className="h-3.5 w-3.5" /> Locked
                  </>
                ) : (
                  <>
                    <Unlock className="h-3.5 w-3.5" /> Draggable
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Draggable Floor Layout Area */}
          <div className="relative border border-border rounded-2xl bg-[#0b0c10] shadow-inner overflow-auto h-[620px]">
            {/* Snap Grid Background rendering */}
            {snapToGrid && (
              <div
                className="absolute inset-0 pointer-events-none opacity-[0.03]"
                style={{
                  backgroundImage: `radial-gradient(circle, #fff 1.5px, transparent 1.5px)`,
                  backgroundSize: '20px 20px',
                }}
              />
            )}

            <div
              ref={canvasRef}
              onMouseMove={handleMouseMove}
              onMouseUp={handleDragEnd}
              onMouseLeave={handleDragEnd}
              className="relative w-[1000px] h-[700px] origin-top-left transition-all"
              style={{ transform: `scale(${zoom})` }}
            >
              {tables.map((table) => {
                const posX = table.position?.x || 100;
                const posY = table.position?.y || 100;
                const isSelected = selectedTable?.id === table.id;

                // Build Table Shape styling dynamically
                const getShapeStyle = () => {
                  switch (table.shape) {
                    case 'ROUND':
                      return 'rounded-full';
                    case 'BOOTH':
                      return 'rounded-xl border-l-[6px] border-primary';
                    case 'BAR_STOOL':
                      return 'rounded-full scale-90 border-[3px] border-dashed';
                    default:
                      return 'rounded-lg';
                  }
                };

                return (
                  <div
                    key={table.id}
                    onMouseDown={(e) => {
                      setSelectedTable(table);
                      handleDragStart(e, table);
                    }}
                    style={{
                      left: posX,
                      top: posY,
                      width: table.width || 80,
                      height: table.height || 80,
                      transform: `rotate(${table.rotation || 0}deg)`,
                      borderWidth: isSelected ? '3px' : '1px',
                    }}
                    className={`absolute flex flex-col items-center justify-center p-2 text-center shadow-lg transition-colors select-none cursor-pointer duration-75 ${getShapeStyle()} ${
                      isSelected
                        ? 'border-primary ring-2 ring-primary/30 shadow-primary/20 bg-primary/10'
                        : table.status === 'AVAILABLE'
                        ? 'border-emerald-500/40 bg-emerald-950/20 text-emerald-300'
                        : table.status === 'OCCUPIED'
                        ? 'border-rose-500/40 bg-rose-950/20 text-rose-300'
                        : table.status === 'RESERVED'
                        ? 'border-amber-500/40 bg-amber-950/20 text-amber-300'
                        : 'border-cyan-500/40 bg-cyan-950/20 text-cyan-300'
                    }`}
                  >
                    {/* Waiter assigned Indicator */}
                    {table.status === 'OCCUPIED' && (
                      <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-rose-500 animate-ping" />
                    )}

                    <span className="font-extrabold text-sm tracking-wide">
                      {table.tableNumber}
                    </span>
                    <span className="text-[10px] opacity-75">Cap: {table.capacity}</span>
                    {table.status !== 'AVAILABLE' && (
                      <span className="text-[9px] mt-0.5 px-1 bg-background/50 rounded font-bold uppercase tracking-wider scale-90">
                        {table.status}
                      </span>
                    )}
                  </div>
                );
              })}

              {tables.length === 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground gap-3">
                  <LayoutGrid className="h-10 w-10 text-muted-foreground/50" />
                  <p className="text-sm">No tables placed on this floor yet.</p>
                  <Button variant="outline" size="sm" onClick={() => setShowAddTableModal(true)}>
                    Place First Table
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Drawer Info Panel */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <Card className="p-6 border border-border shadow-lg">
            <h2 className="text-lg font-bold border-b border-border pb-3 flex items-center gap-2">
              <Info className="h-5 w-5 text-primary" />
              Table Details
            </h2>

            {selectedTable ? (
              <div className="mt-4 space-y-5">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-2xl font-black">{selectedTable.tableNumber}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Shape: {selectedTable.shape} | Max Guests: {selectedTable.maxGuests}
                    </p>
                  </div>
                  <Badge variant={getStatusColor(selectedTable.status)} className="capitalize py-1 px-3">
                    {selectedTable.status}
                  </Badge>
                </div>

                {/* Open Session Logs */}
                {selectedTable.status === 'OCCUPIED' && selectedTable.sessions.length > 0 && (
                  <div className="bg-rose-950/20 border border-rose-500/20 rounded-xl p-4 space-y-3.5">
                    <h4 className="text-sm font-bold text-rose-300 flex items-center gap-1.5 border-b border-rose-500/10 pb-1.5">
                      <Clock className="h-4.5 w-4.5" /> Open Session Info
                    </h4>

                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-muted-foreground block">Waiter Assigned</span>
                        <span className="font-bold text-foreground flex items-center gap-1 mt-0.5">
                          <UserIcon className="h-3.5 w-3.5 text-primary" />
                          {selectedTable.sessions[0].waiter?.displayName || 'None'}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Guests Count</span>
                        <span className="font-bold text-foreground mt-0.5">
                          {selectedTable.sessions[0].guests} Seated
                        </span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-muted-foreground block">Started At</span>
                        <span className="font-bold text-foreground mt-0.5">
                          {new Date(selectedTable.sessions[0].startTime).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action buttons drawer */}
                <div className="flex flex-col gap-2 pt-4 border-t border-border">
                  {selectedTable.status === 'AVAILABLE' && (
                    <div className="space-y-3.5">
                      <div className="space-y-1.5">
                        <label className="text-xs text-muted-foreground font-semibold">
                          Party Size (Guests)
                        </label>
                        <input
                          type="number"
                          value={sessionGuests}
                          onChange={(e) => setSessionGuests(Number(e.target.value))}
                          className="w-full bg-accent border border-border rounded-lg px-3 py-2 text-sm text-foreground"
                          min="1"
                          max={selectedTable.maxGuests}
                        />
                      </div>

                      <Button
                        onClick={() =>
                          openSessionMutation.mutate({
                            tableId: selectedTable.id,
                            guests: sessionGuests,
                          })
                        }
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                      >
                        Open Table Session
                      </Button>
                    </div>
                  )}

                  {selectedTable.status === 'OCCUPIED' && (
                    <Button
                      onClick={() => closeSessionMutation.mutate({ tableId: selectedTable.id })}
                      className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold"
                    >
                      Settle & Close Table
                    </Button>
                  )}

                  {/* Transfer / Merges Options */}
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowTransferModal(true)}
                      className="flex items-center gap-1 text-xs"
                    >
                      <UserCheck className="h-3.5 w-3.5" /> Transfer
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowMergeModal(true)}
                      className="flex items-center gap-1 text-xs"
                    >
                      <Split className="h-3.5 w-3.5" /> Merge
                    </Button>
                  </div>

                  {selectedTable.status === 'MERGED' && selectedTable.mergeItem && (
                    <Button
                      onClick={() =>
                        splitTablesMutation.mutate({
                          mergeId: selectedTable.mergeItem?.merge.id,
                        })
                      }
                      variant="outline"
                      className="w-full text-xs font-bold text-amber-500 border-amber-500/50 hover:bg-amber-950/20"
                    >
                      Split Tables Group
                    </Button>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowQRModal(true)}
                      className="flex items-center justify-center gap-1.5"
                    >
                      <FileText className="h-4 w-4" /> QR Code
                    </Button>

                    {selectedTable.status !== 'AVAILABLE' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          updateTableMutation.mutate({
                            id: selectedTable.id,
                            data: { status: 'AVAILABLE' },
                          })
                        }
                      >
                        Release Status
                      </Button>
                    )}
                  </div>

                  {/* Layout rotation duplicates locked options */}
                  {!isLockedLayout && (
                    <div className="border-t border-border mt-4 pt-4 space-y-2">
                      <p className="text-[11px] font-bold text-amber-500 flex items-center gap-1">
                        <AlertTriangle className="h-3.5 w-3.5" /> Layout Designer Mode Active
                      </p>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={rotateSelectedTable}
                          className="flex items-center justify-center gap-1.5 bg-accent hover:bg-accent/80 text-foreground py-2 text-xs font-semibold rounded-lg border border-border"
                        >
                          <RotateCw className="h-3.5 w-3.5" /> Rotate 45°
                        </button>
                        <button
                          onClick={duplicateSelectedTable}
                          className="flex items-center justify-center gap-1.5 bg-accent hover:bg-accent/80 text-foreground py-2 text-xs font-semibold rounded-lg border border-border"
                        >
                          <Copy className="h-3.5 w-3.5" /> Duplicate
                        </button>
                      </div>

                      {hasPermission('Table.Delete') && (
                        <Button
                          onClick={() => deleteTableMutation.mutate(selectedTable.id)}
                          variant="outline"
                          className="w-full text-rose-500 border-rose-500/40 hover:bg-rose-950/20 text-xs"
                        >
                          <Trash2 className="h-4 w-4 mr-1.5 inline" /> Delete Object
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-16 text-muted-foreground">
                <Move className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm">Click a table on the floor plan to view details or manage sessions.</p>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* MODALS SECTION */}

      {/* 1. Add Table Modal */}
      {showAddTableModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <h3 className="text-lg font-bold">Place New Table</h3>
              <button
                onClick={() => setShowAddTableModal(false)}
                className="p-1 rounded-full hover:bg-accent text-muted-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground font-bold">Table Number</label>
                <input
                  type="text"
                  placeholder="e.g. T09"
                  value={newTableNum}
                  onChange={(e) => setNewTableNum(e.target.value)}
                  className="w-full bg-accent border border-border rounded-lg px-3 py-2 mt-1 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground font-bold">Table Shape</label>
                  <select
                    value={newTableShape}
                    onChange={(e) => setNewTableShape(e.target.value)}
                    className="w-full bg-accent border border-border rounded-lg px-3 py-2 mt-1 text-sm"
                  >
                    <option value="SQUARE">Square</option>
                    <option value="RECTANGLE">Rectangle</option>
                    <option value="ROUND">Round</option>
                    <option value="BOOTH">Booth</option>
                    <option value="BAR_STOOL">Bar Stool</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground font-bold">Capacity</label>
                  <input
                    type="number"
                    value={newTableCapacity}
                    onChange={(e) => setNewTableCapacity(Number(e.target.value))}
                    className="w-full bg-accent border border-border rounded-lg px-3 py-2 mt-1 text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowAddTableModal(false)}>
                Cancel
              </Button>
              <Button
                onClick={() =>
                  createTableMutation.mutate({
                    tableNumber: newTableNum,
                    shape: newTableShape,
                    capacity: newTableCapacity,
                    floorId: selectedFloorId,
                    branchId: floors[0]?.branchId,
                  })
                }
                disabled={!newTableNum}
              >
                Place Table
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 2. QR Code Modal */}
      {showQRModal && selectedTable && selectedTable.qrCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl w-full max-w-sm p-6 text-center space-y-4">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <h3 className="text-lg font-bold">Table QR Code: {selectedTable.tableNumber}</h3>
              <button
                onClick={() => setShowQRModal(false)}
                className="p-1 rounded-full hover:bg-accent text-muted-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div
              className="w-48 h-48 mx-auto bg-white p-2 rounded-xl border border-neutral-300"
              dangerouslySetInnerHTML={{ __html: selectedTable.qrCode.svgString }}
            />

            <p className="text-xs text-muted-foreground">
              Scan code to open customer digital menu for Table {selectedTable.tableNumber}.
            </p>

            <div className="flex justify-center pt-2">
              <Button variant="outline" onClick={() => setShowQRModal(false)} className="w-full">
                Close View
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Merges Modal */}
      {showMergeModal && selectedTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <h3 className="text-lg font-bold">Merge Tables Layout</h3>
              <button
                onClick={() => setShowMergeModal(false)}
                className="p-1 rounded-full hover:bg-accent text-muted-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-sm text-muted-foreground">
              Select tables to merge with <span className="font-extrabold text-foreground">{selectedTable.tableNumber}</span>. Selected tables will share the same dining orders bill.
            </p>

            <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
              {tables
                .filter((t) => t.id !== selectedTable.id && t.status === 'AVAILABLE')
                .map((tab) => {
                  const isChecked = mergeTargetTableIds.includes(tab.id);
                  return (
                    <button
                      key={tab.id}
                      onClick={() =>
                        isChecked
                          ? setMergeTargetTableIds(mergeTargetTableIds.filter((id) => id !== tab.id))
                          : setMergeTargetTableIds([...mergeTargetTableIds, tab.id])
                      }
                      className={`p-3 text-sm font-bold border rounded-xl transition-all ${
                        isChecked
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'border-border text-muted-foreground hover:border-foreground'
                      }`}
                    >
                      {tab.tableNumber}
                    </button>
                  );
                })}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button variant="outline" onClick={() => setShowMergeModal(false)}>
                Cancel
              </Button>
              <Button
                disabled={mergeTargetTableIds.length === 0}
                onClick={() =>
                  mergeTablesMutation.mutate({
                    parentTableId: selectedTable.id,
                    childTableIds: mergeTargetTableIds,
                  })
                }
              >
                Confirm Merge Group
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Transfers Modal */}
      {showTransferModal && selectedTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <h3 className="text-lg font-bold">Transfer Dining Session</h3>
              <button
                onClick={() => setShowTransferModal(false)}
                className="p-1 rounded-full hover:bg-accent text-muted-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-sm text-muted-foreground">
              Select destination table to transfer the active session of <span className="font-extrabold text-foreground">{selectedTable.tableNumber}</span>.
            </p>

            <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
              {tables
                .filter((t) => t.id !== selectedTable.id && t.status === 'AVAILABLE')
                .map((tab) => {
                  const isChecked = transferTargetTableId === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setTransferTargetTableId(tab.id)}
                      className={`p-3 text-sm font-bold border rounded-xl transition-all ${
                        isChecked
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'border-border text-muted-foreground hover:border-foreground'
                      }`}
                    >
                      {tab.tableNumber}
                    </button>
                  );
                })}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button variant="outline" onClick={() => setShowTransferModal(false)}>
                Cancel
              </Button>
              <Button
                disabled={!transferTargetTableId}
                onClick={() =>
                  transferTableMutation.mutate({
                    fromTableId: selectedTable.id,
                    toTableId: transferTargetTableId,
                  })
                }
              >
                Confirm Transfer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FloorManagement;
