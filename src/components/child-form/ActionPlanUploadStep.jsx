import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Upload, FileText, Loader2, Sparkles, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import heic2any from 'heic2any';

export default function ActionPlanUploadStep({ onExtracted, onSkip }) {
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null); // { url, name }

  const handleFileChange = async (e) => {
    let file = e.target.files[0];
    if (!file) return;

    // Convert HEIC/HEIF to JPEG before uploading
    if (file.type === 'image/heic' || file.type === 'image/heif' || file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif')) {
      try {
        toast.info('Converting HEIC image...');
        const blob = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 });
        file = new File([blob], file.name.replace(/\.heic$/i, '.jpg').replace(/\.heif$/i, '.jpg'), { type: 'image/jpeg' });
      } catch {
        toast.error('Could not convert HEIC file');
        return;
      }
    }

    setUploading(true);
    let file_url;
    try {
      const res = await base44.integrations.Core.UploadFile({ file });
      file_url = res.file_url;
      setUploadedFile({ url: file_url, name: file.name });
      toast.success('Plan uploaded — extracting info...');
    } catch {
      toast.error('Upload failed');
      setUploading(false);
      return;
    }

    setUploading(false);
    setExtracting(true);

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are reviewing a medical action plan or doctor's letter for a child at an OSHC (Outside School Hours Care) service. The plan may be for food allergies, dietary requirements, or asthma.
Extract the following information:
- condition_type (one of: "Allergy", "Dietary", "Asthma")
- allergens (comma-separated list, e.g. "Peanuts, Tree Nuts" — allergy only)
- severity (one of: "Low", "Moderate", "Anaphylaxis" — allergy only)
- asthma_severity (one of: "Mild", "Moderate", "Severe" — asthma only)
- asthma_triggers (comma-separated, e.g. "Exercise, Cold air, Dust" — asthma only)
- reliever_medication (e.g. "Ventolin 2-4 puffs via spacer" — asthma)
- preventer_medication (e.g. "Flixotide 1 puff twice daily" — asthma or empty string)
- trigger (what triggers the reaction — allergy)
- reaction (expected reaction — allergy)
- control_measures (key steps to minimise risk)
- medication_required (medication name and dose e.g. "EpiPen 0.3mg" or empty string)
- medication_location (where stored, or empty string)
- dietary_requirement (if dietary, e.g. "Halal, No Dairy", otherwise empty string)
- notes (any other important notes)
- child_first_name (child's first name if visible)
- child_last_name (child's last name if visible)
- child_dob (date of birth in YYYY-MM-DD format if visible, otherwise empty string)
- parent_name (parent/guardian name if visible)
- parent_phone (parent phone if visible)
- parent_email (parent email if visible)

Return only extracted data. Use empty strings for fields not found.`,
        file_urls: [file_url],
        response_json_schema: {
          type: 'object',
          properties: {
            condition_type: { type: 'string' },
            allergens: { type: 'string' },
            severity: { type: 'string' },
            asthma_severity: { type: 'string' },
            asthma_triggers: { type: 'string' },
            reliever_medication: { type: 'string' },
            preventer_medication: { type: 'string' },
            trigger: { type: 'string' },
            reaction: { type: 'string' },
            control_measures: { type: 'string' },
            medication_required: { type: 'string' },
            medication_location: { type: 'string' },
            dietary_requirement: { type: 'string' },
            notes: { type: 'string' },
            child_first_name: { type: 'string' },
            child_last_name: { type: 'string' },
            child_dob: { type: 'string' },
            parent_name: { type: 'string' },
            parent_phone: { type: 'string' },
            parent_email: { type: 'string' },
          },
        },
      });

      onExtracted(result, { url: file_url, name: file.name });
    } catch {
      toast.error('AI extraction failed — you can still fill in the form manually');
      onSkip({ url: file_url, name: file.name });
    } finally {
      setExtracting(false);
    }
  };

  const isLoading = uploading || extracting;

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <FileText className="w-7 h-7 text-primary" />
        </div>
        <h2 className="text-lg font-semibold">Upload Doctor's Action Plan</h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Upload the child's medical action plan (ASCIA, asthma, or dietary plan) and our AI will automatically extract all the details to pre-fill the form.
        </p>
      </div>

      <Card className="p-6">
        <label className={`cursor-pointer block ${isLoading ? 'pointer-events-none' : ''}`}>
          <input type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg,.heic,.heif" onChange={handleFileChange} disabled={isLoading} />
          <div className="border-2 border-dashed border-border rounded-xl p-10 text-center hover:border-primary hover:bg-primary/5 transition-colors">
            {isLoading ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm font-medium text-primary">
                  {uploading ? 'Uploading plan...' : 'AI is reading and extracting info...'}
                </p>
                <p className="text-xs text-muted-foreground">This takes about 10–15 seconds</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                  <Upload className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Click to upload or drag & drop</p>
                  <p className="text-xs text-muted-foreground mt-1">PDF, PNG, or JPG — ASCIA / Asthma / Dietary action plan</p>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-primary font-medium">
                  <Sparkles className="w-3.5 h-3.5" />
                  AI will auto-fill the form from this document
                </div>
              </div>
            )}
          </div>
        </label>
      </Card>

      <div className="text-center">
        <Button variant="ghost" size="sm" onClick={() => onSkip(null)} className="text-muted-foreground gap-2">
          Skip — I'll fill in the form manually <ArrowRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}