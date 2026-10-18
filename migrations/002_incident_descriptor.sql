-- Keep the original vehicle description; transferring a tag must not expose its new owner's data in old histories.
ALTER TABLE incident ADD COLUMN vehicle_descriptor text NOT NULL DEFAULT 'Vehicle';
