import { useState, useEffect } from 'react';
import { Check, Eye, Pencil, FileText, Palette, Layout, Type, Image, Grid3X3 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { useAllSettings, useUpdateSettings } from '@/hooks/useSettings';
import { cn } from '@/lib/utils';

// Template definitions
const TEMPLATES = [
  {
    id: 'modern-minimal',
    name: 'Modern Minimal',
    description: 'Clean lines, generous whitespace, contemporary feel',
    preview: 'bg-gradient-to-br from-slate-50 to-slate-100',
    accent: 'hsl(var(--primary))',
    style: 'minimal',
  },
  {
    id: 'professional-classic',
    name: 'Professional Classic',
    description: 'Traditional business layout with structured sections',
    preview: 'bg-gradient-to-br from-blue-50 to-indigo-50',
    accent: '#1e40af',
    style: 'classic',
  },
  {
    id: 'bold-modern',
    name: 'Bold Modern',
    description: 'Strong typography with accent color blocks',
    preview: 'bg-gradient-to-br from-violet-50 to-purple-100',
    accent: '#7c3aed',
    style: 'bold',
  },
  {
    id: 'elegant-serif',
    name: 'Elegant Serif',
    description: 'Sophisticated design with serif typography',
    preview: 'bg-gradient-to-br from-amber-50 to-orange-50',
    accent: '#b45309',
    style: 'elegant',
  },
  {
    id: 'tech-startup',
    name: 'Tech Startup',
    description: 'Modern gradient accents with tech aesthetics',
    preview: 'bg-gradient-to-br from-cyan-50 to-teal-50',
    accent: '#0891b2',
    style: 'tech',
  },
];

// Display fields configuration
const DISPLAY_FIELDS = {
  header: [
    { key: 'logo', label: 'Company Logo', default: true },
    { key: 'company_name', label: 'Company Name', default: true },
    { key: 'company_address', label: 'Company Address', default: true },
    { key: 'company_phone', label: 'Phone Number', default: true },
    { key: 'company_email', label: 'Email Address', default: true },
    { key: 'tax_id', label: 'Tax ID / VAT Number', default: false },
    { key: 'website', label: 'Website', default: false },
  ],
  document: [
    { key: 'invoice_number', label: 'Invoice/Estimate Number', default: true, required: true },
    { key: 'issue_date', label: 'Issue Date', default: true, required: true },
    { key: 'due_date', label: 'Due Date', default: true },
    { key: 'payment_terms', label: 'Payment Terms', default: true },
    { key: 'reference', label: 'Reference/PO Number', default: false },
    { key: 'salesperson', label: 'Salesperson', default: false },
  ],
  customer: [
    { key: 'customer_name', label: 'Customer Name', default: true, required: true },
    { key: 'customer_company', label: 'Company Name', default: true },
    { key: 'customer_address', label: 'Billing Address', default: true },
    { key: 'customer_phone', label: 'Phone Number', default: true },
    { key: 'customer_email', label: 'Email Address', default: true },
    { key: 'customer_tax_id', label: 'Customer Tax ID', default: false },
  ],
  items: [
    { key: 'item_service', label: 'Service/Account', default: true },
    { key: 'item_description', label: 'Description', default: true, required: true },
    { key: 'item_quantity', label: 'Quantity', default: true, required: true },
    { key: 'item_rate', label: 'Rate/Unit Price', default: true, required: true },
    { key: 'item_amount', label: 'Amount', default: true, required: true },
    { key: 'item_tax', label: 'Tax per Item', default: false },
    { key: 'item_discount', label: 'Discount per Item', default: false },
  ],
  totals: [
    { key: 'subtotal', label: 'Subtotal', default: true, required: true },
    { key: 'discount', label: 'Discount', default: true },
    { key: 'tax', label: 'Tax', default: true },
    { key: 'shipping', label: 'Shipping/Handling', default: false },
    { key: 'total', label: 'Total', default: true, required: true },
    { key: 'amount_paid', label: 'Amount Paid', default: true },
    { key: 'balance_due', label: 'Balance Due', default: true },
  ],
  footer: [
    { key: 'notes', label: 'Notes/Memo', default: true },
    { key: 'terms', label: 'Terms & Conditions', default: true },
    { key: 'payment_instructions', label: 'Payment Instructions', default: true },
    { key: 'bank_details', label: 'Bank Account Details', default: false },
    { key: 'signature', label: 'Signature Line', default: false },
    { key: 'thank_you', label: 'Thank You Message', default: true },
  ],
};

interface InvoiceSettings {
  selectedTemplate: string;
  displayFields: Record<string, boolean>;
  customColors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  customText: {
    footer_note: string;
    terms: string;
    payment_instructions: string;
    thank_you: string;
  };
  numberFormat: {
    prefix: string;
    padding: number;
  };
}

const defaultSettings: InvoiceSettings = {
  selectedTemplate: 'modern-minimal',
  displayFields: Object.fromEntries(
    Object.values(DISPLAY_FIELDS).flat().map(f => [f.key, f.default])
  ),
  customColors: {
    primary: 'hsl(var(--primary))',
    secondary: 'hsl(var(--secondary))',
    accent: 'hsl(var(--accent))',
  },
  customText: {
    footer_note: '',
    terms: 'Payment is due within the specified terms. Late payments may incur additional charges.',
    payment_instructions: 'Please include the invoice number with your payment.',
    thank_you: 'Thank you for your business!',
  },
  numberFormat: {
    prefix: 'INV-',
    padding: 6,
  },
};

// Template Preview Component
function TemplatePreview({ template, isSelected, onSelect }: { 
  template: typeof TEMPLATES[0]; 
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <div
      onClick={onSelect}
      className={cn(
        "relative cursor-pointer rounded-xl border-2 transition-all duration-200 hover:shadow-lg overflow-hidden group",
        isSelected 
          ? "border-primary ring-2 ring-primary/20" 
          : "border-border hover:border-primary/50"
      )}
    >
      {/* Preview Area */}
      <div className={cn("h-48 p-4", template.preview)}>
        {/* Mini Invoice Preview */}
        <div className="bg-white rounded-lg shadow-sm h-full p-3 flex flex-col">
          {/* Header */}
          <div className="flex justify-between items-start mb-3">
            <div 
              className="w-12 h-6 rounded" 
              style={{ backgroundColor: template.accent }}
            />
            <div className="text-right space-y-1">
              <div className="h-2 w-16 bg-muted rounded" />
              <div className="h-1.5 w-12 bg-muted/60 rounded" />
            </div>
          </div>
          
          {/* Content Lines */}
          <div className="flex-1 space-y-2">
            <div className="flex gap-2">
              <div className="h-1.5 w-8 bg-muted rounded" />
              <div className="h-1.5 flex-1 bg-muted/40 rounded" />
              <div className="h-1.5 w-6 bg-muted/60 rounded" />
            </div>
            <div className="flex gap-2">
              <div className="h-1.5 w-8 bg-muted rounded" />
              <div className="h-1.5 flex-1 bg-muted/40 rounded" />
              <div className="h-1.5 w-6 bg-muted/60 rounded" />
            </div>
            <div className="flex gap-2">
              <div className="h-1.5 w-8 bg-muted rounded" />
              <div className="h-1.5 flex-1 bg-muted/40 rounded" />
              <div className="h-1.5 w-6 bg-muted/60 rounded" />
            </div>
          </div>
          
          {/* Footer */}
          <div className="pt-2 border-t border-muted/30 flex justify-end">
            <div 
              className="h-3 w-16 rounded"
              style={{ backgroundColor: template.accent }}
            />
          </div>
        </div>
      </div>
      
      {/* Info */}
      <div className="p-4 bg-card">
        <div className="flex items-center justify-between mb-1">
          <h4 className="font-semibold text-sm">{template.name}</h4>
          {isSelected && (
            <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
              <Check className="h-3 w-3 text-primary-foreground" />
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{template.description}</p>
      </div>
      
      {/* Hover overlay */}
      <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
    </div>
  );
}

// Field Toggle Section
function FieldToggleSection({ 
  title, 
  fields, 
  values, 
  onChange 
}: { 
  title: string;
  fields: Array<{ key: string; label: string; default: boolean; required?: boolean }>;
  values: Record<string, boolean>;
  onChange: (key: string, value: boolean) => void;
}) {
  return (
    <div className="space-y-3">
      <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">{title}</h4>
      <div className="grid gap-2">
        {fields.map((field) => (
          <div 
            key={field.key} 
            className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Label htmlFor={field.key} className="text-sm cursor-pointer">
                {field.label}
              </Label>
              {field.required && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  Required
                </Badge>
              )}
            </div>
            <Switch
              id={field.key}
              checked={values[field.key] ?? field.default}
              onCheckedChange={(checked) => onChange(field.key, checked)}
              disabled={field.required}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export function InvoiceEstimateSettings() {
  const { data: allSettings, isLoading } = useAllSettings();
  const updateSettings = useUpdateSettings();
  const [settings, setSettings] = useState<InvoiceSettings>(defaultSettings);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    if (allSettings?.invoice_settings) {
      setSettings({ 
        ...defaultSettings, 
        ...allSettings.invoice_settings as unknown as InvoiceSettings 
      });
    }
  }, [allSettings]);

  const handleSave = async () => {
    await updateSettings.mutateAsync({
      key: 'invoice_settings',
      value: settings as unknown as Record<string, unknown>,
    });
    toast.success('Invoice/Estimate settings saved');
  };

  const handleTemplateSelect = (templateId: string) => {
    setSettings(prev => ({ ...prev, selectedTemplate: templateId }));
  };

  const handleFieldToggle = (key: string, value: boolean) => {
    setSettings(prev => ({
      ...prev,
      displayFields: { ...prev.displayFields, [key]: value }
    }));
  };

  const handleTextChange = (key: keyof InvoiceSettings['customText'], value: string) => {
    setSettings(prev => ({
      ...prev,
      customText: { ...prev.customText, [key]: value }
    }));
  };

  const selectedTemplate = TEMPLATES.find(t => t.id === settings.selectedTemplate) || TEMPLATES[0];

  return (
    <div className="space-y-6">
      {/* Template Selection */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Layout className="h-5 w-5" />
                Invoice & Estimate Templates
              </CardTitle>
              <CardDescription>
                Choose a template style for your invoices and estimates
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Eye className="h-4 w-4" />
                    Preview
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Invoice Preview - {selectedTemplate.name}</DialogTitle>
                  </DialogHeader>
                  <div className="mt-4">
                    <InvoicePreviewContent 
                      template={selectedTemplate} 
                      settings={settings}
                    />
                  </div>
                </DialogContent>
              </Dialog>
              <Button onClick={handleSave} disabled={updateSettings.isPending} size="sm">
                {updateSettings.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {TEMPLATES.map((template) => (
              <TemplatePreview
                key={template.id}
                template={template}
                isSelected={settings.selectedTemplate === template.id}
                onSelect={() => handleTemplateSelect(template.id)}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Display Options */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Grid3X3 className="h-5 w-5" />
            Display Options
          </CardTitle>
          <CardDescription>
            Choose which fields to show on your invoices and estimates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="header" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
              <TabsTrigger value="header">Header</TabsTrigger>
              <TabsTrigger value="document">Document</TabsTrigger>
              <TabsTrigger value="customer">Customer</TabsTrigger>
              <TabsTrigger value="items">Line Items</TabsTrigger>
              <TabsTrigger value="totals">Totals</TabsTrigger>
              <TabsTrigger value="footer">Footer</TabsTrigger>
            </TabsList>

            <TabsContent value="header">
              <FieldToggleSection
                title="Company Header Information"
                fields={DISPLAY_FIELDS.header}
                values={settings.displayFields}
                onChange={handleFieldToggle}
              />
            </TabsContent>

            <TabsContent value="document">
              <FieldToggleSection
                title="Document Details"
                fields={DISPLAY_FIELDS.document}
                values={settings.displayFields}
                onChange={handleFieldToggle}
              />
            </TabsContent>

            <TabsContent value="customer">
              <FieldToggleSection
                title="Customer Information"
                fields={DISPLAY_FIELDS.customer}
                values={settings.displayFields}
                onChange={handleFieldToggle}
              />
            </TabsContent>

            <TabsContent value="items">
              <FieldToggleSection
                title="Line Item Columns"
                fields={DISPLAY_FIELDS.items}
                values={settings.displayFields}
                onChange={handleFieldToggle}
              />
            </TabsContent>

            <TabsContent value="totals">
              <FieldToggleSection
                title="Totals Section"
                fields={DISPLAY_FIELDS.totals}
                values={settings.displayFields}
                onChange={handleFieldToggle}
              />
            </TabsContent>

            <TabsContent value="footer">
              <FieldToggleSection
                title="Footer Information"
                fields={DISPLAY_FIELDS.footer}
                values={settings.displayFields}
                onChange={handleFieldToggle}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Custom Text */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Type className="h-5 w-5" />
            Custom Text & Messages
          </CardTitle>
          <CardDescription>
            Customize the default text that appears on your documents
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="terms">Terms & Conditions</Label>
              <textarea
                id="terms"
                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={settings.customText.terms}
                onChange={(e) => handleTextChange('terms', e.target.value)}
                placeholder="Enter your terms and conditions..."
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="payment_instructions">Payment Instructions</Label>
              <textarea
                id="payment_instructions"
                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={settings.customText.payment_instructions}
                onChange={(e) => handleTextChange('payment_instructions', e.target.value)}
                placeholder="Enter payment instructions..."
              />
            </div>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="footer_note">Footer Note</Label>
              <Input
                id="footer_note"
                value={settings.customText.footer_note}
                onChange={(e) => handleTextChange('footer_note', e.target.value)}
                placeholder="Additional footer note..."
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="thank_you">Thank You Message</Label>
              <Input
                id="thank_you"
                value={settings.customText.thank_you}
                onChange={(e) => handleTextChange('thank_you', e.target.value)}
                placeholder="Thank you message..."
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Invoice Preview Content Component
function InvoicePreviewContent({ 
  template, 
  settings 
}: { 
  template: typeof TEMPLATES[0];
  settings: InvoiceSettings;
}) {
  const displayField = (key: string) => settings.displayFields[key] ?? true;

  return (
    <div className={cn("rounded-lg overflow-hidden", template.preview)}>
      <div className="bg-white m-4 rounded-lg shadow-lg p-8 min-h-[600px]">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div className="space-y-2">
            {displayField('logo') && (
              <div 
                className="w-32 h-12 rounded flex items-center justify-center text-white font-bold"
                style={{ backgroundColor: template.accent }}
              >
                LOGO
              </div>
            )}
            {displayField('company_name') && (
              <h2 className="text-xl font-bold">Astraline Cargo</h2>
            )}
            {displayField('company_address') && (
              <p className="text-sm text-muted-foreground">123 Business Street, Dubai, UAE</p>
            )}
            {displayField('company_phone') && (
              <p className="text-sm text-muted-foreground">+971 4 123 4567</p>
            )}
            {displayField('company_email') && (
              <p className="text-sm text-muted-foreground">info@astraline.com</p>
            )}
          </div>
          
          <div className="text-right">
            <h1 
              className="text-3xl font-bold mb-4"
              style={{ color: template.accent }}
            >
              INVOICE
            </h1>
            {displayField('invoice_number') && (
              <p className="text-sm"><span className="text-muted-foreground">Invoice #:</span> INV-000123</p>
            )}
            {displayField('issue_date') && (
              <p className="text-sm"><span className="text-muted-foreground">Date:</span> Dec 29, 2024</p>
            )}
            {displayField('due_date') && (
              <p className="text-sm"><span className="text-muted-foreground">Due Date:</span> Jan 28, 2025</p>
            )}
            {displayField('payment_terms') && (
              <p className="text-sm"><span className="text-muted-foreground">Terms:</span> Net 30</p>
            )}
          </div>
        </div>

        {/* Bill To */}
        <div className="mb-8 p-4 bg-muted/30 rounded-lg">
          <h3 className="font-semibold mb-2" style={{ color: template.accent }}>Bill To:</h3>
          {displayField('customer_name') && <p className="font-medium">John Smith</p>}
          {displayField('customer_company') && <p className="text-sm text-muted-foreground">ABC Corporation</p>}
          {displayField('customer_address') && <p className="text-sm text-muted-foreground">456 Client Ave, Dubai, UAE</p>}
          {displayField('customer_phone') && <p className="text-sm text-muted-foreground">+971 4 987 6543</p>}
          {displayField('customer_email') && <p className="text-sm text-muted-foreground">john@abc.com</p>}
        </div>

        {/* Items Table */}
        <div className="mb-8">
          <table className="w-full">
            <thead>
              <tr style={{ backgroundColor: template.accent }} className="text-white">
                {displayField('item_service') && <th className="text-left p-3 rounded-tl-lg">Service</th>}
                {displayField('item_description') && <th className="text-left p-3">Description</th>}
                {displayField('item_quantity') && <th className="text-center p-3">Qty</th>}
                {displayField('item_rate') && <th className="text-right p-3">Rate</th>}
                {displayField('item_amount') && <th className="text-right p-3 rounded-tr-lg">Amount</th>}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                {displayField('item_service') && <td className="p-3 text-sm">Shipping Revenue</td>}
                {displayField('item_description') && <td className="p-3 text-sm">Air cargo shipping - Dubai to Dar es Salaam</td>}
                {displayField('item_quantity') && <td className="p-3 text-sm text-center">1</td>}
                {displayField('item_rate') && <td className="p-3 text-sm text-right">$500.00</td>}
                {displayField('item_amount') && <td className="p-3 text-sm text-right font-medium">$500.00</td>}
              </tr>
              <tr className="border-b">
                {displayField('item_service') && <td className="p-3 text-sm">Handling Fee</td>}
                {displayField('item_description') && <td className="p-3 text-sm">Package handling and processing</td>}
                {displayField('item_quantity') && <td className="p-3 text-sm text-center">1</td>}
                {displayField('item_rate') && <td className="p-3 text-sm text-right">$25.00</td>}
                {displayField('item_amount') && <td className="p-3 text-sm text-right font-medium">$25.00</td>}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end mb-8">
          <div className="w-64 space-y-2">
            {displayField('subtotal') && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal:</span>
                <span>$525.00</span>
              </div>
            )}
            {displayField('discount') && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Discount:</span>
                <span>-$25.00</span>
              </div>
            )}
            {displayField('tax') && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax (5%):</span>
                <span>$25.00</span>
              </div>
            )}
            <Separator />
            {displayField('total') && (
              <div className="flex justify-between font-bold text-lg" style={{ color: template.accent }}>
                <span>Total:</span>
                <span>$525.00</span>
              </div>
            )}
            {displayField('amount_paid') && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Amount Paid:</span>
                <span>$0.00</span>
              </div>
            )}
            {displayField('balance_due') && (
              <div className="flex justify-between font-bold">
                <span>Balance Due:</span>
                <span style={{ color: template.accent }}>$525.00</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t pt-6 space-y-4">
          {displayField('notes') && settings.customText.footer_note && (
            <div>
              <h4 className="font-semibold text-sm mb-1">Notes:</h4>
              <p className="text-sm text-muted-foreground">{settings.customText.footer_note}</p>
            </div>
          )}
          {displayField('terms') && settings.customText.terms && (
            <div>
              <h4 className="font-semibold text-sm mb-1">Terms & Conditions:</h4>
              <p className="text-sm text-muted-foreground">{settings.customText.terms}</p>
            </div>
          )}
          {displayField('payment_instructions') && settings.customText.payment_instructions && (
            <div>
              <h4 className="font-semibold text-sm mb-1">Payment Instructions:</h4>
              <p className="text-sm text-muted-foreground">{settings.customText.payment_instructions}</p>
            </div>
          )}
          {displayField('thank_you') && settings.customText.thank_you && (
            <p className="text-center font-medium mt-6" style={{ color: template.accent }}>
              {settings.customText.thank_you}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
