"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateBusinessProfileAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export interface BusinessProfile {
  name: string;
  ownerName: string;
  phone: string;
  address: string;
  businessType: string;
  logoUrl: string;
}

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function ShopDetailsForm({ profile: initial }: { profile: BusinessProfile }) {
  const router = useRouter();
  const [p, setP] = useState<BusinessProfile>(initial);
  const [pending, startTransition] = useTransition();
  const [dirty, setDirty] = useState(false);

  function update<K extends keyof BusinessProfile>(key: K, value: BusinessProfile[K]) {
    setP((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  }

  function save() {
    startTransition(async () => {
      const result = await updateBusinessProfileAction(p);
      if (result.ok) {
        toast.success("Shop details save ho gayi.");
        setDirty(false);
        router.refresh();
      } else {
        toast.error(result.error ?? "Save nahi ho sake.");
      }
    });
  }

  const logoPreviewable = p.logoUrl.trim() !== "" && isValidUrl(p.logoUrl.trim());

  return (
    <section className="space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Shop Details
      </h2>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="shop-name">Shop Name</Label>
          <Input
            id="shop-name"
            value={p.name}
            onChange={(e) => update("name", e.target.value)}
            placeholder="Babar General Store"
          />
          <p className="text-xs text-muted-foreground">Har receipt aur bill par chapta hai.</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="owner-name">Owner Name</Label>
          <Input
            id="owner-name"
            value={p.ownerName}
            onChange={(e) => update("ownerName", e.target.value)}
            placeholder="Babar Hussain"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="shop-phone">Phone</Label>
          <Input
            id="shop-phone"
            value={p.phone}
            onChange={(e) => update("phone", e.target.value)}
            placeholder="0300 1234567"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="business-type">Business Type</Label>
          <Input
            id="business-type"
            value={p.businessType}
            onChange={(e) => update("businessType", e.target.value)}
            placeholder="Karyana / General Store"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="shop-address">Address</Label>
        <Textarea
          id="shop-address"
          value={p.address}
          onChange={(e) => update("address", e.target.value)}
          placeholder="Shop 12, Main Bazar, Lahore"
          rows={2}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="logo-url">Logo URL (optional)</Label>
        <div className="flex items-center gap-3">
          <Input
            id="logo-url"
            value={p.logoUrl}
            onChange={(e) => update("logoUrl", e.target.value)}
            placeholder="https://…/logo.png"
            aria-invalid={p.logoUrl.trim() !== "" && !logoPreviewable}
          />
          {logoPreviewable && (
            // Live preview of an arbitrary external URL — next/image needs
            // domain allowlisting, so a plain img is the right tool here.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={p.logoUrl.trim()}
              alt="Logo preview"
              className="h-10 w-10 shrink-0 rounded border object-contain"
            />
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Logo receipt ke header mein use hoga. http(s) URL dein.
        </p>
      </div>
      <Button onClick={save} disabled={pending || !dirty} className="w-full sm:w-auto">
        {pending ? "Saving…" : "Save Shop Details"}
      </Button>
    </section>
  );
}
