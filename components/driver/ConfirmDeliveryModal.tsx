"use client";

import { useRef, useState } from "react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase/client";
import SignatureCanvas from "react-signature-canvas";

type Props = {
  deliveryId: string;
  clientName: string;
  onClose: () => void;
  onSuccess: () => void;
};

export function ConfirmDeliveryModal({
  deliveryId,
  clientName,
  onClose,
  onSuccess,
}: Props) {
  const sigRef = useRef<SignatureCanvas | null>(null);
  const [receivedBy, setReceivedBy] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhoto(file);
      const url = URL.createObjectURL(file);
      setPhotoPreview(url);
    } else {
      setPhoto(null);
      setPhotoPreview(null);
    }
  };

  const handleSubmit = async () => {
    if (!receivedBy.trim()) {
      setError("Please enter the name of the person who received the delivery");
      return;
    }
    const canvas = sigRef.current;
    const signature = canvas?.toDataURL("image/png");
    if (!signature || canvas?.isEmpty()) {
      setError("Please provide a signature");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      let photoUrl: string | null = null;
      if (photo) {
        const storageRef = ref(storage, `deliveries/${deliveryId}/photo.jpg`);
        await uploadBytes(storageRef, photo);
        photoUrl = await getDownloadURL(storageRef);
      }

      const res = await fetch("/api/confirm-delivery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deliveryId,
          receivedBy: receivedBy.trim(),
          signature,
          photoUrl,
          notes: notes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to confirm delivery");
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to confirm");
    } finally {
      setSubmitting(false);
    }
  };

  const clearSignature = () => {
    sigRef.current?.clear();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-dark/50 p-0 sm:p-4">
      <div className="bg-cream w-full max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-sm sm:max-w-md p-6">
        <h3 className="font-display text-xl text-dark mb-4">Confirm Delivery</h3>
        <p className="text-muted text-sm mb-4">Delivery for {clientName}</p>

        <div className="space-y-4">
          <div>
            <label className="block text-muted text-xs uppercase tracking-wider mb-2">
              Received by
            </label>
            <input
              type="text"
              value={receivedBy}
              onChange={(e) => setReceivedBy(e.target.value)}
              placeholder="Name of person who received"
              className="w-full bg-warm border border-stone rounded-sm px-3 py-2"
              required
            />
          </div>

          <div>
            <label className="block text-muted text-xs uppercase tracking-wider mb-2">
              Client signature
            </label>
            <div className="border border-stone rounded-sm bg-white overflow-hidden">
              <SignatureCanvas
                ref={(r) => { (sigRef as React.MutableRefObject<SignatureCanvas | null>).current = r; }}
                canvasProps={{
                  className: "w-full h-32 touch-none",
                  style: { touchAction: "none" },
                }}
                backgroundColor="rgb(255,255,255)"
                penColor="rgb(0,0,0)"
              />
            </div>
            <button
              type="button"
              onClick={clearSignature}
              className="text-terracotta text-sm mt-1 hover:underline"
            >
              Clear
            </button>
          </div>

          <div>
            <label className="block text-muted text-xs uppercase tracking-wider mb-2">
              Photo (optional)
            </label>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoChange}
              className="w-full text-sm text-muted file:mr-2 file:py-2 file:px-4 file:rounded-sm file:border-0 file:bg-terracotta file:text-cream file:text-sm"
            />
            {photoPreview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoPreview}
                alt="Preview"
                className="mt-2 w-full max-h-32 object-cover rounded-sm"
              />
            )}
          </div>

          <div>
            <label className="block text-muted text-xs uppercase tracking-wider mb-2">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes..."
              className="w-full bg-warm border border-stone rounded-sm px-3 py-2 min-h-[60px]"
            />
          </div>
        </div>

        {error && (
          <div className="mt-4 bg-red-50 text-red-700 px-4 py-2 rounded-sm text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 border border-stone text-muted rounded-sm font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 py-3 bg-terracotta text-cream rounded-sm font-medium hover:bg-terracotta/90 disabled:opacity-70"
          >
            {submitting ? "Confirming..." : "Confirm Delivery"}
          </button>
        </div>
      </div>
    </div>
  );
}
