-- Since Leads is in MongoDB, schema updates are handled by Mongoose.
-- The following SQL is for the relational database part (Customers).

ALTER TABLE customers ADD COLUMN location VARCHAR(255);
ALTER TABLE model ADD COLUMN hs_code VARCHAR(100) NULL;
