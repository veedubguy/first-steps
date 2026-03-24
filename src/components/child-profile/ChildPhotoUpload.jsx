import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Camera, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function ChildPhotoUpload({ child, onUpdated }) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await base44.entities.Children.update(child.id, { photo_url: file_url });
    toast.success('Photo updated');
    onUpdated();
    setUploading(false);
  };

  const handleRemove = async () => {
    await base44.entities.Children.update(child.id, { photo_url: null });
    toast.success('Photo removed');
    onUpdated();
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="relative w-20 h-20 rounded-full border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center overflow-hidden cursor-pointer hover:border-primary transition-colors"
        onClick={() => !uploading && inputRef.current?.click()}
      >
        {uploading ? (
          <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
        ) : child.photo_url ? (
          <img src={child.photo_url} alt="Child photo" className="w-full h-full object-cover" />
        ) : (
          <Camera className="w-6 h-6 text-muted-foreground" />
        )}
        {child.photo_url && !uploading && (
          <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
            <Camera className="w-5 h-5 text-white" />
          </div>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      {child.photo_url && (
        <Button type="button" variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1 h-6" onClick={handleRemove}>
          <X className="w-3 h-3" /> Remove
        </Button>
      )}
      {!child.photo_url && (
        <span className="text-xs text-muted-foreground">Add photo</span>
      )}
    </div>
  );
}