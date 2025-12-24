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
import { Save, Eye, EyeOff, Plus, Trash2, GripVertical } from 'lucide-react';
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
