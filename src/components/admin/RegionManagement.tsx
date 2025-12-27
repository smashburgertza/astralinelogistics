import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { 
  DollarSign, 
  MapPin, 
  Edit2, 
  Loader2, 
  Phone, 
  Mail, 
  Building,
  Plus,
  Trash2,
  Globe,
  GripVertical,
  Eye,
  Copy,
  Check
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  useRegionPricing, 
  useAgentAddresses, 
  useUpdateRegionPricing,
  useUpdateAgentAddress,
  useCreateRegionPricing,
  useCreateAgentAddress,
} from '@/hooks/useRegionPricing';
import { 
  useRegions, 
  useCreateRegion, 
  useUpdateRegion, 
  useDeleteRegion,
  useReorderRegions,
  Region 
} from '@/hooks/useRegions';
import { CURRENCY_SYMBOLS, COMMON_CURRENCIES } from '@/lib/constants';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const pricingSchema = z.object({
  customer_rate_per_kg: z.coerce.number().min(0, 'Rate must be positive'),
  agent_rate_per_kg: z.coerce.number().min(0, 'Rate must be positive'),
  handling_fee: z.coerce.number().min(0, 'Fee must be positive'),
  currency: z.string().min(1, 'Currency is required'),
});

const addressSchema = z.object({
  address_line1: z.string().min(1, 'Address is required'),
  address_line2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  postal_code: z.string().optional(),
  country: z.string().min(1, 'Country is required'),
  contact_name: z.string().optional(),
  contact_phone: z.string().optional(),
  contact_email: z.string().email().optional().or(z.literal('')),
});

const regionSchema = z.object({
  code: z.string().min(1, 'Code is required').regex(/^[a-z_]+$/, 'Code must be lowercase letters and underscores only'),
  name: z.string().min(1, 'Name is required'),
  flag_emoji: z.string().optional(),
  is_active: z.boolean().default(true),
  display_order: z.coerce.number().min(0).default(0),
  default_currency: z.string().min(1, 'Currency is required').default('USD'),
});

type PricingFormValues = z.infer<typeof pricingSchema>;
type AddressFormValues = z.infer<typeof addressSchema>;
type RegionFormValues = z.infer<typeof regionSchema>;

interface RegionPricingData {
  id: string;
  region: string;
  region_id: string | null;
  customer_rate_per_kg: number;
  agent_rate_per_kg: number;
  handling_fee: number | null;
  currency: string;
}

interface AgentAddressData {
  id: string;
  region: string;
  region_id: string | null;
  address_line1: string;
  address_line2: string | null;
  city: string;
  postal_code: string | null;
  country: string;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
}

interface RegionWithData extends Region {
  pricing?: RegionPricingData;
  address?: AgentAddressData;
}

interface SortableRegionItemProps {
  region: RegionWithData;
  openRegionDialog: (region: Region) => void;
  openPricingDialog: (pricing: RegionPricingData) => void;
  openAddressDialog: (regionCode: string, regionId: string, address: AgentAddressData | null) => void;
  setDeletingRegion: (region: Region) => void;
  setEditingPricing: (pricing: RegionPricingData) => void;
  pricingForm: any;
}

function SortableRegionItem({
  region,
  openRegionDialog,
  openPricingDialog,
  openAddressDialog,
  setDeletingRegion,
  setEditingPricing,
  pricingForm,
}: SortableRegionItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: region.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const currencySymbol = region.pricing 
    ? CURRENCY_SYMBOLS[region.pricing.currency] || region.pricing.currency
    : '$';

  return (
    <div ref={setNodeRef} style={style}>
      <AccordionItem 
        value={region.id}
        className="border rounded-lg bg-card shadow-sm overflow-hidden"
      >
        <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50">
          <div className="flex items-center gap-3 flex-1">
            <button
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded touch-none"
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical className="w-4 h-4 text-muted-foreground" />
            </button>
            <span className="text-2xl">{region.flag_emoji || '🌍'}</span>
            <div className="text-left">
              <div className="font-semibold flex items-center gap-2">
                {region.name}
                <span className="text-xs text-muted-foreground font-mono">({region.code})</span>
                {(region.pricing?.currency || region.default_currency) && (
                  <Badge variant="outline" className="text-xs font-normal">
                    {region.pricing?.currency || region.default_currency}
                  </Badge>
                )}
              </div>
              <div className="text-sm text-muted-foreground">
                {region.pricing 
                  ? `${currencySymbol}${region.pricing.customer_rate_per_kg}/kg`
                  : 'No pricing set'
                }
              </div>
            </div>
            {!region.is_active && (
              <Badge variant="secondary" className="ml-2">
                Inactive
              </Badge>
            )}
            {!region.pricing && (
              <Badge variant="outline" className="ml-auto mr-4 text-amber-600 border-amber-300">
                Setup Required
              </Badge>
            )}
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-4 pb-4">
          <div className="flex justify-end gap-2 mb-4">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => openRegionDialog(region)}
            >
              <Edit2 className="w-3 h-3 mr-1" />
              Edit Region
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => setDeletingRegion(region)}
            >
              <Trash2 className="w-3 h-3 mr-1" />
              Delete
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Pricing Card */}
            <Card className="border-0 shadow-none bg-muted/30">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-primary" />
                    Pricing
                  </CardTitle>
                  {region.pricing && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => openPricingDialog(region.pricing as RegionPricingData)}
                    >
                      <Edit2 className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {region.pricing ? (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Customer Rate</span>
                      <span className="font-medium">
                        {currencySymbol}{region.pricing.customer_rate_per_kg}/kg
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Agent Rate</span>
                      <span className="font-medium">
                        {currencySymbol}{region.pricing.agent_rate_per_kg}/kg
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Handling Fee</span>
                      <span className="font-medium">
                        {currencySymbol}{region.pricing.handling_fee || 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Currency</span>
                      <span className="font-medium">{region.pricing.currency}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground mb-2">
                      No pricing configured
                    </p>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        setEditingPricing({
                          id: '',
                          region: region.code,
                          region_id: region.id,
                          customer_rate_per_kg: 0,
                          agent_rate_per_kg: 0,
                          handling_fee: 0,
                          currency: 'USD',
                        });
                        pricingForm.reset({
                          customer_rate_per_kg: 0,
                          agent_rate_per_kg: 0,
                          handling_fee: 0,
                          currency: 'USD',
                        });
                      }}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Set Pricing
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Address Card */}
            <Card className="border-0 shadow-none bg-muted/30">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary" />
                    Warehouse Address
                  </CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => openAddressDialog(region.code, region.id, region.address as AgentAddressData | null)}
                  >
                    {region.address ? (
                      <>
                        <Edit2 className="w-3 h-3 mr-1" />
                        Edit
                      </>
                    ) : (
                      <>
                        <Plus className="w-3 h-3 mr-1" />
                        Add
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {region.address ? (
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <Building className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <div>
                        <div>{region.address.address_line1}</div>
                        {region.address.address_line2 && (
                          <div>{region.address.address_line2}</div>
                        )}
                        <div>
                          {region.address.city}
                          {region.address.postal_code && `, ${region.address.postal_code}`}
                        </div>
                        <div>{region.address.country}</div>
                      </div>
                    </div>
                    {region.address.contact_name && (
                      <div className="flex items-center gap-2 pt-2 border-t">
                        <span className="text-muted-foreground">Contact:</span>
                        <span>{region.address.contact_name}</span>
                      </div>
                    )}
                    {region.address.contact_phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3 h-3 text-muted-foreground" />
                        <span>{region.address.contact_phone}</span>
                      </div>
                    )}
                    {region.address.contact_email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-3 h-3 text-muted-foreground" />
                        <span>{region.address.contact_email}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground">
                      No address configured
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </AccordionContent>
      </AccordionItem>
    </div>
  );
}

// Preview component showing how regions appear on the public site
function PublicSitePreview({ regions }: { regions: RegionWithData[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const activeRegions = regions.filter(r => r.is_active);

  const copyAddress = (region: RegionWithData) => {
    if (!region.address) return;
    const address = region.address;
    const fullAddress = `${address.address_line1}${address.address_line2 ? ', ' + address.address_line2 : ''}, ${address.city}${address.postal_code ? ' ' + address.postal_code : ''}, ${address.country}`;
    navigator.clipboard.writeText(fullAddress);
    setCopiedId(region.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <Card className="mt-6">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-primary" />
                <CardTitle className="text-lg">Public Site Preview</CardTitle>
              </div>
              <Badge variant="outline" className="text-xs">
                {isOpen ? 'Click to collapse' : 'Click to expand'}
              </Badge>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-6">
            {/* Footer "We Ship From" Preview */}
            <div className="rounded-xl bg-[#0f172a] p-6">
              <h4 className="font-semibold text-sm text-muted-foreground mb-3 uppercase tracking-wide">
                Footer: "We Ship From" Section
              </h4>
              <div className="bg-[#1e293b] rounded-lg p-4">
                <h5 className="font-semibold text-white mb-4">We Ship From</h5>
                <ul className="space-y-2 text-sm text-white/70">
                  {activeRegions.map((region) => (
                    <li key={region.id} className="flex items-center gap-2">
                      <span className="text-lg">{region.flag_emoji || '🌍'}</span>
                      {region.name}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Agent Addresses Preview */}
            <div className="rounded-xl bg-[#0f172a] p-6">
              <h4 className="font-semibold text-sm text-muted-foreground mb-3 uppercase tracking-wide">
                Agent Delivery Addresses Section
              </h4>
              <div className="text-center mb-6">
                <span className="inline-block px-4 py-2 rounded-full bg-primary/20 text-primary font-semibold text-xs uppercase tracking-wide mb-3">
                  Global Network
                </span>
                <h5 className="text-2xl font-bold text-white mb-2">
                  Agent Delivery Addresses
                </h5>
                <p className="text-white/70 text-sm max-w-xl mx-auto">
                  Send your goods to our trusted agents in these locations.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeRegions.map((region) => (
                  <div 
                    key={region.id}
                    className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-3xl">{region.flag_emoji || '🌍'}</span>
                      <h6 className="font-semibold text-white">{region.name}</h6>
                    </div>
                    {region.address ? (
                      <>
                        <div className="flex items-start gap-2 text-xs text-white/80 mb-3">
                          <MapPin className="w-3 h-3 mt-0.5 text-primary shrink-0" />
                          <div>
                            <p>{region.address.address_line1}</p>
                            {region.address.address_line2 && <p>{region.address.address_line2}</p>}
                            <p>{region.address.city} {region.address.postal_code}</p>
                            <p>{region.address.country}</p>
                          </div>
                        </div>
                        <Button 
                          variant="outline"
                          size="sm" 
                          className="w-full bg-transparent border-white/20 text-white hover:bg-white hover:text-[#0f172a] transition-all text-xs"
                          onClick={() => copyAddress(region)}
                        >
                          {copiedId === region.id ? (
                            <>
                              <Check className="w-3 h-3 mr-1" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3 mr-1" />
                              Copy Address
                            </>
                          )}
                        </Button>
                      </>
                    ) : (
                      <p className="text-xs text-amber-400 italic">No address configured</p>
                    )}
                  </div>
                ))}
              </div>
              {activeRegions.length === 0 && (
                <p className="text-center text-white/50 py-8">
                  No active regions to display
                </p>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

export function RegionManagement() {
  const { data: regions, isLoading: regionsLoading } = useRegions();
  const { data: pricing, isLoading: pricingLoading } = useRegionPricing();
  const { data: addresses, isLoading: addressesLoading } = useAgentAddresses();
  const updatePricing = useUpdateRegionPricing();
  const updateAddress = useUpdateAgentAddress();
  const createPricing = useCreateRegionPricing();
  const createAddress = useCreateAgentAddress();
  const createRegion = useCreateRegion();
  const updateRegion = useUpdateRegion();
  const deleteRegion = useDeleteRegion();
  const reorderRegions = useReorderRegions();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const [editingPricing, setEditingPricing] = useState<RegionPricingData | null>(null);
  const [editingAddress, setEditingAddress] = useState<{ regionCode: string; regionId: string; address: AgentAddressData | null } | null>(null);
  const [editingRegion, setEditingRegion] = useState<Region | null>(null);
  const [isCreatingRegion, setIsCreatingRegion] = useState(false);
  const [deletingRegion, setDeletingRegion] = useState<Region | null>(null);

  const pricingForm = useForm<PricingFormValues>({
    resolver: zodResolver(pricingSchema),
  });

  const addressForm = useForm<AddressFormValues>({
    resolver: zodResolver(addressSchema),
  });

  const regionForm = useForm<RegionFormValues>({
    resolver: zodResolver(regionSchema),
    defaultValues: {
      is_active: true,
      display_order: 0,
      default_currency: 'USD',
    },
  });

  const openPricingDialog = (regionPricing: RegionPricingData) => {
    setEditingPricing(regionPricing);
    pricingForm.reset({
      customer_rate_per_kg: regionPricing.customer_rate_per_kg,
      agent_rate_per_kg: regionPricing.agent_rate_per_kg,
      handling_fee: regionPricing.handling_fee || 0,
      currency: regionPricing.currency,
    });
  };

  const openAddressDialog = (regionCode: string, regionId: string, address: AgentAddressData | null) => {
    setEditingAddress({ regionCode, regionId, address });
    if (address) {
      addressForm.reset({
        address_line1: address.address_line1,
        address_line2: address.address_line2 || '',
        city: address.city,
        postal_code: address.postal_code || '',
        country: address.country,
        contact_name: address.contact_name || '',
        contact_phone: address.contact_phone || '',
        contact_email: address.contact_email || '',
      });
    } else {
      addressForm.reset({
        address_line1: '',
        address_line2: '',
        city: '',
        postal_code: '',
        country: '',
        contact_name: '',
        contact_phone: '',
        contact_email: '',
      });
    }
  };

  const openRegionDialog = (region?: Region) => {
    if (region) {
      setEditingRegion(region);
      setIsCreatingRegion(false);
      regionForm.reset({
        code: region.code,
        name: region.name,
        flag_emoji: region.flag_emoji || '',
        is_active: region.is_active,
        display_order: region.display_order,
        default_currency: region.default_currency || 'USD',
      });
    } else {
      setEditingRegion(null);
      setIsCreatingRegion(true);
      regionForm.reset({
        code: '',
        name: '',
        flag_emoji: '',
        is_active: true,
        display_order: (regions?.length || 0) + 1,
        default_currency: 'USD',
      });
    }
  };

  const handlePricingSubmit = async (values: PricingFormValues) => {
    if (editingPricing) {
      if (editingPricing.id) {
        await updatePricing.mutateAsync({
          id: editingPricing.id,
          ...values,
        });
      } else {
        // Create new pricing
        await createPricing.mutateAsync({
          region: editingPricing.region as 'europe' | 'dubai' | 'china' | 'india',
          customer_rate_per_kg: values.customer_rate_per_kg,
          agent_rate_per_kg: values.agent_rate_per_kg,
          handling_fee: values.handling_fee,
          currency: values.currency,
        });
      }
      setEditingPricing(null);
    }
  };

  const handleAddressSubmit = async (values: AddressFormValues) => {
    if (editingAddress) {
      if (editingAddress.address) {
        await updateAddress.mutateAsync({
          id: editingAddress.address.id,
          ...values,
          contact_email: values.contact_email || null,
        });
      } else {
        await createAddress.mutateAsync({
          region: editingAddress.regionCode as any,
          address_line1: values.address_line1,
          address_line2: values.address_line2 || undefined,
          city: values.city,
          postal_code: values.postal_code || undefined,
          country: values.country,
          contact_name: values.contact_name || undefined,
          contact_phone: values.contact_phone || undefined,
          contact_email: values.contact_email || undefined,
        });
      }
      setEditingAddress(null);
    }
  };

  const handleRegionSubmit = async (values: RegionFormValues) => {
    if (isCreatingRegion) {
      await createRegion.mutateAsync({
        code: values.code,
        name: values.name,
        flag_emoji: values.flag_emoji || undefined,
        is_active: values.is_active,
        display_order: values.display_order,
        default_currency: values.default_currency,
      });
    } else if (editingRegion) {
      await updateRegion.mutateAsync({
        id: editingRegion.id,
        name: values.name,
        flag_emoji: values.flag_emoji || undefined,
        is_active: values.is_active,
        display_order: values.display_order,
        default_currency: values.default_currency,
      });
    }
    setEditingRegion(null);
    setIsCreatingRegion(false);
  };

  const handleDeleteRegion = async () => {
    if (deletingRegion) {
      await deleteRegion.mutateAsync(deletingRegion.id);
      setDeletingRegion(null);
    }
  };

  const isLoading = regionsLoading || pricingLoading || addressesLoading;

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  // Build region data with pricing and addresses
  const regionData: RegionWithData[] = (regions || []).map((region) => ({
    ...region,
    pricing: pricing?.find(p => p.region === region.code || p.region_id === region.id),
    address: addresses?.find(a => a.region === region.code || a.region_id === region.id),
  }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = regionData.findIndex((r) => r.id === active.id);
      const newIndex = regionData.findIndex((r) => r.id === over.id);

      const newOrder = arrayMove(regionData, oldIndex, newIndex);
      
      // Update display_order for all affected regions
      const updates = newOrder.map((region, index) => ({
        id: region.id,
        display_order: index,
      }));

      reorderRegions.mutate(updates);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Region Configuration</h2>
          <p className="text-sm text-muted-foreground">
            Manage regions, pricing, and warehouse addresses. Drag to reorder.
          </p>
        </div>
        <Button onClick={() => openRegionDialog()}>
          <Plus className="w-4 h-4 mr-2" />
          Add Region
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={regionData.map((r) => r.id)}
          strategy={verticalListSortingStrategy}
        >
          <Accordion type="single" collapsible className="space-y-3">
            {regionData.map((region) => (
              <SortableRegionItem
                key={region.id}
                region={region}
                openRegionDialog={openRegionDialog}
                openPricingDialog={openPricingDialog}
                openAddressDialog={openAddressDialog}
                setDeletingRegion={setDeletingRegion}
                setEditingPricing={setEditingPricing}
                pricingForm={pricingForm}
              />
            ))}
          </Accordion>
        </SortableContext>
      </DndContext>

      {regionData.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Globe className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Regions Configured</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Add your first region to get started with shipping configuration.
            </p>
            <Button onClick={() => openRegionDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Add Region
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Public Site Preview */}
      <PublicSitePreview regions={regionData} />
      <Dialog open={!!editingRegion || isCreatingRegion} onOpenChange={(open) => {
        if (!open) {
          setEditingRegion(null);
          setIsCreatingRegion(false);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isCreatingRegion ? 'Add New Region' : 'Edit Region'}
            </DialogTitle>
            <DialogDescription>
              {isCreatingRegion 
                ? 'Create a new shipping region for your network.'
                : 'Update the region details.'}
            </DialogDescription>
          </DialogHeader>
          <Form {...regionForm}>
            <form onSubmit={regionForm.handleSubmit(handleRegionSubmit)} className="space-y-4">
              <FormField
                control={regionForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Region Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Western Europe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={regionForm.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., western_europe" 
                        {...field} 
                        disabled={!!editingRegion}
                      />
                    </FormControl>
                    <FormDescription>
                      Unique identifier (lowercase, underscores only)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={regionForm.control}
                name="flag_emoji"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Flag Emoji</FormLabel>
                    <FormControl>
                      <Input placeholder="🇪🇺" {...field} />
                    </FormControl>
                    <FormDescription>
                      Optional flag emoji for display
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={regionForm.control}
                name="display_order"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Order</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={regionForm.control}
                name="default_currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Currency</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {COMMON_CURRENCIES.map((currency) => (
                          <SelectItem key={currency.code} value={currency.code}>
                            {currency.symbol} {currency.code} - {currency.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Default currency for pricing and invoices in this region
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={regionForm.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Active</FormLabel>
                      <FormDescription>
                        Inactive regions won't appear in shipping calculators
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditingRegion(null);
                    setIsCreatingRegion(false);
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createRegion.isPending || updateRegion.isPending}
                >
                  {(createRegion.isPending || updateRegion.isPending) && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  {isCreatingRegion ? 'Create Region' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingRegion} onOpenChange={(open) => !open && setDeletingRegion(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Region?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingRegion?.name}"? This will also remove associated pricing and address configurations. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRegion}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteRegion.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Pricing Edit Dialog */}
      <Dialog open={!!editingPricing} onOpenChange={(open) => !open && setEditingPricing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingPricing?.id ? 'Edit' : 'Set'} Pricing
            </DialogTitle>
            <DialogDescription>
              Configure the shipping rates for this region.
            </DialogDescription>
          </DialogHeader>
          <Form {...pricingForm}>
            <form onSubmit={pricingForm.handleSubmit(handlePricingSubmit)} className="space-y-4">
              <FormField
                control={pricingForm.control}
                name="customer_rate_per_kg"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Rate (per kg)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={pricingForm.control}
                name="agent_rate_per_kg"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Agent Rate (per kg)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={pricingForm.control}
                name="handling_fee"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Handling Fee (flat)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={pricingForm.control}
                name="currency"
                render={({ field }) => {
                  // Find the region's default currency
                  const regionDefaultCurrency = regions?.find(
                    r => r.code === editingPricing?.region || r.id === editingPricing?.region_id
                  )?.default_currency;
                  const showCurrencyWarning = regionDefaultCurrency && field.value && field.value !== regionDefaultCurrency;
                  
                  return (
                    <FormItem>
                      <FormLabel>Currency</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select currency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {COMMON_CURRENCIES.map((currency) => (
                            <SelectItem key={currency.code} value={currency.code}>
                              {currency.symbol} {currency.code} - {currency.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {showCurrencyWarning && (
                        <Alert variant="default" className="mt-2 border-amber-300 bg-amber-50 dark:bg-amber-950/20">
                          <AlertDescription className="text-amber-700 dark:text-amber-400 text-xs">
                            This differs from the region's default currency ({regionDefaultCurrency}). 
                            Pricing will display in {field.value}.
                          </AlertDescription>
                        </Alert>
                      )}
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingPricing(null)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={updatePricing.isPending || createPricing.isPending}
                >
                  {(updatePricing.isPending || createPricing.isPending) && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  Save
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Address Edit Dialog */}
      <Dialog open={!!editingAddress} onOpenChange={(open) => !open && setEditingAddress(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingAddress?.address ? 'Edit' : 'Add'} Warehouse Address
            </DialogTitle>
            <DialogDescription>
              Configure the warehouse address for this region.
            </DialogDescription>
          </DialogHeader>
          <Form {...addressForm}>
            <form onSubmit={addressForm.handleSubmit(handleAddressSubmit)} className="space-y-4">
              <FormField
                control={addressForm.control}
                name="address_line1"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address Line 1</FormLabel>
                    <FormControl>
                      <Input placeholder="Street address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={addressForm.control}
                name="address_line2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address Line 2 (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Apt, suite, unit, etc." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={addressForm.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input placeholder="City" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={addressForm.control}
                  name="postal_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Postal Code</FormLabel>
                      <FormControl>
                        <Input placeholder="Postal code" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={addressForm.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country</FormLabel>
                    <FormControl>
                      <Input placeholder="Country" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="border-t pt-4 mt-4">
                <h4 className="text-sm font-medium mb-3">Contact Information (optional)</h4>
                <div className="space-y-4">
                  <FormField
                    control={addressForm.control}
                    name="contact_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Contact name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={addressForm.control}
                    name="contact_phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="+1 234 567 8900" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={addressForm.control}
                    name="contact_email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="email@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingAddress(null)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateAddress.isPending || createAddress.isPending}
                >
                  {(updateAddress.isPending || createAddress.isPending) && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  Save
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
