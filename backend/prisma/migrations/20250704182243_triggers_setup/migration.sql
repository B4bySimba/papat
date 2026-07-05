-- This is an empty migration.
CREATE SEQUENCE IF NOT EXISTS house_id_seq;
CREATE SEQUENCE IF NOT EXISTS landlord_id_seq;

-- Function to generate house code
CREATE OR REPLACE FUNCTION generate_house_code()
RETURNS TRIGGER AS $$
DECLARE
    nextval INTEGER;
BEGIN
    nextval := nextval('house_id_seq');
    NEW.code := 'hse' || nextval;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to generate landlord code
CREATE OR REPLACE FUNCTION generate_landlord_code()
RETURNS TRIGGER AS $$
DECLARE
    nextval INTEGER;
BEGIN
    nextval := nextval('landlord_id_seq');
    NEW.code := 'lnd' || nextval;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to prevent assigning tenant to occupied unit
CREATE OR REPLACE FUNCTION prevent_assigning_to_occupied_unit()
RETURNS TRIGGER AS $$
DECLARE
    unit_state TEXT;
BEGIN
    SELECT state INTO unit_state FROM "Unit" WHERE id = NEW."unitId";

    IF unit_state = 'OCCUPIED' THEN
        RAISE EXCEPTION 'Cannot assign tenant to an OCCUPIED unit (%).', NEW."unitId";
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for house code generation
CREATE TRIGGER house_id_trigger
BEFORE INSERT ON "House"
FOR EACH ROW
EXECUTE FUNCTION generate_house_code();

-- Trigger for landlord code generation
CREATE TRIGGER landlord_id_trigger
BEFORE INSERT ON "Landlord"
FOR EACH ROW
EXECUTE FUNCTION generate_landlord_code();

-- Trigger to prevent assigning tenant to occupied unit
CREATE TRIGGER prevent_occupied_unit_assignment
BEFORE INSERT ON "Tenant"
FOR EACH ROW
EXECUTE FUNCTION prevent_assigning_to_occupied_unit();
