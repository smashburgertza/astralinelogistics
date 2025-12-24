import { useState } from 'react';
import { usePageContent, useUpdatePageContent, PageContent } from '@/hooks/usePageContent';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Save, Eye, EyeOff, Plus, Trash2, GripVertical, Monitor, Star, Phone, Mail, MapPin, Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const sectionLabels: Record<string, string> = {
  hero: 'Hero Section',
  partners: 'Partners Section',
  about: 'About Us Section',
  services: 'Services Section',
  shop_for_me: 'Shop For Me Section',
  testimonials: 'Testimonials Section',
  contact: 'Contact Section',
  cta: 'Call to Action Section',
};

export default function PageContentAdmin() {
  const { data: sections, isLoading } = usePageContent() as { data: PageContent[] | undefined; isLoading: boolean };
  const updateContent = useUpdatePageContent();
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<PageContent>>({});

  const handleEdit = (section: PageContent) => {
    setEditingSection(section.section_key);
    setFormData({
      title: section.title,
      subtitle: section.subtitle,
      description: section.description,
      content: section.content,
      is_visible: section.is_visible,
    });
  };

  const handleSave = async (sectionKey: string) => {
    await updateContent.mutateAsync({
      sectionKey,
      updates: formData,
    });
    setEditingSection(null);
    setFormData({});
  };

  const handleCancel = () => {
    setEditingSection(null);
    setFormData({});
  };

  const updateFormField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateContentField = (path: string, value: any) => {
    setFormData(prev => {
      const newContent = { ...prev.content };
      const keys = path.split('.');
      let current: any = newContent;
      
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) current[keys[i]] = {};
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      
      return { ...prev, content: newContent };
    });
  };

  const updateArrayItem = (arrayKey: string, index: number, field: string, value: any) => {
    setFormData(prev => {
      const newContent = { ...prev.content };
      if (!newContent[arrayKey]) newContent[arrayKey] = [];
      if (!newContent[arrayKey][index]) newContent[arrayKey][index] = {};
      newContent[arrayKey][index] = { ...newContent[arrayKey][index], [field]: value };
      return { ...prev, content: newContent };
    });
  };

  const addArrayItem = (arrayKey: string, template: Record<string, any>) => {
    setFormData(prev => {
      const newContent = { ...prev.content };
      if (!newContent[arrayKey]) newContent[arrayKey] = [];
      newContent[arrayKey] = [...newContent[arrayKey], template];
      return { ...prev, content: newContent };
    });
  };

  const removeArrayItem = (arrayKey: string, index: number) => {
    setFormData(prev => {
      const newContent = { ...prev.content };
      newContent[arrayKey] = newContent[arrayKey].filter((_: any, i: number) => i !== index);
      return { ...prev, content: newContent };
    });
  };

  const sectionsArray = Array.isArray(sections) ? sections : [];

  return (
    <AdminLayout title="Page Content" subtitle="Edit the content displayed on the public website">
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : (
        <Accordion type="single" collapsible className="space-y-4">
          {sectionsArray.map((section) => (
            <AccordionItem key={section.section_key} value={section.section_key} className="border rounded-lg bg-card">
              <AccordionTrigger className="px-4 hover:no-underline">
                <div className="flex items-center gap-4">
                  <span className="font-semibold">{sectionLabels[section.section_key] || section.section_key}</span>
                  {!section.is_visible && (
                    <span className="text-xs bg-muted px-2 py-1 rounded">Hidden</span>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                {editingSection === section.section_key ? (
                  <SectionEditor
                    section={section}
                    formData={formData}
                    onFieldChange={updateFormField}
                    onContentChange={updateContentField}
                    onArrayItemChange={updateArrayItem}
                    onAddArrayItem={addArrayItem}
                    onRemoveArrayItem={removeArrayItem}
                    onSave={() => handleSave(section.section_key)}
                    onCancel={handleCancel}
                    isSaving={updateContent.isPending}
                  />
                ) : (
                  <SectionPreview
                    section={section}
                    onEdit={() => handleEdit(section)}
                  />
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </AdminLayout>
  );
}

function SectionPreview({ section, onEdit }: { section: PageContent; onEdit: () => void }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label className="text-muted-foreground text-xs">Title</Label>
          <p className="font-medium">{section.title || '-'}</p>
        </div>
        <div>
          <Label className="text-muted-foreground text-xs">Subtitle</Label>
          <p className="font-medium">{section.subtitle || '-'}</p>
        </div>
      </div>
      <div>
        <Label className="text-muted-foreground text-xs">Description</Label>
        <p className="text-sm">{section.description || '-'}</p>
      </div>
      {section.content && Object.keys(section.content).length > 0 && (
        <div>
          <Label className="text-muted-foreground text-xs">Additional Content</Label>
          <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-auto max-h-40">
            {JSON.stringify(section.content, null, 2)}
          </pre>
        </div>
      )}
      <div className="flex items-center gap-2 pt-2">
        <Button onClick={onEdit}>Edit Section</Button>
        <div className="flex items-center gap-2 ml-auto text-sm text-muted-foreground">
          {section.is_visible ? (
            <>
              <Eye className="h-4 w-4" />
              <span>Visible</span>
            </>
          ) : (
            <>
              <EyeOff className="h-4 w-4" />
              <span>Hidden</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

interface SectionEditorProps {
  section: PageContent;
  formData: Partial<PageContent>;
  onFieldChange: (field: string, value: any) => void;
  onContentChange: (path: string, value: any) => void;
  onArrayItemChange: (arrayKey: string, index: number, field: string, value: any) => void;
  onAddArrayItem: (arrayKey: string, template: Record<string, any>) => void;
  onRemoveArrayItem: (arrayKey: string, index: number) => void;
  onSave: () => void;
  onCancel: () => void;
  isSaving: boolean;
}

function SectionEditor({
  section,
  formData,
  onFieldChange,
  onContentChange,
  onArrayItemChange,
  onAddArrayItem,
  onRemoveArrayItem,
  onSave,
  onCancel,
  isSaving,
}: SectionEditorProps) {
  return (
    <div className="space-y-6">
      {/* Basic Fields */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={formData.title || ''}
            onChange={(e) => onFieldChange('title', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="subtitle">Subtitle / Badge</Label>
          <Input
            id="subtitle"
            value={formData.subtitle || ''}
            onChange={(e) => onFieldChange('subtitle', e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description || ''}
          onChange={(e) => onFieldChange('description', e.target.value)}
          rows={3}
        />
      </div>

      <div className="flex items-center gap-2">
        <Switch
          id="visibility"
          checked={formData.is_visible ?? true}
          onCheckedChange={(checked) => onFieldChange('is_visible', checked)}
        />
        <Label htmlFor="visibility">Section Visible</Label>
      </div>

      {/* Section-specific content editors */}
      <ContentEditor
        sectionKey={section.section_key}
        content={formData.content || {}}
        onContentChange={onContentChange}
        onArrayItemChange={onArrayItemChange}
        onAddArrayItem={onAddArrayItem}
        onRemoveArrayItem={onRemoveArrayItem}
      />

      {/* Actions */}
      <div className="flex gap-2 pt-4 border-t">
        <Button onClick={onSave} disabled={isSaving}>
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Monitor className="h-4 w-4 mr-2" />
              Preview
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Preview: {sectionLabels[section.section_key]}</DialogTitle>
            </DialogHeader>
            <SectionLivePreview sectionKey={section.section_key} formData={formData} />
          </DialogContent>
        </Dialog>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

interface ContentEditorProps {
  sectionKey: string;
  content: Record<string, any>;
  onContentChange: (path: string, value: any) => void;
  onArrayItemChange: (arrayKey: string, index: number, field: string, value: any) => void;
  onAddArrayItem: (arrayKey: string, template: Record<string, any>) => void;
  onRemoveArrayItem: (arrayKey: string, index: number) => void;
}

function ContentEditor({
  sectionKey,
  content,
  onContentChange,
  onArrayItemChange,
  onAddArrayItem,
  onRemoveArrayItem,
}: ContentEditorProps) {
  switch (sectionKey) {
    case 'hero':
      return (
        <div className="space-y-4">
          <h4 className="font-semibold">CTA Buttons</h4>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Primary Button Text</Label>
              <Input
                value={content.cta_primary || ''}
                onChange={(e) => onContentChange('cta_primary', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Secondary Button Text</Label>
              <Input
                value={content.cta_secondary || ''}
                onChange={(e) => onContentChange('cta_secondary', e.target.value)}
              />
            </div>
          </div>
          
          <h4 className="font-semibold">Statistics</h4>
          <div className="space-y-3">
            {(content.stats || []).map((stat: any, index: number) => (
              <div key={index} className="flex gap-2 items-start">
                <GripVertical className="h-5 w-5 text-muted-foreground mt-2" />
                <Input
                  placeholder="Value (e.g., 15K+)"
                  value={stat.value || ''}
                  onChange={(e) => onArrayItemChange('stats', index, 'value', e.target.value)}
                  className="w-32"
                />
                <Input
                  placeholder="Label"
                  value={stat.label || ''}
                  onChange={(e) => onArrayItemChange('stats', index, 'label', e.target.value)}
                  className="flex-1"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onRemoveArrayItem('stats', index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAddArrayItem('stats', { value: '', label: '' })}
            >
              <Plus className="h-4 w-4 mr-2" /> Add Statistic
            </Button>
          </div>
        </div>
      );

    case 'partners':
      return (
        <div className="space-y-4">
          <h4 className="font-semibold">Partner Logos</h4>
          <div className="space-y-3">
            {(content.logos || []).map((logo: any, index: number) => (
              <div key={index} className="flex gap-2 items-center">
                <GripVertical className="h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Partner Name"
                  value={logo.name || ''}
                  onChange={(e) => onArrayItemChange('logos', index, 'name', e.target.value)}
                  className="flex-1"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onRemoveArrayItem('logos', index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAddArrayItem('logos', { name: '', placeholder: true })}
            >
              <Plus className="h-4 w-4 mr-2" /> Add Partner
            </Button>
          </div>
        </div>
      );

    case 'about':
      return (
        <div className="space-y-4">
          <h4 className="font-semibold">Features</h4>
          <div className="space-y-3">
            {(content.features || []).map((feature: any, index: number) => (
              <Card key={index} className="p-3">
                <div className="flex gap-2 items-start">
                  <GripVertical className="h-5 w-5 text-muted-foreground mt-2" />
                  <div className="flex-1 space-y-2">
                    <Input
                      placeholder="Feature Title"
                      value={feature.title || ''}
                      onChange={(e) => onArrayItemChange('features', index, 'title', e.target.value)}
                    />
                    <Input
                      placeholder="Feature Description"
                      value={feature.description || ''}
                      onChange={(e) => onArrayItemChange('features', index, 'description', e.target.value)}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemoveArrayItem('features', index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAddArrayItem('features', { title: '', description: '' })}
            >
              <Plus className="h-4 w-4 mr-2" /> Add Feature
            </Button>
          </div>
        </div>
      );

    case 'services':
      return (
        <div className="space-y-4">
          <h4 className="font-semibold">Services</h4>
          <div className="space-y-3">
            {(content.services || []).map((service: any, index: number) => (
              <Card key={index} className="p-3">
                <div className="flex gap-2 items-start">
                  <GripVertical className="h-5 w-5 text-muted-foreground mt-2" />
                  <div className="flex-1 space-y-2">
                    <div className="grid gap-2 md:grid-cols-2">
                      <Input
                        placeholder="Service Title"
                        value={service.title || ''}
                        onChange={(e) => onArrayItemChange('services', index, 'title', e.target.value)}
                      />
                      <Input
                        placeholder="Icon (e.g., Plane, Ship)"
                        value={service.icon || ''}
                        onChange={(e) => onArrayItemChange('services', index, 'icon', e.target.value)}
                      />
                    </div>
                    <Textarea
                      placeholder="Service Description"
                      value={service.description || ''}
                      onChange={(e) => onArrayItemChange('services', index, 'description', e.target.value)}
                      rows={2}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemoveArrayItem('services', index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAddArrayItem('services', { title: '', description: '', icon: 'Package' })}
            >
              <Plus className="h-4 w-4 mr-2" /> Add Service
            </Button>
          </div>
        </div>
      );

    case 'shop_for_me':
      return (
        <div className="space-y-6">
          <div>
            <h4 className="font-semibold mb-3">Process Steps</h4>
            <div className="space-y-3">
              {(content.steps || []).map((step: any, index: number) => (
                <Card key={index} className="p-3">
                  <div className="flex gap-2 items-start">
                    <div className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="grid gap-2 md:grid-cols-2">
                        <Input
                          placeholder="Step Title"
                          value={step.title || ''}
                          onChange={(e) => onArrayItemChange('steps', index, 'title', e.target.value)}
                        />
                        <Input
                          placeholder="Color (blue, purple, green, etc.)"
                          value={step.color || ''}
                          onChange={(e) => onArrayItemChange('steps', index, 'color', e.target.value)}
                        />
                      </div>
                      <Textarea
                        placeholder="Step Description"
                        value={step.description || ''}
                        onChange={(e) => onArrayItemChange('steps', index, 'description', e.target.value)}
                        rows={2}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onRemoveArrayItem('steps', index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => onAddArrayItem('steps', { title: '', description: '', color: 'blue' })}
              >
                <Plus className="h-4 w-4 mr-2" /> Add Step
              </Button>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-3">Features</h4>
            <div className="space-y-3">
              {(content.features || []).map((feature: any, index: number) => (
                <Card key={index} className="p-3">
                  <div className="flex gap-2 items-start">
                    <GripVertical className="h-5 w-5 text-muted-foreground mt-2" />
                    <div className="flex-1 space-y-2">
                      <Input
                        placeholder="Feature Title"
                        value={feature.title || ''}
                        onChange={(e) => onArrayItemChange('features', index, 'title', e.target.value)}
                      />
                      <Input
                        placeholder="Feature Description"
                        value={feature.description || ''}
                        onChange={(e) => onArrayItemChange('features', index, 'description', e.target.value)}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onRemoveArrayItem('features', index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => onAddArrayItem('features', { title: '', description: '', icon: 'Star' })}
              >
                <Plus className="h-4 w-4 mr-2" /> Add Feature
              </Button>
            </div>
          </div>
        </div>
      );

    case 'testimonials':
      return (
        <div className="space-y-6">
          <div>
            <h4 className="font-semibold mb-3">Customer Testimonials</h4>
            <div className="space-y-3">
              {(content.testimonials || []).map((testimonial: any, index: number) => (
                <Card key={index} className="p-3">
                  <div className="flex gap-2 items-start">
                    <GripVertical className="h-5 w-5 text-muted-foreground mt-2" />
                    <div className="flex-1 space-y-2">
                      <div className="grid gap-2 md:grid-cols-3">
                        <Input
                          placeholder="Customer Name"
                          value={testimonial.name || ''}
                          onChange={(e) => onArrayItemChange('testimonials', index, 'name', e.target.value)}
                        />
                        <Input
                          placeholder="Role/Title"
                          value={testimonial.role || ''}
                          onChange={(e) => onArrayItemChange('testimonials', index, 'role', e.target.value)}
                        />
                        <Input
                          placeholder="Rating (1-5)"
                          type="number"
                          min="1"
                          max="5"
                          value={testimonial.rating || 5}
                          onChange={(e) => onArrayItemChange('testimonials', index, 'rating', parseInt(e.target.value))}
                        />
                      </div>
                      <Textarea
                        placeholder="Testimonial Content"
                        value={testimonial.content || ''}
                        onChange={(e) => onArrayItemChange('testimonials', index, 'content', e.target.value)}
                        rows={2}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onRemoveArrayItem('testimonials', index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => onAddArrayItem('testimonials', { name: '', role: '', content: '', rating: 5 })}
              >
                <Plus className="h-4 w-4 mr-2" /> Add Testimonial
              </Button>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-3">Statistics</h4>
            <div className="space-y-3">
              {(content.stats || []).map((stat: any, index: number) => (
                <div key={index} className="flex gap-2 items-center">
                  <Input
                    placeholder="Value"
                    value={stat.value || ''}
                    onChange={(e) => onArrayItemChange('stats', index, 'value', e.target.value)}
                    className="w-32"
                  />
                  <Input
                    placeholder="Label"
                    value={stat.label || ''}
                    onChange={(e) => onArrayItemChange('stats', index, 'label', e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemoveArrayItem('stats', index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => onAddArrayItem('stats', { value: '', label: '' })}
              >
                <Plus className="h-4 w-4 mr-2" /> Add Statistic
              </Button>
            </div>
          </div>
        </div>
      );

    case 'contact':
      return (
        <div className="space-y-4">
          <h4 className="font-semibold">Contact Information</h4>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={content.phone || ''}
                onChange={(e) => onContentChange('phone', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                value={content.email || ''}
                onChange={(e) => onContentChange('email', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input
                value={content.address || ''}
                onChange={(e) => onContentChange('address', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Business Hours</Label>
              <Input
                value={content.hours || ''}
                onChange={(e) => onContentChange('hours', e.target.value)}
              />
            </div>
          </div>
        </div>
      );

    case 'cta':
      return (
        <div className="space-y-4">
          <h4 className="font-semibold">CTA Buttons</h4>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Primary Button Text</Label>
              <Input
                value={content.cta_primary || ''}
                onChange={(e) => onContentChange('cta_primary', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Secondary Button Text</Label>
              <Input
                value={content.cta_secondary || ''}
                onChange={(e) => onContentChange('cta_secondary', e.target.value)}
              />
            </div>
          </div>
        </div>
      );

    default:
      return (
        <div className="space-y-2">
          <Label>Raw JSON Content</Label>
          <Textarea
            value={JSON.stringify(content, null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                onContentChange('', parsed);
              } catch {
                // Invalid JSON, ignore
              }
            }}
            rows={10}
            className="font-mono text-sm"
          />
        </div>
      );
  }
}

// Live Preview Component
function SectionLivePreview({ sectionKey, formData }: { sectionKey: string; formData: Partial<PageContent> }) {
  const content = formData.content || {};
  
  switch (sectionKey) {
    case 'hero':
      return (
        <div className="bg-brand-navy rounded-lg p-8 text-white">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 mb-4">
              <span className="w-2 h-2 rounded-full bg-primary" />
              <span className="text-xs text-white/90">{formData.subtitle || 'Astraline Logistics'}</span>
            </div>
            <h1 className="text-3xl font-bold mb-4">{formData.title || 'Global Shipping Made Simple'}</h1>
            <p className="text-white/80 mb-6">{formData.description || 'Your shipping description here...'}</p>
            <div className="flex gap-3 mb-6">
              <Button size="sm" className="bg-primary text-primary-foreground">{content.cta_primary || 'Get a Quote'}</Button>
              <Button size="sm" variant="outline" className="border-white/30 text-white hover:bg-white/10">{content.cta_secondary || 'Track Shipment'}</Button>
            </div>
            {content.stats?.length > 0 && (
              <div className="flex gap-6 pt-4 border-t border-white/10">
                {content.stats.map((stat: any, i: number) => (
                  <div key={i}>
                    <p className="text-xl font-bold text-primary">{stat.value}</p>
                    <p className="text-xs text-white/60">{stat.label}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      );

    case 'partners':
      return (
        <div className="bg-muted/30 rounded-lg p-8 text-center">
          <p className="text-muted-foreground text-sm uppercase tracking-widest mb-6">
            {formData.description || 'Trusted by leading brands & partners worldwide'}
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            {(content.logos || []).map((logo: any, i: number) => (
              <div key={i} className="px-4 py-2 bg-background rounded border">
                <span className="font-bold text-muted-foreground">{logo.name}</span>
              </div>
            ))}
          </div>
        </div>
      );

    case 'about':
      return (
        <div className="bg-brand-navy rounded-lg p-8 text-white">
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h2 className="text-2xl font-bold mb-4">{formData.title || 'About Us'}</h2>
              <Button size="sm" className="bg-primary text-primary-foreground">GET A QUOTE</Button>
            </div>
            <div className="bg-white/5 rounded-lg p-6">
              <p className="text-white/90 mb-4">{formData.description || 'Your company description here...'}</p>
              <div className="grid grid-cols-2 gap-3">
                {(content.features || []).map((feature: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <div className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                    </div>
                    <span className="text-white/80">{feature.title || feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      );

    case 'services':
      return (
        <div className="bg-background rounded-lg p-8">
          <div className="text-center mb-8">
            <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-sm mb-2">
              {formData.subtitle || 'What We Offer'}
            </span>
            <h2 className="text-2xl font-bold">{formData.title || 'Our Services'}</h2>
            <p className="text-muted-foreground mt-2">{formData.description || 'Service description...'}</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {(content.services || []).map((service: any, i: number) => (
              <Card key={i} className="p-4">
                <div className="w-10 h-10 rounded-lg bg-brand-navy mb-3 flex items-center justify-center text-white text-xs">
                  {service.icon || '📦'}
                </div>
                <h3 className="font-semibold mb-1">{service.title}</h3>
                <p className="text-xs text-muted-foreground">{service.description}</p>
              </Card>
            ))}
          </div>
        </div>
      );

    case 'shop_for_me':
      return (
        <div className="bg-gradient-to-b from-background to-muted/30 rounded-lg p-8">
          <div className="text-center mb-8">
            <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-sm mb-2">
              {formData.subtitle || 'Shop For Me'}
            </span>
            <h2 className="text-2xl font-bold">{formData.title || 'We Buy, We Ship, You Receive'}</h2>
            <p className="text-muted-foreground mt-2">{formData.description || 'Description...'}</p>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
            {(content.steps || []).map((step: any, i: number) => (
              <div key={i} className="relative bg-card border rounded-lg p-3 text-center">
                <div className="absolute -top-2 -left-2 w-5 h-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">
                  {i + 1}
                </div>
                <div className={`w-8 h-8 mx-auto mb-2 rounded-lg bg-${step.color || 'blue'}-500/10 flex items-center justify-center`}>
                  <span className="text-xs">📦</span>
                </div>
                <h4 className="text-xs font-semibold">{step.title}</h4>
              </div>
            ))}
          </div>
          <div className="bg-primary/5 border border-primary/10 rounded-xl p-6">
            <h3 className="text-lg font-bold text-center mb-4">Why Use Shop For Me?</h3>
            <div className="grid grid-cols-3 gap-4">
              {(content.features || []).map((feature: any, i: number) => (
                <div key={i} className="text-center">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl mx-auto mb-2 flex items-center justify-center">
                    <span>✨</span>
                  </div>
                  <h4 className="text-sm font-semibold">{feature.title}</h4>
                  <p className="text-xs text-muted-foreground">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      );

    case 'testimonials':
      return (
        <div className="bg-background rounded-lg p-8">
          <div className="text-center mb-8">
            <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-sm mb-2">
              {formData.subtitle || 'Testimonials'}
            </span>
            <h2 className="text-2xl font-bold">{formData.title || 'What Our Customers Say'}</h2>
            <p className="text-muted-foreground mt-2">{formData.description || 'Description...'}</p>
          </div>
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            {(content.testimonials || []).slice(0, 4).map((testimonial: any, i: number) => (
              <Card key={i} className="p-4">
                <div className="flex gap-1 mb-2">
                  {[...Array(testimonial.rating || 5)].map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-primary text-primary" />
                  ))}
                </div>
                <p className="text-sm italic mb-3">"{testimonial.content}"</p>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-brand-navy text-white flex items-center justify-center text-xs">
                    {testimonial.name?.slice(0, 2).toUpperCase() || 'NA'}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{testimonial.name}</p>
                    <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
          {content.stats?.length > 0 && (
            <div className="grid grid-cols-4 gap-4 text-center">
              {content.stats.map((stat: any, i: number) => (
                <div key={i}>
                  <p className="text-2xl font-bold text-primary">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      );

    case 'contact':
      return (
        <div className="bg-muted/30 rounded-lg p-8">
          <div className="text-center mb-8">
            <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-sm mb-2">
              {formData.subtitle || 'Get In Touch'}
            </span>
            <h2 className="text-2xl font-bold">{formData.title || 'Contact Us'}</h2>
            <p className="text-muted-foreground mt-2">{formData.description || 'Description...'}</p>
          </div>
          <div className="grid md:grid-cols-4 gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Phone className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Phone</h3>
                <p className="text-xs text-muted-foreground">{content.phone || '+255 xxx xxx xxx'}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Mail className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Email</h3>
                <p className="text-xs text-muted-foreground">{content.email || 'info@example.com'}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Address</h3>
                <p className="text-xs text-muted-foreground">{content.address || 'Location'}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Hours</h3>
                <p className="text-xs text-muted-foreground">{content.hours || 'Mon-Fri'}</p>
              </div>
            </div>
          </div>
        </div>
      );

    case 'cta':
      return (
        <div className="bg-primary rounded-lg p-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left">
              <h2 className="text-2xl font-bold text-primary-foreground mb-2">{formData.title || 'Ready to Ship with Us?'}</h2>
              <p className="text-primary-foreground/80">{formData.description || 'Get started today...'}</p>
            </div>
            <div className="flex gap-3">
              <Button className="bg-brand-navy text-white">{content.cta_primary || 'Get Started'}</Button>
              <Button variant="outline" className="border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary">
                {content.cta_secondary || 'Contact Us'}
              </Button>
            </div>
          </div>
        </div>
      );

    default:
      return (
        <div className="bg-muted rounded-lg p-8 text-center">
          <p className="text-muted-foreground">Preview not available for this section type.</p>
          <pre className="mt-4 text-left text-xs bg-background p-4 rounded overflow-auto max-h-60">
            {JSON.stringify(formData, null, 2)}
          </pre>
        </div>
      );
  }
}
