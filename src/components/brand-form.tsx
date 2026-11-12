import type { Brand } from "@prisma/client";
import { ActionForm } from "./action-form";
import { HiddenOrg } from "./ui";
export function BrandForm({
  organizationId,
  brand,
}: {
  organizationId: string;
  brand?: Brand;
}) {
  return (
    <ActionForm kind="brand:save" label={brand ? "Save brand" : "Create brand"}>
      <HiddenOrg id={organizationId} />
      {brand && <input type="hidden" name="id" value={brand.id} />}
      <div className="brand-placeholder" style={{ background: brand?.color }}>
        <span>{brand?.name.slice(0, 2).toUpperCase() || "—"}</span>
        <p>
          Lettermark logo
          <small>Automatically created from your brand name.</small>
        </p>
      </div>
      <label>
        Brand name
        <input
          name="name"
          required
          minLength={2}
          maxLength={80}
          defaultValue={brand?.name}
          placeholder="Enter your business or brand name"
        />
      </label>
      <label>
        Description
        <textarea
          name="description"
          maxLength={1000}
          defaultValue={brand?.description}
          placeholder="What makes this brand different?"
        />
      </label>
      <div className="form-columns">
        <label>
          Primary color
          <input
            type="color"
            name="color"
            defaultValue={brand?.color ?? "#2f6bff"}
          />
        </label>
        <label>
          Secondary color
          <input
            type="color"
            name="secondaryColor"
            defaultValue={brand?.secondaryColor ?? "#8d8d8d"}
          />
        </label>
      </div>
      <label>
        Website
        <input
          name="website"
          type="url"
          maxLength={2048}
          defaultValue={brand?.website}
          placeholder="https://yourbrand.com"
        />
      </label>
      <label>
        Target audience
        <textarea
          name="audience"
          maxLength={1000}
          defaultValue={brand?.audience}
          placeholder="Who are you creating for?"
        />
      </label>
      <label>
        Tone & communication style
        <textarea
          name="tone"
          maxLength={1000}
          defaultValue={brand?.tone}
          placeholder="e.g. Confident, thoughtful, and a little playful"
        />
      </label>
    </ActionForm>
  );
}
